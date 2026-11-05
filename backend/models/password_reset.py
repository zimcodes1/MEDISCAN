import uuid
from datetime import datetime

from sqlalchemy import DateTime, String
from sqlmodel import Field, SQLModel

from backend.models.base import utcnow


class PasswordReset(SQLModel, table=True):
    """A one-time link an organisation admin hands to a colleague who has lost
    their password. Only a hash of the token is stored; the raw token is shown to
    the admin once, inside the link. At most one unused link exists per user."""

    __tablename__ = "password_resets"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(
        foreign_key="users.id", index=True, nullable=False, ondelete="CASCADE"
    )
    token_hash: str = Field(sa_type=String(64), unique=True, nullable=False)
    created_by_id: uuid.UUID = Field(foreign_key="users.id", nullable=False, ondelete="RESTRICT")
    created_at: datetime = Field(
        default_factory=utcnow, sa_type=DateTime(timezone=True), nullable=False
    )
    expires_at: datetime = Field(sa_type=DateTime(timezone=True), nullable=False)
    used_at: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
