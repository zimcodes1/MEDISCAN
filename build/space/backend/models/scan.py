import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import CheckConstraint, DateTime, Index, String
from sqlmodel import Field, Relationship, SQLModel

from backend.models.base import utcnow


class ScanStatus(str, Enum):
    pending = "pending"
    completed = "completed"
    failed = "failed"


class Scan(SQLModel, table=True):
    """One uploaded X-ray. The image itself lives in object storage;
    only its key and integrity metadata are stored here."""

    __tablename__ = "scans"
    __table_args__ = (Index("ix_scans_patient_created", "patient_id", "created_at"),)

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    # Deleting a patient deletes their scans (supports erasure requests).
    patient_id: uuid.UUID = Field(
        foreign_key="patients.id", index=True, nullable=False, ondelete="CASCADE"
    )
    uploaded_by_id: uuid.UUID = Field(
        foreign_key="users.id", index=True, nullable=False, ondelete="RESTRICT"
    )
    image_key: str = Field(sa_type=String(512), nullable=False)
    image_sha256: str = Field(sa_type=String(64), index=True, nullable=False)
    content_type: str = Field(sa_type=String(100), nullable=False)
    size_bytes: int = Field(nullable=False)
    status: ScanStatus = Field(
        default=ScanStatus.pending, sa_type=String(20), nullable=False
    )
    error_message: str | None = Field(default=None, sa_type=String(500))
    created_at: datetime = Field(
        default_factory=utcnow, sa_type=DateTime(timezone=True), nullable=False
    )

    # Findings are tiny (<= ~4 per scan) and loaded eagerly, which avoids
    # lazy-load errors in async sessions.
    findings: list["Finding"] = Relationship(
        back_populates="scan",
        sa_relationship_kwargs={"cascade": "all, delete-orphan", "lazy": "selectin"},
    )


class Finding(SQLModel, table=True):
    """One condition result for a scan. Stores the raw model `score` (0-1),
    not a confidence percentage: sigmoid outputs are not calibrated."""

    __tablename__ = "findings"
    __table_args__ = (
        CheckConstraint("score >= 0 AND score <= 1", name="ck_findings_score_range"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    scan_id: uuid.UUID = Field(
        foreign_key="scans.id", index=True, nullable=False, ondelete="CASCADE"
    )
    condition: str = Field(sa_type=String(100), nullable=False)
    score: float = Field(nullable=False)
    # Object-storage key of the heatmap overlay; NULL for TB (no heatmap).
    heatmap_key: str | None = Field(default=None, sa_type=String(512))
    model_name: str = Field(sa_type=String(100), nullable=False)
    model_version: str = Field(sa_type=String(100), nullable=False)
    experimental: bool = Field(default=False, nullable=False)
    created_at: datetime = Field(
        default_factory=utcnow, sa_type=DateTime(timezone=True), nullable=False
    )

    scan: Scan | None = Relationship(back_populates="findings")
