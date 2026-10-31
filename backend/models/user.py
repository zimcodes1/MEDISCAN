import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, String
from sqlmodel import Field, SQLModel

from backend.models.base import utcnow


class UserRole(str, Enum):
    clinician = "clinician"
    radiologist = "radiologist"
    admin = "admin"  # organisation admin; NOT the platform operator


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    # Always store lowercased/stripped; normalise in the auth layer.
    email: str = Field(sa_type=String(320), unique=True, index=True, nullable=False)
    hashed_password: str = Field(sa_type=String(255), nullable=False)
    full_name: str = Field(sa_type=String(200), nullable=False)
    role: UserRole = Field(
        default=UserRole.clinician, sa_type=String(20), nullable=False
    )
    organisation_id: uuid.UUID = Field(
        foreign_key="organisations.id", index=True, nullable=False, ondelete="RESTRICT"
    )
    # Profile. The avatar is stored in object storage; only its key lives here.
    job_title: str | None = Field(default=None, sa_type=String(100))
    phone_number: str | None = Field(default=None, sa_type=String(20))
    avatar_key: str | None = Field(default=None, sa_type=String(200))
    # The platform operator who approves new organisations. Separate from the
    # organisation `admin` role; grants no access to other organisations' data.
    is_platform_admin: bool = Field(default=False, nullable=False)
    # Self-registered accounts start unapproved; an admin must approve them.
    is_approved: bool = Field(default=False, nullable=False)
    # Admin kill-switch (deactivate/reactivate), separate from approval.
    is_active: bool = Field(default=True, nullable=False)
    created_at: datetime = Field(
        default_factory=utcnow, sa_type=DateTime(timezone=True), nullable=False
    )
    updated_at: datetime = Field(
        default_factory=utcnow,
        sa_type=DateTime(timezone=True),
        nullable=False,
        sa_column_kwargs={"onupdate": utcnow},
    )

    @property
    def avatar_url(self) -> str | None:
        """Relative URL of the picture. `v` is a content hash, so a new upload gets
        a new URL and browsers never show a stale picture."""
        if not self.avatar_key:
            return None
        version = self.avatar_key.rsplit("/", 1)[-1].removesuffix(".png")
        return f"/users/{self.id}/avatar?v={version}"

