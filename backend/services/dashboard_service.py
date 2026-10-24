from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import case, func
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.core.flagging import flagged_scan_clause
from backend.models import Scan, User

LAGOS = ZoneInfo("Africa/Lagos")  # fixed UTC+1, no daylight saving


def start_of_today_utc(now: datetime | None = None) -> datetime:
    """Midnight at the start of the current Lagos day, as a UTC instant."""
    local = (now or datetime.now(timezone.utc)).astimezone(LAGOS)
    return local.replace(hour=0, minute=0, second=0, microsecond=0).astimezone(timezone.utc)


async def stats(session: AsyncSession, user: User, now: datetime | None = None) -> dict:
    pending = Scan.review_status == "pending"
    row = (await session.exec(
        select(
            func.count(Scan.id),
            func.count(case((pending, 1))),
            func.count(case((pending & (Scan.priority == "urgent"), 1))),
            func.count(case((pending & flagged_scan_clause(), 1))),
            func.count(case((
                (Scan.review_status == "reviewed")
                & (Scan.reviewed_at >= start_of_today_utc(now)), 1,
            ))),
        ).where(Scan.organisation_id == user.organisation_id)
    )).one()
    total, pending_n, urgent, flagged, reviewed_today = row
    return {
        "total_scans": total, "pending_review": pending_n, "urgent": urgent,
        "flagged": flagged, "reviewed_today": reviewed_today,
    }
