import uuid
from datetime import datetime

from sqlalchemy import DateTime, Index, String
from sqlmodel import Field, SQLModel

from backend.models.base import utcnow


class AuditLog(SQLModel, table=True):
    """Who did what to which record (e.g. action=scan.view)."""

    __tablename__ = "audit_logs"
    __table_args__ = (Index("ix_audit_resource", "resource_type", "resource_id"),)

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    # Kept (as NULL) if the user is later deleted, so history survives.
    user_id: uuid.UUID | None = Field(
        default=None, foreign_key="users.id", index=True, ondelete="SET NULL"
    )
    action: str = Field(sa_type=String(50), nullable=False)
    resource_type: str = Field(sa_type=String(50), nullable=False)
    resource_id: uuid.UUID | None = Field(default=None)
    ip_address: str | None = Field(default=None, sa_type=String(45))
    created_at: datetime = Field(
        default_factory=utcnow,
        sa_type=DateTime(timezone=True),
        nullable=False,
        index=True,
    )
