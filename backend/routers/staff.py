import uuid
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.core.database import get_session
from backend.core.deps import get_current_user
from backend.models import User

router = APIRouter(tags=["staff"])


class StaffOut(BaseModel):
    id: uuid.UUID
    full_name: str
    role: str


@router.get("/staff", response_model=list[StaffOut])
async def list_staff(
    role: Literal["clinician", "radiologist", "admin"] | None = None,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Approved, active colleagues in your organisation: just what a dropdown needs."""
    stmt = select(User).where(
        User.organisation_id == user.organisation_id,
        User.is_approved.is_(True), User.is_active.is_(True),
    )
    if role is not None:
        stmt = stmt.where(User.role == role)
    return (await session.exec(stmt.order_by(User.full_name, User.id))).all()
