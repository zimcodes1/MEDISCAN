import uuid

from fastapi import APIRouter, Depends, Query, Request
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.core.database import get_session
from backend.core.deps import get_current_user
from backend.core.net import client_ip
from backend.models import User
from backend.schemas.scan import ScanOut
from backend.services import scan_service
from backend.services.auth_service import audit

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
