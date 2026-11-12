"""Organisations: registration, platform approval, profile, settings, logo, invitations."""
import logging
import secrets
import uuid
from datetime import timedelta
from urllib.parse import quote

from fastapi import UploadFile
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import update
from sqlalchemy.exc import IntegrityError
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.core import security
from backend.core.config import get_settings
from backend.core.errors import AppError
from backend.models import Invite, Organisation, RefreshToken, User, UserRole
from backend.models.base import utcnow
from backend.schemas.org import (
    AcceptInvite, AdminRef, InviteCreate, InviteCreated, InviteOut, OrganisationRegister,
    OrgSettings, OrgSettingsUpdate, OrgUpdate, PlatformOrgOut,
)
from backend.services import activity_service, email_service, notification_service
from backend.services.auth_service import _aware, audit, normalize_email
from backend.services.profile_images import process_profile_image
from backend.services.scan_service import validate_assignee
from backend.services.storage_service import StorageService
from backend.services.upload_validation import read_upload

logger = logging.getLogger("mediscan.org")
INVITE_ERROR = "Invalid or expired invitation"


# ---------------------------------------------------------------- registration
async def register_organisation(
    session: AsyncSession, body: OrganisationRegister, ip: str | None
) -> None:
    """Creates a pending organisation and its first admin (not yet approved).
    Looks identical to the caller whether or not the email is already taken."""
    email = normalize_email(body.email)
    pw_hash = await security.hash_password_async(body.password)  # equal timing for duplicates
    existing = (await session.exec(select(User).where(User.email == email))).first()
    if existing:
        audit(session, "org.register_duplicate", user_id=existing.id, resource_id=existing.id, ip=ip)
        await session.commit()
        return
    org = Organisation(
        name=body.organisation_name, type=body.organisation_type, state=body.state,
        phone_number=body.phone_number, radiologist_count=body.radiologist_count,
        status="pending",
    )
    session.add(org)
    await session.flush()  # the user row points at the organisation: write that first
    admin = User(
        email=email, full_name=body.full_name.strip(), hashed_password=pw_hash,
        role=UserRole.admin, is_approved=False, is_active=True, organisation_id=org.id,
    )
    session.add(admin)
    try:
        await session.flush()
        audit(session, "org.register", user_id=admin.id, resource_type="organisation",
              resource_id=org.id, ip=ip)
        await session.commit()
    except IntegrityError:  # two simultaneous registrations for the same email
        await session.rollback()


# -------------------------------------------------------------- platform admin
async def _first_admins(session: AsyncSession, org_ids: list[uuid.UUID]) -> dict[uuid.UUID, User]:
    if not org_ids:
        return {}
    rows = (await session.exec(
        select(User).where(User.organisation_id.in_(org_ids), User.role == UserRole.admin)
        .order_by(User.created_at, User.id)
    )).all()
    first: dict[uuid.UUID, User] = {}
    for u in rows:
        first.setdefault(u.organisation_id, u)
    return first


async def list_organisations(session: AsyncSession, status: str | None) -> list[PlatformOrgOut]:
    stmt = select(Organisation).order_by(Organisation.created_at.desc(), Organisation.id)
    if status is not None:
        stmt = stmt.where(Organisation.status == status)
    orgs = list((await session.exec(stmt)).all())
    admins = await _first_admins(session, [o.id for o in orgs])
    out = []
    for o in orgs:
        a = admins.get(o.id)
        out.append(PlatformOrgOut(
            id=o.id, name=o.name, type=o.type, state=o.state, phone_number=o.phone_number,
            radiologist_count=o.radiologist_count, status=o.status, created_at=o.created_at,
            admin=AdminRef(id=a.id, full_name=a.full_name, email=a.email) if a else None,
        ))
    return out


async def _org_or_404(session: AsyncSession, org_id: uuid.UUID) -> Organisation:
    org = await session.get(Organisation, org_id)
    if org is None:
        raise AppError(404, "Organisation not found")
    return org


async def approve_organisation(
    session: AsyncSession, operator: User, org_id: uuid.UUID, ip: str | None
) -> PlatformOrgOut:
    """Activates the organisation and approves its admin(s) so they can sign in."""
    org = await _org_or_404(session, org_id)
    org_name = org.name
    # Only people approved by this click get the email, not admins who already could sign in.
    newly = (await session.exec(
        select(User).where(User.organisation_id == org.id, User.role == UserRole.admin,
                           User.is_approved.is_(False), User.is_active.is_(True))
    )).all()
    mails = [(u.email, u.full_name) for u in newly]
    org.status = "active"
    await session.exec(
        update(User)
        .where(User.organisation_id == org.id, User.role == UserRole.admin,
               User.is_approved.is_(False))
        .values(is_approved=True)
    )
    audit(session, "org.approve", user_id=operator.id, resource_type="organisation",
          resource_id=org.id, ip=ip)
    session.add(org)
    await session.commit()
    for email, full_name in mails:
        email_service.send_organisation_approved(email, full_name, org_name)
    return (await get_platform_org(session, org.id))


async def suspend_organisation(
    session: AsyncSession, operator: User, org_id: uuid.UUID, ip: str | None
) -> PlatformOrgOut:
    """Locks everyone in the organisation out at once: every request is refused
    (see get_current_user) and every refresh token is revoked."""
    if operator.organisation_id == org_id:
        raise AppError(409, "You cannot suspend your own organisation")
    org = await _org_or_404(session, org_id)
    org.status = "suspended"
    member_ids = select(User.id).where(User.organisation_id == org.id)
    await session.exec(
        update(RefreshToken)
        .where(RefreshToken.user_id.in_(member_ids), RefreshToken.revoked_at.is_(None))
        .values(revoked_at=utcnow())
    )
    audit(session, "org.suspend", user_id=operator.id, resource_type="organisation",
          resource_id=org.id, ip=ip)
    session.add(org)
    await session.commit()
    return (await get_platform_org(session, org.id))


async def get_platform_org(session: AsyncSession, org_id: uuid.UUID) -> PlatformOrgOut:
    org = await _org_or_404(session, org_id)
    admins = await _first_admins(session, [org.id])
    a = admins.get(org.id)
    return PlatformOrgOut(
        id=org.id, name=org.name, type=org.type, state=org.state, phone_number=org.phone_number,
        radiologist_count=org.radiologist_count, status=org.status, created_at=org.created_at,
        admin=AdminRef(id=a.id, full_name=a.full_name, email=a.email) if a else None,
    )


# --------------------------------------------------------------------- profile
async def get_org(session: AsyncSession, user: User) -> Organisation:
    return await session.get(Organisation, user.organisation_id)


async def update_org(
    session: AsyncSession, admin: User, body: OrgUpdate, ip: str | None
) -> Organisation:
    fields = body.model_fields_set
    if not fields:
        raise AppError(422, "No fields to update")
    org = await get_org(session, admin)
    for name in fields:
        setattr(org, name, getattr(body, name))
    audit(session, "org.update", user_id=admin.id, resource_type="organisation",
          resource_id=org.id, ip=ip)
    session.add(org)
    await session.commit()
    return org


# -------------------------------------------------------------------- settings
def settings_out(org: Organisation) -> OrgSettings:
    return OrgSettings(
        default_priority=org.default_priority, auto_assign_to_id=org.auto_assign_to_id,
        report_disclaimer=org.report_disclaimer,
    )


async def update_settings(
    session: AsyncSession, admin: User, body: OrgSettingsUpdate, ip: str | None
) -> Organisation:
    fields = body.model_fields_set
    if not fields:
        raise AppError(422, "No fields to update")
    org = await get_org(session, admin)
    if "auto_assign_to_id" in fields and body.auto_assign_to_id is not None:
        await validate_assignee(session, admin, body.auto_assign_to_id)  # 422 if not valid
    for name in fields:
        setattr(org, name, getattr(body, name))
    audit(session, "org.update_settings", user_id=admin.id, resource_type="organisation",
          resource_id=org.id, ip=ip)
    session.add(org)
    await session.commit()
    return org


# ------------------------------------------------------------------------ logo
async def set_logo(
    session: AsyncSession, storage: StorageService, admin: User, file: UploadFile, ip: str | None
) -> Organisation:
    s = get_settings()
    raw = await read_upload(file, s.profile_image_max_mb * 1024 * 1024)
    img = await run_in_threadpool(
        process_profile_image, raw, max_side=s.profile_image_max_side_px, allow_gif=True
    )
    org = await get_org(session, admin)
    old_key, org_id = org.logo_key, org.id
    new_key = f"logos/{org_id}/{img.digest}.png"
    try:
        await storage.put(new_key, img.png_bytes, "image/png")
        org.logo_key = new_key
        audit(session, "org.set_logo", user_id=admin.id, resource_type="organisation",
              resource_id=org_id, ip=ip)
        session.add(org)
        await session.commit()
    except Exception:
        await session.rollback()
        if new_key != old_key:
            await storage.delete(new_key)
        logger.exception("Saving logo failed for organisation %s", org_id)
        raise AppError(502, "Could not save the logo. Please try again.")
    if old_key and old_key != new_key:
        await _delete_quietly(storage, old_key)
    return org


async def clear_logo(session: AsyncSession, storage: StorageService, admin: User, ip: str | None) -> None:
    org = await get_org(session, admin)
    old_key = org.logo_key
    if not old_key:
        return
    org.logo_key = None
    audit(session, "org.clear_logo", user_id=admin.id, resource_type="organisation",
          resource_id=org.id, ip=ip)
    session.add(org)
    await session.commit()
    await _delete_quietly(storage, old_key)


async def get_logo_bytes(session: AsyncSession, storage: StorageService, user: User) -> bytes:
    org = await get_org(session, user)
    if not org.logo_key:
        raise AppError(404, "No logo")
    try:
        return await storage.get(org.logo_key)
    except FileNotFoundError:
        raise AppError(404, "No logo")
    except Exception:
        logger.exception("Storage read failed for a logo")
        raise AppError(502, "Storage is temporarily unavailable")


async def _delete_quietly(storage: StorageService, key: str) -> None:
    try:
        await storage.delete(key)
    except Exception:
        logger.warning("Could not delete old profile image %s", key)


# ----------------------------------------------------------------- invitations
def _invite_url(raw_token: str, email: str) -> str:
    """Matches the web app's /staff/accept-invite page, which reads `token` and
    pre-fills the form from `email`."""
    base = get_settings().frontend_url.rstrip("/")
    return f"{base}/staff/accept-invite?token={raw_token}&email={quote(email)}"


async def create_invite(
    session: AsyncSession, admin: User, body: InviteCreate, ip: str | None
) -> InviteCreated:
    email = normalize_email(body.email)
    now = utcnow()
    if (await session.exec(select(User.id).where(User.email == email))).first():
        # Deliberately vague: emails are unique across all organisations.
        raise AppError(409, "This email address can't be invited")
    pending = (await session.exec(
        select(Invite).where(
            Invite.organisation_id == admin.organisation_id, Invite.email == email,
            Invite.accepted_at.is_(None), Invite.expires_at > now,
        )
    )).first()
    if pending:
        raise AppError(409, "An invitation for this email is already pending. Delete it to send a new one.")
    raw = secrets.token_urlsafe(32)
    invite = Invite(
        organisation_id=admin.organisation_id, email=email, role=body.role,
        job_title=body.job_title,
        token_hash=security.hash_token(raw), created_by_id=admin.id,
        expires_at=now + timedelta(days=get_settings().invite_expire_days),
    )
    session.add(invite)
    await session.flush()
    audit(session, "invite.create", user_id=admin.id, resource_type="invite",
          resource_id=invite.id, ip=ip)
    await session.commit()
    return InviteCreated(
        id=invite.id, email=invite.email, role=invite.role, job_title=invite.job_title,
        token=raw, invite_url=_invite_url(raw, invite.email), expires_at=invite.expires_at,
    )


async def list_invites(session: AsyncSession, admin: User) -> list[InviteOut]:
    now = utcnow()
    rows = (await session.exec(
        select(Invite).where(
            Invite.organisation_id == admin.organisation_id, Invite.accepted_at.is_(None)
        ).order_by(Invite.created_at.desc(), Invite.id)
    )).all()
    return [
        InviteOut(
            id=i.id, email=i.email, role=i.role, job_title=i.job_title,
            created_at=i.created_at, expires_at=i.expires_at,
            status="expired" if _aware(i.expires_at) <= now else "pending",
        )
        for i in rows
    ]


async def delete_invite(session: AsyncSession, admin: User, invite_id: uuid.UUID, ip: str | None) -> None:
    invite = await session.get(Invite, invite_id)
    # Another organisation's invitation, or one already used, is simply not found.
    if invite is None or invite.organisation_id != admin.organisation_id or invite.accepted_at:
        raise AppError(404, "Invitation not found")
    audit(session, "invite.delete", user_id=admin.id, resource_type="invite",
          resource_id=invite.id, ip=ip)
    await session.delete(invite)
    await session.commit()


async def accept_invite(session: AsyncSession, body: AcceptInvite, ip: str | None) -> User:
    pw_hash = await security.hash_password_async(body.password)  # equal timing either way
    invite = (await session.exec(
        select(Invite).where(Invite.token_hash == security.hash_token(body.token)).with_for_update()
    )).first()
    now = utcnow()
    if invite is None or invite.accepted_at is not None or _aware(invite.expires_at) <= now:
        raise AppError(404, INVITE_ERROR)  # one message for every failure: no probing
    org = await session.get(Organisation, invite.organisation_id)
    if org is None or org.status != "active":
        raise AppError(404, INVITE_ERROR)
    user = User(
        email=invite.email, full_name=body.full_name.strip(), hashed_password=pw_hash,
        role=invite.role, job_title=invite.job_title, is_approved=True, is_active=True,
        organisation_id=invite.organisation_id,
    )
    org_id, invite_id = org.id, invite.id
    session.add(user)
    try:
        await session.flush()  # the user must exist before anything points at it
    except IntegrityError:
        await session.rollback()
        raise AppError(409, "An account with this email already exists")
    invite.accepted_at = now
    invite.accepted_user_id = user.id
    session.add(invite)
    activity_service.record(
        session, organisation_id=org_id, type="user_joined", actor_id=user.id,
        message="Joined the organisation",
    )
    await notification_service.notify(
        session, recipient_ids=await notification_service.admin_ids(session, org_id),
        organisation_id=org_id, type="staff_joined", actor_id=user.id,
        message=f"{user.full_name} joined the organisation",
    )
    audit(session, "invite.accept", user_id=user.id, resource_type="invite",
          resource_id=invite_id, ip=ip)
    await session.commit()
    return user
