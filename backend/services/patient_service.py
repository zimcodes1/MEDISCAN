import secrets
import uuid

from sqlalchemy.exc import IntegrityError
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.core.errors import AppError
from backend.models import Patient, User, UserRole
from backend.schemas.patient import PatientCreate
from backend.services.auth_service import audit

# No 0/O/1/I/L: codes get read aloud and copied by hand.
_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"


def _is_admin(user: User) -> bool:
    return UserRole(user.role) == UserRole.admin


async def create_patient(
    session: AsyncSession, user: User, body: PatientCreate, ip: str | None
) -> Patient:
    owner_id = user.id  # rollback() expires ORM objects; keep plain values
    for _ in range(5):
        code = "PT-" + "".join(secrets.choice(_ALPHABET) for _ in range(8))
        patient = Patient(
            patient_code=code, sex=body.sex, year_of_birth=body.year_of_birth,
            created_by_id=owner_id,
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
    """Clinicians see only their own patients; admins see all. A patient that
    exists but is not yours is reported as 404 so its existence is not leaked."""
    patient = await session.get(Patient, patient_id)
    if patient is None or (not _is_admin(user) and patient.created_by_id != user.id):
        raise AppError(404, "Patient not found")
    return patient


async def list_patients(
    session: AsyncSession, user: User, limit: int, offset: int
) -> list[Patient]:
    stmt = select(Patient).order_by(Patient.created_at.desc()).limit(limit).offset(offset)
    if not _is_admin(user):
        stmt = stmt.where(Patient.created_by_id == user.id)
    return list((await session.exec(stmt)).all())
