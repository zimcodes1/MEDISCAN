import hashlib
import logging
import uuid

from fastapi import APIRouter, Depends, Query, Request, Response
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.core.database import get_session
from backend.core.deps import get_current_user, get_storage
from backend.core.errors import AppError
from backend.core.net import client_ip
from backend.core.rate_limit import IMAGE_PER_USER
from backend.models import User
from backend.schemas.scan import ScanOut
from backend.services import scan_service
from backend.services.auth_service import audit
from backend.services.storage_service import StorageService

logger = logging.getLogger("mediscan.scans")
router = APIRouter(prefix="/scans", tags=["scans"])


@router.get("", response_model=list[ScanOut])
async def list_scans(
    patient_id: uuid.UUID,
    limit: int = Query(50, ge=1, le=200), offset: int = Query(0, ge=0),
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    scans = await scan_service.list_scans(session, user, patient_id, limit, offset)
    return [ScanOut.from_scan(s) for s in scans]


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
    return ScanOut.from_scan(scan)


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
