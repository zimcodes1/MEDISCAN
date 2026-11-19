import uuid
from datetime import datetime

from sqlalchemy import DateTime, String
from sqlmodel import Field, SQLModel

from backend.models.base import utcnow


class RefreshToken(SQLModel, table=True):
    """Server-side record of an issued refresh token.

    Only the SHA-256 hex digest of the token is stored (never the token).
    Tokens rotate on every use and share a `family_id`; presenting an already
    revoked token means theft/reuse, so the whole family gets revoked.
    """

    __tablename__ = "refresh_tokens"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(
        foreign_key="users.id", index=True, nullable=False, ondelete="CASCADE"
    )
    token_hash: str = Field(
        sa_type=String(64), unique=True, index=True, nullable=False
    )
    family_id: uuid.UUID = Field(index=True, nullable=False)
    expires_at: datetime = Field(sa_type=DateTime(timezone=True), nullable=False)
    revoked_at: datetime | None = Field(
        default=None, sa_type=DateTime(timezone=True)
    )
    created_at: datetime = Field(
        default_factory=utcnow, sa_type=DateTime(timezone=True), nullable=False
    )
