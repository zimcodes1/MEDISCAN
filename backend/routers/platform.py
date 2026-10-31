import uuid
from typing import Literal

from fastapi import APIRouter, Depends, Request
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.core.database import get_session
from backend.core.deps import require_platform_admin
from backend.core.net import client_ip
from backend.models import User
from backend.schemas.org import PlatformOrgOut
from backend.services import org_service

router = APIRouter(prefix="/platform", tags=["platform"])
# Platform operator only. These routes are the one place that look across
# organisations, and they expose organisation and admin contact details only:
# never patients, scans, reports or images.


@router.get("/organisations", response_model=list[PlatformOrgOut])
async def list_organisations(
    status: Literal["pending", "active", "suspended"] | None = None,
    _op: User = Depends(require_platform_admin),
    session: AsyncSession = Depends(get_session),
):
    return await org_service.list_organisations(session, status)


@router.post("/organisations/{org_id}/approve", response_model=PlatformOrgOut)
async def approve(
    org_id: uuid.UUID, request: Request,
    op: User = Depends(require_platform_admin), session: AsyncSession = Depends(get_session),
):
    return await org_service.approve_organisation(session, op, org_id, client_ip(request))


@router.post("/organisations/{org_id}/suspend", response_model=PlatformOrgOut)
async def suspend(
    org_id: uuid.UUID, request: Request,
    op: User = Depends(require_platform_admin), session: AsyncSession = Depends(get_session),
):
    return await org_service.suspend_organisation(session, op, org_id, client_ip(request))
