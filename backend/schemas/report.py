import uuid
from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, Field, StringConstraints, field_validator

from backend.models import Report
from backend.schemas.scan import UserRef

LungField = Literal[
    "clear", "consolidation", "increased-opacity", "pleural-effusion",
    "possible-nodule-mass", "other",
]
AffectedSide = Literal["left", "right", "bilateral", "na"]
Severity = Literal["mild", "moderate", "severe"]
PrimaryImpression = Literal[
    "normal", "pneumonia-bacterial", "pneumonia-viral", "tuberculosis", "cardiomegaly",
    "lung-nodule-mass", "pleural-effusion", "other",
]
RecommendedAction = Literal[
    "no-action", "follow-up-xray", "ct-scan", "immediate-review", "refer-specialist",
]
FollowUpUnit = Literal["days", "weeks", "months"]
AiAgreement = Literal["agree", "partially-agree", "disagree"]
ReportStatus = Literal["draft", "final"]

# Free text is patient data. Capped, and never logged anywhere.
Text5000 = Annotated[str, StringConstraints(max_length=5000)]


class ReportUpdate(BaseModel):
    """PUT body. Every field is optional; only the fields present are changed
    (so a partial autosave never wipes the rest). `null` clears a nullable field
    and resets a text field to an empty string."""

    lung_fields: list[LungField] | None = None
    affected_side: AffectedSide | None = None
    severity: Severity | None = None
    detailed_findings: Text5000 | None = None
    primary_impression: PrimaryImpression | None = None
    secondary_findings: Text5000 | None = None
    impression_narrative: Text5000 | None = None
    recommended_action: RecommendedAction | None = None
    follow_up_timeframe: int | None = Field(default=None, ge=1, le=999)
    follow_up_unit: FollowUpUnit | None = None
    additional_notes: Text5000 | None = None
    ai_agreement: AiAgreement | None = None
    ai_disagreement_reason: Text5000 | None = None

    @field_validator("lung_fields")
    @classmethod
    def _dedupe(cls, v):
        # keep first occurrences, in order
        return list(dict.fromkeys(v)) if v is not None else v


class ReportOut(BaseModel):
    id: uuid.UUID
    scan_id: uuid.UUID
    author: UserRef
    status: ReportStatus
    lung_fields: list[str]
    affected_side: str | None
    severity: str | None
    detailed_findings: str
    primary_impression: str | None
    secondary_findings: str
    impression_narrative: str
    recommended_action: str | None
    follow_up_timeframe: int | None
    follow_up_unit: str | None
    additional_notes: str
    ai_agreement: str | None
    ai_disagreement_reason: str | None
    created_at: datetime
    updated_at: datetime
    finalised_at: datetime | None

    @classmethod
    def of(cls, r: Report, author: UserRef) -> "ReportOut":
        return cls(
            id=r.id, scan_id=r.scan_id, author=author, status=r.status,
            lung_fields=list(r.lung_fields or []), affected_side=r.affected_side,
            severity=r.severity, detailed_findings=r.detailed_findings,
            primary_impression=r.primary_impression,
            secondary_findings=r.secondary_findings,
            impression_narrative=r.impression_narrative,
            recommended_action=r.recommended_action,
            follow_up_timeframe=r.follow_up_timeframe, follow_up_unit=r.follow_up_unit,
            additional_notes=r.additional_notes, ai_agreement=r.ai_agreement,
            ai_disagreement_reason=r.ai_disagreement_reason,
            created_at=r.created_at, updated_at=r.updated_at, finalised_at=r.finalised_at,
        )


class ReportSummary(BaseModel):
    id: uuid.UUID
    scan_id: uuid.UUID
    patient_code: str
    status: ReportStatus
    author: UserRef
    primary_impression: str | None
    created_at: datetime
    updated_at: datetime
    finalised_at: datetime | None
