import uuid

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.models import Activity, User
from backend.schemas.activity import ActivityOut
from backend.schemas.scan import UserRef


def record(
    session: AsyncSession, *, organisation_id: uuid.UUID, type: str,
    actor_id: uuid.UUID, message: str, scan_id: uuid.UUID | None = None,
) -> None:
    """Queue a feed entry in the caller's transaction (no commit here), so the
    entry exists if and only if the event it describes was saved.

    `message` must contain no clinical content: names and patient codes only."""
    session.add(Activity(
        organisation_id=organisation_id, type=type, actor_id=actor_id,
        message=message[:300], scan_id=scan_id,
    ))


async def recent(session: AsyncSession, user: User, limit: int) -> list[ActivityOut]:
    rows = (await session.exec(
        select(Activity, User)
        .join(User, User.id == Activity.actor_id)
        .where(Activity.organisation_id == user.organisation_id)
        .order_by(Activity.created_at.desc(), Activity.id)
        .limit(limit)
    )).all()
    return [
        ActivityOut(
            id=a.id, type=a.type, message=a.message,
            actor=UserRef(id=u.id, full_name=u.full_name),
            scan_id=a.scan_id, created_at=a.created_at,
        )
        for a, u in rows
    ]
