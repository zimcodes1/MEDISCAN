import uuid

from pydantic import BaseModel, Field


class FindingOut(BaseModel):
    condition: str
    score: float = Field(ge=0, le=1, description="Raw model output, 0 to 1. Not a calibrated probability.")
    confidence_pct: float = Field(description="score x 100, rounded. See the disclaimer.")
    heatmap_base64: str | None = Field(
        description="Base64 of a 224x224 RGBA PNG overlay (no data: prefix). "
                    "Null when the model produces no heatmap (e.g. tuberculosis)."
    )
    model_name: str
    model_version: str
    experimental: bool


class PredictResponse(BaseModel):
    scan_id: uuid.UUID | None = Field(description="Set only when the scan was saved (patient_id supplied).")
    saved: bool
    inference_backend: str
    findings: list[FindingOut]
    disclaimer: str
