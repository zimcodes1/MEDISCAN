import base64
import logging
import uuid

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile
from sqlmodel.ext.asyncio.session import AsyncSession
from starlette.concurrency import run_in_threadpool

from backend.core.config import get_settings
from backend.core.constants import DISCLAIMER
from backend.core.database import get_session
from backend.core.deps import get_current_user, get_inference, get_storage
from backend.core.errors import AppError
from backend.core.net import client_ip
from backend.core.rate_limit import PREDICT_INFLIGHT, PREDICT_PER_USER
from backend.models import User
from backend.schemas.inference import FindingOut, PredictResponse
from backend.services import scan_service
from backend.services.inference_service import InferenceService
from backend.services.patient_service import get_accessible_patient
from backend.services.storage_service import StorageService
from backend.services.upload_validation import read_upload, validate_image

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
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    inference: InferenceService = Depends(get_inference),
    storage: StorageService = Depends(get_storage),
):
    settings = get_settings()
    PREDICT_PER_USER.check(str(user.id))

    declared = request.headers.get("content-length")
    if declared and declared.isdigit() and int(declared) > settings.max_upload_bytes + 1024 * 1024:
        raise AppError(413, f"File too large (maximum {settings.max_upload_mb} MB)")

    async with PREDICT_INFLIGHT.slot():
        # Fail fast on access before doing any expensive work.
        patient = await get_accessible_patient(session, user, patient_id) if patient_id else None

        raw = await read_upload(file, settings.max_upload_bytes)
        validated = await run_in_threadpool(
            validate_image, raw, settings.max_image_pixels, settings.min_image_side
        )

        try:
            results = await inference.predict(validated.image)
        except Exception:
            logger.exception("Inference failed")
            raise AppError(500, "Inference failed")

        scan = None
        if patient is not None:
            scan = await scan_service.save_scan(
                session, storage, user=user, patient=patient,
                image_png=validated.png_bytes, image_sha256=validated.sha256,
                results=results, ip=client_ip(request),
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
