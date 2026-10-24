from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.core.database import get_session
from backend.core.deps import get_current_user
from backend.models import User
from backend.services import dashboard_service

router = APIRouter(tags=["dashboard"])


class StatsOut(BaseModel):
    total_scans: int
    pending_review: int
    urgent: int
    flagged: int
    reviewed_today: int


@router.get("/dashboard/stats", response_model=StatsOut)
async def dashboard_stats(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Counts for your organisation. `urgent` and `flagged` count scans still
    pending review; "today" is the Africa/Lagos calendar day."""
    return await dashboard_service.stats(session, user)
