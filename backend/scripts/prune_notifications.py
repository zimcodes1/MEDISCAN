"""
    python -m backend.scripts.prune_notifications [--dry-run]

Deletes old notifications now (the app also does this by itself every
MAINTENANCE_INTERVAL_HOURS). Read ones go after NOTIFICATION_READ_RETENTION_DAYS,
anything after NOTIFICATION_MAX_AGE_DAYS. --dry-run only counts them.
"""
import argparse
import asyncio

from backend.core.config import get_settings
from backend.core.database import async_session_factory, dispose_engine
from backend.services import notification_service


async def main(dry_run: bool) -> int:
    s = get_settings()
    try:
        async with async_session_factory() as session:
            n = await notification_service.prune(
                session, read_days=s.notification_read_retention_days,
                max_age_days=s.notification_max_age_days, dry_run=dry_run,
            )
    finally:
        await dispose_engine()
    print(f"{'Would delete' if dry_run else 'Deleted'} {n} notification(s).")
    return 0


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    raise SystemExit(asyncio.run(main(ap.parse_args().dry_run)))
