import uuid
from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text, Uuid
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
    # Profile
    logo_key: str | None = Field(default=None, sa_type=String(200))
    radiologist_count: int | None = Field(default=None, sa_type=Integer)
    # Settings (api-contract.md section 10)
    default_priority: str = Field(               # routine | urgent
        default="routine", sa_type=String(10), nullable=False,
        sa_column_kwargs={"server_default": "routine"},
    )
    # A user id, or None for manual assignment. Deliberately NOT a foreign key:
    # users.organisation_id already points back at organisations, and a second
    # link in the other direction would make the two tables depend on each other.
    # It is checked when written and again each time it is used.
    auto_assign_to_id: uuid.UUID | None = Field(default=None, sa_type=Uuid)
    report_disclaimer: str = Field(
        default="", sa_type=Text, nullable=False, sa_column_kwargs={"server_default": ""},
    )
    created_at: datetime = Field(
        default_factory=utcnow, sa_type=DateTime(timezone=True), nullable=False
    )

    @property
    def logo_url(self) -> str | None:
        """Relative URL of the logo; `v` is a content hash (see User.avatar_url)."""
        if not self.logo_key:
            return None
        return f"/org/logo?v={self.logo_key.rsplit('/', 1)[-1].removesuffix('.png')}"

