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
