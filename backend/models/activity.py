import uuid
from datetime import datetime

from sqlalchemy import DateTime, Index, String
from sqlmodel import Field, SQLModel

from backend.models.base import utcnow


class Activity(SQLModel, table=True):
    """One line in an organisation's activity feed. Written at event time, in the
    same transaction as the event. Kept apart from `audit_logs` (which records
    views and logins, with IP addresses) so the feed can be shown to staff.
    Messages hold names and pseudonymous patient codes only: no clinical content."""

    __tablename__ = "activities"
    __table_args__ = (Index("ix_activities_org_created", "organisation_id", "created_at"),)

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    organisation_id: uuid.UUID = Field(
        foreign_key="organisations.id", nullable=False, ondelete="RESTRICT"
    )
    # scan_uploaded | scan_assigned | scan_reviewed | report_finalised | user_joined
    type: str = Field(sa_type=String(30), nullable=False)
    message: str = Field(sa_type=String(300), nullable=False)
    actor_id: uuid.UUID = Field(
        foreign_key="users.id", index=True, nullable=False, ondelete="RESTRICT"
    )
    scan_id: uuid.UUID | None = Field(
        default=None, foreign_key="scans.id", index=True, ondelete="SET NULL"
    )
    created_at: datetime = Field(
        default_factory=utcnow, sa_type=DateTime(timezone=True), nullable=False
    )
