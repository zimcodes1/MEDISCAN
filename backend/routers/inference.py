import base64
import logging
import uuid
from datetime import date
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile
from pydantic import BeforeValidator
from sqlmodel.ext.asyncio.session import AsyncSession
from starlette.concurrency import run_in_threadpool

from backend.core.config import get_settings
from backend.core.constants import DISCLAIMER
from backend.core.database import get_session
from backend.core.deps import get_current_user, get_inference, get_storage
from backend.core.errors import AppError
from backend.core.net import client_ip
from backend.core.rate_limit import PREDICT_INFLIGHT, PREDICT_PER_USER, WARMUP_PER_USER
from backend.models import Organisation, User, UserRole
from backend.schemas.inference import FindingOut, PredictResponse
from backend.services import scan_service
from backend.services.inference_service import InferenceService
from backend.services.patient_service import get_accessible_patient
from backend.services.remote_inference import RemoteInferenceError
from backend.services.storage_service import StorageService
from backend.services.upload_validation import read_upload, validate_image

def _blank_to_none(v):
    return None if v in ("", None) else v


# Optional form fields: a blank value is the same as leaving the field out.
BlankIsNone = BeforeValidator(_blank_to_none)

logger = logging.getLogger("mediscan.predict")
router = APIRouter(tags=["inference"])


@router.post("/predict", response_model=PredictResponse)
async def predict(
    request: Request,
    file: UploadFile = File(..., description="Chest X-ray, PNG or JPEG"),
    patient_id: uuid.UUID | None = Form(
        default=None,
        description="If given, the scan and findings are saved to this patient. "
                    "If omitted, the image is analysed and nothing is stored.",
    ),
    # Clinical details: stored only when patient_id is given; always validated.
    priority: Annotated[Literal["routine", "urgent"] | None, BlankIsNone, Form()] = None,
    projection: Annotated[Literal["pa", "ap", "lateral"] | None, BlankIsNone, Form()] = None,
    exam_date: Annotated[date | None, BlankIsNone, Form(description="YYYY-MM-DD")] = None,
    clinical_notes: Annotated[str | None, BlankIsNone, Form(max_length=2000)] = None,
    assigned_to_id: Annotated[uuid.UUID | None, BlankIsNone, Form()] = None,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    inference: InferenceService = Depends(get_inference),
    storage: StorageService = Depends(get_storage),
):
    settings = get_settings()
    PREDICT_PER_USER.check(str(user.id))
    # Choosing who examines a scan is an admin decision. Everyone else gets the
    # organisation's auto-assign setting (applied below), never a choice of their own.
    if assigned_to_id is not None and UserRole(user.role) != UserRole.admin:
        raise AppError(403, "Only admins can assign scans")

    declared = request.headers.get("content-length")
    if declared and declared.isdigit() and int(declared) > settings.max_upload_bytes + 1024 * 1024:
        raise AppError(413, f"File too large (maximum {settings.max_upload_mb} MB)")

    async with PREDICT_INFLIGHT.slot():
        # Fail fast on access before doing any expensive work.
        patient = await get_accessible_patient(session, user, patient_id) if patient_id else None
        assignee = None
        effective_priority = priority or "routine"
        if patient is not None:
            org = await session.get(Organisation, user.organisation_id)
            effective_priority = priority or org.default_priority  # organisation default
            if assigned_to_id is not None:
                assignee = await scan_service.validate_assignee(session, user, assigned_to_id)
            elif org.auto_assign_to_id is not None:  # organisation auto-assign, if still valid
                assignee = await scan_service.usable_assignee(session, user, org.auto_assign_to_id)

        raw = await read_upload(file, settings.max_upload_bytes)
        validated = await run_in_threadpool(
            validate_image, raw, settings.max_image_pixels, settings.min_image_side
        )

        try:
            results = await inference.predict(validated.image, png_bytes=validated.png_bytes)
        except RemoteInferenceError:
            logger.exception("Remote inference unavailable")
            raise AppError(
                503, "The analysis service is starting up or unavailable. Please try again in a minute.",
                headers={"Retry-After": "30"},
            )
        except Exception:
            logger.exception("Inference failed")
            raise AppError(500, "Inference failed")

        scan = None
        if patient is not None:
            scan = await scan_service.save_scan(
                session, storage, user=user, patient=patient,
                image_png=validated.png_bytes, image_sha256=validated.sha256,
                results=results, ip=client_ip(request),
                meta=scan_service.ScanMeta(
                    priority=effective_priority, projection=projection,
                    exam_date=exam_date, clinical_notes=clinical_notes,
                    assigned_to_id=assignee.id if assignee else None,
                ),
                assignee=assignee,
            )

    return PredictResponse(
        scan_id=scan.id if scan else None,
        saved=scan is not None,
        inference_backend=inference.backend_name,
        disclaimer=DISCLAIMER,
        findings=[
            FindingOut(
                condition=r.condition, score=r.score,
                confidence_pct=round(r.score * 100, 1),
                heatmap_base64=(
                    base64.b64encode(r.heatmap_png).decode() if r.heatmap_png else None
                ),
                model_name=r.model_name, model_version=r.model_version,
                experimental=r.experimental,
            )
            for r in results
        ],
    )


@router.post("/predict/warmup", status_code=202)
async def warmup(
    user: User = Depends(get_current_user),
    inference: InferenceService = Depends(get_inference),
) -> dict:
    """Call when the upload screen opens: wakes a sleeping analysis service so
    the user's real request does not wait for a cold start. Returns at once."""
    WARMUP_PER_USER.check(str(user.id))
    wake = getattr(inference, "warmup", None)
    if wake is None:
        return {"status": "ready"}
    await wake()
    return {"status": "warming"}
