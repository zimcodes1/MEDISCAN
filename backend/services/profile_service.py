"""The signed-in user's own profile: name, title, phone, password, picture."""
import logging
import uuid

from fastapi import UploadFile
from fastapi.concurrency import run_in_threadpool
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.core import security
from backend.core.config import get_settings
from backend.core.errors import AppError, AuthError
from backend.models import User, UserRole
from backend.models.base import utcnow
from backend.schemas.auth import PasswordChange, ProfileUpdate
from backend.services import auth_service
from backend.services.auth_service import audit
from backend.services.profile_images import process_profile_image
from backend.services.storage_service import StorageService
from backend.services.upload_validation import read_upload

logger = logging.getLogger("mediscan.profile")


async def update_me(session: AsyncSession, user: User, body: ProfileUpdate, ip: str | None) -> User:
    fields = body.model_fields_set
    if not fields:
        raise AppError(422, "No fields to update")
    if "job_title" in fields and UserRole(user.role) != UserRole.admin:
        # Titles come from the invitation or an admin (PATCH /admin/users/{id}).
        raise AppError(403, "Your job title is set by your organisation admin")
    for name in fields:
        setattr(user, name, getattr(body, name))
    user.updated_at = utcnow()
    audit(session, "user.update_profile", user_id=user.id, resource_id=user.id, ip=ip)
    session.add(user)
    await session.commit()
    return user


async def change_password(
    session: AsyncSession, user: User, body: PasswordChange, ip: str | None
) -> None:
    """Verifies the current password, sets the new one and signs the user out of
    every device (all refresh tokens are revoked, including this session's)."""
    ok = await security.verify_password_async(body.current_password, user.hashed_password)
    if not ok:
        audit(session, "user.password_change_failed", user_id=user.id, resource_id=user.id, ip=ip)
        await session.commit()
        raise AuthError(400, "Current password is incorrect")
    if body.new_password == body.current_password:
        raise AppError(422, "Choose a password different from the current one")
    user.hashed_password = await security.hash_password_async(body.new_password)
    user.updated_at = utcnow()
    session.add(user)
    await auth_service.revoke_all_for_user(session, user.id)
    audit(session, "user.password_change", user_id=user.id, resource_id=user.id, ip=ip)
    await session.commit()


async def set_avatar(
    session: AsyncSession, storage: StorageService, user: User, file: UploadFile, ip: str | None
) -> User:
    s = get_settings()
    raw = await read_upload(file, s.profile_image_max_mb * 1024 * 1024)
    img = await run_in_threadpool(process_profile_image, raw, max_side=s.profile_image_max_side_px)
    # The key carries the content hash, so a new picture is a new object (and URL).
    old_key, uid = user.avatar_key, user.id
    new_key = f"avatars/{uid}/{img.digest}.png"
    try:
        await storage.put(new_key, img.png_bytes, "image/png")
        user.avatar_key = new_key
        user.updated_at = utcnow()
        session.add(user)
        audit(session, "user.set_avatar", user_id=uid, resource_id=uid, ip=ip)
        await session.commit()
    except Exception:
        await session.rollback()
        if new_key != old_key:  # do not leave an orphan behind
            await storage.delete(new_key)
        logger.exception("Saving avatar failed for user %s", uid)
        raise AppError(502, "Could not save the picture. Please try again.")
    if old_key and old_key != new_key:
        await _delete_quietly(storage, old_key)
    return user


async def clear_avatar(
    session: AsyncSession, storage: StorageService, user: User, ip: str | None
) -> None:
    old_key = user.avatar_key
    if not old_key:
        return
    user.avatar_key = None
    user.updated_at = utcnow()
    session.add(user)
    audit(session, "user.clear_avatar", user_id=user.id, resource_id=user.id, ip=ip)
    await session.commit()
    await _delete_quietly(storage, old_key)


async def get_avatar_bytes(
    session: AsyncSession, storage: StorageService, viewer: User, user_id: uuid.UUID
) -> bytes:
    """Only people in the same organisation can see a picture; anyone else gets the
    same 404 as for a missing user."""
    target = await session.get(User, user_id)
    if target is None or target.organisation_id != viewer.organisation_id or not target.avatar_key:
        raise AppError(404, "Picture not found")
    try:
        return await storage.get(target.avatar_key)
    except FileNotFoundError:
        raise AppError(404, "Picture not found")
    except Exception:
        logger.exception("Storage read failed for an avatar")
        raise AppError(502, "Storage is temporarily unavailable")


async def _delete_quietly(storage: StorageService, key: str) -> None:
    try:
        await storage.delete(key)
    except Exception:  # the row is already updated; a leftover object is harmless
        logger.warning("Could not delete old profile image %s", key)
