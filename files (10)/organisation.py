import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, String, Text
from sqlmodel import Field, SQLModel

from backend.models.base import utcnow


class Organisation(SQLModel, table=True):
    """A hospital / clinic / diagnostic centre. Staff, patients and scans belong to one."""

    __tablename__ = "organisations"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str = Field(sa_type=String(200), nullable=False)
    org_type: str = Field(default="hospital", sa_type=String(30), nullable=False)
    state: str = Field(default="", sa_type=String(50), nullable=False)
    phone_number: str | None = Field(default=None, sa_type=String(20))
    logo_key: str | None = Field(default=None, sa_type=String(512))
    billing_email: str | None = Field(default=None, sa_type=String(320))
    expected_radiologists: int | None = Field(default=None)

    # Organisation-wide defaults (Settings > Scan & Report Defaults)
    default_priority: str = Field(
        default="routine", sa_type=String(10), nullable=False,
        sa_column_kwargs={"server_default": "routine"},
    )
    report_disclaimer: str | None = Field(default=None, sa_type=Text)
    auto_assign_to_id: uuid.UUID | None = Field(default=None)  # no FK: avoids a users<->orgs cycle

    # Plan / usage (no payment integration: trial limits only)
    plan: str = Field(
        default="trial", sa_type=String(30), nullable=False,
        sa_column_kwargs={"server_default": "trial"},
    )
    scan_limit: int = Field(default=50, nullable=False, sa_column_kwargs={"server_default": "50"})
    trial_ends_at: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))

    onboarding_completed_at: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
    is_active: bool = Field(default=True, nullable=False, sa_column_kwargs={"server_default": "true"})
    deactivated_at: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
    created_at: datetime = Field(
        default_factory=utcnow, sa_type=DateTime(timezone=True), nullable=False
    )
