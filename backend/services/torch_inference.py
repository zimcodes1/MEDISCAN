"""Real inference: TorchXRayVision DenseNet121 with Grad-CAM heatmaps, plus an
optional Hugging Face classifier for tuberculosis (reported as experimental,
without a heatmap).

PyTorch and friends are imported lazily inside TorchEngine.load(), so this
module imports without them. Everything except the model calls is plain
Python and unit-tested; the model calls themselves are verified on real
hardware with:  python -m backend.scripts.check_models
"""
import asyncio
import logging
import math
import os
import re
import threading
import time
from dataclasses import dataclass
from typing import Protocol

import numpy as np
from PIL import Image
from starlette.concurrency import run_in_threadpool

from backend.services.imaging import cam_to_overlay_png, to_gray_uint8
from backend.services.inference_types import FindingResult

logger = logging.getLogger("mediscan.torch")

DENSENET_WEIGHTS = "densenet121-res224-all"
INPUT_SIZE = 224
NODULE_MASS_CONDITION = "Lung Nodule / Mass"
TB_CONDITION = "Tuberculosis"
REQUIRED_LABELS = ("Pneumonia", "Cardiomegaly", "Nodule", "Mass")


# ------------------------------------------------------------ pure logic
@dataclass(frozen=True)
class TbResult:
    score: float
    model_name: str
    model_version: str


def select_cam_labels(scores: dict[str, float]) -> list[str]:
    """Which DenseNet outputs get a Grad-CAM. 'Nodule' and 'Mass' are reported
    as one condition (the max of the two), so only the higher one needs a map."""
    nodule_like = "Nodule" if scores["Nodule"] >= scores["Mass"] else "Mass"
    return ["Pneumonia", "Cardiomegaly", nodule_like]


def _checked_score(label: str, value: float) -> float:
    value = float(value)
    if not math.isfinite(value):
        raise ValueError(f"Model produced a non-finite score for {label}")
    return min(1.0, max(0.0, value))


def build_findings(
    *,
    scores: dict[str, float],
    cams: dict[str, "np.ndarray | None"],
    densenet_version: str,
    tb: TbResult | None,
) -> list[FindingResult]:
    """Raw model outputs -> the API's findings (always in the same order)."""
    for label in REQUIRED_LABELS:
        if label not in scores:
            raise ValueError(f"Model output is missing the '{label}' label")
    s = {label: _checked_score(label, scores[label]) for label in REQUIRED_LABELS}
    nodule_label = "Nodule" if s["Nodule"] >= s["Mass"] else "Mass"

    def overlay(label: str) -> bytes | None:
        cam = cams.get(label)
        return cam_to_overlay_png(cam) if cam is not None else None

    def dense(condition: str, score: float, heat_label: str) -> FindingResult:
        return FindingResult(
            condition=condition, score=score, model_name=DENSENET_WEIGHTS,
            model_version=densenet_version, experimental=False,
            heatmap_png=overlay(heat_label),
        )

    findings = [
        dense("Pneumonia", s["Pneumonia"], "Pneumonia"),
        dense("Cardiomegaly", s["Cardiomegaly"], "Cardiomegaly"),
        dense(NODULE_MASS_CONDITION, max(s["Nodule"], s["Mass"]), nodule_label),
    ]
    if tb is not None:
        findings.append(
            FindingResult(
                condition=TB_CONDITION, score=_checked_score(TB_CONDITION, tb.score),
                model_name=tb.model_name, model_version=tb.model_version,
                experimental=True, heatmap_png=None,  # MobileViT has no conv feature map
            )
        )
    return findings


_POSITIVE_RE = re.compile(r"tuberc|(^|[\W_])tb([\W_]|$)|positive", re.I)
_NEGATIVE_RE = re.compile(r"(^|[\W_])(non|no|not|normal|negative|healthy)([\W_]|$)", re.I)


def resolve_positive_label(id2label: dict, configured: str | None) -> int:
    """Index of the class that means 'tuberculosis'. Refuses to guess: picking
    the wrong class would silently invert the result."""
    labels = {int(k): str(v) for k, v in id2label.items()}
    listing = ", ".join(f"{i}={name!r}" for i, name in sorted(labels.items()))
    if configured:
        wanted = configured.strip().lower()
        hits = [i for i, name in labels.items() if name.lower() == wanted]
        if len(hits) != 1:
            raise ValueError(f"TB_POSITIVE_LABEL={configured!r} does not match exactly one label. Labels: {listing}")
        return hits[0]
    hits = [i for i, name in labels.items() if _POSITIVE_RE.search(name) and not _NEGATIVE_RE.search(name)]
    if len(hits) != 1:
        raise ValueError(
            "Cannot tell which TB model label means tuberculosis. "
            f"Set TB_POSITIVE_LABEL to one of: {listing}"
        )
    return hits[0]


# ----------------------------------------------------------- the engine

@dataclass(frozen=True)
class EngineConfig:
    """Everything the engine needs, independent of the API's Settings: the same
    engine runs inside the API process and inside the Modal container."""

    torch_threads: int = 2
    gradcam_enabled: bool = True
    tb_model_id: str | None = None
    tb_model_revision: str | None = None
    tb_positive_label: str | None = None

    @classmethod
    def from_settings(cls, settings) -> "EngineConfig":
        return cls(
            torch_threads=settings.torch_threads, gradcam_enabled=settings.gradcam_enabled,
            tb_model_id=settings.tb_model_id, tb_model_revision=settings.tb_model_revision,
            tb_positive_label=settings.tb_positive_label,
        )

    @classmethod
    def from_env(cls, env=None) -> "EngineConfig":
        env = os.environ if env is None else env

        def opt(name: str) -> str | None:
            return (env.get(name) or "").strip() or None

        return cls(
            torch_threads=int(opt("TORCH_THREADS") or (os.cpu_count() or 2)),
            gradcam_enabled=(opt("GRADCAM_ENABLED") or "true").lower() not in ("0", "false", "no"),
            tb_model_id=opt("TB_MODEL_ID"), tb_model_revision=opt("TB_MODEL_REVISION"),
            tb_positive_label=opt("TB_POSITIVE_LABEL"),
        )

class InferenceEngine(Protocol):
    """Blocking (synchronous) model runner; the service handles async + locking."""

    def load(self) -> None: ...
    def analyse(self, image: Image.Image) -> list[FindingResult]: ...


class TorchEngine:
    def __init__(self, config: EngineConfig):
        self._s = config
        self._lock = threading.Lock()  # one analysis at a time, even if a caller is cancelled
        self._densenet = None
        self._tb_model = None
        self.gradcam_error: str | None = None

    @property
    def tb_enabled(self) -> bool:
        return self._tb_model is not None

    # -- loading --
    def load(self) -> None:
        try:
            import torch
            import torchxrayvision as xrv
        except ImportError as exc:
            raise RuntimeError(
                "INFERENCE_BACKEND=torch needs the ML packages. "
                "Install them with: pip install -r requirements-ml.txt"
            ) from exc

        s = self._s
        started = time.perf_counter()
        torch.set_num_threads(s.torch_threads)
        model = xrv.models.DenseNet(weights=DENSENET_WEIGHTS).eval()
        labels = list(model.pathologies)
        missing = [name for name in REQUIRED_LABELS if name not in labels]
        if missing:
            raise RuntimeError(f"DenseNet is missing expected labels {missing}; it reports {labels}")
        if not hasattr(model, "features"):
            raise RuntimeError("DenseNet has no 'features' module to attach Grad-CAM to")

        self._torch, self._xrv, self._densenet = torch, xrv, model
        self._label_index = {name: i for i, name in enumerate(labels)}
        self._densenet_version = f"txrv-{getattr(xrv, '__version__', 'unknown')}"
        self._normalize = getattr(xrv.datasets, "normalize", None) or xrv.utils.normalize

        if s.tb_model_id:
            self._load_tb(s)
        else:
            logger.warning("TB_MODEL_ID is not set: tuberculosis analysis is DISABLED")

        logger.info("Models loaded in %.1fs; running warm-up", time.perf_counter() - started)
        self.analyse(Image.new("L", (256, 256), 128))  # fails startup on any wiring problem
        if s.gradcam_enabled and self.gradcam_error:
            logger.error("Grad-CAM is NOT working (%s): heatmaps will be missing", self.gradcam_error)

    def _load_tb(self, s: EngineConfig) -> None:
        from transformers import AutoImageProcessor, AutoModelForImageClassification

        kwargs = {"revision": s.tb_model_revision} if s.tb_model_revision else {}
        if not s.tb_model_revision:
            logger.warning("TB_MODEL_REVISION is not set: the model may change under you; pin a commit hash")
        self._tb_processor = AutoImageProcessor.from_pretrained(s.tb_model_id, **kwargs)
        self._tb_model = AutoModelForImageClassification.from_pretrained(
            s.tb_model_id, use_safetensors=True, **kwargs  # safetensors only: no pickled code
        ).eval()
        self._tb_index = (
            0 if self._tb_model.config.num_labels == 1
            else resolve_positive_label(self._tb_model.config.id2label, s.tb_positive_label)
        )
        self._tb_version = s.tb_model_revision or "unpinned"
        logger.info("TB model %s loaded (positive class index %d)", s.tb_model_id, self._tb_index)

    # -- inference --
    def analyse(self, image: Image.Image) -> list[FindingResult]:
        with self._lock:
            arr = to_gray_uint8(image)
            x = self._prepare(arr)
            with self._torch.no_grad():
                out = self._densenet(x)[0].tolist()
            scores = dict(zip(self._densenet.pathologies, out))
            cams = {}
            if self._s.gradcam_enabled:
                cams = self._gradcams(x, select_cam_labels(scores))
            return build_findings(
                scores=scores, cams=cams, densenet_version=self._densenet_version,
                tb=self._tb_result(arr),
            )

    def _prepare(self, arr: np.ndarray):
        """Same chain as the TorchXRayVision docs: normalise to [-1024, 1024],
        centre-crop to a square, resize to 224."""
        xrv, torch = self._xrv, self._torch
        img = self._normalize(arr, 255)[None, ...]  # (1, H, W)
        img = xrv.datasets.XRayCenterCrop()(img)
        img = xrv.datasets.XRayResizer(INPUT_SIZE)(img)
        return torch.from_numpy(np.ascontiguousarray(img, dtype=np.float32))[None, ...]

    def _gradcams(self, x, labels: list[str]) -> dict[str, np.ndarray]:
        """One batched forward/backward pass for all requested labels. A failure
        degrades to 'scores without heatmaps' instead of failing the request."""
        try:
            from pytorch_grad_cam import GradCAM
            from pytorch_grad_cam.utils.model_targets import ClassifierOutputTarget

            targets = [ClassifierOutputTarget(self._label_index[name]) for name in labels]
            batch = x.repeat(len(labels), 1, 1, 1)
            with GradCAM(model=self._densenet, target_layers=[self._densenet.features[-1]]) as cam:
                maps = cam(input_tensor=batch, targets=targets)
            self.gradcam_error = None
            return {name: maps[k] for k, name in enumerate(labels)}
        except Exception as exc:
            self.gradcam_error = f"{type(exc).__name__}: {exc}"
            logger.exception("Grad-CAM failed; returning scores without heatmaps")
            return {}

    def _tb_result(self, arr: np.ndarray) -> TbResult | None:
        if self._tb_model is None:
            return None
        torch = self._torch
        rgb = Image.fromarray(arr.astype(np.uint8), mode="L").convert("RGB")
        inputs = self._tb_processor(images=rgb, return_tensors="pt")
        with torch.no_grad():
            logits = self._tb_model(**inputs).logits
        if logits.shape[-1] == 1:
            score = float(torch.sigmoid(logits)[0, 0])
        else:
            score = float(torch.softmax(logits, dim=-1)[0, self._tb_index])
        return TbResult(score=score, model_name=self._s.tb_model_id, model_version=self._tb_version)


# ----------------------------------------------------------- the service
class TorchInferenceService:
    """Async wrapper: models load once at startup; requests are serialised
    (Grad-CAM hooks are not safe to share between concurrent passes) and the
    CPU-bound work runs in a worker thread so the event loop stays responsive."""

    backend_name = "torch"

    def __init__(self, engine: InferenceEngine):
        self.engine = engine
        self._lock = asyncio.Lock()  # keeps waiting requests off the thread pool
        # The real guard. If a client disconnects, its request is cancelled and the
        # asyncio lock is released, but the worker thread keeps running. This lock
        # lives inside the thread, so the next analysis waits for it to finish.
        self._thread_lock = threading.Lock()

    def _analyse_exclusive(self, image: Image.Image) -> list[FindingResult]:
        with self._thread_lock:
            return self.engine.analyse(image)

    async def startup(self) -> None:
        started = time.perf_counter()
        await run_in_threadpool(self.engine.load)
        logger.info("Inference ready after %.1fs", time.perf_counter() - started)

    async def shutdown(self) -> None:
        pass

    async def predict(self, image: Image.Image, png_bytes: bytes | None = None) -> list[FindingResult]:
        async with self._lock:
            return await run_in_threadpool(self._analyse_exclusive, image)
