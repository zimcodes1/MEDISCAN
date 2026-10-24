"""/dashboard/stats, /activity, /staff."""
import uuid
from datetime import datetime, timezone

import pytest

from backend.models import User, UserRole
from backend.services import dashboard_service
from tests.helpers import (
    create_patient, make_org, make_scan, make_user, me_id, predict_saved, token_for,
)

UTC = timezone.utc


# ---------------------------------------------------------------------- Lagos day
@pytest.mark.parametrize("now,expected_start", [
    # Lagos is UTC+1 all year: its day starts at 23:00 UTC the evening before.
    (datetime(2026, 10, 23, 12, 0, tzinfo=UTC), datetime(2026, 10, 22, 23, 0, tzinfo=UTC)),
    (datetime(2026, 10, 23, 22, 59, tzinfo=UTC), datetime(2026, 10, 22, 23, 0, tzinfo=UTC)),
    (datetime(2026, 10, 23, 23, 0, tzinfo=UTC), datetime(2026, 10, 23, 23, 0, tzinfo=UTC)),
    (datetime(2026, 1, 1, 0, 30, tzinfo=UTC), datetime(2025, 12, 31, 23, 0, tzinfo=UTC)),
])
def test_start_of_lagos_day(now, expected_start):
    assert dashboard_service.start_of_today_utc(now) == expected_start


# -------------------------------------------------------------------------- stats
async def test_stats_counts_and_scoping(client, db):
    org_a, org_b = await make_org(db, "Org A"), await make_org(db, "Org B")
    doc = await token_for(client, db, "a@example.com", org=org_a)
    other = await token_for(client, db, "b@example.com", org=org_b)
    a_id, b_id = uuid.UUID(await me_id(client, doc)), uuid.UUID(await me_id(client, other))
    pa, pb = await create_patient(client, doc), await create_patient(client, other)

    def scan(org, p, uid, score=0.1, **kw):
        return make_scan(db, org_id=org.id, patient_id=p, uploader_id=uid,
                         scores={"Pneumonia": score}, **kw)

    await scan(org_a, pa, a_id)                                           # pending, routine
    await scan(org_a, pa, a_id, 0.9, priority="urgent")                   # pending, urgent, flagged
    await scan(org_a, pa, a_id, 0.9)                                      # pending, flagged
    await scan(org_a, pa, a_id, 0.9, priority="urgent", review_status="reviewed",
               reviewed_at=datetime(2026, 10, 23, 8, 0, tzinfo=UTC), reviewed_by_id=a_id)  # today
    await scan(org_a, pa, a_id, review_status="reviewed",
               reviewed_at=datetime(2026, 10, 22, 22, 59, tzinfo=UTC), reviewed_by_id=a_id)  # yesterday
    await scan(org_b, pb, b_id, 0.9, priority="urgent")                   # another organisation

    async with db() as s:
        user = await s.get(User, a_id)
        got = await dashboard_service.stats(s, user, now=datetime(2026, 10, 23, 12, 0, tzinfo=UTC))
    assert got == {"total_scans": 5, "pending_review": 3, "urgent": 1, "flagged": 2, "reviewed_today": 1}


async def test_stats_endpoint_shape_and_auth(client, db):
    h = await token_for(client, db)
    body = (await client.get("/dashboard/stats", headers=h)).json()
    assert body == {"total_scans": 0, "pending_review": 0, "urgent": 0, "flagged": 0, "reviewed_today": 0}
    assert (await client.get("/dashboard/stats")).status_code in (401, 403)


async def test_stats_follow_review_changes(client, db):
    h = await token_for(client, db)
    pid = await create_patient(client, h)
    sid = (await predict_saved(client, h, pid))["scan_id"]
    await client.patch(f"/scans/{sid}", headers=h, json={"priority": "urgent"})
    s = (await client.get("/dashboard/stats", headers=h)).json()
    assert (s["pending_review"], s["urgent"], s["reviewed_today"]) == (1, 1, 0)
    await client.patch(f"/scans/{sid}", headers=h, json={"review_status": "reviewed"})
    s = (await client.get("/dashboard/stats", headers=h)).json()
    assert (s["pending_review"], s["urgent"], s["flagged"], s["reviewed_today"]) == (0, 0, 0, 1)


# ------------------------------------------------------------------------ activity
async def test_activity_newest_first_limited_and_scoped(client, db):
    org_a, org_b = await make_org(db, "Org A"), await make_org(db, "Org B")
    doc = await token_for(client, db, "a@example.com", org=org_a, full_name="Dr A")
    other = await token_for(client, db, "b@example.com", org=org_b)
    pid = await create_patient(client, doc)
    sid = (await predict_saved(client, doc, pid))["scan_id"]
    await client.patch(f"/scans/{sid}", headers=doc, json={"review_status": "reviewed"})

    feed = (await client.get("/activity", headers=doc)).json()
    assert [a["type"] for a in feed] == ["scan_reviewed", "scan_uploaded"]
    assert feed[0]["scan_id"] == sid and feed[0]["actor"]["full_name"] == "Dr A"
    assert set(feed[0]) == {"id", "type", "message", "actor", "scan_id", "created_at"}
    assert len((await client.get("/activity?limit=1", headers=doc)).json()) == 1
    assert (await client.get("/activity", headers=other)).json() == []
    for bad in ("?limit=0", "?limit=101"):
        assert (await client.get(f"/activity{bad}", headers=doc)).status_code == 422


async def test_user_joined_is_recorded_once_on_approval(client, db):
    admin = await token_for(client, db, "admin@example.com", UserRole.admin)
    newbie = await make_user(db, "new@example.com", approved=False, full_name="Nia New")
    for _ in range(2):
        assert (await client.post(f"/admin/users/{newbie.id}/approve", headers=admin)).status_code == 200
    joined = [a for a in (await client.get("/activity", headers=admin)).json() if a["type"] == "user_joined"]
    assert len(joined) == 1 and joined[0]["actor"]["full_name"] == "Nia New"


# --------------------------------------------------------------------------- staff
async def test_staff_lists_only_active_approved_colleagues(client, db):
    org_a, org_b = await make_org(db, "Org A"), await make_org(db, "Org B")
    me = await token_for(client, db, "me@example.com", org=org_a, full_name="Mo Me")
    await make_user(db, "r@example.com", role=UserRole.radiologist, org=org_a, full_name="Ann Rad")
    await make_user(db, "p@example.com", approved=False, org=org_a, full_name="Pending Pat")
    await make_user(db, "i@example.com", active=False, org=org_a, full_name="Inactive Ian")
    await make_user(db, "x@example.com", org=org_b, full_name="Other Org")

    staff = (await client.get("/staff", headers=me)).json()
    assert [s["full_name"] for s in staff] == ["Ann Rad", "Mo Me"]  # sorted by name
    assert all(set(s) == {"id", "full_name", "role"} for s in staff)  # no email, nothing else
    rads = (await client.get("/staff?role=radiologist", headers=me)).json()
    assert [s["full_name"] for s in rads] == ["Ann Rad"]
    assert (await client.get("/staff?role=janitor", headers=me)).status_code == 422
    assert (await client.get("/staff")).status_code in (401, 403)
