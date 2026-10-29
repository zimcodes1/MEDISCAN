import uuid
from datetime import datetime

from sqlalchemy import DateTime, String
from sqlmodel import Field, SQLModel

from backend.models.base import utcnow


class Invitation(SQLModel, table=True):
    """A staff invitation. Only the SHA-256 of the emailed token is stored."""

    __tablename__ = "invitations"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    organisation_id: uuid.UUID = Field(
        foreign_key="organisations.id", index=True, nullable=False, ondelete="CASCADE"
    )
    email: str = Field(sa_type=String(320), index=True, nullable=False)
    full_name: str = Field(sa_type=String(200), nullable=False)
    role: str = Field(sa_type=String(20), nullable=False)
    token_hash: str = Field(sa_type=String(64), unique=True, index=True, nullable=False)
    invited_by_id: uuid.UUID | None = Field(
        default=None, foreign_key="users.id", ondelete="SET NULL"
    )
    expires_at: datetime = Field(sa_type=DateTime(timezone=True), nullable=False)
    accepted_at: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
    revoked_at: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
    created_at: datetime = Field(
        default_factory=utcnow, sa_type=DateTime(timezone=True), nullable=False
    )
