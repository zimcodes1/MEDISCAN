import io

from PIL import Image

from backend.core import security
from backend.models import User, UserRole

PW = "correct-horse-battery"


async def make_user(db, email="dr@example.com", *, role=UserRole.clinician,
                    approved=True, active=True) -> User:
    async with db() as s:
        u = User(email=email, full_name="Dr X", hashed_password=security.hash_password(PW),
                 role=role, is_approved=approved, is_active=active)
        s.add(u)
        await s.commit()
        return u


async def login(client, email="dr@example.com", password=PW):
    return await client.post("/auth/login", json={"email": email, "password": password})


def bearer(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


async def token_for(client, db, email="dr@example.com", role=UserRole.clinician) -> dict:
    """Create an approved user, log in, return ready-to-use auth headers."""
    await make_user(db, email, role=role)
    return bearer((await login(client, email)).json()["access_token"])


def png_bytes(seed: int = 0, size=(128, 128)) -> bytes:
    im = Image.new("L", size, (seed * 37) % 256)
    im.paste((seed * 91 + 50) % 256, (10, 10, 60, 60))
    buf = io.BytesIO()
    im.save(buf, "PNG")
    return buf.getvalue()


def jpeg_bytes(seed: int = 0, size=(128, 128), exif: bool = False) -> bytes:
    im = Image.new("RGB", size, ((seed * 37) % 256,) * 3)
    buf = io.BytesIO()
    if exif:
        ex = Image.Exif()
        ex[0x010F] = "SecretCameraMaker"  # tag 'Make'
        ex[0x0131] = "PhoneApp 1.0"
        im.save(buf, "JPEG", exif=ex)
    else:
        im.save(buf, "JPEG")
    return buf.getvalue()


async def create_patient(client, headers) -> str:
    r = await client.post("/patients", headers=headers, json={"sex": "female", "year_of_birth": 1980})
    assert r.status_code == 201
    return r.json()["id"]


async def predict_saved(client, headers, patient_id, seed: int = 1) -> dict:
    r = await client.post("/predict", headers=headers, files=upload(png_bytes(seed)),
                          data={"patient_id": patient_id})
    assert r.status_code == 200 and r.json()["saved"]
    return r.json()


def upload(data: bytes, name="xray.png", mime="image/png") -> dict:
    return {"file": (name, data, mime)}
