import uuid
from datetime import datetime

from sqlalchemy import DateTime, String
from sqlmodel import Field, SQLModel

from backend.models.base import utcnow


class Patient(SQLModel, table=True):
    """Pseudonymous patient record. No names, phone numbers or MRNs are stored;
    the clinic maps `patient_code` to a real identity outside this system."""

    __tablename__ = "patients"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    patient_code: str = Field(
        sa_type=String(32), unique=True, index=True, nullable=False
    )
    sex: str | None = Field(default=None, sa_type=String(10))
    year_of_birth: int | None = Field(default=None)
    # Owner clinician: clinicians only see their own patients, admins see all.
    created_by_id: uuid.UUID = Field(
        foreign_key="users.id", index=True, nullable=False, ondelete="RESTRICT"
    )
    created_at: datetime = Field(
        default_factory=utcnow, sa_type=DateTime(timezone=True), nullable=False
    )
