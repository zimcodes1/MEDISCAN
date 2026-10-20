"""Organisation isolation. Another organisation's data must be indistinguishable
from missing data (404, never 403), on every route that touches it."""
import uuid

import pytest
from sqlmodel import select

from backend.core.config import get_settings
from backend.models import Organisation, Scan, UserRole
from tests.helpers import (
    PW, create_patient, login, make_org, make_user, png_bytes, predict_saved, token_for, upload,
)

NOPE = str(uuid.uuid4())


@pytest.fixture
async def world(client, db):
    """Two organisations; org A has an admin and two clinicians, org B an admin and one."""
    w = type("World", (), {})()
    w.org_a, w.org_b = await make_org(db, "Org A"), await make_org(db, "Org B")
    w.admin_a = await token_for(client, db, "admin-a@example.com", UserRole.admin, w.org_a)
    w.a1 = await token_for(client, db, "c1@example.com", org=w.org_a)
    w.a2 = await token_for(client, db, "c2@example.com", org=w.org_a)
    w.admin_b = await token_for(client, db, "admin-b@example.com", UserRole.admin, w.org_b)
    w.b = await token_for(client, db, "cb@example.com", org=w.org_b)
    return w


# ---------------------------------------------------------------- patients
async def test_org_wide_visibility_within_organisation(client, world):
    pid = await create_patient(client, world.a1)
    # A colleague who did NOT register the patient sees it (decision: org-wide).
    assert (await client.get(f"/patients/{pid}", headers=world.a2)).status_code == 200
    ids = [p["id"] for p in (await client.get("/patients", headers=world.a2)).json()]
    assert pid in ids


async def test_patient_in_other_org_is_404(client, world):
    pid = await create_patient(client, world.a1)
    r = await client.get(f"/patients/{pid}", headers=world.b)
    missing = await client.get(f"/patients/{NOPE}", headers=world.b)
    assert r.status_code == 404
    assert r.json() == missing.json()  # indistinguishable from "does not exist"


async def test_patient_list_excludes_other_org_even_for_admin(client, world):
    await create_patient(client, world.a1)
    for headers in (world.b, world.admin_b):
        assert (await client.get("/patients", headers=headers)).json() == []


async def test_new_patient_belongs_to_creators_org(client, world):
    pid = await create_patient(client, world.b)
    assert (await client.get(f"/patients/{pid}", headers=world.admin_b)).status_code == 200
    assert (await client.get(f"/patients/{pid}", headers=world.admin_a)).status_code == 404


# ------------------------------------------------------------------- scans
async def test_scan_routes_hide_other_org(client, world):
    pid = await create_patient(client, world.a1)
    sid = (await predict_saved(client, world.a1, pid))["scan_id"]
    body = (await client.get(f"/scans/{sid}", headers=world.a1)).json()
    fid = body["findings"][0]["id"]
    paths = [f"/scans/{sid}", f"/scans/{sid}/image", f"/scans/{sid}/findings/{fid}/heatmap"]
    for path in paths:
        for headers in (world.b, world.admin_b):
            assert (await client.get(path, headers=headers)).status_code == 404, path
    # a colleague in the same organisation can read it
    assert (await client.get(f"/scans/{sid}", headers=world.a2)).status_code == 200
    assert (await client.get(f"/scans/{sid}/image", headers=world.a2)).status_code == 200


async def test_scan_list_without_patient_is_org_scoped(client, world):
    pa, pb = await create_patient(client, world.a1), await create_patient(client, world.b)
    sa = (await predict_saved(client, world.a1, pa))["scan_id"]
    sb = (await predict_saved(client, world.b, pb))["scan_id"]
    a_ids = {s["id"] for s in (await client.get("/scans", headers=world.a2)).json()}
    b_ids = {s["id"] for s in (await client.get("/scans", headers=world.b)).json()}
    assert a_ids == {sa} and b_ids == {sb}
    # clients that send an empty / "null" patient_id get the same org-wide list
    for q in ("?patient_id=", "?patient_id=null"):
        assert {s["id"] for s in (await client.get(f"/scans{q}", headers=world.a2)).json()} == {sa}
    assert (await client.get("/scans?patient_id=nope", headers=world.a2)).status_code == 422


async def test_scans_by_patient_of_other_org_is_404(client, world):
    pid = await create_patient(client, world.a1)
    await predict_saved(client, world.a1, pid)
    assert (await client.get(f"/scans?patient_id={pid}", headers=world.b)).status_code == 404


async def test_cannot_predict_into_other_orgs_patient(client, world):
    pid = await create_patient(client, world.a1)
    r = await client.post("/predict", headers=world.b, data={"patient_id": pid},
                          files=upload(png_bytes(1)))
    assert r.status_code == 404


async def test_scan_org_comes_from_patient_not_uploader(client, db, world):
    pid = await create_patient(client, world.a1)
    sid = (await predict_saved(client, world.a2, pid))["scan_id"]
    async with db() as s:
        scan = (await s.exec(select(Scan).where(Scan.id == uuid.UUID(sid)))).one()
    assert scan.organisation_id == world.org_a.id


# ------------------------------------------------------------------- admin
async def test_admin_lists_only_own_org_users(client, db, world):
    await make_user(db, "p@example.com", approved=False, org=world.org_b)
    r = await client.get("/admin/users?status=all", headers=world.admin_a)
    assert {u["email"] for u in r.json()} == {
        "admin-a@example.com", "c1@example.com", "c2@example.com"}


@pytest.mark.parametrize("action", ["approve", "deactivate", "activate"])
async def test_admin_cannot_act_on_other_org_user(client, db, world, action):
    victim = await make_user(db, "victim@example.com", approved=False, org=world.org_b)
    r = await client.post(f"/admin/users/{victim.id}/{action}", headers=world.admin_a)
    assert r.status_code == 404
    rows = (await client.get("/admin/users?status=all", headers=world.admin_b)).json()
    row = next(u for u in rows if u["email"] == "victim@example.com")
    assert row["is_approved"] is False and row["is_active"] is True


async def test_admin_can_approve_own_org_user(client, db, world):
    pending = await make_user(db, "new@example.com", approved=False, org=world.org_a)
    r = await client.post(f"/admin/users/{pending.id}/approve", headers=world.admin_a)
    assert r.status_code == 200 and r.json()["is_approved"] is True


async def test_non_admin_forbidden_on_admin_routes(client, db, world):
    assert (await client.get("/admin/users", headers=world.a1)).status_code == 403
    rad = await token_for(client, db, "rad@example.com", UserRole.radiologist, world.org_a)
    assert (await client.get("/admin/users", headers=rad)).status_code == 403


# ------------------------------------------------------------ org lifecycle
async def test_radiologist_sees_org_scans(client, db, world):
    rad = await token_for(client, db, "rad@example.com", UserRole.radiologist, world.org_a)
    pid = await create_patient(client, world.a1)
    sid = (await predict_saved(client, world.a1, pid))["scan_id"]
    assert (await client.get(f"/scans/{sid}", headers=rad)).status_code == 200


async def test_suspended_org_locks_out_tokens_login_and_refresh(client, db, world):
    refresh = (await login(client, "c1@example.com")).json()["refresh_token"]
    assert (await client.get("/patients", headers=world.a1)).status_code == 200
    async with db() as s:
        org = await s.get(Organisation, world.org_a.id)
        org.status = "suspended"
        await s.commit()
    assert (await client.get("/patients", headers=world.a1)).status_code == 401
    assert (await login(client, "c1@example.com")).status_code == 403
    assert (await client.post("/auth/refresh", json={"refresh_token": refresh})).status_code == 401
    assert (await client.get("/patients", headers=world.b)).status_code == 200  # others unaffected


async def test_pending_org_cannot_use_api(client, db):
    org = await make_org(db, "Pending Org", status="pending")
    await make_user(db, "x@example.com", org=org)
    # login is refused outright, and a hand-made token would be refused too
    assert (await login(client, "x@example.com")).status_code == 403


async def test_deactivated_user_is_rejected_on_next_request(client, db, world):
    victim = (await client.get("/auth/me", headers=world.a1)).json()["id"]
    assert (await client.get("/patients", headers=world.a1)).status_code == 200
    r = await client.post(f"/admin/users/{victim}/deactivate", headers=world.admin_a)
    assert r.status_code == 200
    assert (await client.get("/patients", headers=world.a1)).status_code == 401


async def test_legacy_register_joins_default_org_as_pending(client, db):
    admin = await token_for(client, db, "root@example.com", UserRole.admin)  # default org admin
    r = await client.post("/auth/register", json={
        "email": "newbie@example.com", "full_name": "New Bie", "password": PW})
    assert r.status_code == 202
    users = (await client.get("/admin/users", headers=admin)).json()
    assert [u["email"] for u in users] == ["newbie@example.com"]  # pending list
    assert (await login(client, "newbie@example.com")).status_code == 403
