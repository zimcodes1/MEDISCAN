import uuid
from typing import Literal

from fastapi import APIRouter, Depends, Request
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.core.database import get_session
from backend.core.deps import require_admin
from backend.core.net import client_ip as _ip
from backend.models import User
from backend.core.rate_limit import PASSWORD_RESET_CREATE_PER_USER
from backend.schemas.auth import PasswordResetCreated, StaffUpdate, UserPublic
from backend.services import auth_service, password_reset_service

router = APIRouter(prefix="/admin", tags=["admin"])




@router.get("/users", response_model=list[UserPublic])
async def list_users(
    status: Literal["pending", "all"] = "pending",
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
):
    stmt = (
        select(User).where(User.organisation_id == admin.organisation_id)
        .order_by(User.created_at)
    )
    if status == "pending":
        stmt = stmt.where(User.is_approved == False)  # noqa: E712
    return (await session.exec(stmt)).all()


@router.patch("/users/{user_id}", response_model=UserPublic)
async def update_staff(
    user_id: uuid.UUID, body: StaffUpdate, request: Request,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
):
    """Set a colleague's job title. Only admins can: staff cannot edit their own."""
    return await auth_service.update_staff(session, admin, user_id, body, _ip(request))


@router.post("/users/{user_id}/approve", response_model=UserPublic)
async def approve(
    user_id: uuid.UUID, request: Request,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
):
    return await auth_service.approve_user(session, admin, user_id, _ip(request))


@router.post("/users/{user_id}/deactivate", response_model=UserPublic)
async def deactivate(
    user_id: uuid.UUID, request: Request,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
):
    return await auth_service.deactivate_user(session, admin, user_id, _ip(request))


@router.post("/users/{user_id}/activate", response_model=UserPublic)
async def activate(
    user_id: uuid.UUID, request: Request,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
):
    return await auth_service.activate_user(session, admin, user_id, _ip(request))


@router.post("/users/{user_id}/password-reset", response_model=PasswordResetCreated, status_code=201)
async def create_password_reset_link(
    user_id: uuid.UUID, request: Request,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
):
    """A one-time link for a colleague who has lost their password. No email is
    sent: hand the link over yourself. It is shown once and expires quickly."""
    PASSWORD_RESET_CREATE_PER_USER.check(str(admin.id))
    return await password_reset_service.create_link(session, admin, user_id, _ip(request))