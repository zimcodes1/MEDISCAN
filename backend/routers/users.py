import uuid

from fastapi import APIRouter, Depends, Response
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.core.database import get_session
from backend.core.deps import get_current_user, get_storage
from backend.core.rate_limit import IMAGE_PER_USER
from backend.models import User
from backend.services import profile_service
from backend.services.storage_service import StorageService

router = APIRouter(tags=["users"])


@router.get("/users/{user_id}/avatar")
async def get_avatar(
    user_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    storage: StorageService = Depends(get_storage),
):
    """A colleague's picture. 404 for anyone outside your organisation."""
    IMAGE_PER_USER.check(str(user.id))
    data = await profile_service.get_avatar_bytes(session, storage, user, user_id)
    return Response(
        content=data, media_type="image/png",
        headers={
            # The URL carries a content hash, so a changed picture is a new URL.
            "Cache-Control": "private, max-age=3600",
            "X-Content-Type-Options": "nosniff",
        },
    )
