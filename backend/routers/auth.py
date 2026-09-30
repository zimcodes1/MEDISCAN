from fastapi import APIRouter, Depends, Request, Response
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.core.database import get_session
from backend.core.deps import get_current_user
from backend.models import User
from backend.schemas.auth import (
    LoginRequest, MessageResponse, RefreshRequest, RegisterRequest,
    TokenResponse, UserPublic,
)
from backend.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


def _ip(request: Request) -> str | None:
    return request.client.host if request.client else None


@router.post("/register", status_code=202, response_model=MessageResponse)
async def register(
    body: RegisterRequest, request: Request,
    session: AsyncSession = Depends(get_session),
):
    await auth_service.register_user(
        session, body.email, body.full_name, body.password, _ip(request)
    )
    return MessageResponse(
        detail="Registration received. An administrator must approve "
               "your account before you can sign in."
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginRequest, request: Request,
    session: AsyncSession = Depends(get_session),
):
    return await auth_service.login(session, body.email, body.password, _ip(request))


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    body: RefreshRequest, request: Request,
    session: AsyncSession = Depends(get_session),
):
    return await auth_service.refresh(session, body.refresh_token, _ip(request))


@router.post("/logout", status_code=204)
async def logout(
    body: RefreshRequest, request: Request,
    session: AsyncSession = Depends(get_session),
):
    await auth_service.logout(session, body.refresh_token, _ip(request))
    return Response(status_code=204)


@router.get("/me", response_model=UserPublic)
async def me(user: User = Depends(get_current_user)):
    return user
