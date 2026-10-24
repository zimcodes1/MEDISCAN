import hashlib
import logging
import uuid

from typing import Literal

from fastapi import APIRouter, Depends, Query, Request, Response
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.core.database import get_session
from backend.core.deps import get_current_user, get_storage
from backend.core.errors import AppError
from backend.core.net import client_ip
from backend.core.rate_limit import IMAGE_PER_USER
from backend.models import User
from backend.schemas.scan import ScanOut, ScanUpdate
from backend.services import scan_service
from backend.services.auth_service import audit
from backend.services.storage_service import StorageService

logger = logging.getLogger("mediscan.scans")
router = APIRouter(prefix="/scans", tags=["scans"])


def _blank(v: str | None) -> bool:
    return v in (None, "", "null")


@router.get("", response_model=list[ScanOut])
async def list_scans(
    # Optional filters. Blank / "null" values (some clients send them) mean "no filter".
    patient_id_raw: str | None = Query(None, alias="patient_id"),
    assigned_to_raw: str | None = Query(None, alias="assigned_to_id", description="a user id, or 'me'"),
    review_status: Literal["pending", "reviewed"] | None = None,
    priority: Literal["routine", "urgent"] | None = None,
    flagged: bool | None = None,
    limit: int = Query(50, ge=1, le=200), offset: int = Query(0, ge=0),
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    patient_id = assigned_to_id = None
    try:
        if not _blank(patient_id_raw):
            patient_id = uuid.UUID(patient_id_raw)
    except ValueError:
        raise AppError(422, "Invalid patient_id")
    try:
        if assigned_to_raw == "me":
            assigned_to_id = user.id
        elif not _blank(assigned_to_raw):
            assigned_to_id = uuid.UUID(assigned_to_raw)
    except ValueError:
        raise AppError(422, "Invalid assigned_to_id")
    scans = await scan_service.list_scans(
        session, user, patient_id=patient_id, review_status=review_status,
        priority=priority, assigned_to_id=assigned_to_id, flagged=flagged,
        limit=limit, offset=offset,
    )
    return await scan_service.to_out(session, scans)


@router.get("/{scan_id}", response_model=ScanOut)
async def get_scan(
    scan_id: uuid.UUID, request: Request,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    scan = await scan_service.get_accessible_scan(session, user, scan_id)
    audit(session, "scan.view", user_id=user.id, resource_type="scan",
          resource_id=scan.id, ip=client_ip(request))
    await session.commit()  # who viewed which scan
    return (await scan_service.to_out(session, [scan]))[0]


@router.patch("/{scan_id}", response_model=ScanOut)
async def update_scan(
    scan_id: uuid.UUID, body: ScanUpdate, request: Request,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Change priority, assignee or review status. Anyone in the organisation may
    mark a scan reviewed; who did it and when is always recorded."""
    scan = await scan_service.update_scan(session, user, scan_id, body, client_ip(request))
    return (await scan_service.to_out(session, [scan]))[0]


# ---- image bytes: authenticated, audited, never cacheable, never public ----
def _file_response(data: bytes, media_type: str, filename: str) -> Response:
    return Response(
        content=data, media_type=media_type,
        headers={
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
            "Content-Disposition": f'inline; filename="{filename}"',
        },
    )


async def _read_object(storage: StorageService, key: str) -> bytes:
    try:
        return await storage.get(key)
    except FileNotFoundError:
        logger.error("Object missing in storage: %s", key)
        raise AppError(404, "Image unavailable")
    except Exception:
        logger.exception("Storage read failed for %s", key)
        raise AppError(502, "Storage is temporarily unavailable")


@router.get("/{scan_id}/image")
async def get_scan_image(
    scan_id: uuid.UUID, request: Request,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    storage: StorageService = Depends(get_storage),
):
    IMAGE_PER_USER.check(str(user.id))
    scan = await scan_service.get_accessible_scan(session, user, scan_id)
    audit(session, "scan.view_image", user_id=user.id, resource_type="scan",
          resource_id=scan.id, ip=client_ip(request))
    await session.commit()
    data = await _read_object(storage, scan.image_key)
    if hashlib.sha256(data).hexdigest() != scan.image_sha256:
        logger.error("Integrity check failed for scan %s", scan.id)
        raise AppError(500, "Stored image failed its integrity check")
    return _file_response(data, scan.content_type, f"scan-{scan.id}.png")


@router.get("/{scan_id}/findings/{finding_id}/heatmap")
async def get_finding_heatmap(
    scan_id: uuid.UUID, finding_id: uuid.UUID, request: Request,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    storage: StorageService = Depends(get_storage),
):
    IMAGE_PER_USER.check(str(user.id))
    scan = await scan_service.get_accessible_scan(session, user, scan_id)
    finding = next((f for f in scan.findings if f.id == finding_id), None)
    if finding is None or not finding.heatmap_key:
        raise AppError(404, "Heatmap not found")  # e.g. tuberculosis has none
    audit(session, "scan.view_heatmap", user_id=user.id, resource_type="scan",
          resource_id=scan.id, ip=client_ip(request))
    await session.commit()
    data = await _read_object(storage, finding.heatmap_key)
    return _file_response(data, "image/png", f"heatmap-{finding.id}.png")
