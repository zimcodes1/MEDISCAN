"""Invitations: create, list, delete, accept."""
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from sqlmodel import select

from backend.core import security
from backend.core.config import get_settings
from backend.models import Activity, Invite, User, UserRole
from tests.helpers import PW, create_patient, login, make_org, make_user, token_for


@pytest.fixture
async def world(client, db):
    w = type("World", (), {})()
    w.org, w.other = await make_org(db, "Org A"), await make_org(db, "Org B")
    w.admin = await token_for(client, db, "admin@example.com", UserRole.admin, w.org, "Ada Admin")
    w.clin = await token_for(client, db, "clin@example.com", org=w.org)
    w.other_admin = await token_for(client, db, "oadmin@example.com", UserRole.admin, w.other)
    return w


async def invite(client, headers, email="new@example.com", role="radiologist"):
    return await client.post("/org/invites", headers=headers, json={"email": email, "role": role})


async def accept(client, token, name="New Person", password=PW):
    return await client.post("/auth/accept-invite",
                             json={"token": token, "full_name": name, "password": password})


# ------------------------------------------------------------------- create
async def test_create_returns_the_link_once_and_stores_only_a_hash(client, db, world):
    r = await invite(client, world.admin)
    assert r.status_code == 201
    body = r.json()
    assert set(body) == {"id", "email", "role", "job_title", "token", "invite_url", "expires_at"}
    assert body["email"] == "new@example.com" and body["role"] == "radiologist"
    base = get_settings().frontend_url.rstrip("/")
    assert body["invite_url"] == f"{base}/staff/accept-invite?token={body['token']}&email=new%40example.com"
    async with db() as s:
        row = (await s.exec(select(Invite))).one()
    assert row.token_hash == security.hash_token(body["token"]) != body["token"]
    assert body["token"] not in str(row.__dict__)
    expires = datetime.fromisoformat(body["expires_at"].replace("Z", "+00:00"))
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    assert timedelta(days=6.9) < expires - datetime.now(timezone.utc) < timedelta(days=7.1)


async def test_email_is_normalised(client, world):
    r = await invite(client, world.admin, email="  Mixed.Case@Example.COM ")
    assert r.status_code == 201 and r.json()["email"] == "mixed.case@example.com"


@pytest.mark.parametrize("role", ["admin", "clinician", "radiologist"])
async def test_each_role_can_be_invited(client, world, role):
    assert (await invite(client, world.admin, role=role)).status_code == 201


@pytest.mark.parametrize("payload", [
    {"email": "x@example.com", "role": "janitor"}, {"email": "nope", "role": "clinician"},
    {"email": "x@example.com"}, {"role": "clinician"},
])
async def test_create_validation(client, world, payload):
    assert (await client.post("/org/invites", headers=world.admin, json=payload)).status_code == 422


async def test_only_admins_manage_invites(client, world):
    created = (await invite(client, world.admin)).json()
    for call in (
        invite(client, world.clin),
        client.get("/org/invites", headers=world.clin),
        client.delete(f"/org/invites/{created['id']}", headers=world.clin),
    ):
        assert (await call).status_code == 403
    assert (await client.get("/org/invites")).status_code in (401, 403)


async def test_cannot_invite_an_existing_account_or_a_pending_invite(client, db, world):
    first = await invite(client, world.admin, email="dup@example.com")
    assert (await invite(client, world.admin, email="dup@example.com")).status_code == 409
    # an account that already exists, in this or any other organisation
    for email in ("clin@example.com", "oadmin@example.com"):
        r = await invite(client, world.admin, email=email)
        assert r.status_code == 409 and r.json()["detail"] == "This email address can't be invited"
    # an expired invitation does not block a new one
    async with db() as s:
        row = await s.get(Invite, uuid.UUID(first.json()["id"]))
        row.expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
        await s.commit()
    assert (await invite(client, world.admin, email="dup@example.com")).status_code == 201


# --------------------------------------------------------------------- list
async def test_list_is_scoped_and_shows_status(client, db, world):
    live = (await invite(client, world.admin, email="a@example.com")).json()
    old = (await invite(client, world.admin, email="b@example.com")).json()
    await invite(client, world.other_admin, email="c@example.com")
    async with db() as s:
        row = await s.get(Invite, uuid.UUID(old["id"]))
        row.expires_at = datetime.now(timezone.utc) - timedelta(hours=1)
        await s.commit()
    rows = (await client.get("/org/invites", headers=world.admin)).json()
    assert {r["email"]: r["status"] for r in rows} == {"a@example.com": "pending", "b@example.com": "expired"}
    assert all("token" not in r and "token_hash" not in r for r in rows)
    assert set(rows[0]) == {"id", "email", "role", "job_title", "created_at", "expires_at", "status"}
    assert live["id"] in {r["id"] for r in rows}


async def test_delete_invalidates_the_link_and_is_scoped(client, world):
    made = (await invite(client, world.admin)).json()
    assert (await client.delete(f"/org/invites/{made['id']}", headers=world.other_admin)).status_code == 404
    assert (await client.delete(f"/org/invites/{made['id']}", headers=world.admin)).status_code == 204
    assert (await client.delete(f"/org/invites/{made['id']}", headers=world.admin)).status_code == 404
    assert (await client.get("/org/invites", headers=world.admin)).json() == []
    assert (await accept(client, made["token"])).status_code == 404


# ------------------------------------------------------------------- accept
async def test_accepting_creates_an_approved_member_who_can_sign_in(client, db, world):
    made = (await invite(client, world.admin, email="rad@example.com", role="radiologist")).json()
    r = await accept(client, made["token"], name="Dr Rad Person")
    assert r.status_code == 201
    body = r.json()
    assert body["email"] == "rad@example.com" and body["role"] == "radiologist"
    assert body["is_approved"] is True and body["is_active"] is True
    assert "hashed_password" not in body

    token = (await login(client, "rad@example.com")).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    me = (await client.get("/auth/me", headers=headers)).json()
    assert me["organisation"]["name"] == "Org A" and me["full_name"] == "Dr Rad Person"
    assert (await client.get("/org/invites", headers=world.admin)).json() == []  # used up
    # a member of this organisation, and only this one
    mine = await create_patient(client, world.admin)
    assert (await client.get(f"/patients/{mine}", headers=headers)).status_code == 200
    theirs = await create_patient(client, world.other_admin)
    assert (await client.get(f"/patients/{theirs}", headers=headers)).status_code == 404
    async with db() as s:
        joined = (await s.exec(select(Activity).where(Activity.type == "user_joined"))).all()
    assert len(joined) == 1 and joined[0].message == "Joined the organisation"


async def test_an_invitation_works_once(client, world):
    made = (await invite(client, world.admin)).json()
    assert (await accept(client, made["token"])).status_code == 201
    again = await accept(client, made["token"], name="Someone Else")
    assert again.status_code == 404 and again.json()["detail"] == "Invalid or expired invitation"


async def test_every_failure_looks_the_same(client, db, world):
    made = (await invite(client, world.admin)).json()
    async with db() as s:
        row = await s.get(Invite, uuid.UUID(made["id"]))
        row.expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
        await s.commit()
    expired = await accept(client, made["token"])
    unknown = await accept(client, "x" * 43)
    assert expired.status_code == unknown.status_code == 404
    assert expired.json() == unknown.json() == {"detail": "Invalid or expired invitation"}


async def test_a_suspended_organisation_cannot_take_new_members(client, db, world):
    from backend.models import Organisation
    made = (await invite(client, world.admin)).json()
    async with db() as s:
        org = await s.get(Organisation, world.org.id)
        org.status = "suspended"
        await s.commit()
    assert (await accept(client, made["token"])).status_code == 404


@pytest.mark.parametrize("override", [
    {"password": "short"}, {"password": "é" * 40}, {"full_name": ""}, {"token": "tiny"},
])
async def test_accept_validation(client, world, override):
    made = (await invite(client, world.admin)).json()
    body = {"token": made["token"], "full_name": "Ok Name", "password": PW, **override}
    assert (await client.post("/auth/accept-invite", json=body)).status_code == 422


async def test_an_account_created_since_the_invite_blocks_acceptance(client, db, world):
    made = (await invite(client, world.admin, email="late@example.com")).json()
    await make_user(db, "late@example.com", org=world.other)  # registered elsewhere meanwhile
    assert (await accept(client, made["token"])).status_code == 409
    async with db() as s:  # nothing half-saved: the invitation is still unused
        assert (await s.exec(select(Invite))).one().accepted_at is None
