"""The signed-in user's profile, password and picture."""
import io

import pytest
from PIL import Image
from sqlmodel import select

from backend.models import User, UserRole
from tests.helpers import (
    PW, big_png_bytes, bomb_png_bytes, gif_bytes, jpeg_bytes, login, make_org, make_user,
    me_id, noisy_png_bytes, pic, png_bytes, token_for,
)


@pytest.fixture
async def team(client, db):
    t = type("Team", (), {})()
    t.org, t.other = await make_org(db, "Org A"), await make_org(db, "Org B")
    t.me = await token_for(client, db, "me@example.com", org=t.org, full_name="Dr Me")
    t.mate = await token_for(client, db, "mate@example.com", org=t.org, full_name="Dr Mate")
    t.stranger = await token_for(client, db, "stranger@example.com", org=t.other)
    t.me_id = await me_id(client, t.me)
    return t


async def stored_key(db, email="me@example.com"):
    async with db() as s:
        return (await s.exec(select(User.avatar_key).where(User.email == email))).one()


async def exists(storage, key) -> bool:
    try:
        await storage.get(key)
        return True
    except Exception:
        return False


# ---------------------------------------------------------------------- /me
async def test_me_has_the_profile_fields(client, team):
    body = (await client.get("/auth/me", headers=team.me)).json()
    assert body["job_title"] is None and body["phone_number"] is None and body["avatar_url"] is None
    assert body["is_platform_admin"] is False
    assert body["organisation"] == {"id": str(team.org.id), "name": "Org A"}
    assert "hashed_password" not in body


async def test_patch_me_changes_only_what_is_sent(client, team):
    r = await client.patch("/auth/me", headers=team.me,
                           json={"job_title": "Consultant Radiologist", "phone_number": "0801 234 5678"})
    body = r.json()
    assert r.status_code == 200 and body["job_title"] == "Consultant Radiologist"
    assert body["phone_number"] == "0801 234 5678" and body["full_name"] == "Dr Me"
    body = (await client.patch("/auth/me", headers=team.me, json={"full_name": "  Dr Renamed "})).json()
    assert body["full_name"] == "Dr Renamed" and body["job_title"] == "Consultant Radiologist"
    body = (await client.patch("/auth/me", headers=team.me,
                               json={"job_title": None, "phone_number": ""})).json()
    assert body["job_title"] is None and body["phone_number"] is None


@pytest.mark.parametrize("payload", [
    {}, {"full_name": None}, {"full_name": "   "}, {"phone_number": "abc"},
    {"job_title": "x" * 101}, {"full_name": "x" * 201},
])
async def test_patch_me_validation(client, team, payload):
    assert (await client.patch("/auth/me", headers=team.me, json=payload)).status_code == 422


async def test_patch_me_cannot_change_role_email_or_organisation(client, db, team):
    r = await client.patch("/auth/me", headers=team.me, json={
        "full_name": "Still Me", "role": "admin", "email": "evil@example.com",
        "is_platform_admin": True, "organisation_id": str(team.other.id)})
    assert r.status_code == 200
    body = r.json()
    assert body["role"] == "clinician" and body["email"] == "me@example.com"
    assert body["is_platform_admin"] is False and body["organisation"]["name"] == "Org A"


# ----------------------------------------------------------------- password
async def test_password_change_signs_out_everywhere(client, team):
    session = (await login(client, "me@example.com")).json()
    new = "a-brand-new-password-1"
    r = await client.post("/auth/me/password", headers=team.me,
                          json={"current_password": PW, "new_password": new})
    assert r.status_code == 204
    assert (await login(client, "me@example.com")).status_code == 401  # old password
    ok = await client.post("/auth/login", json={"email": "me@example.com", "password": new})
    assert ok.status_code == 200
    assert (await client.post("/auth/refresh", json={"refresh_token": session["refresh_token"]})).status_code == 401


async def test_password_change_checks_the_current_password(client, team):
    r = await client.post("/auth/me/password", headers=team.me,
                          json={"current_password": "wrong-password-xx", "new_password": "a-brand-new-password-1"})
    assert r.status_code == 400 and r.json()["detail"] == "Current password is incorrect"
    assert (await login(client, "me@example.com")).status_code == 200  # unchanged


@pytest.mark.parametrize("new", ["short", "é" * 40, PW])
async def test_new_password_rules(client, team, new):
    r = await client.post("/auth/me/password", headers=team.me,
                          json={"current_password": PW, "new_password": new})
    assert r.status_code == 422


async def test_password_guessing_is_rate_limited(client, team):
    codes = [
        (await client.post("/auth/me/password", headers=team.me, json={
            "current_password": f"guess-number-{i}-xx", "new_password": "a-brand-new-password-1"})).status_code
        for i in range(7)
    ]
    assert codes[:5] == [400] * 5 and codes[5] == 429


# ------------------------------------------------------------------- avatar
async def test_upload_avatar_and_colleagues_can_see_it(client, db, storage, team):
    r = await client.post("/auth/me/avatar", headers=team.me, files=pic(png_bytes(2)))
    assert r.status_code == 200
    url = r.json()["avatar_url"]
    assert url.startswith(f"/users/{team.me_id}/avatar?v=") and len(url.split("v=")[1]) == 12
    assert (await client.get("/auth/me", headers=team.me)).json()["avatar_url"] == url
    for who in (team.me, team.mate):
        got = await client.get(f"/users/{team.me_id}/avatar", headers=who)
        assert got.status_code == 200 and got.headers["content-type"] == "image/png"
        assert "private" in got.headers["cache-control"]
        assert Image.open(io.BytesIO(got.content)).format == "PNG"
    assert (await client.get(f"/users/{team.me_id}/avatar", headers=team.stranger)).status_code == 404
    assert (await client.get(f"/users/{team.me_id}/avatar")).status_code in (401, 403)


async def test_other_people_without_a_picture_get_404(client, team):
    mate_id = await me_id(client, team.mate)
    assert (await client.get(f"/users/{mate_id}/avatar", headers=team.me)).status_code == 404
    assert (await client.get(f"/users/{team.me_id}/avatar", headers=team.me)).status_code == 404


async def test_avatars_are_scaled_down_and_stripped_of_metadata(client, team):
    await client.post("/auth/me/avatar", headers=team.me, files=pic(big_png_bytes((1600, 1000))))
    got = await client.get(f"/users/{team.me_id}/avatar", headers=team.me)
    assert Image.open(io.BytesIO(got.content)).size == (512, 320)  # aspect ratio kept

    exif = Image.Exif()
    exif[0x010F] = "SecretCameraMaker"  # an EXIF tag, standing in for GPS data
    buf = io.BytesIO()
    Image.new("RGB", (200, 200), (10, 200, 10)).save(buf, "JPEG", exif=exif)
    assert b"SecretCameraMaker" in buf.getvalue()
    r = await client.post("/auth/me/avatar", headers=team.me, files=pic(buf.getvalue(), "p.jpg", "image/jpeg"))
    assert r.status_code == 200
    stored = (await client.get(f"/users/{team.me_id}/avatar", headers=team.me)).content
    assert b"SecretCameraMaker" not in stored and not Image.open(io.BytesIO(stored)).getexif()


async def test_replacing_and_removing_the_avatar_cleans_up_storage(client, db, storage, team):
    await client.post("/auth/me/avatar", headers=team.me, files=pic(png_bytes(1)))
    first = await stored_key(db)
    assert await exists(storage, first)
    r = await client.post("/auth/me/avatar", headers=team.me, files=pic(png_bytes(2)))
    second = await stored_key(db)
    assert second != first and r.json()["avatar_url"].endswith(second.rsplit("/", 1)[1].removesuffix(".png"))
    assert await exists(storage, second) and not await exists(storage, first)

    assert (await client.delete("/auth/me/avatar", headers=team.me)).status_code == 204
    assert await stored_key(db) is None and not await exists(storage, second)
    assert (await client.get("/auth/me", headers=team.me)).json()["avatar_url"] is None
    assert (await client.delete("/auth/me/avatar", headers=team.me)).status_code == 204  # harmless twice


@pytest.mark.parametrize("data,name,mime,expected", [
    (b"just some text, not a picture", "a.png", "image/png", 415),
    (gif_bytes(), "a.gif", "image/gif", 415),               # GIF is for logos only
    (b"\x89PNG\r\n\x1a\n" + b"corrupt" * 20, "a.png", "image/png", 422),
    (noisy_png_bytes(), "big.png", "image/png", 413),       # over the 2 MB limit
    (bomb_png_bytes(), "bomb.png", "image/png", 413),       # tiny file, huge dimensions
])
async def test_bad_avatar_uploads_are_refused(client, db, team, data, name, mime, expected):
    r = await client.post("/auth/me/avatar", headers=team.me, files=pic(data, name, mime))
    assert r.status_code == expected
    assert await stored_key(db) is None


async def test_jpeg_avatars_are_accepted(client, team):
    r = await client.post("/auth/me/avatar", headers=team.me, files=pic(jpeg_bytes(), "p.jpg", "image/jpeg"))
    assert r.status_code == 200


async def test_picture_upload_is_rate_limited(client, team):
    codes = [(await client.post("/auth/me/avatar", headers=team.me, files=pic(png_bytes(i)))).status_code
             for i in range(12)]
    assert codes[:10] == [200] * 10 and 429 in codes[10:]
