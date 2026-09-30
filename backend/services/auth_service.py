"""Authentication business logic. Services flush/commit; routers stay thin."""
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import update
from sqlalchemy.exc import IntegrityError
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.core import security
from backend.core.config import get_settings
from backend.core.errors import AuthError
from backend.models import AuditLog, RefreshToken, User
from backend.models.base import utcnow
from backend.schemas.auth import TokenResponse


def normalize_email(email: str) -> str:
    return email.strip().lower()


def _aware(dt: datetime) -> datetime:
    """SQLite returns naive datetimes; Postgres returns aware ones."""
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def audit(
    session: AsyncSession,
    action: str,
    *,
    user_id: uuid.UUID | None = None,
    resource_type: str = "user",
    resource_id: uuid.UUID | None = None,
    ip: str | None = None,
) -> None:
    session.add(
        AuditLog(
            user_id=user_id, action=action, resource_type=resource_type,
            resource_id=resource_id, ip_address=ip,
        )
    )


# ---------- registration ----------
async def register_user(
    session: AsyncSession, email: str, full_name: str, password: str, ip: str | None
) -> None:
    """Always looks identical to the caller (no account enumeration): a
    duplicate email is silently ignored and only recorded in the audit log."""
    email = normalize_email(email)
    pw_hash = await security.hash_password_async(password)  # hash even for dupes: equal timing
    existing = (await session.exec(select(User).where(User.email == email))).first()
    if existing:
        audit(session, "user.register_duplicate", user_id=existing.id,
              resource_id=existing.id, ip=ip)
        await session.commit()
        return
    user = User(email=email, full_name=full_name.strip(), hashed_password=pw_hash)
    session.add(user)
    try:
        await session.flush()
        audit(session, "user.register", user_id=user.id, resource_id=user.id, ip=ip)
        await session.commit()
    except IntegrityError:  # two simultaneous registrations for the same email
        await session.rollback()


# ---------- tokens ----------
def _issue_token_pair(
    session: AsyncSession, user: User, family_id: uuid.UUID | None = None
) -> TokenResponse:
    s = get_settings()
    raw = security.generate_refresh_token()
    session.add(
        RefreshToken(
            user_id=user.id,
            token_hash=security.hash_token(raw),
            family_id=family_id or uuid.uuid4(),
            expires_at=utcnow() + timedelta(days=s.refresh_token_expire_days),
        )
    )
    return TokenResponse(
        access_token=security.create_access_token(user),
        refresh_token=raw,
        expires_in=s.access_token_expire_minutes * 60,
    )


async def _revoke_family(session: AsyncSession, family_id: uuid.UUID, now: datetime) -> None:
    await session.exec(
        update(RefreshToken)
        .where(RefreshToken.family_id == family_id, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=now)
    )


async def revoke_all_for_user(session: AsyncSession, user_id: uuid.UUID) -> None:
    await session.exec(
        update(RefreshToken)
        .where(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=utcnow())
    )


# ---------- login / refresh / logout ----------
async def login(
    session: AsyncSession, email: str, password: str, ip: str | None
) -> TokenResponse:
    email = normalize_email(email)
    user = (await session.exec(select(User).where(User.email == email))).first()
    password_ok = await security.verify_password_async(
        password, user.hashed_password if user else security.dummy_hash()
    )
    if user is None or not password_ok:
        audit(session, "auth.login_failed", user_id=user.id if user else None, ip=ip)
        await session.commit()
        raise AuthError(401, "Invalid email or password")
    # Status is only revealed after the password was correct.
    if not user.is_active:
        raise AuthError(403, "Account disabled")
    if not user.is_approved:
        raise AuthError(403, "Account pending administrator approval")

    pair = _issue_token_pair(session, user)
    audit(session, "auth.login", user_id=user.id, resource_id=user.id, ip=ip)
    await session.commit()
    return pair


async def refresh(session: AsyncSession, raw_token: str, ip: str | None) -> TokenResponse:
    """Rotate: each refresh token is single-use. Replaying a used token means it
    was stolen (or the client is broken), so the whole family is revoked."""
    row = (
        await session.exec(
            select(RefreshToken)
            .where(RefreshToken.token_hash == security.hash_token(raw_token))
            .with_for_update()  # serialise concurrent refreshes of the same token
        )
    ).first()
    if row is None:
        raise AuthError(401, "Invalid refresh token")

    now = utcnow()
    if row.revoked_at is not None:
        await _revoke_family(session, row.family_id, now)
        audit(session, "auth.refresh_reuse_detected", user_id=row.user_id,
              resource_id=row.user_id, ip=ip)
        await session.commit()
        raise AuthError(401, "Invalid refresh token")

    if _aware(row.expires_at) <= now:
        raise AuthError(401, "Refresh token expired")

    user = await session.get(User, row.user_id)
    if user is None or not user.is_active or not user.is_approved:
        row.revoked_at = now
        await session.commit()
        raise AuthError(401, "Invalid refresh token")

    row.revoked_at = now
    pair = _issue_token_pair(session, user, family_id=row.family_id)
    await session.commit()
    return pair


async def logout(session: AsyncSession, raw_token: str, ip: str | None) -> None:
    """Idempotent: unknown tokens are ignored so callers learn nothing."""
    row = (
        await session.exec(
            select(RefreshToken).where(RefreshToken.token_hash == security.hash_token(raw_token))
        )
    ).first()
    if row is not None:
        await _revoke_family(session, row.family_id, utcnow())
        audit(session, "auth.logout", user_id=row.user_id, resource_id=row.user_id, ip=ip)
        await session.commit()


# ---------- admin actions ----------
async def _get_user_or_404(session: AsyncSession, user_id: uuid.UUID) -> User:
    user = await session.get(User, user_id)
    if user is None:
        raise AuthError(404, "User not found")
    return user


async def approve_user(session: AsyncSession, admin: User, user_id: uuid.UUID, ip: str | None) -> User:
    user = await _get_user_or_404(session, user_id)
    user.is_approved = True
    audit(session, "user.approve", user_id=admin.id, resource_id=user.id, ip=ip)
    await session.commit()
    return user


async def deactivate_user(session: AsyncSession, admin: User, user_id: uuid.UUID, ip: str | None) -> User:
    if admin.id == user_id:
        raise AuthError(400, "You cannot deactivate your own account")
    user = await _get_user_or_404(session, user_id)
    user.is_active = False
    await revoke_all_for_user(session, user.id)
    audit(session, "user.deactivate", user_id=admin.id, resource_id=user.id, ip=ip)
    await session.commit()
    return user


async def activate_user(session: AsyncSession, admin: User, user_id: uuid.UUID, ip: str | None) -> User:
    user = await _get_user_or_404(session, user_id)
    user.is_active = True
    audit(session, "user.activate", user_id=admin.id, resource_id=user.id, ip=ip)
    await session.commit()
    return user
