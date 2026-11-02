import uuid
from datetime import timedelta

import pytest
import pytest_asyncio
from sqlalchemy import event
from sqlmodel import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.models import (
    Finding, Patient, RefreshToken, Scan, ScanStatus, User, UserRole,
)
from backend.models.base import utcnow


@pytest_asyncio.fixture
async def session():
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:", poolclass=StaticPool
    )

    @event.listens_for(engine.sync_engine, "connect")
    def _fk_on(dbapi_conn, _):  # SQLite ignores FKs unless enabled
        dbapi_conn.execute("PRAGMA foreign_keys=ON")

    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    async with async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)() as s:
        yield s
    await engine.dispose()


async def make_user(session, email="dr@example.com"):
    u = User(email=email, hashed_password="x", full_name="Dr Test")
    session.add(u)
    await session.commit()
    return u


async def make_scan(session):
    u = await make_user(session)
    p = Patient(patient_code="PT-0001", created_by_id=u.id)
    session.add(p)
    await session.commit()
    s = Scan(
        patient_id=p.id, uploaded_by_id=u.id, image_key="scans/a.png",
        image_sha256="0" * 64, content_type="image/png", size_bytes=10,
        findings=[
            Finding(condition="Pneumonia", score=0.8, heatmap_key="h/a.png",
                    model_name="densenet121-res224-all", model_version="1"),
            Finding(condition="Tuberculosis", score=0.1, experimental=True,
                    model_name="mobilevit_small-chest_xray", model_version="1"),
        ],
    )
    session.add(s)
    await session.commit()
    return u, p, s


async def test_defaults(session):
    u, _, s = await make_scan(session)
    assert isinstance(u.id, uuid.UUID)
    assert u.role == UserRole.clinician and u.is_active
    assert s.status == ScanStatus.pending


async def test_scan_loads_findings_and_tb_has_no_heatmap(session):
    _, _, s = await make_scan(session)
    session.expunge_all()
    loaded = (await session.exec(select(Scan).where(Scan.id == s.id))).one()
    by_name = {f.condition: f for f in loaded.findings}
    assert len(by_name) == 2
    assert by_name["Tuberculosis"].heatmap_key is None
    assert by_name["Tuberculosis"].experimental


async def test_email_unique(session):
    await make_user(session)
    session.add(User(email="dr@example.com", hashed_password="x", full_name="B"))
    with pytest.raises(IntegrityError):
        await session.commit()


async def test_score_range_enforced(session):
    _, _, s = await make_scan(session)
    session.add(Finding(scan_id=s.id, condition="X", score=1.5,
                        model_name="m", model_version="1"))
    with pytest.raises(IntegrityError):
        await session.commit()


async def test_deleting_scan_deletes_findings(session):
    _, _, s = await make_scan(session)
    await session.delete(s)
    await session.commit()
    assert (await session.exec(select(Finding))).all() == []


async def test_deleting_patient_cascades_to_scans(session):
    _, p, _ = await make_scan(session)
    await session.execute(Patient.__table__.delete().where(Patient.id == p.id))
    await session.commit()
    assert (await session.exec(select(Scan))).all() == []
    assert (await session.exec(select(Finding))).all() == []


async def test_refresh_token_hash_unique(session):
    u = await make_user(session)
    fam = uuid.uuid4()
    exp = utcnow() + timedelta(days=7)
    session.add(RefreshToken(user_id=u.id, token_hash="a" * 64, family_id=fam, expires_at=exp))
    await session.commit()
    session.add(RefreshToken(user_id=u.id, token_hash="a" * 64, family_id=fam, expires_at=exp))
    with pytest.raises(IntegrityError):
        await session.commit()
