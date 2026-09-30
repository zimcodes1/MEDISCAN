"""Shared FastAPI dependencies: current user and role checks."""
import uuid

import jwt
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.core import security
from backend.core.database import get_session
from backend.core.errors import AuthError
from backend.models import User, UserRole

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    session: AsyncSession = Depends(get_session),
) -> User:
    if creds is None:
        raise AuthError(401, "Not authenticated")
    try:
        payload = security.decode_access_token(creds.credentials)
        user_id = uuid.UUID(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise AuthError(401, "Invalid or expired token")
    # Re-check the DB every request so deactivation takes effect immediately.
    user = await session.get(User, user_id)
    if user is None or not user.is_active or not user.is_approved:
        raise AuthError(401, "Invalid or expired token")
    return user


def require_role(*roles: UserRole):
    async def checker(user: User = Depends(get_current_user)) -> User:
        if UserRole(user.role) not in roles:
            raise AuthError(403, "Insufficient permissions")
        return user

    return checker


require_admin = require_role(UserRole.admin)
