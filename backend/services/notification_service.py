"""In-app notifications. Events call `notify` inside their own transaction, so a
notification exists if and only if the event it describes was saved."""
import uuid
from collections.abc import Iterable

from sqlalchemy import func, update
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.core.errors import AppError
from backend.models import Notification, NotificationPreference, User, UserRole
from backend.models.base import utcnow
from backend.schemas.notification import (
    NotificationOut, NotificationPrefs, NotificationPrefsUpdate,
)

PREF_FIELDS = ("scan_assigned", "scan_reviewed", "report_finalised", "staff_joined", "in_app_sound")


async def notify(
    session: AsyncSession, *, recipient_ids: Iterable[uuid.UUID | None],
    organisation_id: uuid.UUID, type: str, message: str,
    actor_id: uuid.UUID | None, scan_id: uuid.UUID | None = None,
) -> None:
    """Queue a notification for each recipient (no commit here).

    Skipped for the person who caused the event, for anyone outside the organisation
    or no longer active, and for anyone who switched this kind off. `message` must
    contain no clinical content: names and patient codes only."""
    ids = {i for i in recipient_ids if i is not None and i != actor_id}
    if not ids:
        return
    members = (await session.exec(
        select(User.id).where(
            User.id.in_(ids), User.organisation_id == organisation_id,
            User.is_active.is_(True), User.is_approved.is_(True),
        )
    )).all()
    prefs = {
        p.user_id: p for p in (await session.exec(
            select(NotificationPreference).where(NotificationPreference.user_id.in_(members))
        )).all()
    }
    for uid in members:
        pref = prefs.get(uid)
        if pref is not None and not getattr(pref, type, True):
            continue
        session.add(Notification(
            user_id=uid, organisation_id=organisation_id, type=type,
            message=message[:300], scan_id=scan_id, actor_id=actor_id,
        ))


async def admin_ids(session: AsyncSession, organisation_id: uuid.UUID) -> list[uuid.UUID]:
    return list((await session.exec(
        select(User.id).where(
            User.organisation_id == organisation_id, User.role == UserRole.admin,
            User.is_active.is_(True), User.is_approved.is_(True),
        )
    )).all())


async def list_for(
    session: AsyncSession, user: User, *, unread_only: bool, limit: int, offset: int
) -> list[NotificationOut]:
    stmt = select(Notification).where(Notification.user_id == user.id)
    if unread_only:
        stmt = stmt.where(Notification.read_at.is_(None))
    stmt = stmt.order_by(Notification.created_at.desc(), Notification.id).limit(limit).offset(offset)
    return [
        NotificationOut(
            id=n.id, type=n.type, message=n.message, scan_id=n.scan_id,
            created_at=n.created_at, read=n.read_at is not None,
        )
        for n in (await session.exec(stmt)).all()
    ]


async def unread_count(session: AsyncSession, user: User) -> int:
    return (await session.exec(
        select(func.count(Notification.id)).where(
            Notification.user_id == user.id, Notification.read_at.is_(None)
        )
    )).one()


async def mark_read(session: AsyncSession, user: User, notification_id: uuid.UUID) -> None:
    n = await session.get(Notification, notification_id)
    if n is None or n.user_id != user.id:  # someone else's is simply not found
        raise AppError(404, "Notification not found")
    if n.read_at is None:
        n.read_at = utcnow()
        session.add(n)
        await session.commit()


async def mark_all_read(session: AsyncSession, user: User) -> None:
    await session.exec(
        update(Notification)
        .where(Notification.user_id == user.id, Notification.read_at.is_(None))
        .values(read_at=utcnow())
    )
    await session.commit()


def _prefs_out(pref: NotificationPreference | None) -> NotificationPrefs:
    return NotificationPrefs(**{f: getattr(pref, f) if pref else True for f in PREF_FIELDS})


async def get_prefs(session: AsyncSession, user: User) -> NotificationPrefs:
    return _prefs_out(await session.get(NotificationPreference, user.id))


async def update_prefs(
    session: AsyncSession, user: User, body: NotificationPrefsUpdate
) -> NotificationPrefs:
    fields = body.model_fields_set
    if not fields:
        raise AppError(422, "No fields to update")
    if any(getattr(body, f) is None for f in fields):
        raise AppError(422, "Preferences must be true or false")
    pref = await session.get(NotificationPreference, user.id)
    if pref is None:
        pref = NotificationPreference(user_id=user.id)
    for f in fields:
        setattr(pref, f, getattr(body, f))
    session.add(pref)
    await session.commit()
    return _prefs_out(pref)
