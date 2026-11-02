"""Verify the real models end to end (run on the Space, Colab or any machine
with the ML packages installed):

    python -m backend.scripts.check_models                 # synthetic image
    python -m backend.scripts.check_models --image xray.png

Loads the models, runs two predictions and validates every finding.
Scores on the synthetic image are meaningless: it only tests the plumbing.
"""
import argparse
import asyncio
import io
import math
import sys
import time

import numpy as np
from PIL import Image

from backend.core.config import get_settings
from backend.services.inference_types import FindingResult
from backend.services.torch_inference import EngineConfig, TorchEngine, TorchInferenceService

EXPECTED = ["Pneumonia", "Cardiomegaly", "Lung Nodule / Mass"]


def validate_findings(results: list[FindingResult], expect_tb: bool) -> list[str]:
    """Plain-language list of problems; empty means everything is as the API promises."""
    problems: list[str] = []
    expected = EXPECTED + (["Tuberculosis"] if expect_tb else [])
    names = [r.condition for r in results]
    if names != expected:
        problems.append(f"Conditions are {names}, expected {expected}")
    for r in results:
        if not (math.isfinite(r.score) and 0.0 <= r.score <= 1.0):
            problems.append(f"{r.condition}: score {r.score} is not a number between 0 and 1")
        if r.condition == "Tuberculosis":
            if not r.experimental:
                problems.append("Tuberculosis must be flagged experimental")
            if r.heatmap_png is not None:
                problems.append("Tuberculosis must not have a heatmap")
            continue
        if r.heatmap_png is None:
            problems.append(f"{r.condition}: no heatmap (Grad-CAM failed?)")
            continue
        try:
            img = Image.open(io.BytesIO(r.heatmap_png))
            img.load()
        except Exception:
            problems.append(f"{r.condition}: heatmap is not a readable PNG")
            continue
        if img.size != (224, 224) or img.mode != "RGBA":
            problems.append(f"{r.condition}: heatmap is {img.size} {img.mode}, expected 224x224 RGBA")
        elif img.getchannel("A").getextrema()[1] == 0:
            problems.append(f"{r.condition}: heatmap is fully transparent (Grad-CAM produced no signal)")
    return problems


def _synthetic_image() -> Image.Image:
    yy, xx = np.mgrid[0:512, 0:512]
    base = 90 + 60 * np.exp(-(((xx - 256) / 200.0) ** 2 + ((yy - 256) / 230.0) ** 2))
    noise = np.random.default_rng(0).normal(0, 6, base.shape)
    return Image.fromarray(np.clip(base + noise, 0, 255).astype(np.uint8), mode="L")


async def main(image_path: str | None) -> int:
    settings = get_settings()
    engine = TorchEngine(EngineConfig.from_settings(settings))
    service = TorchInferenceService(engine)

    started = time.perf_counter()
    try:
        await service.startup()
    except Exception as exc:
        print(f"FAILED while loading models: {type(exc).__name__}: {exc}")
        return 1
    print(f"Models loaded in {time.perf_counter() - started:.1f}s "
          f"(TB model: {'on' if engine.tb_enabled else 'OFF - TB_MODEL_ID not set'})")

    image = Image.open(image_path) if image_path else _synthetic_image()
    if not image_path:
        print("Using a synthetic image: scores are meaningless, this only checks the plumbing.")

    results: list[FindingResult] = []
    for attempt in (1, 2):
        t = time.perf_counter()
        results = await service.predict(image)
        print(f"Prediction {attempt}: {time.perf_counter() - t:.2f}s")

    print()
    for r in results:
        heat = "heatmap" if r.heatmap_png else "no heatmap"
        flag = " (experimental)" if r.experimental else ""
        print(f"  {r.condition:<20} score={r.score:.3f}  {heat}{flag}  [{r.model_name} {r.model_version}]")

    problems = validate_findings(results, expect_tb=engine.tb_enabled)
    if engine.gradcam_error:
        problems.append(f"Grad-CAM error: {engine.gradcam_error}")
    print()
    if problems:
        print("PROBLEMS FOUND:")
        for p in problems:
            print(f"  - {p}")
        return 1
    print("OK: models load, scores are valid and heatmaps render.")
    return 0


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--image", help="path to a chest X-ray PNG/JPEG (optional)")
    sys.exit(asyncio.run(main(ap.parse_args().image)))
