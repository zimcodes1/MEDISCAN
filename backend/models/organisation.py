import uuid
from datetime import datetime

from sqlalchemy import DateTime, String
from sqlmodel import Field, SQLModel

from backend.models.base import utcnow


class Organisation(SQLModel, table=True):
    """A tenant. Patients, scans and everything derived from them belong to
    exactly one organisation. `status` is a plain string validated at the edge
    (pending | active | suspended), not a database enum."""

    __tablename__ = "organisations"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str = Field(sa_type=String(200), nullable=False)
    # hospital | diagnostic_centre | clinic | telemedicine
    type: str = Field(default="clinic", sa_type=String(30), nullable=False)
    state: str | None = Field(default=None, sa_type=String(50))
    phone_number: str | None = Field(default=None, sa_type=String(20))
    status: str = Field(default="pending", sa_type=String(20), nullable=False)
    created_at: datetime = Field(
        default_factory=utcnow, sa_type=DateTime(timezone=True), nullable=False
    )
