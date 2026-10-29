import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, String, Text
from sqlmodel import Field, SQLModel

from backend.models.base import utcnow


class Report(SQLModel, table=True):
    """A radiologist's structured report for one scan. Locked once submitted."""

    __tablename__ = "reports"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    report_code: str = Field(sa_type=String(32), unique=True, index=True, nullable=False)
    scan_id: uuid.UUID = Field(
        foreign_key="scans.id", unique=True, index=True, nullable=False, ondelete="CASCADE"
    )
    organisation_id: uuid.UUID | None = Field(
        default=None, foreign_key="organisations.id", index=True, ondelete="RESTRICT"
    )
    author_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False, ondelete="RESTRICT")
    status: str = Field(default="draft", sa_type=String(10), nullable=False, index=True)

    lung_fields: list | None = Field(default=None, sa_type=JSON)
    affected_side: str | None = Field(default=None, sa_type=String(30))
    severity: str | None = Field(default=None, sa_type=String(30))
    detailed_findings: str | None = Field(default=None, sa_type=Text)

    primary_impression: str | None = Field(default=None, sa_type=String(300))
    secondary_findings: str | None = Field(default=None, sa_type=Text)
    impression_narrative: str | None = Field(default=None, sa_type=Text)

    recommended_action: str | None = Field(default=None, sa_type=String(300))
    follow_up_timeframe: str | None = Field(default=None, sa_type=String(50))
    follow_up_unit: str | None = Field(default=None, sa_type=String(10))
    additional_notes: str | None = Field(default=None, sa_type=Text)

    ai_agreement: str | None = Field(default=None, sa_type=String(20))
    disagreement_reason: str | None = Field(default=None, sa_type=Text)

    submitted_at: datetime | None = Field(default=None, sa_type=DateTime(timezone=True), index=True)
    created_at: datetime = Field(
        default_factory=utcnow, sa_type=DateTime(timezone=True), nullable=False
    )
    updated_at: datetime = Field(
        default_factory=utcnow, sa_type=DateTime(timezone=True), nullable=False,
        sa_column_kwargs={"onupdate": utcnow},
    )
