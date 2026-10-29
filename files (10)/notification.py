import uuid
from datetime import datetime

from sqlalchemy import DateTime, Index, String
from sqlmodel import Field, SQLModel

from backend.models.base import utcnow


class Notification(SQLModel, table=True):
    __tablename__ = "notifications"
    __table_args__ = (Index("ix_notifications_user_created", "user_id", "created_at"),)

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(
        foreign_key="users.id", index=True, nullable=False, ondelete="CASCADE"
    )
    kind: str = Field(sa_type=String(30), nullable=False)
    title: str = Field(sa_type=String(120), nullable=False)
    message: str = Field(sa_type=String(300), nullable=False)
    link: str | None = Field(default=None, sa_type=String(200))
    created_at: datetime = Field(
        default_factory=utcnow, sa_type=DateTime(timezone=True), nullable=False
    )
    read_at: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
