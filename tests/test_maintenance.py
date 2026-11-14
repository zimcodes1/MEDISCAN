"""Old-notification clean-up: what is deleted, what is kept, and the background loop."""
import asyncio
import uuid
from datetime import timedelta

import pytest
from sqlmodel import select

from backend.core.config import Settings
from backend.models import Notification, UserRole
from backend.models.base import utcnow
from backend.services import maintenance, notification_service
from tests.helpers import make_org, me_id, token_for


def cfg(**kw) -> Settings:
    return Settings(_env_file=None, database_url="sqlite+aiosqlite:///:memory:",
                    jwt_secret_key="x" * 40, **kw)


@pytest.fixture
async def rows(client, db):
    """One person with notifications of every age and read state."""
    org = await make_org(db, "Org A")
    who = await token_for(client, db, "doc@example.com", UserRole.clinician, org, "Dr Doc")
    uid = uuid.UUID(await me_id(client, who))
    now = utcnow()

    def n(name, created_days, read_days=None):
        return Notification(
            user_id=uid, organisation_id=org.id, type="scan_assigned", message=name,
            created_at=now - timedelta(days=created_days),
            read_at=None if read_days is None else now - timedelta(days=read_days),
        )

    data = [
        n("fresh-unread", 1),
        n("fresh-read", 2, read_days=1),
        n("old-unread-but-recent-enough", 60),     # unread, under 90 days: keep
        n("read-long-ago", 50, read_days=40),      # read 40 days ago (> 30): delete
        n("read-recently-but-old", 100, read_days=2),  # older than 90 days: delete
        n("ancient-unread", 200),                  # unread for over 90 days: delete
    ]
    async with db() as s:
        s.add_all(data)
        await s.commit()
    return now


async def names(db) -> set[str]:
    async with db() as s:
        return {x.message for x in (await s.exec(select(Notification))).all()}


async def test_prune_deletes_old_read_ones_and_anything_past_the_maximum_age(db, rows):
    async with db() as s:
        deleted = await notification_service.prune(s, read_days=30, max_age_days=90, now=rows)
    assert deleted == 3
    assert await names(db) == {"fresh-unread", "fresh-read", "old-unread-but-recent-enough"}


async def test_dry_run_only_counts(db, rows):
    async with db() as s:
        assert await notification_service.prune(s, read_days=30, max_age_days=90, now=rows, dry_run=True) == 3
    assert len(await names(db)) == 6  # nothing deleted


async def test_prune_is_repeatable_and_a_no_op_when_nothing_is_old(db, rows):
    async with db() as s:
        await notification_service.prune(s, read_days=30, max_age_days=90, now=rows)
    async with db() as s:
        assert await notification_service.prune(s, read_days=30, max_age_days=90, now=rows) == 0
    assert len(await names(db)) == 3


async def test_stricter_limits_remove_more(db, rows):
    async with db() as s:
        deleted = await notification_service.prune(s, read_days=1, max_age_days=30, now=rows)
    assert deleted == 4  # also the 60-day-old unread one; the read-yesterday one is not past 1 day yet
    assert "old-unread-but-recent-enough" not in await names(db)


async def test_run_once_uses_the_configured_retention(db, rows):
    removed = await maintenance.run_once(db, cfg(notification_read_retention_days=30,
                                                 notification_max_age_days=90))
    assert removed == 3


async def test_the_loop_is_off_when_the_interval_is_zero(db, rows):
    await asyncio.wait_for(maintenance.loop(db, cfg(maintenance_interval_hours=0), first_delay=0), 2)
    assert len(await names(db)) == 6  # returned at once and cleaned nothing


async def test_the_loop_cleans_then_keeps_going_and_stops_on_cancel(db, rows):
    task = asyncio.create_task(
        maintenance.loop(db, cfg(maintenance_interval_hours=1), first_delay=0))
    for _ in range(50):  # wait for the first pass
        await asyncio.sleep(0.05)
        if len(await names(db)) == 3:
            break
    assert len(await names(db)) == 3
    assert not task.done()  # sleeping until the next pass
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task


async def test_a_failed_pass_does_not_stop_the_loop(db, monkeypatch):
    calls = []

    async def flaky(session_factory, settings=None):
        calls.append(1)
        if len(calls) == 1:
            raise RuntimeError("database blip")
        return 0

    monkeypatch.setattr(maintenance, "run_once", flaky)
    s = cfg(maintenance_interval_hours=1)
    object.__setattr__(s, "maintenance_interval_hours", 0.00001)  # ~36 ms between passes
    task = asyncio.create_task(maintenance.loop(db, s, first_delay=0))
    for _ in range(60):
        await asyncio.sleep(0.05)
        if len(calls) >= 2:
            break
    task.cancel()
    await asyncio.gather(task, return_exceptions=True)
    assert len(calls) >= 2  # it survived the first failure


def test_retention_settings_have_sensible_defaults_and_bounds():
    s = cfg()
    assert (s.maintenance_interval_hours, s.notification_read_retention_days,
            s.notification_max_age_days) == (24.0, 30, 90)
    for bad in ({"notification_read_retention_days": 0}, {"notification_max_age_days": 0},
                {"maintenance_interval_hours": -1}):
        with pytest.raises(ValueError):
            cfg(**bad)
