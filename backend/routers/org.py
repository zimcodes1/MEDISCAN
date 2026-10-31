import uuid

from fastapi import APIRouter, Depends, File, Request, Response, UploadFile
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.core.database import get_session
from backend.core.deps import get_current_user, get_storage, require_admin
from backend.core.net import client_ip
from backend.core.rate_limit import IMAGE_PER_USER, PROFILE_IMAGE_PER_USER
from backend.models import Organisation, User
from backend.schemas.org import (
    InviteCreate, InviteCreated, InviteOut, OrgOut, OrgSettings, OrgSettingsUpdate, OrgUpdate,
)
from backend.services import org_service
from backend.services.storage_service import StorageService

router = APIRouter(prefix="/org", tags=["organisation"])


def _out(org: Organisation) -> OrgOut:
    return OrgOut(
        id=org.id, name=org.name, type=org.type, state=org.state,
        phone_number=org.phone_number, logo_url=org.logo_url,
        radiologist_count=org.radiologist_count,
    )


@router.get("", response_model=OrgOut)
async def get_org(
    user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session),
):
    return _out(await org_service.get_org(session, user))


@router.put("", response_model=OrgOut)
async def update_org(
    body: OrgUpdate, request: Request,
    admin: User = Depends(require_admin), session: AsyncSession = Depends(get_session),
):
    """Organisation admins only. Only the fields you send change."""
    return _out(await org_service.update_org(session, admin, body, client_ip(request)))


# ---- settings ----
@router.get("/settings", response_model=OrgSettings)
async def get_settings_(
    user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session),
):
    return org_service.settings_out(await org_service.get_org(session, user))


@router.put("/settings", response_model=OrgSettings)
async def update_settings(
    body: OrgSettingsUpdate, request: Request,
    admin: User = Depends(require_admin), session: AsyncSession = Depends(get_session),
):
    org = await org_service.update_settings(session, admin, body, client_ip(request))
    return org_service.settings_out(org)


# ---- logo ----
@router.get("/logo")
async def get_logo(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    storage: StorageService = Depends(get_storage),
):
    IMAGE_PER_USER.check(str(user.id))
    data = await org_service.get_logo_bytes(session, storage, user)
    return Response(
        content=data, media_type="image/png",
        headers={"Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff"},
    )


@router.post("/logo", response_model=dict)
async def upload_logo(
    request: Request, file: UploadFile = File(...),
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
    storage: StorageService = Depends(get_storage),
):
    PROFILE_IMAGE_PER_USER.check(str(admin.id))
    org = await org_service.set_logo(session, storage, admin, file, client_ip(request))
    return {"logo_url": org.logo_url}


@router.delete("/logo", status_code=204)
async def delete_logo(
    request: Request,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
    storage: StorageService = Depends(get_storage),
):
    await org_service.clear_logo(session, storage, admin, client_ip(request))
    return Response(status_code=204)


# ---- invitations ----
@router.post("/invites", response_model=InviteCreated, status_code=201)
async def create_invite(
    body: InviteCreate, request: Request,
    admin: User = Depends(require_admin), session: AsyncSession = Depends(get_session),
):
    """No email is sent: share the returned invite_url. The token is shown once."""
    return await org_service.create_invite(session, admin, body, client_ip(request))


@router.get("/invites", response_model=list[InviteOut])
async def list_invites(
    admin: User = Depends(require_admin), session: AsyncSession = Depends(get_session),
):
    return await org_service.list_invites(session, admin)


@router.delete("/invites/{invite_id}", status_code=204)
async def delete_invite(
    invite_id: uuid.UUID, request: Request,
    admin: User = Depends(require_admin), session: AsyncSession = Depends(get_session),
):
    await org_service.delete_invite(session, admin, invite_id, client_ip(request))
    return Response(status_code=204)
