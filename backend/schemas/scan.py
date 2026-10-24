import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, field_validator

from backend.core.constants import CONDITION_ORDER, DISCLAIMER
from backend.core.flagging import finding_is_flagged
from backend.models import Scan, ScanStatus, User

Priority = Literal["routine", "urgent"]
Projection = Literal["pa", "ap", "lateral"]
ReviewStatus = Literal["pending", "reviewed"]


class UserRef(BaseModel):
    id: uuid.UUID
    full_name: str

    @classmethod
    def of(cls, user: User | None) -> "UserRef | None":
        return cls(id=user.id, full_name=user.full_name) if user is not None else None


class StoredFindingOut(BaseModel):
    id: uuid.UUID
    condition: str
    score: float
    confidence_pct: float
    has_heatmap: bool
    model_name: str
    model_version: str
    experimental: bool
    flagged: bool


class ScanOut(BaseModel):
    id: uuid.UUID
    patient_id: uuid.UUID
    status: ScanStatus
    content_type: str
    size_bytes: int
    created_at: datetime
    findings: list[StoredFindingOut]
    disclaimer: str
    # clinical workflow
    priority: Priority
    projection: Projection | None
    exam_date: date | None
    clinical_notes: str | None
    uploaded_by: UserRef | None
    assigned_to: UserRef | None
    review_status: ReviewStatus
    reviewed_at: datetime | None
    reviewed_by: UserRef | None
    is_flagged: bool  # computed, never stored

    @classmethod
    def from_scan(cls, scan: Scan, users: dict[uuid.UUID, User] | None = None) -> "ScanOut":
        users = users or {}

        def order(f) -> int:
            try:
                return CONDITION_ORDER.index(f.condition)
            except ValueError:
                return len(CONDITION_ORDER)

        findings = [
            StoredFindingOut(
                id=f.id, condition=f.condition, score=f.score,
                confidence_pct=round(f.score * 100, 1),
                has_heatmap=f.heatmap_key is not None,
                model_name=f.model_name, model_version=f.model_version,
                experimental=f.experimental,
                flagged=finding_is_flagged(f.condition, f.score, f.experimental),
            )
            for f in sorted(scan.findings, key=order)
        ]
        return cls(
            id=scan.id, patient_id=scan.patient_id, status=scan.status,
            content_type=scan.content_type, size_bytes=scan.size_bytes,
            created_at=scan.created_at, disclaimer=DISCLAIMER, findings=findings,
            priority=scan.priority, projection=scan.projection,
            exam_date=scan.exam_date, clinical_notes=scan.clinical_notes,
            uploaded_by=UserRef.of(users.get(scan.uploaded_by_id)),
            assigned_to=UserRef.of(users.get(scan.assigned_to_id)) if scan.assigned_to_id else None,
            review_status=scan.review_status, reviewed_at=scan.reviewed_at,
            reviewed_by=UserRef.of(users.get(scan.reviewed_by_id)) if scan.reviewed_by_id else None,
            is_flagged=any(f.flagged for f in findings),
        )


class ScanUpdate(BaseModel):
    """PATCH body. Only fields that are present change; `assigned_to_id: null`
    un-assigns. `priority` and `review_status` cannot be null."""

    priority: Priority | None = None
    assigned_to_id: uuid.UUID | None = None
    review_status: ReviewStatus | None = None

    @field_validator("priority", "review_status")
    @classmethod
    def _not_null(cls, v):
        if v is None:
            raise ValueError("must not be null")
        return v
