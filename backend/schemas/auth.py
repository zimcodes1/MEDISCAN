import re
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from backend.models.user import UserRole


class RegisterRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=200)
    password: str = Field(min_length=10, max_length=72)

    @field_validator("password")
    @classmethod
    def _within_bcrypt_limit(cls, v: str) -> str:
        if len(v.encode()) > 72:
            raise ValueError("Password must be at most 72 bytes")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=20, max_length=256)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # access-token lifetime, seconds


class MessageResponse(BaseModel):
    detail: str


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    full_name: str
    role: UserRole
    is_approved: bool
    is_active: bool
    created_at: datetime
    job_title: str | None = None
    phone_number: str | None = None
    avatar_url: str | None = None
    is_platform_admin: bool = False


class OrgRef(BaseModel):
    id: uuid.UUID
    name: str


class MeOut(UserPublic):
    organisation: OrgRef


_USER_PHONE = re.compile(r"^\+?[0-9][0-9 ()\-]{6,19}$")


class ProfileUpdate(BaseModel):
    """PATCH /auth/me. Only the fields sent change; `null` clears a title or phone."""

    full_name: str | None = Field(default=None, min_length=1, max_length=200)
    job_title: str | None = Field(default=None, max_length=100)
    phone_number: str | None = Field(default=None, max_length=20)

    @field_validator("full_name")
    @classmethod
    def _name(cls, v):
        if v is None:
            raise ValueError("must not be null")
        v = v.strip()
        if not v:
            raise ValueError("must not be blank")
        return v

    @field_validator("phone_number")
    @classmethod
    def _phone(cls, v):
        if v is None:
            return v
        v = v.strip()
        if v == "":
            return None
        if not _USER_PHONE.match(v):
            raise ValueError("Enter a valid phone number")
        return v

    @field_validator("job_title")
    @classmethod
    def _title(cls, v):
        return (v.strip() or None) if v is not None else v


class PasswordChange(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=10, max_length=72)

    @field_validator("new_password")
    @classmethod
    def _within_bcrypt_limit(cls, v: str) -> str:
        if len(v.encode()) > 72:
            raise ValueError("Password must be at most 72 bytes")
        return v


class AvatarOut(BaseModel):
    avatar_url: str


class ResetPassword(BaseModel):
    """POST /auth/reset-password: sets a new password from an admin-issued link."""

    token: str = Field(min_length=20, max_length=200)
    new_password: str = Field(min_length=10, max_length=72)

    @field_validator("new_password")
    @classmethod
    def _within_bcrypt_limit(cls, v: str) -> str:
        if len(v.encode()) > 72:
            raise ValueError("Password must be at most 72 bytes")
        return v


class ResetTarget(BaseModel):
    id: uuid.UUID
    full_name: str
    email: str


class PasswordResetCreated(BaseModel):
    token: str          # shown once; only a hash is stored
    reset_url: str
    expires_at: datetime
    user: ResetTarget


class StaffUpdate(BaseModel):
    """PATCH /admin/users/{id}: what an organisation admin may change about a colleague.
    `null` or a blank title clears it."""

    job_title: str | None = Field(default=None, max_length=100)

    @field_validator("job_title")
    @classmethod
    def _title(cls, v):
        return (v.strip() or None) if v is not None else v
