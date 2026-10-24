import secrets
import uuid

from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.core.errors import AppError
from backend.models import Patient, Scan, User
from backend.schemas.patient import PatientCreate, PatientOut
from backend.services.auth_service import audit

# No 0/O/1/I/L: codes get read aloud and copied by hand.
_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"


async def create_patient(
    session: AsyncSession, user: User, body: PatientCreate, ip: str | None
) -> Patient:
    owner_id, org_id = user.id, user.organisation_id  # rollback() expires ORM objects; keep plain values
    for _ in range(5):
        code = "PT-" + "".join(secrets.choice(_ALPHABET) for _ in range(8))
        patient = Patient(
            patient_code=code, sex=body.sex, year_of_birth=body.year_of_birth,
            created_by_id=owner_id, organisation_id=org_id,
        )
        session.add(patient)
        try:
            await session.flush()
        except IntegrityError:  # code collision: extremely rare, try another
            await session.rollback()
            continue
        audit(session, "patient.create", user_id=owner_id,
              resource_type="patient", resource_id=patient.id, ip=ip)
        await session.commit()
        return patient
    raise AppError(500, "Could not allocate a patient code")


async def get_accessible_patient(
    session: AsyncSession, user: User, patient_id: uuid.UUID
) -> Patient:
    """Everyone in an organisation sees all of its patients. A patient in
    another organisation is reported as 404 so its existence is not leaked."""
    patient = await session.get(Patient, patient_id)
    if patient is None or patient.organisation_id != user.organisation_id:
        raise AppError(404, "Patient not found")
    return patient


async def _with_stats(session: AsyncSession, patients: list[Patient]) -> list[PatientOut]:
    """Attach scan_count and last_scan_at with a single grouped query."""
    stats = {}
    if patients:
        rows = await session.exec(
            select(Scan.patient_id, func.count(Scan.id), func.max(Scan.created_at))
            .where(Scan.patient_id.in_([p.id for p in patients]))
            .group_by(Scan.patient_id)
        )
        stats = {pid: (n, last) for pid, n, last in rows.all()}
    out = []
    for p in patients:
        n, last = stats.get(p.id, (0, None))
        out.append(PatientOut(
            id=p.id, patient_code=p.patient_code, sex=p.sex,
            year_of_birth=p.year_of_birth, created_at=p.created_at,
            scan_count=n, last_scan_at=last,
        ))
    return out


async def get_patient_out(session: AsyncSession, user: User, patient_id: uuid.UUID) -> PatientOut:
    patient = await get_accessible_patient(session, user, patient_id)
    return (await _with_stats(session, [patient]))[0]


async def list_patients(
    session: AsyncSession, user: User, limit: int, offset: int, q: str | None = None
) -> list[PatientOut]:
    stmt = select(Patient).where(Patient.organisation_id == user.organisation_id)
    if q and q.strip():
        # Case-insensitive "contains" on the patient code; %, _ and \ are literals.
        needle = q.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        stmt = stmt.where(Patient.patient_code.ilike(f"%{needle}%", escape="\\"))
    stmt = stmt.order_by(Patient.created_at.desc(), Patient.id).limit(limit).offset(offset)
    patients = list((await session.exec(stmt)).all())
    return await _with_stats(session, patients)
