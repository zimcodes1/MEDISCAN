import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, String
from sqlmodel import Field, SQLModel

from backend.models.base import utcnow


class UserRole(str, Enum):
    clinician = "clinician"
    admin = "admin"


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
