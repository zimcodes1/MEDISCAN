"""Organisation profile, settings, logo, and the defaults they apply to uploads."""
import io
import uuid

import pytest
from PIL import Image
from sqlmodel import select

from backend.models import Organisation, UserRole
from tests.helpers import (
    big_png_bytes, create_patient, gif_bytes, make_org, make_user, me_id, noisy_png_bytes,
    pic, png_bytes, token_for, upload,
)


@pytest.fixture
async def world(client, db):
    w = type("World", (), {})()
    w.org, w.other = await make_org(db, "Org A"), await make_org(db, "Org B")
    w.admin = await token_for(client, db, "admin@example.com", UserRole.admin, w.org, "Ada Admin")
    w.doc = await token_for(client, db, "doc@example.com", org=w.org, full_name="Dr Doc")
    w.rad = await token_for(client, db, "rad@example.com", UserRole.radiologist, w.org, "Dr Rad")
    w.other_admin = await token_for(client, db, "oadmin@example.com", UserRole.admin, w.other)
    w.rad_id, w.doc_id = await me_id(client, w.rad), await me_id(client, w.doc)
    w.patient = await create_patient(client, w.doc)
    return w


async def exists(storage, key) -> bool:
    try:
        await storage.get(key)
        return True
    except Exception:
        return False


# --------------------------------------------------------------------- /org
async def test_any_member_can_read_the_organisation(client, world):
    for who in (world.admin, world.doc, world.rad):
        body = (await client.get("/org", headers=who)).json()
        assert body["name"] == "Org A" and body["id"] == str(world.org.id)
        assert set(body) == {"id", "name", "type", "state", "phone_number", "logo_url", "radiologist_count"}
    assert (await client.get("/org")).status_code in (401, 403)


async def test_admin_updates_only_what_is_sent(client, world):
    r = await client.put("/org", headers=world.admin, json={
        "name": "  Sunrise Hospital ", "type": "hospital", "state": "Borno",
        "phone_number": "+2348012345678", "radiologist_count": 5})
    body = r.json()
    assert r.status_code == 200 and body["name"] == "Sunrise Hospital" and body["state"] == "Borno"
    assert (body["type"], body["phone_number"], body["radiologist_count"]) == ("hospital", "+2348012345678", 5)
    body = (await client.put("/org", headers=world.admin, json={"state": "Lagos"})).json()
    assert body["state"] == "Lagos" and body["name"] == "Sunrise Hospital" and body["radiologist_count"] == 5
    body = (await client.put("/org", headers=world.admin, json={"radiologist_count": None})).json()
    assert body["radiologist_count"] is None  # cleared on purpose
    other = (await client.get("/org", headers=world.other_admin)).json()
    assert other["name"] == "Org B"  # nothing leaked across organisations


@pytest.mark.parametrize("payload", [
    {}, {"name": None}, {"name": "x"}, {"type": "pharmacy"}, {"type": None},
    {"state": "Atlantis"}, {"state": None}, {"phone_number": "123"}, {"phone_number": None},
    {"radiologist_count": -3}, {"radiologist_count": "many"},
])
async def test_org_update_validation(client, world, payload):
    assert (await client.put("/org", headers=world.admin, json=payload)).status_code == 422


async def test_only_admins_can_change_the_organisation(client, world):
    for who in (world.doc, world.rad):
        assert (await client.put("/org", headers=who, json={"name": "Hijacked"})).status_code == 403
    assert (await client.get("/org", headers=world.doc)).json()["name"] == "Org A"


# ----------------------------------------------------------------- settings
async def test_settings_start_with_safe_defaults(client, world):
    body = (await client.get("/org/settings", headers=world.doc)).json()
    assert body == {"default_priority": "routine", "auto_assign_to_id": None, "report_disclaimer": ""}


async def test_admin_changes_settings_and_everyone_can_read_them(client, world):
    r = await client.put("/org/settings", headers=world.admin, json={
        "default_priority": "urgent", "auto_assign_to_id": world.rad_id,
        "report_disclaimer": "Reviewed by a consultant radiologist."})
    assert r.status_code == 200 and r.json()["auto_assign_to_id"] == world.rad_id
    assert (await client.get("/org/settings", headers=world.doc)).json() == r.json()
    body = (await client.put("/org/settings", headers=world.admin, json={"auto_assign_to_id": None})).json()
    assert body["auto_assign_to_id"] is None and body["default_priority"] == "urgent"
    assert (await client.get("/org/settings", headers=world.other_admin)).json()["default_priority"] == "routine"


async def test_settings_validation_and_permissions(client, db, world):
    pending = await make_user(db, "p@example.com", approved=False, org=world.org)
    gone = await make_user(db, "g@example.com", active=False, org=world.org)
    stranger = await me_id(client, world.other_admin)
    for bad in (str(pending.id), str(gone.id), stranger, str(uuid.uuid4())):
        r = await client.put("/org/settings", headers=world.admin, json={"auto_assign_to_id": bad})
        assert r.status_code == 422, bad
    for payload in ({}, {"default_priority": "high"}, {"default_priority": None},
                    {"report_disclaimer": None}, {"report_disclaimer": "x" * 2001}):
        assert (await client.put("/org/settings", headers=world.admin, json=payload)).status_code == 422
    assert (await client.put("/org/settings", headers=world.doc, json={"default_priority": "urgent"})).status_code == 403


# ------------------------------------------------- defaults applied on upload
async def predict(client, headers, patient, **data):
    return await client.post("/predict", headers=headers, files=upload(png_bytes(4)),
                             data={"patient_id": patient, **data})


async def scan_of(client, headers, response):
    assert response.status_code == 200, response.text
    return (await client.get(f"/scans/{response.json()['scan_id']}", headers=headers)).json()


async def test_organisation_defaults_fill_in_omitted_fields(client, world):
    await client.put("/org/settings", headers=world.admin,
                     json={"default_priority": "urgent", "auto_assign_to_id": world.rad_id})
    scan = await scan_of(client, world.doc, await predict(client, world.doc, world.patient))
    assert scan["priority"] == "urgent" and scan["assigned_to"]["id"] == world.rad_id
    # what the person chooses always wins
    scan = await scan_of(client, world.doc, await predict(
        client, world.doc, world.patient, priority="routine", assigned_to_id=world.doc_id))
    assert scan["priority"] == "routine" and scan["assigned_to"]["id"] == world.doc_id
    # blank form fields count as omitted
    scan = await scan_of(client, world.doc, await predict(
        client, world.doc, world.patient, priority="", assigned_to_id=""))
    assert scan["priority"] == "urgent" and scan["assigned_to"]["id"] == world.rad_id


async def test_without_settings_uploads_behave_as_before(client, world):
    scan = await scan_of(client, world.doc, await predict(client, world.doc, world.patient))
    assert scan["priority"] == "routine" and scan["assigned_to"] is None


async def test_an_auto_assignee_who_left_is_skipped_not_an_error(client, world):
    await client.put("/org/settings", headers=world.admin, json={"auto_assign_to_id": world.rad_id})
    await client.post(f"/admin/users/{world.rad_id}/deactivate", headers=world.admin)
    scan = await scan_of(client, world.doc, await predict(client, world.doc, world.patient))
    assert scan["assigned_to"] is None


async def test_defaults_do_not_cross_organisations(client, world):
    await client.put("/org/settings", headers=world.admin, json={"default_priority": "urgent"})
    other_patient = await create_patient(client, world.other_admin)
    scan = await scan_of(client, world.other_admin, await predict(client, world.other_admin, other_patient))
    assert scan["priority"] == "routine"


# --------------------------------------------------------------------- logo
async def test_admin_uploads_a_logo_that_members_can_see(client, storage, world):
    assert (await client.get("/org/logo", headers=world.doc)).status_code == 404
    r = await client.post("/org/logo", headers=world.admin, files=pic(big_png_bytes((1200, 600))))
    assert r.status_code == 200
    url = r.json()["logo_url"]
    assert url.startswith("/org/logo?v=") and (await client.get("/org", headers=world.doc)).json()["logo_url"] == url
    got = await client.get("/org/logo", headers=world.doc)
    assert got.status_code == 200 and Image.open(io.BytesIO(got.content)).size == (512, 256)
    # each organisation only ever sees its own logo
    assert (await client.get("/org/logo", headers=world.other_admin)).status_code == 404
    assert (await client.get("/org/logo")).status_code in (401, 403)


async def test_logos_may_be_gifs(client, world):
    r = await client.post("/org/logo", headers=world.admin, files=pic(gif_bytes(), "l.gif", "image/gif"))
    assert r.status_code == 200
    stored = (await client.get("/org/logo", headers=world.admin)).content
    assert Image.open(io.BytesIO(stored)).format == "PNG"


async def test_only_admins_change_the_logo(client, world):
    assert (await client.post("/org/logo", headers=world.doc, files=pic(png_bytes(1)))).status_code == 403
    assert (await client.delete("/org/logo", headers=world.doc)).status_code == 403


@pytest.mark.parametrize("data,expected", [
    (b"not an image at all", 415), (noisy_png_bytes(), 413),
    (b"\x89PNG\r\n\x1a\n" + b"corrupt" * 20, 422),
])
async def test_bad_logo_uploads_are_refused(client, world, data, expected):
    assert (await client.post("/org/logo", headers=world.admin, files=pic(data))).status_code == expected
    assert (await client.get("/org", headers=world.admin)).json()["logo_url"] is None


async def test_replacing_and_removing_the_logo_cleans_up_storage(client, db, storage, world):
    async def key():
        async with db() as s:
            return (await s.exec(select(Organisation.logo_key).where(Organisation.id == world.org.id))).one()

    await client.post("/org/logo", headers=world.admin, files=pic(png_bytes(1)))
    first = await key()
    await client.post("/org/logo", headers=world.admin, files=pic(png_bytes(2)))
    second = await key()
    assert second != first and await exists(storage, second) and not await exists(storage, first)
    assert (await client.delete("/org/logo", headers=world.admin)).status_code == 204
    assert await key() is None and not await exists(storage, second)
    assert (await client.get("/org/logo", headers=world.doc)).status_code == 404
    assert (await client.delete("/org/logo", headers=world.admin)).status_code == 204
