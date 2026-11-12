import uuid
from datetime import datetime

from sqlalchemy import DateTime, Index, String
from sqlmodel import Field, SQLModel

from backend.models.base import utcnow


class Notification(SQLModel, table=True):
    """One in-app notification for one person. Written in the same transaction as the
    event it describes. Messages hold names and pseudonymous patient codes only: no
    clinical content (the same rule as the activity feed)."""

    __tablename__ = "notifications"
    __table_args__ = (Index("ix_notifications_user_created", "user_id", "created_at"),)

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(
        foreign_key="users.id", nullable=False, ondelete="CASCADE"  # the recipient
    )
    organisation_id: uuid.UUID = Field(
        foreign_key="organisations.id", nullable=False, ondelete="CASCADE"
    )
    # scan_assigned | scan_reviewed | report_finalised | staff_joined
    type: str = Field(sa_type=String(30), nullable=False)
    message: str = Field(sa_type=String(300), nullable=False)
    scan_id: uuid.UUID | None = Field(
        default=None, foreign_key="scans.id", ondelete="SET NULL"
    )
    actor_id: uuid.UUID | None = Field(
        default=None, foreign_key="users.id", ondelete="SET NULL"
    )
    created_at: datetime = Field(
        default_factory=utcnow, sa_type=DateTime(timezone=True), nullable=False
    )
    read_at: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))


class NotificationPreference(SQLModel, table=True):
    """Which notifications a person wants. No row means the defaults (everything on)."""

    __tablename__ = "notification_preferences"

    user_id: uuid.UUID = Field(foreign_key="users.id", primary_key=True, ondelete="CASCADE")
    scan_assigned: bool = Field(default=True, nullable=False)
    scan_reviewed: bool = Field(default=True, nullable=False)
    report_finalised: bool = Field(default=True, nullable=False)
    staff_joined: bool = Field(default=True, nullable=False)
    in_app_sound: bool = Field(default=True, nullable=False)  # a client setting, stored per person
