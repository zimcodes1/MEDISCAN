from sqlmodel import select

from backend.core import security
from backend.models import AuditLog, User
from backend.scripts.reset_password import reset_password
from tests.helpers import PW, bearer, login, make_user

NEW = "a-brand-new-password-1"


async def test_reset_changes_password_and_signs_everyone_out(client, db):
    await make_user(db, "me@example.com")
    await make_user(db, "other@example.com")
    tokens = (await login(client, "me@example.com")).json()
    other = (await login(client, "other@example.com")).json()

    async with db() as s:
        assert await reset_password(s, " Me@Example.com ", NEW) is True  # email is normalised

    assert (await login(client, "me@example.com", PW)).status_code == 401        # old password dead
    assert (await login(client, "me@example.com", NEW)).status_code == 200       # new one works
    r = await client.post("/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert r.status_code == 401                                                  # old sessions revoked
    # another user is untouched
    r = await client.post("/auth/refresh", json={"refresh_token": other["refresh_token"]})
    assert r.status_code == 200
    assert (await client.get("/auth/me", headers=bearer(other["access_token"]))).status_code == 200


async def test_reset_is_audited_and_stores_only_a_hash(db):
    u = await make_user(db, "me@example.com")
    async with db() as s:
        await reset_password(s, "me@example.com", NEW)
    async with db() as s:
        user = (await s.exec(select(User))).one()
        actions = [a.action for a in (await s.exec(select(AuditLog))).all()]
    assert user.hashed_password != NEW and security.verify_password(NEW, user.hashed_password)
    assert "user.password_reset" in actions and user.id == u.id


async def test_unknown_email_returns_false(db):
    async with db() as s:
        assert await reset_password(s, "nobody@example.com", NEW) is False
