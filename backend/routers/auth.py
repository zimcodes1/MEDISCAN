from fastapi import APIRouter, Depends, Request, Response
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.core.database import get_session
from backend.core.deps import get_current_user
from backend.core.net import client_ip
from backend.core.rate_limit import (
    LOGIN_PER_ACCOUNT, LOGIN_PER_IP, REFRESH_PER_IP, REGISTER_PER_IP, by_ip,
)
from backend.models import User
from backend.schemas.auth import (
    LoginRequest, MessageResponse, RefreshRequest, RegisterRequest,
    TokenResponse, UserPublic,
)
from backend.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", status_code=202, response_model=MessageResponse,
             dependencies=[Depends(by_ip(REGISTER_PER_IP))])
async def register(
    body: RegisterRequest, request: Request,
    session: AsyncSession = Depends(get_session),
):
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


@router.get("/me", response_model=UserPublic)
async def me(user: User = Depends(get_current_user)):
    return user
