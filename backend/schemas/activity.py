import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from backend.schemas.scan import UserRef

ActivityType = Literal[
    "scan_uploaded", "scan_assigned", "scan_reviewed", "report_finalised", "user_joined"
]


class ActivityOut(BaseModel):
    id: uuid.UUID
    type: ActivityType
    message: str
    actor: UserRef
    scan_id: uuid.UUID | None
    created_at: datetime
