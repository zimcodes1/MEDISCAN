"""Admin-only assignment, job titles set by admins, who registered a patient,
in-app notifications and approval emails."""
import smtplib

import pytest
from sqlmodel import select

from backend.core.config import Settings, get_settings
from backend.models import AuditLog, Notification, User, UserRole
from backend.services import email_service
from tests.helpers import (
    PW, create_patient, login, make_org, make_user, me_id, png_bytes, predict_saved,
    token_for, upload,
)

READY = {  # everything a report needs to be finalised
    "primary_impression": "pneumonia-bacterial", "recommended_action": "follow-up-xray",
    "ai_agreement": "agree",
}


@pytest.fixture
async def world(client, db):
    """Org A: an admin, an uploading clinician, a radiologist. Org B: an admin and a clinician."""
    w = type("World", (), {})()
    w.org, w.other = await make_org(db, "Org A"), await make_org(db, "Org B")
    w.admin = await token_for(client, db, "admin@example.com", UserRole.admin, w.org, "Ada Admin")
    w.doc = await token_for(client, db, "doc@example.com", UserRole.clinician, w.org, "Dr Doc")
    w.rad = await token_for(client, db, "rad@example.com", UserRole.radiologist, w.org, "Dr Rad")
    w.oadmin = await token_for(client, db, "oadmin@example.com", UserRole.admin, w.other, "Olu Admin")
    w.oclin = await token_for(client, db, "oclin@example.com", UserRole.clinician, w.other, "Dr Elsewhere")
    w.admin_id = await me_id(client, w.admin)
    w.doc_id, w.rad_id = await me_id(client, w.doc), await me_id(client, w.rad)
    w.patient = await create_patient(client, w.doc)
    return w


async def post_predict(client, headers, patient, **data):
    return await client.post("/predict", headers=headers, files=upload(png_bytes(3)),
                             data={"patient_id": patient, **data})


async def notes(client, headers, **params):
    r = await client.get("/notifications", headers=headers, params=params)
    assert r.status_code == 200, r.text
    return r.json()


async def unread(client, headers) -> int:
    return (await client.get("/notifications/unread-count", headers=headers)).json()["unread"]


# =================================================================== assignment
async def test_a_clinician_cannot_choose_the_assignee_on_upload(client, world):
    r = await post_predict(client, world.doc, world.patient, assigned_to_id=world.rad_id)
    assert r.status_code == 403 and "admin" in r.json()["detail"].lower()
    assert (await client.get("/scans", headers=world.admin)).json() == []  # nothing was saved


async def test_a_radiologist_cannot_either(client, world):
    r = await post_predict(client, world.rad, world.patient, assigned_to_id=world.rad_id)
    assert r.status_code == 403


async def test_organisation_auto_assign_still_applies_to_everyone(client, world):
    await client.put("/org/settings", headers=world.admin, json={"auto_assign_to_id": world.rad_id})
    r = await post_predict(client, world.doc, world.patient)
    assert r.status_code == 200
    scan = (await client.get(f"/scans/{r.json()['scan_id']}", headers=world.doc)).json()
    assert scan["assigned_to"]["id"] == world.rad_id


async def test_an_admin_can_choose_the_assignee(client, world):
    r = await post_predict(client, world.admin, world.patient, assigned_to_id=world.rad_id)
    assert r.status_code == 200
    scan = (await client.get(f"/scans/{r.json()['scan_id']}", headers=world.doc)).json()
    assert scan["assigned_to"]["id"] == world.rad_id


async def test_only_an_admin_can_change_the_assignee_of_a_scan(client, world):
    sid = (await predict_saved(client, world.doc, world.patient))["scan_id"]
    for who in (world.doc, world.rad):
        for body in ({"assigned_to_id": world.rad_id}, {"assigned_to_id": None}):
            r = await client.patch(f"/scans/{sid}", headers=who, json=body)
            assert r.status_code == 403, (who, body)
    # the rest of the workflow is still open to staff
    assert (await client.patch(f"/scans/{sid}", headers=world.doc, json={"priority": "urgent"})).status_code == 200
    assert (await client.patch(f"/scans/{sid}", headers=world.rad, json={"review_status": "reviewed"})).status_code == 200
    r = await client.patch(f"/scans/{sid}", headers=world.admin, json={"assigned_to_id": world.rad_id})
    assert r.status_code == 200 and r.json()["assigned_to"]["id"] == world.rad_id


# ================================================================== job titles
async def test_an_admin_sets_a_colleagues_job_title(client, db, world):
    r = await client.patch(f"/admin/users/{world.rad_id}", headers=world.admin,
                           json={"job_title": "  Consultant Radiologist "})
    assert r.status_code == 200 and r.json()["job_title"] == "Consultant Radiologist"
    assert (await client.get("/auth/me", headers=world.rad)).json()["job_title"] == "Consultant Radiologist"
    async with db() as s:
        actions = {a.action for a in (await s.exec(select(AuditLog))).all()}
    assert "user.update_staff" in actions
    # null or blank clears it
    for clear in (None, "   "):
        r = await client.patch(f"/admin/users/{world.rad_id}", headers=world.admin, json={"job_title": clear})
        assert r.status_code == 200 and r.json()["job_title"] is None


async def test_staff_cannot_use_the_staff_endpoint_or_set_their_own_title(client, world):
    for who in (world.doc, world.rad):
        r = await client.patch(f"/admin/users/{world.rad_id}", headers=who, json={"job_title": "Boss"})
        assert r.status_code == 403
    r = await client.patch("/auth/me", headers=world.doc, json={"job_title": "Chief of Everything"})
    assert r.status_code == 403
    assert (await client.get("/auth/me", headers=world.doc)).json()["job_title"] is None


async def test_the_staff_endpoint_is_scoped_and_validated(client, world):
    r = await client.patch(f"/admin/users/{world.rad_id}", headers=world.oadmin, json={"job_title": "X"})
    assert r.status_code == 404  # another organisation's admin cannot see them
    for bad in ({}, {"job_title": "x" * 101}):
        r = await client.patch(f"/admin/users/{world.rad_id}", headers=world.admin, json=bad)
        assert r.status_code == 422, bad


async def test_an_invitation_can_carry_a_job_title(client, db, world):
    r = await client.post("/org/invites", headers=world.admin, json={
        "email": "new@example.com", "role": "radiologist", "job_title": " Senior Radiographer "})
    assert r.status_code == 201 and r.json()["job_title"] == "Senior Radiographer"
    rows = (await client.get("/org/invites", headers=world.admin)).json()
    assert rows[0]["job_title"] == "Senior Radiographer"
    token = r.json()["token"]
    r = await client.post("/auth/accept-invite",
                          json={"token": token, "full_name": "New Person", "password": PW})
    assert r.status_code == 201 and r.json()["job_title"] == "Senior Radiographer"
    mine = {"Authorization": f"Bearer {(await login(client, 'new@example.com')).json()['access_token']}"}
    assert (await client.get("/auth/me", headers=mine)).json()["job_title"] == "Senior Radiographer"
    # the new colleague cannot change it afterwards
    assert (await client.patch("/auth/me", headers=mine, json={"job_title": "Boss"})).status_code == 403


async def test_an_invitation_without_a_title_still_works(client, world):
    r = await client.post("/org/invites", headers=world.admin,
                          json={"email": "plain@example.com", "role": "clinician"})
    assert r.status_code == 201 and r.json()["job_title"] is None


# ================================================================ patient creator
async def test_patients_show_who_registered_them(client, world):
    r = await client.post("/patients", headers=world.rad, json={"sex": "male", "year_of_birth": 1990})
    assert r.status_code == 201
    pid = r.json()["id"]
    assert r.json()["created_by"] == {"id": world.rad_id, "full_name": "Dr Rad"}
    # every colleague sees it, in the list and on the record
    got = (await client.get(f"/patients/{pid}", headers=world.doc)).json()
    assert got["created_by"]["full_name"] == "Dr Rad"
    listed = {p["id"]: p for p in (await client.get("/patients", headers=world.admin)).json()}
    assert listed[pid]["created_by"]["id"] == world.rad_id
    assert listed[world.patient]["created_by"]["full_name"] == "Dr Doc"


async def test_registering_a_patient_appears_in_the_activity_feed(client, world):
    r = await client.post("/patients", headers=world.rad, json={})
    code = r.json()["patient_code"]
    feed = (await client.get("/activity", headers=world.doc)).json()
    entry = next(a for a in feed if a["type"] == "patient_registered" and code in a["message"])
    assert entry["actor"]["full_name"] == "Dr Rad" and entry["scan_id"] is None
    # nothing about the patient but their pseudonymous code
    assert entry["message"] == f"Patient {code} registered"
    other = (await client.get("/activity", headers=world.oadmin)).json()
    assert all(code not in a["message"] for a in other)  # another organisation never sees it


# ================================================================= notifications
async def test_assigning_a_scan_notifies_only_the_assignee(client, world):
    r = await post_predict(client, world.admin, world.patient, assigned_to_id=world.rad_id,
                           priority="urgent", clinical_notes="SECRET NOTE TEXT")
    sid = r.json()["scan_id"]
    rad = await notes(client, world.rad)
    assert len(rad) == 1 and rad[0]["type"] == "scan_assigned" and rad[0]["read"] is False
    assert rad[0]["scan_id"] == sid
    assert "Ada Admin" in rad[0]["message"] and "(urgent)" in rad[0]["message"]
    assert "SECRET NOTE TEXT" not in rad[0]["message"]  # no clinical content, ever
    assert set(rad[0]) == {"id", "type", "message", "scan_id", "created_at", "read"}
    assert await notes(client, world.admin) == [] and await notes(client, world.doc) == []
    assert await unread(client, world.rad) == 1


async def test_reassigning_notifies_once_and_not_for_the_same_person_again(client, world):
    sid = (await predict_saved(client, world.doc, world.patient))["scan_id"]
    for _ in range(2):
        await client.patch(f"/scans/{sid}", headers=world.admin, json={"assigned_to_id": world.rad_id})
    assert len(await notes(client, world.rad)) == 1


async def test_review_notifies_the_uploader_and_assignee_but_not_the_reviewer(client, world):
    sid = (await post_predict(client, world.doc, world.patient)).json()["scan_id"]
    await client.patch(f"/scans/{sid}", headers=world.admin, json={"assigned_to_id": world.rad_id})
    await client.patch(f"/scans/{sid}", headers=world.rad, json={"review_status": "reviewed"})
    doc = [n for n in await notes(client, world.doc) if n["type"] == "scan_reviewed"]
    assert len(doc) == 1 and "Dr Rad" in doc[0]["message"]
    assert [n for n in await notes(client, world.rad) if n["type"] == "scan_reviewed"] == []


async def test_finalising_a_report_notifies_the_uploader_and_assignee(client, world):
    sid = (await post_predict(client, world.doc, world.patient)).json()["scan_id"]
    await client.patch(f"/scans/{sid}", headers=world.admin, json={"assigned_to_id": world.rad_id})
    await client.put(f"/scans/{sid}/report", headers=world.admin, json=READY)
    assert (await client.post(f"/scans/{sid}/report/finalise", headers=world.admin)).status_code == 200
    for who in (world.doc, world.rad):
        got = [n for n in await notes(client, who) if n["type"] == "report_finalised"]
        assert len(got) == 1 and "Ada Admin" in got[0]["message"], who
    assert [n for n in await notes(client, world.admin) if n["type"] == "report_finalised"] == []


async def test_a_new_colleague_notifies_the_admins(client, world):
    r = await client.post("/org/invites", headers=world.admin,
                          json={"email": "new@example.com", "role": "clinician"})
    await client.post("/auth/accept-invite", json={
        "token": r.json()["token"], "full_name": "New Person", "password": PW})
    got = await notes(client, world.admin)
    assert [n["type"] for n in got] == ["staff_joined"] and "New Person" in got[0]["message"]
    assert await notes(client, world.doc) == []  # staff are not told about arrivals


async def test_preferences_default_to_everything_on_and_update_partially(client, world):
    prefs = (await client.get("/notifications/preferences", headers=world.rad)).json()
    assert prefs == {"scan_assigned": True, "scan_reviewed": True, "report_finalised": True,
                     "staff_joined": True, "in_app_sound": True}
    r = await client.put("/notifications/preferences", headers=world.rad, json={"scan_assigned": False})
    assert r.status_code == 200 and r.json()["scan_assigned"] is False and r.json()["in_app_sound"] is True
    r = await client.put("/notifications/preferences", headers=world.rad, json={"in_app_sound": False})
    assert r.json()["scan_assigned"] is False and r.json()["in_app_sound"] is False  # earlier choice kept
    for bad in ({}, {"scan_assigned": None}, {"scan_assigned": "maybe"}):
        assert (await client.put("/notifications/preferences", headers=world.rad, json=bad)).status_code == 422, bad
    # preferences are personal
    assert (await client.get("/notifications/preferences", headers=world.doc)).json()["scan_assigned"] is True


async def test_a_switched_off_kind_is_not_delivered(client, world):
    await client.put("/notifications/preferences", headers=world.rad, json={"scan_assigned": False})
    await post_predict(client, world.admin, world.patient, assigned_to_id=world.rad_id)
    assert await notes(client, world.rad) == []
    # other kinds still arrive
    sid = (await post_predict(client, world.rad, world.patient)).json()["scan_id"]
    await client.patch(f"/scans/{sid}", headers=world.doc, json={"review_status": "reviewed"})
    assert [n["type"] for n in await notes(client, world.rad)] == ["scan_reviewed"]


async def test_reading_notifications(client, world):
    for _ in range(3):
        await post_predict(client, world.admin, world.patient, assigned_to_id=world.rad_id)
    got = await notes(client, world.rad)
    assert len(got) == 3 and await unread(client, world.rad) == 3
    assert (await client.post(f"/notifications/{got[0]['id']}/read", headers=world.rad)).status_code == 204
    assert (await client.post(f"/notifications/{got[0]['id']}/read", headers=world.rad)).status_code == 204  # idempotent
    assert await unread(client, world.rad) == 2
    assert len(await notes(client, world.rad, unread_only="true")) == 2
    assert len(await notes(client, world.rad, limit=1)) == 1
    assert (await client.post("/notifications/read-all", headers=world.rad)).status_code == 204
    assert await unread(client, world.rad) == 0 and len(await notes(client, world.rad)) == 3
    for bad in ("?limit=0", "?limit=101", "?offset=-1"):
        assert (await client.get(f"/notifications{bad}", headers=world.rad)).status_code == 422


async def test_notifications_are_private(client, world):
    await post_predict(client, world.admin, world.patient, assigned_to_id=world.rad_id)
    nid = (await notes(client, world.rad))[0]["id"]
    for who in (world.doc, world.admin, world.oadmin):  # colleagues and other organisations alike
        assert (await client.post(f"/notifications/{nid}/read", headers=who)).status_code == 404
        assert await notes(client, who) == []
    assert await unread(client, world.rad) == 1  # untouched
    r = await client.get("/notifications")
    assert r.status_code == 401


async def test_people_who_left_or_are_inactive_get_nothing(client, db, world):
    await post_predict(client, world.admin, world.patient, assigned_to_id=world.rad_id)
    async with db() as s:
        row = (await s.exec(select(User).where(User.email == "rad@example.com"))).one()
        row.is_active = False
        await s.commit()
    sid = (await post_predict(client, world.doc, world.patient)).json()["scan_id"]
    await client.patch(f"/scans/{sid}", headers=world.admin, json={"review_status": "reviewed"})
    async with db() as s:
        count = len((await s.exec(select(Notification).where(Notification.user_id == row.id))).all())
    assert count == 1  # only the one from before they were deactivated


# ======================================================================== email
@pytest.fixture
def outbox(monkeypatch):
    """Switch the email backend on and capture what would be sent."""
    sent = []

    async def fake_deliver(to, subject, body):
        sent.append({"to": to, "subject": subject, "body": body})

    monkeypatch.setattr(get_settings(), "email_backend", "console")
    monkeypatch.setattr(email_service, "deliver", fake_deliver)
    return sent


async def test_nothing_is_sent_while_email_is_disabled(client, db, monkeypatch):
    called = []

    async def fake_deliver(*a):
        called.append(a)

    monkeypatch.setattr(email_service, "deliver", fake_deliver)
    assert get_settings().email_backend == "disabled"  # the default
    op = await token_for(client, db, "operator@example.com", UserRole.admin, platform_admin=True)
    await client.post("/auth/register-organisation", json={
        "organisation_name": "Sunrise Clinic", "organisation_type": "clinic", "state": "Lagos",
        "phone_number": "08012345678", "full_name": "Ada Obi", "email": "ada@sunrise.example.com",
        "password": PW})
    oid = (await client.get("/platform/organisations?status=pending", headers=op)).json()[0]["id"]
    assert (await client.post(f"/platform/organisations/{oid}/approve", headers=op)).status_code == 200
    await email_service.drain()
    assert called == []


async def test_approving_an_organisation_emails_its_admin_once(client, db, outbox):
    op = await token_for(client, db, "operator@example.com", UserRole.admin, platform_admin=True)
    await client.post("/auth/register-organisation", json={
        "organisation_name": "Sunrise Clinic", "organisation_type": "clinic", "state": "Lagos",
        "phone_number": "08012345678", "full_name": "Ada Obi", "email": "ada@sunrise.example.com",
        "password": PW})
    oid = (await client.get("/platform/organisations?status=pending", headers=op)).json()[0]["id"]
    await email_service.drain()
    assert outbox == []  # registering sends nothing: nobody is approved yet
    assert (await client.post(f"/platform/organisations/{oid}/approve", headers=op)).status_code == 200
    await email_service.drain()
    assert len(outbox) == 1
    mail = outbox[0]
    assert mail["to"] == "ada@sunrise.example.com" and "approved" in mail["subject"].lower()
    assert "Ada Obi" in mail["body"] and "Sunrise Clinic" in mail["body"]
    assert get_settings().frontend_url.rstrip("/") + "/login" in mail["body"]
    assert PW not in mail["body"]
    # approving again (or reinstating) does not send it again
    await client.post(f"/platform/organisations/{oid}/approve", headers=op)
    await email_service.drain()
    assert len(outbox) == 1


async def test_approving_a_member_emails_them(client, db, outbox):
    admin = await token_for(client, db, "boss@example.com", UserRole.admin)  # default organisation
    await client.post("/auth/register", json={
        "email": "newbie@example.com", "full_name": "New Bie", "password": PW})
    pending = (await client.get("/admin/users?status=pending", headers=admin)).json()
    uid = next(u["id"] for u in pending if u["email"] == "newbie@example.com")
    await email_service.drain()
    assert outbox == []
    assert (await client.post(f"/admin/users/{uid}/approve", headers=admin)).status_code == 200
    await email_service.drain()
    assert [m["to"] for m in outbox] == ["newbie@example.com"]
    assert "New Bie" in outbox[0]["body"] and "approved" in outbox[0]["subject"].lower()
    await client.post(f"/admin/users/{uid}/approve", headers=admin)  # approving twice
    await email_service.drain()
    assert len(outbox) == 1


async def test_a_mail_failure_never_breaks_the_approval(client, db, monkeypatch):
    async def boom(*a):
        raise RuntimeError("smtp is down")

    monkeypatch.setattr(get_settings(), "email_backend", "smtp")
    monkeypatch.setattr(email_service, "deliver", boom)
    admin = await token_for(client, db, "boss@example.com", UserRole.admin)
    await client.post("/auth/register", json={
        "email": "newbie@example.com", "full_name": "New Bie", "password": PW})
    uid = (await client.get("/admin/users?status=pending", headers=admin)).json()[0]["id"]
    r = await client.post(f"/admin/users/{uid}/approve", headers=admin)
    assert r.status_code == 200 and r.json()["is_approved"] is True
    await email_service.drain()  # the failure is only logged
    assert (await login(client, "newbie@example.com")).status_code == 200


async def test_smtp_delivery_uses_starttls_login_and_the_configured_sender(monkeypatch):
    calls = []

    class FakeSMTP:
        def __init__(self, host, port, timeout=None):
            calls.append(("connect", host, port))

        def starttls(self):
            calls.append(("starttls",))

        def login(self, user, password):
            calls.append(("login", user, password))

        def send_message(self, msg):
            calls.append(("send", msg["From"], msg["To"], msg["Subject"]))

        def quit(self):
            calls.append(("quit",))

    s = get_settings()
    for name, value in dict(
        email_backend="smtp", smtp_host="smtp.example.com", smtp_port=587,
        smtp_username="user", email_from="MediScan <no-reply@example.com>",
        smtp_security="starttls",
    ).items():
        monkeypatch.setattr(s, name, value)
    from pydantic import SecretStr
    monkeypatch.setattr(s, "smtp_password", SecretStr("s3cret"))
    monkeypatch.setattr(smtplib, "SMTP", FakeSMTP)
    await email_service.deliver("a@example.com", "Hello", "Body")
    assert calls == [
        ("connect", "smtp.example.com", 587), ("starttls",), ("login", "user", "s3cret"),
        ("send", "MediScan <no-reply@example.com>", "a@example.com", "Hello"), ("quit",),
    ]


def test_smtp_needs_a_host_and_a_sender():
    base = dict(_env_file=None, database_url="sqlite+aiosqlite:///:memory:", jwt_secret_key="x" * 40)
    with pytest.raises(ValueError):
        Settings(**base, email_backend="smtp")
    with pytest.raises(ValueError):
        Settings(**base, email_backend="smtp", smtp_host="smtp.example.com")  # no sender
    ok = Settings(**base, email_backend="smtp", smtp_host="smtp.example.com",
                  email_from="no-reply@example.com")
    assert ok.email_backend == "smtp"
    assert Settings(**base).email_backend == "disabled"  # off unless asked for
