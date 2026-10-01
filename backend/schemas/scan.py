import uuid
from datetime import datetime

from pydantic import BaseModel

from backend.core.constants import CONDITION_ORDER, DISCLAIMER
from backend.models import Scan, ScanStatus


class StoredFindingOut(BaseModel):
    condition: str
    score: float
    confidence_pct: float
    has_heatmap: bool
    model_name: str
    model_version: str
    experimental: bool


class ScanOut(BaseModel):
    id: uuid.UUID
    patient_id: uuid.UUID
    status: ScanStatus
    content_type: str
    size_bytes: int
    created_at: datetime
    findings: list[StoredFindingOut]
    disclaimer: str

    @classmethod
    def from_scan(cls, scan: Scan) -> "ScanOut":
        def order(f) -> int:
            try:
                return CONDITION_ORDER.index(f.condition)
            except ValueError:
                return len(CONDITION_ORDER)

        return cls(
            id=scan.id, patient_id=scan.patient_id, status=scan.status,
            content_type=scan.content_type, size_bytes=scan.size_bytes,
            created_at=scan.created_at, disclaimer=DISCLAIMER,
            findings=[
                StoredFindingOut(
                    condition=f.condition, score=f.score,
                    confidence_pct=round(f.score * 100, 1),
                    has_heatmap=f.heatmap_key is not None,
                    model_name=f.model_name, model_version=f.model_version,
                    experimental=f.experimental,
                )
                for f in sorted(scan.findings, key=order)
            ],
        )
