import re
import uuid
from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, EmailStr, Field, StringConstraints, field_validator

from backend.core.constants import NIGERIAN_STATES, ORG_PHONE_PATTERN, ORG_TYPES

OrgType = Literal["hospital", "diagnostic_centre", "clinic", "telemedicine"]
InviteRole = Literal["admin", "clinician", "radiologist"]
_PHONE = re.compile(ORG_PHONE_PATTERN)
Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=200)]
assert set(ORG_TYPES) == set(OrgType.__args__)  # one list, two spellings: keep in step


def _check_state(v: str) -> str:
    if v not in NIGERIAN_STATES:
        raise ValueError("Unknown state")
    return v


def _check_phone(v: str) -> str:
    v = v.strip()
    if not _PHONE.match(v):
        raise ValueError("Enter a Nigerian phone number, e.g. 08012345678 or +2348012345678")
    return v


class OrganisationRegister(BaseModel):
    """POST /auth/register-organisation (api-contract.md section 0)."""

    organisation_name: Name
    organisation_type: OrgType
    state: str
    phone_number: str
    full_name: str = Field(min_length=1, max_length=200)
    email: EmailStr
    password: str = Field(min_length=10, max_length=72)
    radiologist_count: int | None = Field(default=None, ge=0, le=10000)

    _state = field_validator("state")(_check_state)
    _phone = field_validator("phone_number")(_check_phone)

    @field_validator("password")
    @classmethod
    def _within_bcrypt_limit(cls, v: str) -> str:
        if len(v.encode()) > 72:
            raise ValueError("Password must be at most 72 bytes")
        return v


class OrgOut(BaseModel):
    id: uuid.UUID
    name: str
    type: str
    state: str | None
    phone_number: str | None
    logo_url: str | None
    radiologist_count: int | None


class OrgUpdate(BaseModel):
    """PUT /org. Only the fields sent change; `radiologist_count: null` clears it."""

    name: Name | None = None
    type: OrgType | None = None
    state: str | None = None
    phone_number: str | None = None
    radiologist_count: int | None = Field(default=None, ge=0, le=10000)

    @field_validator("name", "type", "state", "phone_number")
    @classmethod
    def _not_null(cls, v):
        if v is None:
            raise ValueError("must not be null")
        return v

    @field_validator("state")
    @classmethod
    def _state(cls, v):
        return _check_state(v)

    @field_validator("phone_number")
    @classmethod
    def _phone(cls, v):
        return _check_phone(v)


class OrgSettings(BaseModel):
    default_priority: Literal["routine", "urgent"]
    auto_assign_to_id: uuid.UUID | None
    report_disclaimer: str


class OrgSettingsUpdate(BaseModel):
    """PUT /org/settings. Only the fields sent change; `auto_assign_to_id: null`
    switches back to manual assignment."""

    default_priority: Literal["routine", "urgent"] | None = None
    auto_assign_to_id: uuid.UUID | None = None
    report_disclaimer: Annotated[str, StringConstraints(max_length=2000)] | None = None

    @field_validator("default_priority", "report_disclaimer")
    @classmethod
    def _not_null(cls, v):
        if v is None:
            raise ValueError("must not be null")
        return v


class InviteCreate(BaseModel):
    email: EmailStr
    role: InviteRole
    # Optional. Applied to the new account, which cannot change it afterwards.
    job_title: str | None = Field(default=None, max_length=100)

    @field_validator("job_title")
    @classmethod
    def _title(cls, v):
        return (v.strip() or None) if v is not None else v


class InviteOut(BaseModel):
    id: uuid.UUID
    email: str
    role: str
    job_title: str | None = None
    created_at: datetime
    expires_at: datetime
    status: Literal["pending", "expired"]


class InviteCreated(BaseModel):
    id: uuid.UUID
    email: str
    role: str
    job_title: str | None = None
    token: str          # shown once; only a hash is stored
    invite_url: str
    expires_at: datetime


class AcceptInvite(BaseModel):
    token: str = Field(min_length=20, max_length=200)
    full_name: str = Field(min_length=1, max_length=200)
    password: str = Field(min_length=10, max_length=72)

    @field_validator("password")
    @classmethod
    def _within_bcrypt_limit(cls, v: str) -> str:
        if len(v.encode()) > 72:
            raise ValueError("Password must be at most 72 bytes")
        return v


class AdminRef(BaseModel):
    id: uuid.UUID
    full_name: str
    email: str


class PlatformOrgOut(BaseModel):
    id: uuid.UUID
    name: str
    type: str
    state: str | None
    phone_number: str | None
    radiologist_count: int | None
    status: Literal["pending", "active", "suspended"]
    created_at: datetime
    admin: AdminRef | None
