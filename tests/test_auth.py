from datetime import timedelta

from sqlmodel import select

from backend.core import security
from backend.models import AuditLog, RefreshToken, User, UserRole
from tests.helpers import PW, bearer, login, make_user


# ---------- unit ----------
def test_password_hash_roundtrip():
    h = security.hash_password(PW)
    assert h != PW and security.verify_password(PW, h)
    assert not security.verify_password("wrong-password", h)
    assert not security.verify_password("x" * 100, h)  # > 72 bytes: rejected, no crash


def test_refresh_hash_is_deterministic_sha256():
    t = security.generate_refresh_token()
    assert security.hash_token(t) == security.hash_token(t)
    assert len(security.hash_token(t)) == 64 and t not in security.hash_token(t)


# ---------- registration ----------
async def test_register_creates_pending_account(client, db):
    r = await client.post("/auth/register", json={
        "email": "New@Example.com ", "full_name": "New Doc", "password": PW})
    assert r.status_code == 202
    async with db() as s:
        u = (await s.exec(select(User))).one()
    assert u.email == "new@example.com" and not u.is_approved
    assert u.role == UserRole.clinician  # cannot self-register as admin


async def test_duplicate_registration_looks_identical_and_adds_nothing(client, db):
    body = {"email": "a@example.com", "full_name": "A", "password": PW}
    r1 = await client.post("/auth/register", json=body)
    r2 = await client.post("/auth/register", json=body)
    assert r1.status_code == r2.status_code == 202 and r1.json() == r2.json()
    async with db() as s:
        assert len((await s.exec(select(User))).all()) == 1


async def test_weak_password_rejected(client):
    r = await client.post("/auth/register", json={
        "email": "a@example.com", "full_name": "A", "password": "short"})
    assert r.status_code == 422


# ---------- login ----------
async def test_login_before_approval_is_403(client, db):
    await make_user(db, approved=False)
    r = await login(client)
    assert r.status_code == 403 and "approval" in r.json()["detail"]


async def test_wrong_password_and_unknown_email_are_indistinguishable(client, db):
    await make_user(db)
    a = await login(client, password="wrong-password-123")
    b = await login(client, email="nobody@example.com")
    assert a.status_code == b.status_code == 401 and a.json() == b.json()


async def test_pending_user_with_wrong_password_gets_401_not_403(client, db):
    await make_user(db, approved=False)
    assert (await login(client, password="wrong-password-123")).status_code == 401


async def test_disabled_account_403(client, db):
    await make_user(db, active=False)
    assert (await login(client)).status_code == 403


async def test_login_and_me(client, db):
    await make_user(db)
    r = await login(client)
    assert r.status_code == 200
    tokens = r.json()
    assert tokens["token_type"] == "bearer" and tokens["expires_in"] == 900
    me = await client.get("/auth/me", headers=bearer(tokens["access_token"]))
    assert me.status_code == 200 and me.json()["email"] == "dr@example.com"
    assert "hashed_password" not in me.json()


async def test_refresh_token_stored_only_as_hash(client, db):
    await make_user(db)
    raw = (await login(client)).json()["refresh_token"]
    async with db() as s:
        row = (await s.exec(select(RefreshToken))).one()
    assert row.token_hash == security.hash_token(raw) and row.token_hash != raw


# ---------- access-token protection ----------
async def test_missing_bad_and_expired_tokens_rejected(client, db):
    u = await make_user(db)
    r = await client.get("/auth/me")
    assert r.status_code == 401 and r.headers["www-authenticate"] == "Bearer"
    assert (await client.get("/auth/me", headers=bearer("garbage"))).status_code == 401
    expired = security.create_access_token(u, expires_delta=timedelta(seconds=-5))
    assert (await client.get("/auth/me", headers=bearer(expired))).status_code == 401


async def test_deactivated_user_loses_access_immediately(client, db):
    await make_user(db)
    tokens = (await login(client)).json()
    async with db() as s:
        u = (await s.exec(select(User))).one()
        u.is_active = False
        s.add(u)
        await s.commit()
    assert (await client.get("/auth/me", headers=bearer(tokens["access_token"]))).status_code == 401


# ---------- refresh rotation & reuse detection ----------
async def test_refresh_rotates_and_reuse_revokes_family(client, db):
    await make_user(db)
    t1 = (await login(client)).json()
    r2 = await client.post("/auth/refresh", json={"refresh_token": t1["refresh_token"]})
    assert r2.status_code == 200
    t2 = r2.json()
    assert t2["refresh_token"] != t1["refresh_token"]

    replay = await client.post("/auth/refresh", json={"refresh_token": t1["refresh_token"]})
    assert replay.status_code == 401
    # the legitimately-rotated token is now dead too (whole family revoked)
    dead = await client.post("/auth/refresh", json={"refresh_token": t2["refresh_token"]})
    assert dead.status_code == 401
    async with db() as s:
        actions = [a.action for a in (await s.exec(select(AuditLog))).all()]
    assert "auth.refresh_reuse_detected" in actions


async def test_expired_refresh_token_rejected(client, db):
    await make_user(db)
    raw = (await login(client)).json()["refresh_token"]
    async with db() as s:
        row = (await s.exec(select(RefreshToken))).one()
        row.expires_at = row.expires_at - timedelta(days=30)
        s.add(row)
        await s.commit()
    assert (await client.post("/auth/refresh", json={"refresh_token": raw})).status_code == 401


async def test_logout_revokes_and_is_idempotent(client, db):
    await make_user(db)
    raw = (await login(client)).json()["refresh_token"]
    assert (await client.post("/auth/logout", json={"refresh_token": raw})).status_code == 204
    assert (await client.post("/auth/refresh", json={"refresh_token": raw})).status_code == 401
    unknown = "x" * 43
    assert (await client.post("/auth/logout", json={"refresh_token": unknown})).status_code == 204


# ---------- admin approval flow ----------
async def test_full_approval_flow(client, db):
    await make_user(db, "admin@example.com", role=UserRole.admin)
    await client.post("/auth/register", json={
        "email": "new@example.com", "full_name": "New", "password": PW})
    assert (await login(client, "new@example.com")).status_code == 403

    admin_tok = (await login(client, "admin@example.com")).json()["access_token"]
    pending = await client.get("/admin/users", headers=bearer(admin_tok))
    assert [u["email"] for u in pending.json()] == ["new@example.com"]

    uid = pending.json()[0]["id"]
    ok = await client.post(f"/admin/users/{uid}/approve", headers=bearer(admin_tok))
    assert ok.status_code == 200 and ok.json()["is_approved"]
    assert (await login(client, "new@example.com")).status_code == 200
    assert (await client.get("/admin/users", headers=bearer(admin_tok))).json() == []


async def test_clinician_cannot_use_admin_endpoints(client, db):
    u = await make_user(db)
    tok = (await login(client)).json()["access_token"]
    assert (await client.get("/admin/users", headers=bearer(tok))).status_code == 403
    r = await client.post(f"/admin/users/{u.id}/approve", headers=bearer(tok))
    assert r.status_code == 403
    assert (await client.get("/admin/users")).status_code == 401


async def test_deactivate_revokes_refresh_tokens_and_blocks_self_deactivation(client, db):
    admin = await make_user(db, "admin@example.com", role=UserRole.admin)
    doc = await make_user(db)
    doc_tokens = (await login(client)).json()
    admin_tok = (await login(client, "admin@example.com")).json()["access_token"]

    r = await client.post(f"/admin/users/{doc.id}/deactivate", headers=bearer(admin_tok))
    assert r.status_code == 200 and not r.json()["is_active"]
    assert (await client.post("/auth/refresh", json={
        "refresh_token": doc_tokens["refresh_token"]})).status_code == 401
    assert (await login(client)).status_code == 403

    me = await client.post(f"/admin/users/{admin.id}/deactivate", headers=bearer(admin_tok))
    assert me.status_code == 400
