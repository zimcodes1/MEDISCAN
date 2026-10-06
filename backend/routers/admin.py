import uuid
from typing import Literal

from fastapi import APIRouter, Depends, Request
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.core.database import get_session
from backend.core.deps import require_admin
from backend.core.net import client_ip as _ip
from backend.models import User
from backend.schemas.auth import UserPublic
from backend.services import auth_service

router = APIRouter(prefix="/admin", tags=["admin"])




@router.get("/users", response_model=list[UserPublic])
async def list_users(
    status: Literal["pending", "all"] = "pending",
    _admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
):
    stmt = select(User).order_by(User.created_at)
    if status == "pending":
        stmt = stmt.where(User.is_approved == False)  # noqa: E712
    return (await session.exec(stmt)).all()


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
