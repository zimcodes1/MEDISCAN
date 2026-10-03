"""Types shared by every inference implementation. Deliberately free of
config/database imports so the Modal image can use it without them."""
from dataclasses import dataclass
from typing import Protocol

from PIL import Image


@dataclass(frozen=True)
class FindingResult:
    condition: str
    score: float  # raw model output in [0, 1]; NOT a calibrated probability
    model_name: str
    model_version: str
    experimental: bool = False
    heatmap_png: bytes | None = None  # RGBA overlay; None when the model has no heatmap


class InferenceService(Protocol):
    backend_name: str

    async def startup(self) -> None: ...
    async def shutdown(self) -> None: ...
    async def predict(
        self, image: Image.Image, png_bytes: bytes | None = None
    ) -> list[FindingResult]:
        """`png_bytes` is the already-encoded image; remote services send it
        as is, local ones ignore it."""
        ...
