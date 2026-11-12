import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel

NotificationType = Literal["scan_assigned", "scan_reviewed", "report_finalised", "staff_joined"]


class NotificationOut(BaseModel):
    id: uuid.UUID
    type: NotificationType
    message: str
    scan_id: uuid.UUID | None
    created_at: datetime
    read: bool


class UnreadCount(BaseModel):
    unread: int


class NotificationPrefs(BaseModel):
    scan_assigned: bool
    scan_reviewed: bool
    report_finalised: bool
    staff_joined: bool
    in_app_sound: bool


class NotificationPrefsUpdate(BaseModel):
    """PUT /notifications/preferences. Only the fields sent change."""

    scan_assigned: bool | None = None
    scan_reviewed: bool | None = None
    report_finalised: bool | None = None
    staff_joined: bool | None = None
    in_app_sound: bool | None = None
