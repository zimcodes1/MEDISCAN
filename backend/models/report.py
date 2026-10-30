import uuid
from datetime import datetime

from sqlalchemy import JSON, Column, DateTime, Index, Integer, String, Text
from sqlmodel import Field, SQLModel

from backend.models.base import utcnow


class Report(SQLModel, table=True):
    """The radiologist's structured report for one scan (at most one per scan).

    Every text column is patient data: it is never logged and never copied into
    the activity feed or audit log. Enum-like values are plain strings validated
    at the API edge (see schemas/report.py), not database enums.

    A final report is immutable. A future amendment workflow belongs in its own
    table (addenda), not in edits to this row."""

    __tablename__ = "reports"
    __table_args__ = (Index("ix_reports_org_updated", "organisation_id", "updated_at"),)

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    # Deleting a scan (or its patient, for an erasure request) deletes its report.
    scan_id: uuid.UUID = Field(
        foreign_key="scans.id", unique=True, nullable=False, ondelete="CASCADE"
    )
    # Copied from the scan on creation, never from request input.
    organisation_id: uuid.UUID = Field(
        foreign_key="organisations.id", nullable=False, ondelete="RESTRICT"
    )
    author_id: uuid.UUID = Field(foreign_key="users.id", nullable=False, ondelete="RESTRICT")
    status: str = Field(default="draft", sa_type=String(10), nullable=False)  # draft | final

    lung_fields: list[str] = Field(default_factory=list, sa_column=Column(JSON, nullable=False))
    affected_side: str | None = Field(default=None, sa_type=String(10))
    severity: str | None = Field(default=None, sa_type=String(10))
    detailed_findings: str = Field(default="", sa_type=Text, nullable=False)
    primary_impression: str | None = Field(default=None, sa_type=String(30))
    secondary_findings: str = Field(default="", sa_type=Text, nullable=False)
    impression_narrative: str = Field(default="", sa_type=Text, nullable=False)
    recommended_action: str | None = Field(default=None, sa_type=String(30))
    follow_up_timeframe: int | None = Field(default=None, sa_type=Integer)
    follow_up_unit: str | None = Field(default=None, sa_type=String(10))
    additional_notes: str = Field(default="", sa_type=Text, nullable=False)
    ai_agreement: str | None = Field(default=None, sa_type=String(20))
    ai_disagreement_reason: str | None = Field(default=None, sa_type=Text)

    created_at: datetime = Field(
        default_factory=utcnow, sa_type=DateTime(timezone=True), nullable=False
    )
    updated_at: datetime = Field(
        default_factory=utcnow, sa_type=DateTime(timezone=True), nullable=False
    )
    finalised_at: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
