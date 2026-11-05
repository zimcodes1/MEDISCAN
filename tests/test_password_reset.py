"""Admin-issued password reset links."""
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from sqlmodel import select

from backend.core import security
from backend.core.config import get_settings
from backend.models import AuditLog, Organisation, PasswordReset, RefreshToken, UserRole
from tests.helpers import login, make_org, make_user, me_id, token_for

NEW = "a-brand-new-password-1"


@pytest.fixture
async def world(client, db):
    w = type("World", (), {})()
    w.org, w.other = await make_org(db, "Org A"), await make_org(db, "Org B")
    w.admin = await token_for(client, db, "admin@example.com", UserRole.admin, w.org, "Ada Admin")
    w.clin = await token_for(client, db, "clin@example.com", org=w.org, full_name="Dr Clin")
    w.other_admin = await token_for(client, db, "oadmin@example.com", UserRole.admin, w.other)
    w.clin_id = await me_id(client, w.clin)
    return w


async def make_link(client, headers, user_id):
    return await client.post(f"/admin/users/{user_id}/password-reset", headers=headers)


async def use(client, token, password=NEW):
    return await client.post("/auth/reset-password", json={"token": token, "new_password": password})


# ------------------------------------------------------------------- create
async def test_admin_creates_a_link_and_only_a_hash_is_stored(client, db, world):
    r = await make_link(client, world.admin, world.clin_id)
    assert r.status_code == 201
    body = r.json()
    assert set(body) == {"token", "reset_url", "expires_at", "user"}
    assert body["user"] == {"id": world.clin_id, "full_name": "Dr Clin", "email": "clin@example.com"}
    base = get_settings().frontend_url.rstrip("/")
    assert body["reset_url"] == f"{base}/reset-password?token={body['token']}"
    async with db() as s:
        row = (await s.exec(select(PasswordReset))).one()
    assert row.token_hash == security.hash_token(body["token"]) != body["token"]
    assert body["token"] not in str(row.__dict__)
    expires = datetime.fromisoformat(body["expires_at"].replace("Z", "+00:00"))
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    assert timedelta(minutes=58) < expires - datetime.now(timezone.utc) < timedelta(minutes=61)


async def test_only_admins_can_create_links(client, world):
    admin_id = await me_id(client, world.admin)
    assert (await make_link(client, world.clin, admin_id)).status_code == 403
    assert (await client.post(f"/admin/users/{world.clin_id}/password-reset")).status_code in (401, 403)


async def test_cannot_reset_someone_in_another_organisation(client, world):
    victim = await me_id(client, world.other_admin)
    assert (await make_link(client, world.admin, victim)).status_code == 404
    assert (await make_link(client, world.admin, str(uuid.uuid4()))).status_code == 404


@pytest.mark.parametrize("kind", ["inactive", "pending"])
async def test_only_active_approved_accounts_can_be_reset(client, db, world, kind):
    user = await make_user(db, f"{kind}@example.com", org=world.org,
                           active=(kind != "inactive"), approved=(kind != "pending"))
    assert (await make_link(client, world.admin, user.id)).status_code == 409


async def test_an_admin_can_reset_another_admin(client, db, world):
    second = await make_user(db, "second@example.com", role=UserRole.admin, org=world.org)
    assert (await make_link(client, world.admin, second.id)).status_code == 201


async def test_a_new_link_replaces_the_old_one(client, world):
    first = (await make_link(client, world.admin, world.clin_id)).json()
    second = (await make_link(client, world.admin, world.clin_id)).json()
    assert (await use(client, first["token"])).status_code == 404
    assert (await use(client, second["token"])).status_code == 204


# ---------------------------------------------------------------------- use
async def test_using_the_link_sets_the_password_and_ends_every_session(client, db, world):
    session = (await login(client, "clin@example.com")).json()
    link = (await make_link(client, world.admin, world.clin_id)).json()
    assert (await use(client, link["token"])).status_code == 204
    assert (await login(client, "clin@example.com")).status_code == 401           # old password
    ok = await client.post("/auth/login", json={"email": "clin@example.com", "password": NEW})
    assert ok.status_code == 200
    refresh = await client.post("/auth/refresh", json={"refresh_token": session["refresh_token"]})
    assert refresh.status_code == 401


async def test_sessions_are_revoked_in_the_database(client, db, world):
    await login(client, "clin@example.com")
    link = (await make_link(client, world.admin, world.clin_id)).json()
    await use(client, link["token"])
    async with db() as s:
        tokens = (await s.exec(select(RefreshToken).where(
            RefreshToken.user_id == uuid.UUID(world.clin_id)))).all()
    assert tokens and all(t.revoked_at is not None for t in tokens)


async def test_a_link_works_once(client, world):
    link = (await make_link(client, world.admin, world.clin_id)).json()
    assert (await use(client, link["token"])).status_code == 204
    again = await use(client, link["token"], password="another-new-password-2")
    assert again.status_code == 404
    assert (await client.post("/auth/login", json={"email": "clin@example.com", "password": NEW})).status_code == 200


async def test_every_failure_looks_the_same(client, db, world):
    link = (await make_link(client, world.admin, world.clin_id)).json()
    async with db() as s:
        row = (await s.exec(select(PasswordReset))).one()
        row.expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
        await s.commit()
    expired, unknown = await use(client, link["token"]), await use(client, "x" * 43)
    assert expired.status_code == unknown.status_code == 404
    assert expired.json() == unknown.json() == {"detail": "Invalid or expired link"}


async def test_the_link_dies_with_the_account_or_the_organisation(client, db, world):
    link = (await make_link(client, world.admin, world.clin_id)).json()
    await client.post(f"/admin/users/{world.clin_id}/deactivate", headers=world.admin)
    assert (await use(client, link["token"])).status_code == 404
    await client.post(f"/admin/users/{world.clin_id}/activate", headers=world.admin)
    link2 = (await make_link(client, world.admin, world.clin_id)).json()
    async with db() as s:
        org = await s.get(Organisation, world.org.id)
        org.status = "suspended"
        await s.commit()
    assert (await use(client, link2["token"])).status_code == 404


@pytest.mark.parametrize("override", [
    {"new_password": "short"}, {"new_password": "é" * 40}, {"token": "tiny"}, {"token": ""},
])
async def test_reset_validation(client, world, override):
    link = (await make_link(client, world.admin, world.clin_id)).json()
    body = {"token": link["token"], "new_password": NEW, **override}
    assert (await client.post("/auth/reset-password", json=body)).status_code == 422
    assert (await use(client, link["token"])).status_code == 204  # the bad attempt did not use it up


async def test_the_reset_endpoint_is_rate_limited(client):
    codes = [(await use(client, f"{i:043d}")).status_code for i in range(22)]
    assert codes[:20] == [404] * 20 and 429 in codes[20:]


async def test_creating_links_is_rate_limited(client, world):
    codes = [(await make_link(client, world.admin, world.clin_id)).status_code for _ in range(32)]
    assert codes[:30] == [201] * 30 and 429 in codes[30:]


# -------------------------------------------------------------------- audit
async def test_audit_records_who_and_never_the_secret(client, db, world):
    link = (await make_link(client, world.admin, world.clin_id)).json()
    await use(client, link["token"])
    async with db() as s:
        rows = (await s.exec(select(AuditLog).where(AuditLog.action.like("password_reset.%")))).all()
    assert {r.action for r in rows} == {"password_reset.create", "password_reset.use"}
    dumped = str([r.__dict__ for r in rows])
    assert link["token"] not in dumped and NEW not in dumped
    creator = next(r for r in rows if r.action == "password_reset.create")
    assert str(creator.user_id) == await me_id(client, world.admin)  # the admin, not the target
    used = next(r for r in rows if r.action == "password_reset.use")
    assert str(used.user_id) == world.clin_id
