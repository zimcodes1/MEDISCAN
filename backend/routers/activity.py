from fastapi import APIRouter, Depends, Query
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.core.database import get_session
from backend.core.deps import get_current_user
from backend.models import User
from backend.schemas.activity import ActivityOut
from backend.services import activity_service

router = APIRouter(tags=["activity"])


@router.get("/activity", response_model=list[ActivityOut])
async def activity(
    limit: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    return await activity_service.recent(session, user, limit)
