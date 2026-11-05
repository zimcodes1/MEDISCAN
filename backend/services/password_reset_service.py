"""Admin-issued password reset links.

For colleagues who have lost their password and cannot sign in. No email is sent:
the admin copies the link and hands it over, the same way invitations work. The
link is single-use, expires quickly, and setting the password signs the person out
of every device."""
import secrets
import uuid
from datetime import timedelta

from sqlalchemy import delete
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.core import security
from backend.core.config import get_settings
from backend.core.errors import AppError, AuthError
from backend.models import Organisation, PasswordReset, User
from backend.models.base import utcnow
from backend.schemas.auth import PasswordResetCreated, ResetTarget
from backend.services.auth_service import (
    _aware, _get_user_or_404, audit, revoke_all_for_user,
)

LINK_ERROR = "Invalid or expired link"


def _reset_url(raw_token: str) -> str:
    return f"{get_settings().frontend_url.rstrip('/')}/reset-password?token={raw_token}"


async def create_link(
    session: AsyncSession, admin: User, user_id: uuid.UUID, ip: str | None
) -> PasswordResetCreated:
    target = await _get_user_or_404(session, admin, user_id)  # another organisation: 404
    if not (target.is_active and target.is_approved):
        raise AuthError(409, "Only active accounts can be reset. Reactivate or approve it first.")
    # One live link per person: a new one replaces any earlier unused link.
    await session.exec(
        delete(PasswordReset).where(
            PasswordReset.user_id == target.id, PasswordReset.used_at.is_(None)
        )
    )
    raw = secrets.token_urlsafe(32)
    reset = PasswordReset(
        user_id=target.id, token_hash=security.hash_token(raw), created_by_id=admin.id,
        expires_at=utcnow() + timedelta(minutes=get_settings().password_reset_expire_minutes),
    )
    session.add(reset)
    await session.flush()
    audit(session, "password_reset.create", user_id=admin.id, resource_type="user",
          resource_id=target.id, ip=ip)
    await session.commit()
    return PasswordResetCreated(
        token=raw, reset_url=_reset_url(raw), expires_at=reset.expires_at,
        user=ResetTarget(id=target.id, full_name=target.full_name, email=target.email),
    )


async def reset_password(
    session: AsyncSession, raw_token: str, new_password: str, ip: str | None
) -> None:
    pw_hash = await security.hash_password_async(new_password)  # equal timing either way
    reset = (await session.exec(
        select(PasswordReset).where(PasswordReset.token_hash == security.hash_token(raw_token))
        .with_for_update()
    )).first()
    now = utcnow()
    # One message for every failure (unknown, used, expired, account no longer usable).
    if reset is None or reset.used_at is not None or _aware(reset.expires_at) <= now:
        raise AppError(404, LINK_ERROR)
    user = await session.get(User, reset.user_id)
    org = await session.get(Organisation, user.organisation_id) if user else None
    if user is None or not (user.is_active and user.is_approved) or org is None or org.status != "active":
        raise AppError(404, LINK_ERROR)

    user.hashed_password = pw_hash
    user.updated_at = now
    session.add(user)
    reset.used_at = now
    session.add(reset)
    await session.exec(  # any other unused link for this person dies with this one
        delete(PasswordReset).where(
            PasswordReset.user_id == user.id, PasswordReset.used_at.is_(None)
        )
    )
    await revoke_all_for_user(session, user.id)  # signed out everywhere
    audit(session, "password_reset.use", user_id=user.id, resource_type="user",
          resource_id=user.id, ip=ip)
    await session.commit()
