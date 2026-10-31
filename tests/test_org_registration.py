"""Organisation registration, platform approval/suspension, and the admin rules."""
import uuid

import pytest
from sqlmodel import select

from backend.core.config import get_settings
from backend.models import Organisation, RefreshToken, User, UserRole
from tests.helpers import (
    PW, create_patient, login, make_org, make_user, me_id, predict_saved, token_for,
)

ORG = {
    "organisation_name": "Sunrise Clinic", "organisation_type": "clinic", "state": "Lagos",
    "phone_number": "08012345678", "full_name": "Ada Obi",
    "email": "ada@sunrise.example.com", "password": PW,
}


@pytest.fixture
async def operator(client, db):
    """The platform operator: an organisation admin in the default organisation."""
    return await token_for(client, db, "operator@example.com", UserRole.admin, platform_admin=True)


async def register(client, **overrides):
    return await client.post("/auth/register-organisation", json={**ORG, **overrides})


async def pending_org_id(client, operator, name="Sunrise Clinic") -> str:
    rows = (await client.get("/platform/organisations?status=pending", headers=operator)).json()
    return next(o["id"] for o in rows if o["name"] == name)


# ------------------------------------------------------------- registration
async def test_registration_creates_a_pending_org_and_unapproved_admin(client, db):
    r = await register(client, radiologist_count=4)
    assert r.status_code == 202
    async with db() as s:
        org = (await s.exec(select(Organisation).where(Organisation.name == "Sunrise Clinic"))).one()
        admin = (await s.exec(select(User).where(User.email == "ada@sunrise.example.com"))).one()
    assert (org.status, org.type, org.state, org.radiologist_count) == ("pending", "clinic", "Lagos", 4)
    assert org.phone_number == "08012345678"
    assert admin.role == UserRole.admin and admin.is_approved is False
    assert admin.organisation_id == org.id and admin.is_platform_admin is False
    assert (await login(client, ORG["email"])).status_code == 403  # cannot sign in yet


async def test_registering_a_taken_email_looks_identical_and_creates_nothing(client, db):
    first = await register(client)
    again = await register(client, organisation_name="Another Clinic")
    assert again.status_code == first.status_code == 202 and again.json() == first.json()
    async with db() as s:
        names = {o.name for o in (await s.exec(select(Organisation))).all()}
    assert "Another Clinic" not in names


@pytest.mark.parametrize("override", [
    {"state": "Atlantis"}, {"state": ""}, {"phone_number": "12345"},
    {"phone_number": "+2348012345"}, {"organisation_type": "pharmacy"},
    {"organisation_name": "x"}, {"password": "short"}, {"password": "é" * 40},
    {"email": "not-an-email"}, {"radiologist_count": -1}, {"full_name": ""},
])
async def test_registration_validation(client, override):
    assert (await register(client, **override)).status_code == 422


@pytest.mark.parametrize("phone", ["08012345678", "+2348012345678", "07098765432"])
async def test_accepted_phone_formats(client, phone):
    assert (await register(client, phone_number=phone)).status_code == 202


def test_every_listed_state_is_accepted():
    from backend.core.constants import NIGERIAN_STATES
    from backend.schemas.org import OrganisationRegister
    assert len(NIGERIAN_STATES) == 37 and {"FCT", "Benue"} <= set(NIGERIAN_STATES)  # 36 states + FCT
    for state in NIGERIAN_STATES:
        assert OrganisationRegister(**{**ORG, "state": state}).state == state


# -------------------------------------------------------- platform approval
async def test_only_the_platform_admin_can_use_platform_routes(client, db, operator):
    await register(client)
    oid = await pending_org_id(client, operator)
    plain_admin = await token_for(client, db, "plain@example.com", UserRole.admin)
    for call in (
        client.get("/platform/organisations", headers=plain_admin),
        client.post(f"/platform/organisations/{oid}/approve", headers=plain_admin),
        client.post(f"/platform/organisations/{oid}/suspend", headers=plain_admin),
    ):
        assert (await call).status_code == 403
    assert (await client.get("/platform/organisations")).status_code in (401, 403)


async def test_pending_list_shows_the_registrant(client, operator):
    await register(client, radiologist_count=3)
    rows = (await client.get("/platform/organisations?status=pending", headers=operator)).json()
    row = next(o for o in rows if o["name"] == "Sunrise Clinic")
    assert row["status"] == "pending" and row["radiologist_count"] == 3
    assert row["admin"]["email"] == ORG["email"] and row["admin"]["full_name"] == "Ada Obi"
    assert (await client.get("/platform/organisations?status=bogus", headers=operator)).status_code == 422


async def test_approval_activates_the_org_and_lets_the_admin_in(client, operator):
    await register(client)
    oid = await pending_org_id(client, operator)
    r = await client.post(f"/platform/organisations/{oid}/approve", headers=operator)
    assert r.status_code == 200 and r.json()["status"] == "active"
    assert (await login(client, ORG["email"])).status_code == 200
    assert (await client.get("/platform/organisations?status=pending", headers=operator)).json() == []
    assert (await client.post(f"/platform/organisations/{oid}/approve", headers=operator)).status_code == 200
    assert (await client.post(f"/platform/organisations/{uuid.uuid4()}/approve", headers=operator)).status_code == 404


async def test_a_new_organisation_is_isolated_from_the_others(client, db, operator):
    await register(client)
    oid = await pending_org_id(client, operator)
    await client.post(f"/platform/organisations/{oid}/approve", headers=operator)
    tok = (await login(client, ORG["email"])).json()["access_token"]
    new_admin = {"Authorization": f"Bearer {tok}"}
    theirs = await create_patient(client, new_admin)
    mine = await create_patient(client, operator)
    assert (await client.get(f"/patients/{mine}", headers=new_admin)).status_code == 404
    # the platform operator has no special access to another organisation's patients
    assert (await client.get(f"/patients/{theirs}", headers=operator)).status_code == 404
    assert [p["id"] for p in (await client.get("/patients", headers=new_admin)).json()] == [theirs]


async def test_suspending_locks_everyone_out_and_revokes_sessions(client, db, operator):
    await register(client)
    oid = await pending_org_id(client, operator)
    await client.post(f"/platform/organisations/{oid}/approve", headers=operator)
    first = (await login(client, ORG["email"])).json()
    headers = {"Authorization": f"Bearer {first['access_token']}"}
    assert (await client.get("/patients", headers=headers)).status_code == 200

    r = await client.post(f"/platform/organisations/{oid}/suspend", headers=operator)
    assert r.status_code == 200 and r.json()["status"] == "suspended"
    # Suspending itself ends every session. Checked here, before anything else touches
    # the tokens: the refresh route also revokes a token when the organisation is inactive.
    async with db() as s:
        admin_id = (await s.exec(select(User.id).where(User.email == ORG["email"]))).one()
        tokens = (await s.exec(select(RefreshToken).where(RefreshToken.user_id == admin_id))).all()
    assert tokens and all(t.revoked_at is not None for t in tokens)
    assert (await client.get("/patients", headers=headers)).status_code == 401
    assert (await login(client, ORG["email"])).status_code == 403
    assert (await client.post("/auth/refresh", json={"refresh_token": first["refresh_token"]})).status_code == 401
    assert [o["status"] for o in (await client.get("/platform/organisations?status=suspended", headers=operator)).json()] == ["suspended"]
    # and it can be reinstated
    await client.post(f"/platform/organisations/{oid}/approve", headers=operator)
    assert (await login(client, ORG["email"])).status_code == 200


async def test_the_operator_cannot_suspend_their_own_organisation(client, db):
    org = await make_org(db, "Ops Org")
    op = await token_for(client, db, "op@example.com", UserRole.admin, org, platform_admin=True)
    own = (await client.get("/org", headers=op)).json()["id"]
    assert (await client.post(f"/platform/organisations/{own}/suspend", headers=op)).status_code == 409


# ---------------------------------------------------------- admin guard rails
async def test_the_last_active_admin_cannot_be_deactivated(client, db):
    from backend.core.errors import AuthError
    from backend.services import auth_service
    org = await make_org(db, "Guard Org")
    a = await make_user(db, "a@example.com", role=UserRole.admin, org=org)
    b = await make_user(db, "b@example.com", role=UserRole.admin, org=org)
    async with db() as s:  # A is deactivated at the same moment (a race), leaving B the only admin
        a_row = await s.get(User, a.id)
        a_row.is_active = False
        await s.commit()
        caller = await s.get(User, a.id)
        with pytest.raises(AuthError) as err:
            await auth_service.deactivate_user(s, caller, b.id, None)
        assert err.value.status_code == 409


async def test_an_admin_can_deactivate_another_admin_while_one_remains(client, db):
    org = await make_org(db, "Two Admins")
    a = await token_for(client, db, "a@example.com", UserRole.admin, org)
    b = await make_user(db, "b@example.com", role=UserRole.admin, org=org)
    assert (await client.post(f"/admin/users/{b.id}/deactivate", headers=a)).status_code == 200


# ------------------------------------------------------------- legacy sign-up
async def test_legacy_register_can_be_switched_off(client, db, monkeypatch):
    await make_user(db, "root@example.com", role=UserRole.admin)
    body = {"email": "old@example.com", "full_name": "Old Way", "password": PW}
    assert (await client.post("/auth/register", json=body)).status_code == 202
    monkeypatch.setattr(get_settings(), "legacy_register_enabled", False)
    assert (await client.post("/auth/register", json={**body, "email": "old2@example.com"})).status_code == 404
