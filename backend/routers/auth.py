from fastapi import APIRouter, Depends, File, Request, Response, UploadFile
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.core.config import get_settings
from backend.core.database import get_session
from backend.core.deps import get_current_user, get_storage
from backend.core.errors import AppError
from backend.core.net import client_ip
from backend.core.rate_limit import (
    ACCEPT_INVITE_PER_IP, LOGIN_PER_ACCOUNT, LOGIN_PER_IP, PASSWORD_CHANGE_PER_USER,
    PROFILE_IMAGE_PER_USER, REFRESH_PER_IP, REGISTER_ORG_PER_IP, REGISTER_PER_IP,
    RESET_PASSWORD_PER_IP, by_ip,
)
from backend.models import Organisation, User
from backend.schemas.auth import (
    AvatarOut, LoginRequest, MeOut, MessageResponse, OrgRef, PasswordChange, ProfileUpdate,
    RefreshRequest, RegisterRequest, ResetPassword, TokenResponse, UserPublic,
)
from backend.schemas.org import AcceptInvite, OrganisationRegister
from backend.services import auth_service, org_service, password_reset_service, profile_service
from backend.services.storage_service import StorageService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", status_code=202, response_model=MessageResponse,
             dependencies=[Depends(by_ip(REGISTER_PER_IP))])
async def register(
    body: RegisterRequest, request: Request,
    session: AsyncSession = Depends(get_session),
):
    """Legacy: joins the default organisation as a pending user. Superseded by
    /auth/register-organisation and invitations; switch off with LEGACY_REGISTER_ENABLED=false."""
    if not get_settings().legacy_register_enabled:
        raise AppError(404, "Not found")
    await auth_service.register_user(
        session, body.email, body.full_name, body.password, client_ip(request)
    )
    return MessageResponse(
        detail="Registration received. An administrator must approve "
               "your account before you can sign in."
    )


@router.post("/login", response_model=TokenResponse,
             dependencies=[Depends(by_ip(LOGIN_PER_IP))])
async def login(
    body: LoginRequest, request: Request,
    session: AsyncSession = Depends(get_session),
):
    ip = client_ip(request)
    # Keyed by IP *and* email: an attacker can only lock themselves out of an
    # account, never the real user.
    LOGIN_PER_ACCOUNT.check(f"{ip}|{auth_service.normalize_email(body.email)}")
    return await auth_service.login(session, body.email, body.password, ip)


@router.post("/refresh", response_model=TokenResponse,
             dependencies=[Depends(by_ip(REFRESH_PER_IP))])
async def refresh(
    body: RefreshRequest, request: Request,
    session: AsyncSession = Depends(get_session),
):
    return await auth_service.refresh(session, body.refresh_token, client_ip(request))


@router.post("/logout", status_code=204,
             dependencies=[Depends(by_ip(REFRESH_PER_IP))])
async def logout(
    body: RefreshRequest, request: Request,
    session: AsyncSession = Depends(get_session),
):
    await auth_service.logout(session, body.refresh_token, client_ip(request))
    return Response(status_code=204)


@router.post("/register-organisation", status_code=202, response_model=MessageResponse,
             dependencies=[Depends(by_ip(REGISTER_ORG_PER_IP))])
async def register_organisation(
    body: OrganisationRegister, request: Request,
    session: AsyncSession = Depends(get_session),
):
    """Creates a pending organisation and its first admin. The platform operator
    must approve the organisation before anyone can sign in."""
    await org_service.register_organisation(session, body, client_ip(request))
    return MessageResponse(
        detail="Registration received. Your organisation must be approved before you can sign in."
    )


@router.post("/accept-invite", status_code=201, response_model=UserPublic,
             dependencies=[Depends(by_ip(ACCEPT_INVITE_PER_IP))])
async def accept_invite(
    body: AcceptInvite, request: Request,
    session: AsyncSession = Depends(get_session),
):
    """Turns an invitation link into an already-approved account in that organisation."""
    return await org_service.accept_invite(session, body, client_ip(request))


@router.post("/reset-password", status_code=204,
             dependencies=[Depends(by_ip(RESET_PASSWORD_PER_IP))])
async def reset_password(
    body: ResetPassword, request: Request,
    session: AsyncSession = Depends(get_session),
):
    """Sets a new password from an admin-issued link, then signs the person out
    everywhere. They sign in again with the new password."""
    await password_reset_service.reset_password(
        session, body.token, body.new_password, client_ip(request)
    )
    return Response(status_code=204)


async def _me(session: AsyncSession, user: User) -> MeOut:
    org = await session.get(Organisation, user.organisation_id)
    base = UserPublic.model_validate(user)
    return MeOut(
        **base.model_dump(), organisation=OrgRef(id=org.id, name=org.name),
        onboarding_pending=user.onboarding_pending,
    )


@router.get("/me", response_model=MeOut)
async def me(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    return await _me(session, user)


@router.post("/me/onboarding/complete", status_code=204)
async def complete_onboarding(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """The first-sign-in setup is finished or skipped. Safe to call again."""
    await profile_service.complete_onboarding(session, user)
    return Response(status_code=204)


@router.patch("/me", response_model=MeOut)
async def update_me(
    body: ProfileUpdate, request: Request,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    user = await profile_service.update_me(session, user, body, client_ip(request))
    return await _me(session, user)


@router.post("/me/password", status_code=204)
async def change_password(
    body: PasswordChange, request: Request,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Signs you out everywhere, this device included: log in again with the new password."""
    PASSWORD_CHANGE_PER_USER.check(str(user.id))
    await profile_service.change_password(session, user, body, client_ip(request))
    return Response(status_code=204)


@router.post("/me/avatar", response_model=AvatarOut)
async def upload_avatar(
    request: Request, file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    storage: StorageService = Depends(get_storage),
):
    PROFILE_IMAGE_PER_USER.check(str(user.id))
    user = await profile_service.set_avatar(session, storage, user, file, client_ip(request))
    return AvatarOut(avatar_url=user.avatar_url)


@router.delete("/me/avatar", status_code=204)
async def delete_avatar(
    request: Request,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    storage: StorageService = Depends(get_storage),
):
    await profile_service.clear_avatar(session, storage, user, client_ip(request))
    return Response(status_code=204)
