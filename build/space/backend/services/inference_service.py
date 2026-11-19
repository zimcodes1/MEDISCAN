"""Inference behind an interface, so the API works identically with the mock
(local development) and the real PyTorch service (Hugging Face Space)."""
import hashlib
import io
from dataclasses import dataclass
from typing import Protocol

from PIL import Image, ImageDraw, ImageFilter
from starlette.concurrency import run_in_threadpool

from backend.core.config import Settings


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
    async def predict(self, image: Image.Image) -> list[FindingResult]: ...


# ---------------------------------------------------------------- mock
MOCK_VERSION = "mock-0.1"
_HEATMAP_SIZE = 224
# (condition, model_name, experimental, has_heatmap)
_MOCK_CONDITIONS = [
    ("Pneumonia", "mock-densenet121-res224-all", False, True),
    ("Cardiomegaly", "mock-densenet121-res224-all", False, True),
    ("Lung Nodule / Mass", "mock-densenet121-res224-all", False, True),
    ("Tuberculosis", "mock-mobilevit_small-chest_xray", True, False),  # no heatmap
]


def _mock_heatmap(cx: int, cy: int) -> bytes:
    mask = Image.new("L", (_HEATMAP_SIZE, _HEATMAP_SIZE), 0)
    ImageDraw.Draw(mask).ellipse((cx - 40, cy - 40, cx + 40, cy + 40), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(25))
    overlay = Image.new("RGBA", (_HEATMAP_SIZE, _HEATMAP_SIZE), (255, 40, 0, 0))
    overlay.putalpha(mask.point(lambda v: int(v * 0.7)))
    buf = io.BytesIO()
    overlay.save(buf, format="PNG")
    return buf.getvalue()


class MockInferenceService:
    """Deterministic fake: the same image always yields the same scores, so UI
    work and tests are repeatable. Model names are prefixed 'mock-' so mock
    results can never be mistaken for real ones in the database."""

    backend_name = "mock"

    async def startup(self) -> None:
        pass

    async def shutdown(self) -> None:
        pass

    async def predict(self, image: Image.Image) -> list[FindingResult]:
        return await run_in_threadpool(self._predict_sync, image)

    def _predict_sync(self, image: Image.Image) -> list[FindingResult]:
        thumb = image.convert("L").resize((64, 64))
        digest = hashlib.sha256(thumb.tobytes()).digest()
        results = []
        for i, (condition, model_name, experimental, has_heatmap) in enumerate(_MOCK_CONDITIONS):
            score = round(int.from_bytes(digest[i * 4 : i * 4 + 4], "big") / 2**32, 4)
            heatmap = None
            if has_heatmap:
                cx = 40 + digest[16 + i * 2] % 145
                cy = 40 + digest[17 + i * 2] % 145
                heatmap = _mock_heatmap(cx, cy)
            results.append(
                FindingResult(
                    condition=condition, score=score, model_name=model_name,
                    model_version=MOCK_VERSION, experimental=experimental,
                    heatmap_png=heatmap,
                )
            )
        return results


# ------------------------------------------------------------- factory
def build_inference_service(settings: Settings) -> InferenceService:
    if settings.inference_backend == "mock":
        return MockInferenceService()
    raise RuntimeError(
        "INFERENCE_BACKEND=torch is not implemented yet (step 6). "
        "Set INFERENCE_BACKEND=mock for local development."
    )
