"""Background housekeeping. Runs inside the app (no separate scheduler needed) and is
also available as `python -m backend.scripts.prune_notifications`."""
import asyncio
import logging

from backend.core.config import Settings, get_settings
from backend.services import notification_service

logger = logging.getLogger("mediscan.maintenance")

STARTUP_DELAY_SECONDS = 120  # let the app settle before the first run


async def run_once(session_factory, settings: Settings | None = None) -> int:
    """One clean-up pass. Returns how many notifications were deleted."""
    s = settings or get_settings()
    async with session_factory() as session:
        removed = await notification_service.prune(
            session, read_days=s.notification_read_retention_days,
            max_age_days=s.notification_max_age_days,
        )
    if removed:
        logger.info("Clean-up removed %d old notifications", removed)
    return removed


async def loop(session_factory, settings: Settings | None = None, *, first_delay: float = STARTUP_DELAY_SECONDS) -> None:
    """Run `run_once` now and then until cancelled. A failed pass is logged and the loop
    carries on, so a database blip never stops housekeeping for good."""
    s = settings or get_settings()
    interval = s.maintenance_interval_hours * 3600
    if interval <= 0:
        return  # switched off
    await asyncio.sleep(first_delay)
    while True:
        try:
            await run_once(session_factory, s)
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            logger.error("Clean-up pass failed (%s)", type(exc).__name__)
        await asyncio.sleep(interval)
