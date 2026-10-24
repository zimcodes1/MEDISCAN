import io

from PIL import Image

from backend.core import security
from sqlmodel import select

from backend.core.config import get_settings
from backend.models import Finding, Organisation, Patient, Scan, ScanStatus, User, UserRole

PW = "correct-horse-battery"


async def make_org(db, name, status="active") -> Organisation:
    async with db() as s:
        org = Organisation(name=name, status=status)
        s.add(org)
        await s.commit()
        return org


async def default_org(db) -> Organisation:
    """The organisation existing data is backfilled into (seeded by the db fixture)."""
    async with db() as s:
        name = get_settings().default_organisation_name
        return (await s.exec(select(Organisation).where(Organisation.name == name))).one()


async def make_user(db, email="dr@example.com", *, role=UserRole.clinician,
                    approved=True, active=True, org=None, full_name="Dr X") -> User:
    org = org or await default_org(db)
    async with db() as s:
        u = User(email=email, full_name=full_name, hashed_password=security.hash_password(PW),
                 role=role, is_approved=approved, is_active=active, organisation_id=org.id)
        s.add(u)
        await s.commit()
        return u


async def login(client, email="dr@example.com", password=PW):
    return await client.post("/auth/login", json={"email": email, "password": password})


def bearer(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


async def token_for(client, db, email="dr@example.com", role=UserRole.clinician, org=None,
                    full_name="Dr X") -> dict:
    """Create an approved user, log in, return ready-to-use auth headers."""
    await make_user(db, email, role=role, org=org, full_name=full_name)
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


async def me_id(client, headers) -> str:
    return (await client.get("/auth/me", headers=headers)).json()["id"]


async def make_scan(db, *, org_id, patient_id, uploader_id, scores=None, experimental=(),
                    **fields) -> str:
    """Insert a scan straight into the database with exact finding scores,
    e.g. scores={"Pneumonia": 0.9}. Conditions listed in `experimental` are
    stored as experimental. Extra keyword args set Scan columns."""
    import uuid
    scan_id = uuid.uuid4()
    async with db() as s:
        s.add(Scan(
            id=scan_id, patient_id=uuid.UUID(str(patient_id)), organisation_id=org_id,
            uploaded_by_id=uploader_id, image_key=f"scans/{scan_id}.png",
            image_sha256="0" * 64, content_type="image/png", size_bytes=1,
            status=ScanStatus.completed,
            findings=[
                Finding(condition=c, score=v, model_name="mock-x", model_version="1",
                        experimental=c in experimental)
                for c, v in (scores or {}).items()
            ],
            **fields,
        ))
        await s.commit()
    return str(scan_id)
