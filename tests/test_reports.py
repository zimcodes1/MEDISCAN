"""Structured reports: draft, finalise, immutability, scoping, privacy."""
import asyncio
import logging

import pytest
from sqlmodel import select

import uuid

from sqlalchemy import text

from backend.models import AuditLog, Patient, Report, UserRole
from tests.helpers import create_patient, make_org, me_id, predict_saved, token_for

REPORT_KEYS = {
    "id", "scan_id", "author", "status", "lung_fields", "affected_side", "severity",
    "detailed_findings", "primary_impression", "secondary_findings", "impression_narrative",
    "recommended_action", "follow_up_timeframe", "follow_up_unit", "additional_notes",
    "ai_agreement", "ai_disagreement_reason", "created_at", "updated_at", "finalised_at",
}
READY = {  # everything finalise needs
    "primary_impression": "pneumonia-bacterial", "recommended_action": "follow-up-xray",
    "ai_agreement": "agree",
}
SECRET = "ZEBRA-QUOKKA-9912"  # marker for "this text must never be logged"


@pytest.fixture
async def team(client, db):
    t = type("Team", (), {})()
    t.org_a, t.org_b = await make_org(db, "Org A"), await make_org(db, "Org B")
    t.doc = await token_for(client, db, "doc@example.com", org=t.org_a, full_name="Dr Doc")
    t.rad = await token_for(client, db, "rad@example.com", UserRole.radiologist, t.org_a, "Dr Rad")
    t.other = await token_for(client, db, "other@example.com", org=t.org_b, full_name="Dr Other")
    t.doc_id, t.rad_id = await me_id(client, t.doc), await me_id(client, t.rad)
    t.patient = await create_patient(client, t.doc)
    t.scan = (await predict_saved(client, t.doc, t.patient))["scan_id"]
    return t


def url(scan, suffix=""):
    return f"/scans/{scan}/report{suffix}"


# ------------------------------------------------------------------- drafts
async def test_no_report_yet_is_404(client, team):
    assert (await client.get(url(team.scan), headers=team.doc)).status_code == 404


async def test_first_save_creates_draft_with_contract_shape(client, team):
    r = await client.put(url(team.scan), headers=team.doc,
                         json={"lung_fields": ["consolidation", "increased-opacity"],
                               "affected_side": "left", "severity": "moderate",
                               "detailed_findings": "Left lower zone opacity."})
    assert r.status_code == 200
    body = r.json()
    assert set(body) == REPORT_KEYS
    assert body["status"] == "draft" and body["finalised_at"] is None
    assert body["author"] == {"id": team.doc_id, "full_name": "Dr Doc"}
    assert body["scan_id"] == team.scan
    assert body["lung_fields"] == ["consolidation", "increased-opacity"]
    assert body["primary_impression"] is None and body["secondary_findings"] == ""
    assert (await client.get(url(team.scan), headers=team.rad)).json()["id"] == body["id"]


async def test_empty_body_creates_an_empty_draft(client, team):
    r = await client.put(url(team.scan), headers=team.doc, json={})
    assert r.status_code == 200 and r.json()["lung_fields"] == []


async def test_save_only_changes_the_fields_sent(client, team):
    await client.put(url(team.scan), headers=team.doc, json={
        "severity": "mild", "detailed_findings": "keep me", "lung_fields": ["clear"]})
    body = (await client.put(url(team.scan), headers=team.doc,
                             json={"affected_side": "right"})).json()
    assert body["affected_side"] == "right"
    assert (body["severity"], body["detailed_findings"], body["lung_fields"]) == ("mild", "keep me", ["clear"])


async def test_null_clears_nullable_fields_and_resets_text(client, team):
    await client.put(url(team.scan), headers=team.doc, json={
        "severity": "severe", "additional_notes": "temp", "follow_up_timeframe": 3,
        "follow_up_unit": "weeks"})
    body = (await client.put(url(team.scan), headers=team.doc, json={
        "severity": None, "additional_notes": None, "follow_up_timeframe": None})).json()
    assert body["severity"] is None and body["additional_notes"] == ""
    assert body["follow_up_timeframe"] is None and body["follow_up_unit"] == "weeks"


async def test_lung_fields_are_replaced_and_deduplicated(client, team):
    await client.put(url(team.scan), headers=team.doc, json={"lung_fields": ["clear", "other"]})
    body = (await client.put(url(team.scan), headers=team.doc, json={
        "lung_fields": ["consolidation", "consolidation", "other"]})).json()
    assert body["lung_fields"] == ["consolidation", "other"]
    assert (await client.put(url(team.scan), headers=team.doc, json={"lung_fields": []})).json()["lung_fields"] == []


async def test_null_lung_fields_means_none_selected(client, db, team):
    await client.put(url(team.scan), headers=team.doc, json={"lung_fields": ["clear"]})
    r = await client.put(url(team.scan), headers=team.doc, json={"lung_fields": None})
    assert r.status_code == 200 and r.json()["lung_fields"] == []
    async with db() as s:  # stored as an empty list, never a JSON null
        assert (await s.exec(select(Report))).one().lung_fields == []
    first = await client.put(url(team.scan), headers=team.rad, json={"lung_fields": None})
    assert first.status_code == 200


async def test_colleague_can_edit_the_draft_but_author_stays(client, team):
    await client.put(url(team.scan), headers=team.doc, json={"severity": "mild"})
    body = (await client.put(url(team.scan), headers=team.rad, json={"severity": "severe"})).json()
    assert body["severity"] == "severe" and body["author"]["id"] == team.doc_id


@pytest.mark.parametrize("payload", [
    {"lung_fields": ["nope"]}, {"affected_side": "up"}, {"severity": "huge"},
    {"primary_impression": "flu"}, {"recommended_action": "pray"},
    {"follow_up_unit": "years"}, {"ai_agreement": "maybe"},
    {"follow_up_timeframe": 0}, {"follow_up_timeframe": 1000}, {"follow_up_timeframe": "soon"},
    {"detailed_findings": "x" * 5001}, {"additional_notes": "x" * 5001},
])
async def test_invalid_fields_are_422(client, team, payload):
    assert (await client.put(url(team.scan), headers=team.doc, json=payload)).status_code == 422


async def test_text_at_the_limit_is_accepted(client, team):
    r = await client.put(url(team.scan), headers=team.doc, json={"detailed_findings": "x" * 5000})
    assert r.status_code == 200


async def test_unknown_fields_cannot_set_status_or_ownership(client, team):
    other_org = str(team.org_b.id)
    r = await client.put(url(team.scan), headers=team.doc, json={
        "status": "final", "author": {"id": team.rad_id}, "organisation_id": other_org,
        "finalised_at": "2026-01-01T00:00:00Z"})
    body = r.json()
    assert r.status_code == 200 and body["status"] == "draft"
    assert body["author"]["id"] == team.doc_id and body["finalised_at"] is None


async def test_two_simultaneous_first_saves_make_one_report(client, db, team):
    a, b = await asyncio.gather(
        client.put(url(team.scan), headers=team.doc, json={"severity": "mild"}),
        client.put(url(team.scan), headers=team.rad, json={"affected_side": "left"}),
    )
    assert a.status_code == 200 and b.status_code == 200
    async with db() as s:
        assert len((await s.exec(select(Report))).all()) == 1


# ----------------------------------------------------------------- finalise
async def test_finalise_without_a_report_is_404(client, team):
    assert (await client.post(url(team.scan, "/finalise"), headers=team.doc)).status_code == 404


async def test_finalise_lists_what_is_missing(client, team):
    await client.put(url(team.scan), headers=team.doc, json={})
    r = await client.post(url(team.scan, "/finalise"), headers=team.doc)
    assert r.status_code == 422
    assert r.json()["detail"] == "Missing: primary_impression, recommended_action, ai_agreement"
    assert (await client.get(url(team.scan), headers=team.doc)).json()["status"] == "draft"


@pytest.mark.parametrize("agreement", ["disagree", "partially-agree"])
async def test_disagreement_needs_a_reason(client, team, agreement):
    await client.put(url(team.scan), headers=team.doc, json={**READY, "ai_agreement": agreement})
    r = await client.post(url(team.scan, "/finalise"), headers=team.doc)
    assert r.status_code == 422 and r.json()["detail"] == "Missing: ai_disagreement_reason"
    await client.put(url(team.scan), headers=team.doc, json={"ai_disagreement_reason": "   "})
    assert (await client.post(url(team.scan, "/finalise"), headers=team.doc)).status_code == 422
    await client.put(url(team.scan), headers=team.doc, json={"ai_disagreement_reason": "Not a nodule"})
    assert (await client.post(url(team.scan, "/finalise"), headers=team.doc)).status_code == 200


async def test_finalise_locks_the_report_and_marks_the_scan_reviewed(client, team):
    await client.put(url(team.scan), headers=team.doc, json=READY)
    r = await client.post(url(team.scan, "/finalise"), headers=team.rad)
    body = r.json()
    assert r.status_code == 200 and body["status"] == "final" and body["finalised_at"]
    assert body["author"]["id"] == team.doc_id  # author is whoever started the report
    scan = (await client.get(f"/scans/{team.scan}", headers=team.doc)).json()
    assert scan["review_status"] == "reviewed" and scan["reviewed_at"]
    assert scan["reviewed_by"]["id"] == team.rad_id  # whoever finalised it
    feed = (await client.get("/activity", headers=team.doc)).json()
    done = [a for a in feed if a["type"] == "report_finalised"]
    assert len(done) == 1 and done[0]["actor"]["id"] == team.rad_id and done[0]["scan_id"] == team.scan
    assert not [a for a in feed if a["type"] == "scan_reviewed"]  # one event, not two


async def test_finalise_keeps_an_earlier_reviewer(client, team):
    await client.patch(f"/scans/{team.scan}", headers=team.doc, json={"review_status": "reviewed"})
    await client.put(url(team.scan), headers=team.rad, json=READY)
    await client.post(url(team.scan, "/finalise"), headers=team.rad)
    scan = (await client.get(f"/scans/{team.scan}", headers=team.doc)).json()
    assert scan["reviewed_by"]["id"] == team.doc_id


async def test_final_report_is_immutable(client, team):
    await client.put(url(team.scan), headers=team.doc, json={**READY, "detailed_findings": "orig"})
    final = (await client.post(url(team.scan, "/finalise"), headers=team.doc)).json()
    assert (await client.put(url(team.scan), headers=team.doc, json={"detailed_findings": "edit"})).status_code == 409
    assert (await client.put(url(team.scan), headers=team.rad, json={})).status_code == 409
    assert (await client.post(url(team.scan, "/finalise"), headers=team.doc)).status_code == 409
    again = (await client.get(url(team.scan), headers=team.doc)).json()
    # (SQLite drops the timezone marker on re-read; Postgres keeps it)
    assert again["detailed_findings"] == "orig"
    assert again["updated_at"].rstrip("Z") == final["updated_at"].rstrip("Z")


async def test_scan_cannot_be_un_reviewed_once_a_report_is_final(client, team):
    await client.put(url(team.scan), headers=team.doc, json=READY)
    await client.post(url(team.scan, "/finalise"), headers=team.doc)
    r = await client.patch(f"/scans/{team.scan}", headers=team.doc, json={"review_status": "pending"})
    assert r.status_code == 409
    assert (await client.get(f"/scans/{team.scan}", headers=team.doc)).json()["review_status"] == "reviewed"


async def test_draft_report_does_not_block_un_reviewing(client, team):
    await client.patch(f"/scans/{team.scan}", headers=team.doc, json={"review_status": "reviewed"})
    await client.put(url(team.scan), headers=team.doc, json=READY)  # still a draft
    r = await client.patch(f"/scans/{team.scan}", headers=team.doc, json={"review_status": "pending"})
    assert r.status_code == 200


# ---------------------------------------------------------------- isolation
async def test_other_organisation_sees_nothing(client, team):
    await client.put(url(team.scan), headers=team.doc, json=READY)
    for call in (
        client.get(url(team.scan), headers=team.other),
        client.put(url(team.scan), headers=team.other, json={"severity": "mild"}),
        client.post(url(team.scan, "/finalise"), headers=team.other),
    ):
        assert (await call).status_code == 404
    assert (await client.get("/reports", headers=team.other)).json() == []
    assert (await client.get(url(team.scan), headers=team.doc)).json()["severity"] is None  # untouched


async def test_report_org_comes_from_the_scan(client, db, team):
    await client.put(url(team.scan), headers=team.rad, json={})
    async with db() as s:
        assert (await s.exec(select(Report))).one().organisation_id == team.org_a.id


# --------------------------------------------------------------------- list
async def test_report_list(client, db, team):
    p2 = await create_patient(client, team.doc)
    scan2 = (await predict_saved(client, team.doc, p2))["scan_id"]
    await client.put(url(team.scan), headers=team.doc, json=READY)
    await client.post(url(team.scan, "/finalise"), headers=team.doc)
    await client.put(url(scan2), headers=team.rad, json={"primary_impression": "normal"})

    rows = (await client.get("/reports", headers=team.doc)).json()
    assert [r["scan_id"] for r in rows] == [scan2, team.scan]  # most recently updated first
    assert set(rows[0]) == {"id", "scan_id", "patient_code", "status", "author",
                            "primary_impression", "created_at", "updated_at", "finalised_at"}
    assert rows[0]["status"] == "draft" and rows[0]["primary_impression"] == "normal"
    assert rows[0]["author"] == {"id": team.rad_id, "full_name": "Dr Rad"}
    async with db() as s:
        codes = {str(p.id): p.patient_code for p in (await s.exec(select(Patient))).all()}
    assert rows[0]["patient_code"] == codes[p2] and rows[1]["patient_code"] == codes[team.patient]

    assert [r["scan_id"] for r in (await client.get("/reports?status=final", headers=team.doc)).json()] == [team.scan]
    assert [r["scan_id"] for r in (await client.get("/reports?status=draft", headers=team.doc)).json()] == [scan2]
    assert len((await client.get("/reports?limit=1", headers=team.doc)).json()) == 1
    assert len((await client.get("/reports?limit=1&offset=1", headers=team.doc)).json()) == 1
    assert (await client.get("/reports?status=other", headers=team.doc)).status_code == 422
    assert (await client.get("/reports")).status_code in (401, 403)


# ------------------------------------------------------------------ privacy
async def test_report_text_never_reaches_logs_audit_or_feed(client, db, team, caplog):
    caplog.set_level(logging.DEBUG)
    payload = {**READY, "detailed_findings": SECRET, "additional_notes": SECRET,
               "impression_narrative": SECRET, "secondary_findings": SECRET,
               "ai_agreement": "disagree", "ai_disagreement_reason": SECRET}
    await client.put(url(team.scan), headers=team.doc, json=payload)
    await client.get(url(team.scan), headers=team.rad)
    await client.post(url(team.scan, "/finalise"), headers=team.doc)
    await client.get("/reports", headers=team.doc)

    # (the aiosqlite test driver logs its own parameters at DEBUG; production uses asyncpg)
    logged = "\n".join(r.getMessage() for r in caplog.records if r.name != "aiosqlite")
    assert "/report" in logged  # the requests really were logged
    assert SECRET not in logged
    assert SECRET not in str((await client.get("/activity", headers=team.doc)).json())
    async with db() as s:
        audit = (await s.exec(select(AuditLog))).all()
    assert {"report.save", "report.view", "report.finalise"} <= {a.action for a in audit}
    assert SECRET not in str([a.__dict__ for a in audit])


# ------------------------------------------------------------------ cascade
async def test_deleting_a_patient_removes_their_reports(client, db, team):
    await client.put(url(team.scan), headers=team.doc, json=READY)
    async with db() as s:
        await s.execute(text("PRAGMA foreign_keys=ON"))  # SQLite leaves cascades off by default
        await s.execute(Patient.__table__.delete().where(Patient.id == uuid.UUID(team.patient)))
        await s.commit()
        assert (await s.exec(select(Report))).all() == []


async def test_real_engine_logs_statements_but_never_their_values(monkeypatch, caplog):
    """With DEBUG on, SQLAlchemy echoes SQL. The production engine factory must hide
    the bound values, which hold patient data (notes, report text)."""
    from sqlalchemy import text
    from sqlmodel import SQLModel

    from backend.core import database

    monkeypatch.setattr(database.settings, "debug", True)  # echo every statement
    eng = database._build_engine()  # the real factory, pointed at the throwaway test DB
    caplog.set_level(logging.INFO, logger="sqlalchemy.engine")
    try:
        async with eng.begin() as conn:
            await conn.run_sync(SQLModel.metadata.create_all)
            await conn.execute(
                text("INSERT INTO organisations (id, name, type, status, created_at) "
                     "VALUES (:i, :n, 'clinic', 'active', :t)"),
                {"i": uuid.uuid4().hex, "n": SECRET, "t": "2026-01-01 00:00:00"},
            )
            await conn.execute(text("SELECT id FROM organisations WHERE name = :n"), {"n": SECRET})
    finally:
        await eng.dispose()
    logged = "\n".join(r.getMessage() for r in caplog.records if r.name.startswith("sqlalchemy"))
    assert "INSERT INTO organisations" in logged  # statements are logged...
    assert SECRET not in logged  # ...their values are not
