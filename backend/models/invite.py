import uuid
from datetime import datetime

from sqlalchemy import DateTime, Index, String
from sqlmodel import Field, SQLModel

from backend.models.base import utcnow


class Invite(SQLModel, table=True):
    """An invitation to join an organisation. Only a hash of the token is stored;
    the raw token is shown to the inviting admin once, in the invite link."""

    __tablename__ = "invites"
    __table_args__ = (Index("ix_invites_org_email", "organisation_id", "email"),)

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    organisation_id: uuid.UUID = Field(
        foreign_key="organisations.id", nullable=False, ondelete="CASCADE"
    )
    email: str = Field(sa_type=String(320), nullable=False)
    role: str = Field(sa_type=String(20), nullable=False)  # admin | clinician | radiologist
    token_hash: str = Field(sa_type=String(64), unique=True, nullable=False)
    created_by_id: uuid.UUID = Field(foreign_key="users.id", nullable=False, ondelete="RESTRICT")
    created_at: datetime = Field(
        default_factory=utcnow, sa_type=DateTime(timezone=True), nullable=False
    )
    expires_at: datetime = Field(sa_type=DateTime(timezone=True), nullable=False)
    accepted_at: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
    accepted_user_id: uuid.UUID | None = Field(
        default=None, foreign_key="users.id", ondelete="SET NULL"
    )
