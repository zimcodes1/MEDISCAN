import uuid
from datetime import datetime

from sqlalchemy import DateTime, String
from sqlmodel import Field, SQLModel

from backend.models.base import utcnow


class EmailToken(SQLModel, table=True):
    """Single-use link tokens (email verification, password reset), stored hashed."""

    __tablename__ = "email_tokens"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(
        foreign_key="users.id", index=True, nullable=False, ondelete="CASCADE"
    )
    purpose: str = Field(sa_type=String(30), nullable=False)  # verify_email | password_reset
    token_hash: str = Field(sa_type=String(64), unique=True, index=True, nullable=False)
    expires_at: datetime = Field(sa_type=DateTime(timezone=True), nullable=False)
    used_at: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
    created_at: datetime = Field(
        default_factory=utcnow, sa_type=DateTime(timezone=True), nullable=False
    )
