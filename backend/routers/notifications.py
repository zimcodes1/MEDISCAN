import uuid

from fastapi import APIRouter, Depends, Query, Response
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.core.database import get_session
from backend.core.deps import get_current_user
from backend.models import User
from backend.schemas.notification import (
    NotificationOut, NotificationPrefs, NotificationPrefsUpdate, UnreadCount,
)
from backend.services import notification_service

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationOut])
async def list_notifications(
    unread_only: bool = False,
    limit: int = Query(30, ge=1, le=100), offset: int = Query(0, ge=0),
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Your notifications, newest first."""
    return await notification_service.list_for(
        session, user, unread_only=unread_only, limit=limit, offset=offset
    )


@router.get("/unread-count", response_model=UnreadCount)
async def unread_count(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    return UnreadCount(unread=await notification_service.unread_count(session, user))


@router.post("/read-all", status_code=204)
async def read_all(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    await notification_service.mark_all_read(session, user)
    return Response(status_code=204)


@router.get("/preferences", response_model=NotificationPrefs)
async def get_preferences(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    return await notification_service.get_prefs(session, user)


@router.put("/preferences", response_model=NotificationPrefs)
async def update_preferences(
    body: NotificationPrefsUpdate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Choose which notifications you receive. Only the fields you send change."""
    return await notification_service.update_prefs(session, user, body)


@router.post("/{notification_id}/read", status_code=204)
async def read_one(
    notification_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    await notification_service.mark_read(session, user, notification_id)
    return Response(status_code=204)
