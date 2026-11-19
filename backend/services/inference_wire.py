"""Wire format between the API (client) and the inference service (server).
Both sides validate it strictly: neither trusts the other's input."""
import base64
import binascii

from pydantic import BaseModel, Field

from backend.services.inference_types import FindingResult

MAX_HEATMAP_BYTES = 2 * 1024 * 1024
_PNG_MAGIC = b"\x89PNG\r\n\x1a\n"


class WireFinding(BaseModel):
    # Length limits match the database columns, so a saved scan can never fail on them.
    condition: str = Field(min_length=1, max_length=100)
    score: float = Field(ge=0, le=1, allow_inf_nan=False)
    model_name: str = Field(min_length=1, max_length=100)
    model_version: str = Field(min_length=1, max_length=100)
    experimental: bool
    heatmap_base64: str | None = Field(default=None, max_length=(MAX_HEATMAP_BYTES * 4) // 3 + 8)


class WireResponse(BaseModel):
    backend: str = Field(max_length=50)
    findings: list[WireFinding] = Field(min_length=1, max_length=10)


def to_wire(results: list[FindingResult], backend: str) -> WireResponse:
    return WireResponse(
        backend=backend,
        findings=[
            WireFinding(
                condition=r.condition, score=r.score, model_name=r.model_name,
                model_version=r.model_version, experimental=r.experimental,
                heatmap_base64=(
                    base64.b64encode(r.heatmap_png).decode("ascii") if r.heatmap_png else None
                ),
            )
            for r in results
        ],
    )


def from_wire(response: WireResponse) -> list[FindingResult]:
    """Raises ValueError if a heatmap is not a small, valid-looking PNG."""
    out = []
    for f in response.findings:
        heatmap = None
        if f.heatmap_base64 is not None:
            try:
                heatmap = base64.b64decode(f.heatmap_base64, validate=True)
            except (binascii.Error, ValueError) as exc:
                raise ValueError("heatmap is not valid base64") from exc
            if len(heatmap) > MAX_HEATMAP_BYTES or not heatmap.startswith(_PNG_MAGIC):
                raise ValueError("heatmap is not a PNG within the size limit")
        out.append(
            FindingResult(
                condition=f.condition, score=f.score, model_name=f.model_name,
                model_version=f.model_version, experimental=f.experimental,
                heatmap_png=heatmap,
            )
        )
    return out
