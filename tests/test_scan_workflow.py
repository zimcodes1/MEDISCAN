"""Scan workflow: clinical fields on upload, PATCH, review state, filters."""
import uuid

import pytest
from sqlmodel import select

from backend.models import Activity, Organisation, UserRole
from tests.helpers import (
    create_patient, make_org, make_scan, make_user, me_id, png_bytes, predict_saved,
    token_for, upload,
)


@pytest.fixture
async def team(client, db):
    """Org A: a clinician (uploader), a radiologist, an admin. Org B: one clinician."""
    t = type("Team", (), {})()
    t.org_a, t.org_b = await make_org(db, "Org A"), await make_org(db, "Org B")
    t.doc = await token_for(client, db, "doc@example.com", org=t.org_a, full_name="Dr Doc")
    t.rad = await token_for(client, db, "rad@example.com", UserRole.radiologist, t.org_a, "Dr Rad")
    t.admin = await token_for(client, db, "admin@example.com", UserRole.admin, t.org_a, "Ada Admin")
    t.other = await token_for(client, db, "other@example.com", org=t.org_b, full_name="Dr Other")
    t.doc_id, t.rad_id = await me_id(client, t.doc), await me_id(client, t.rad)
    t.other_id = await me_id(client, t.other)
    t.patient = await create_patient(client, t.doc)
    return t


async def post_predict(client, headers, patient_id=None, **data):
    d = {k: v for k, v in data.items()}
    if patient_id:
        d["patient_id"] = patient_id
    return await client.post("/predict", headers=headers, files=upload(png_bytes(3)), data=d)


# ------------------------------------------------------------ defaults + upload
async def test_plain_upload_has_workflow_defaults(client, team):
    sid = (await predict_saved(client, team.doc, team.patient))["scan_id"]
    body = (await client.get(f"/scans/{sid}", headers=team.rad)).json()
    assert body["priority"] == "routine" and body["review_status"] == "pending"
    assert body["projection"] is None and body["exam_date"] is None
    assert body["clinical_notes"] is None and body["assigned_to"] is None
    assert body["reviewed_at"] is None and body["reviewed_by"] is None
    assert body["uploaded_by"] == {"id": team.doc_id, "full_name": "Dr Doc"}
    assert isinstance(body["is_flagged"], bool)
    assert all("flagged" in f for f in body["findings"])


async def test_upload_with_clinical_fields(client, team):
    r = await post_predict(
        client, team.doc, team.patient, priority="urgent", projection="pa",
        exam_date="2026-10-20", clinical_notes="Cough for two weeks", assigned_to_id=team.rad_id,
    )
    assert r.status_code == 200 and r.json()["saved"]
    body = (await client.get(f"/scans/{r.json()['scan_id']}", headers=team.doc)).json()
    assert body["priority"] == "urgent" and body["projection"] == "pa"
    assert body["exam_date"] == "2026-10-20"
    assert body["clinical_notes"] == "Cough for two weeks"
    assert body["assigned_to"] == {"id": team.rad_id, "full_name": "Dr Rad"}


async def test_blank_optional_fields_count_as_missing(client, team):
    r = await post_predict(client, team.doc, team.patient, priority="", projection="",
                           exam_date="", clinical_notes="", assigned_to_id="")
    assert r.status_code == 200
    body = (await client.get(f"/scans/{r.json()['scan_id']}", headers=team.doc)).json()
    assert body["priority"] == "routine" and body["assigned_to"] is None


@pytest.mark.parametrize("field,value", [
    ("priority", "high"), ("projection", "oblique"), ("exam_date", "yesterday"),
    ("assigned_to_id", "not-a-uuid"), ("clinical_notes", "x" * 2001),
])
async def test_invalid_clinical_fields_are_422(client, team, field, value):
    assert (await post_predict(client, team.doc, team.patient, **{field: value})).status_code == 422
    # still validated when nothing would be saved
    assert (await post_predict(client, team.doc, **{field: value})).status_code == 422


async def test_clinical_fields_are_ignored_without_a_patient(client, team):
    r = await post_predict(client, team.doc, priority="urgent", assigned_to_id=team.rad_id)
    assert r.status_code == 200 and r.json()["saved"] is False


async def test_notes_at_the_limit_are_accepted(client, team):
    assert (await post_predict(client, team.doc, team.patient, clinical_notes="x" * 2000)).status_code == 200


async def test_assignee_must_be_approved_active_and_in_the_org(client, db, team):
    pending = await make_user(db, "pending@example.com", approved=False, org=team.org_a)
    gone = await make_user(db, "gone@example.com", active=False, org=team.org_a)
    for bad in (team.other_id, str(pending.id), str(gone.id), str(uuid.uuid4())):
        r = await post_predict(client, team.doc, team.patient, assigned_to_id=bad)
        assert r.status_code == 422, bad


# --------------------------------------------------------------------- activity
async def test_upload_writes_feed_entries(client, team):
    await post_predict(client, team.doc, team.patient, assigned_to_id=team.rad_id,
                       clinical_notes="SECRET NOTE TEXT")
    feed = (await client.get("/activity", headers=team.rad)).json()
    assert [a["type"] for a in feed] == ["scan_assigned", "scan_uploaded"] or \
           {a["type"] for a in feed} == {"scan_assigned", "scan_uploaded"}
    assert all(a["actor"]["id"] == team.doc_id for a in feed)
    assert all("SECRET NOTE TEXT" not in a["message"] for a in feed)  # no clinical content


# ------------------------------------------------------------------------ PATCH
async def test_patch_priority_and_assignment(client, team):
    sid = (await predict_saved(client, team.doc, team.patient))["scan_id"]
    r = await client.patch(f"/scans/{sid}", headers=team.admin,
                           json={"priority": "urgent", "assigned_to_id": team.rad_id})
    assert r.status_code == 200
    assert r.json()["priority"] == "urgent" and r.json()["assigned_to"]["id"] == team.rad_id
    r = await client.patch(f"/scans/{sid}", headers=team.admin, json={"assigned_to_id": None})
    assert r.json()["assigned_to"] is None and r.json()["priority"] == "urgent"


async def test_patch_validation(client, team):
    sid = (await predict_saved(client, team.doc, team.patient))["scan_id"]
    for body in ({}, {"priority": None}, {"review_status": None}, {"priority": "high"},
                 {"review_status": "done"}, {"assigned_to_id": "nope"}):
        assert (await client.patch(f"/scans/{sid}", headers=team.doc, json=body)).status_code == 422, body
    assert (await client.patch(f"/scans/{sid}", headers=team.doc,
                               json={"assigned_to_id": team.other_id})).status_code == 422


async def test_review_records_who_and_when_and_first_review_wins(client, team):
    sid = (await predict_saved(client, team.doc, team.patient))["scan_id"]
    r = await client.patch(f"/scans/{sid}", headers=team.doc, json={"review_status": "reviewed"})
    body = r.json()
    assert body["review_status"] == "reviewed" and body["reviewed_at"]
    assert body["reviewed_by"] == {"id": team.doc_id, "full_name": "Dr Doc"}
    first_at = body["reviewed_at"]
    again = (await client.patch(f"/scans/{sid}", headers=team.rad,
                                json={"review_status": "reviewed"})).json()
    # (SQLite drops the timezone marker on re-read; Postgres keeps it)
    assert again["reviewed_by"]["id"] == team.doc_id
    assert again["reviewed_at"].rstrip("Z") == first_at.rstrip("Z")
    reviews = [a for a in (await client.get("/activity", headers=team.doc)).json()
               if a["type"] == "scan_reviewed"]
    assert len(reviews) == 1


async def test_back_to_pending_clears_review(client, team):
    sid = (await predict_saved(client, team.doc, team.patient))["scan_id"]
    await client.patch(f"/scans/{sid}", headers=team.doc, json={"review_status": "reviewed"})
    body = (await client.patch(f"/scans/{sid}", headers=team.doc,
                               json={"review_status": "pending"})).json()
    assert body["review_status"] == "pending"
    assert body["reviewed_at"] is None and body["reviewed_by"] is None


async def test_reassigning_to_same_person_adds_no_second_feed_entry(client, team):
    sid = (await predict_saved(client, team.doc, team.patient))["scan_id"]
    for _ in range(2):
        await client.patch(f"/scans/{sid}", headers=team.doc, json={"assigned_to_id": team.rad_id})
    feed = (await client.get("/activity", headers=team.doc)).json()
    assert sum(a["type"] == "scan_assigned" for a in feed) == 1


async def test_patch_other_org_scan_is_404_and_changes_nothing(client, team):
    sid = (await predict_saved(client, team.doc, team.patient))["scan_id"]
    r = await client.patch(f"/scans/{sid}", headers=team.other, json={"priority": "urgent"})
    assert r.status_code == 404
    assert (await client.get(f"/scans/{sid}", headers=team.doc)).json()["priority"] == "routine"


# ---------------------------------------------------------------------- filters
async def test_list_filters(client, db, team):
    org = team.org_a.id
    p = team.patient
    s_urgent = await make_scan(db, org_id=org, patient_id=p, uploader_id=uuid.UUID(team.doc_id),
                               scores={"Pneumonia": 0.9}, priority="urgent",
                               assigned_to_id=uuid.UUID(team.rad_id))
    s_done = await make_scan(db, org_id=org, patient_id=p, uploader_id=uuid.UUID(team.doc_id),
                             scores={"Pneumonia": 0.1}, review_status="reviewed")
    s_low = await make_scan(db, org_id=org, patient_id=p, uploader_id=uuid.UUID(team.doc_id),
                            scores={"Pneumonia": 0.1})

    async def ids(query, headers=None):
        r = await client.get(f"/scans{query}", headers=headers or team.doc)
        assert r.status_code == 200, r.text
        return {s["id"] for s in r.json()}

    assert await ids("") == {s_urgent, s_done, s_low}
    assert await ids("?priority=urgent") == {s_urgent}
    assert await ids("?review_status=reviewed") == {s_done}
    assert await ids("?review_status=pending") == {s_urgent, s_low}
    assert await ids(f"?assigned_to_id={team.rad_id}") == {s_urgent}
    assert await ids("?assigned_to_id=me", team.rad) == {s_urgent}
    assert await ids("?assigned_to_id=me") == set()
    assert await ids("?flagged=true") == {s_urgent}
    assert await ids("?flagged=false") == {s_done, s_low}
    assert await ids("?review_status=pending&flagged=true") == {s_urgent}
    assert await ids("?assigned_to_id=") == {s_urgent, s_done, s_low}  # blank = no filter
    assert await ids("", team.other) == set()
    for bad in ("?priority=high", "?review_status=x", "?assigned_to_id=zzz", "?flagged=maybe"):
        assert (await client.get(f"/scans{bad}", headers=team.doc)).status_code == 422, bad


async def test_filter_by_patient_still_404s_across_orgs(client, team):
    assert (await client.get(f"/scans?patient_id={team.patient}", headers=team.other)).status_code == 404
