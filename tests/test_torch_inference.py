import asyncio
import importlib.util
import threading
import time

import numpy as np
import pytest
from PIL import Image

from backend.core.config import Settings
from backend.scripts.check_models import validate_findings
from backend.services.imaging import cam_to_overlay_png
from backend.services.inference_service import FindingResult, build_inference_service
from backend.services.torch_inference import (
    DENSENET_WEIGHTS, EngineConfig, TbResult, TorchEngine, TorchInferenceService,
    build_findings, resolve_positive_label, select_cam_labels,
)

GOOD = dict(database_url="sqlite+aiosqlite:///:memory:", jwt_secret_key="x" * 40, _env_file=None)
SCORES = {"Pneumonia": 0.2, "Cardiomegaly": 0.4, "Nodule": 0.3, "Mass": 0.8, "Fracture": 0.1}


def cam(value: float) -> np.ndarray:
    return np.full((224, 224), value, dtype=np.float32)


# ------------------------------------------------------- aggregation
def test_nodule_and_mass_become_one_condition_using_the_max():
    f = {x.condition: x for x in build_findings(
        scores=SCORES, cams={"Mass": cam(0.9), "Nodule": cam(0.1)},
        densenet_version="txrv-1.0.1", tb=None)}
    nm = f["Lung Nodule / Mass"]
    assert nm.score == 0.8
    assert nm.heatmap_png == cam_to_overlay_png(cam(0.9))  # the heatmap of the higher one (Mass)


def test_tie_prefers_nodule():
    scores = {**SCORES, "Nodule": 0.5, "Mass": 0.5}
    assert select_cam_labels(scores) == ["Pneumonia", "Cardiomegaly", "Nodule"]
    assert select_cam_labels(SCORES) == ["Pneumonia", "Cardiomegaly", "Mass"]


def test_findings_order_names_and_flags():
    out = build_findings(
        scores=SCORES, cams={"Pneumonia": cam(0.5), "Cardiomegaly": cam(0.5), "Mass": cam(0.5)},
        densenet_version="txrv-1.0.1",
        tb=TbResult(score=0.7, model_name="org/tb-model", model_version="abc123"))
    assert [f.condition for f in out] == ["Pneumonia", "Cardiomegaly", "Lung Nodule / Mass", "Tuberculosis"]
    assert all(f.model_name == DENSENET_WEIGHTS and not f.experimental for f in out[:3])
    tb = out[3]
    assert tb.experimental and tb.heatmap_png is None
    assert (tb.model_name, tb.model_version, tb.score) == ("org/tb-model", "abc123", 0.7)
    assert all(f.heatmap_png for f in out[:3])


def test_tb_is_omitted_when_the_model_is_not_configured():
    out = build_findings(scores=SCORES, cams={}, densenet_version="v", tb=None)
    assert [f.condition for f in out] == ["Pneumonia", "Cardiomegaly", "Lung Nodule / Mass"]


def test_missing_gradcam_degrades_to_scores_without_heatmaps():
    out = build_findings(scores=SCORES, cams={}, densenet_version="v", tb=None)
    assert [f.heatmap_png for f in out] == [None, None, None]
    assert out[0].score == 0.2


def test_scores_are_clamped_and_non_finite_rejected():
    out = build_findings(scores={**SCORES, "Pneumonia": 1.3, "Cardiomegaly": -0.2},
                         cams={}, densenet_version="v", tb=None)
    assert out[0].score == 1.0 and out[1].score == 0.0
    for bad in (float("nan"), float("inf")):
        with pytest.raises(ValueError):
            build_findings(scores={**SCORES, "Pneumonia": bad}, cams={}, densenet_version="v", tb=None)
    with pytest.raises(ValueError):
        build_findings(scores={**SCORES, "Mass": float("nan")}, cams={}, densenet_version="v", tb=None)


def test_missing_label_in_model_output_is_an_error():
    scores = {k: v for k, v in SCORES.items() if k != "Mass"}
    with pytest.raises(ValueError, match="Mass"):
        build_findings(scores=scores, cams={}, densenet_version="v", tb=None)


# ------------------------------------------------ TB label resolution
@pytest.mark.parametrize("labels, expected", [
    ({0: "Normal", 1: "Tuberculosis"}, 1),
    ({"0": "NORMAL", "1": "TB"}, 1),
    ({0: "Non-Tuberculosis", 1: "Tuberculosis"}, 1),   # must not pick the negative class
    ({0: "no_tuberculosis", 1: "tuberculosis"}, 1),
    ({0: "negative", 1: "positive"}, 1),
    ({0: "TB-negative", 1: "TB-positive"}, 1),
    ({0: "Normal", 1: "Pneumonia", 2: "Tuberculosis"}, 2),
])
def test_positive_label_is_inferred_safely(labels, expected):
    assert resolve_positive_label(labels, None) == expected


@pytest.mark.parametrize("labels", [
    {0: "LABEL_0", 1: "LABEL_1"},             # nothing to go on
    {0: "Tuberculosis", 1: "TB-suspect"},     # ambiguous
    {0: "healthy", 1: "sick"},
])
def test_ambiguous_labels_refuse_to_guess(labels):
    with pytest.raises(ValueError, match="TB_POSITIVE_LABEL"):
        resolve_positive_label(labels, None)


def test_explicit_positive_label_wins_and_must_match_exactly_one():
    assert resolve_positive_label({0: "LABEL_0", 1: "LABEL_1"}, "label_1") == 1
    with pytest.raises(ValueError):
        resolve_positive_label({0: "a", 1: "b"}, "c")


# ------------------------------------------------------------- service
def finding() -> FindingResult:
    return FindingResult(condition="Pneumonia", score=0.5, model_name="m", model_version="v")


class FakeEngine:
    def __init__(self, delay=0.03, fail=False):
        self.delay, self.fail = delay, fail
        self.loaded = 0
        self.active = self.max_active = self.calls = 0
        self.threads: set[int] = set()
        self._guard = threading.Lock()

    def load(self):
        self.loaded += 1
        if self.fail:
            raise RuntimeError("weights missing")

    def analyse(self, image):
        with self._guard:
            self.active += 1
            self.max_active = max(self.max_active, self.active)
        self.threads.add(threading.get_ident())
        time.sleep(self.delay)
        with self._guard:
            self.active -= 1
            self.calls += 1
        if self.fail:
            raise ValueError("boom")
        return [finding()]


IMG = Image.new("L", (64, 64))


async def test_requests_are_serialised_and_run_off_the_event_loop():
    engine = FakeEngine()
    svc = TorchInferenceService(engine)
    await svc.startup()
    results = await asyncio.gather(*[svc.predict(IMG) for _ in range(6)])
    assert engine.loaded == 1 and engine.calls == 6 and len(results) == 6
    assert engine.max_active == 1  # never two analyses at once
    assert threading.get_ident() not in engine.threads  # event loop thread stayed free


async def test_cancelling_a_request_never_lets_two_analyses_overlap():
    engine = FakeEngine(delay=0.05)
    svc = TorchInferenceService(engine)
    first = asyncio.create_task(svc.predict(IMG))
    await asyncio.sleep(0.01)  # first is now running in its worker thread
    first.cancel()
    second = asyncio.create_task(svc.predict(IMG))
    await asyncio.gather(first, second, return_exceptions=True)
    assert engine.max_active == 1


async def test_errors_propagate_and_do_not_wedge_the_lock():
    engine = FakeEngine(fail=True)
    svc = TorchInferenceService(engine)
    for _ in range(2):  # second call proves the lock was released
        with pytest.raises(ValueError, match="boom"):
            await svc.predict(IMG)


async def test_startup_failure_surfaces_instead_of_serving_without_models():
    with pytest.raises(RuntimeError, match="weights missing"):
        await TorchInferenceService(FakeEngine(fail=True)).startup()


# --------------------------------------------------- factory & settings
def test_factory_builds_torch_service_without_importing_torch():
    svc = build_inference_service(Settings(**GOOD, inference_backend="torch"))
    assert isinstance(svc, TorchInferenceService) and isinstance(svc.engine, TorchEngine)
    assert svc.backend_name == "torch"


@pytest.mark.skipif(importlib.util.find_spec("torch") is not None, reason="torch is installed")
def test_loading_without_the_ml_packages_gives_an_actionable_error():
    with pytest.raises(RuntimeError, match="requirements-ml.txt"):
        TorchEngine(EngineConfig()).load()


def test_blank_tb_settings_mean_disabled():
    s = Settings(**GOOD, tb_model_id="  ", tb_model_revision="", tb_positive_label="")
    assert s.tb_model_id is None and s.tb_model_revision is None and s.tb_positive_label is None
    assert Settings(**GOOD, tb_model_id="org/model").tb_model_id == "org/model"


# ------------------------------------------------- check_models helpers
def _ok_results(tb: bool):
    heat = cam_to_overlay_png(cam(0.9))
    out = [FindingResult(condition=c, score=0.5, model_name="m", model_version="v", heatmap_png=heat)
           for c in ("Pneumonia", "Cardiomegaly", "Lung Nodule / Mass")]
    if tb:
        out.append(FindingResult(condition="Tuberculosis", score=0.1, model_name="t",
                                 model_version="v", experimental=True))
    return out


def test_validate_findings_accepts_a_correct_result():
    assert validate_findings(_ok_results(tb=True), expect_tb=True) == []
    assert validate_findings(_ok_results(tb=False), expect_tb=False) == []


def test_validate_findings_flags_each_kind_of_problem():
    bad = _ok_results(tb=True)
    bad[0] = FindingResult(condition="Pneumonia", score=0.5, model_name="m", model_version="v", heatmap_png=None)
    bad[1] = FindingResult(condition="Cardiomegaly", score=float("nan"), model_name="m", model_version="v",
                           heatmap_png=cam_to_overlay_png(cam(0.9)))
    bad[2] = FindingResult(condition="Lung Nodule / Mass", score=0.5, model_name="m", model_version="v",
                           heatmap_png=cam_to_overlay_png(cam(0.0)))  # fully transparent
    bad[3] = FindingResult(condition="Tuberculosis", score=0.1, model_name="t", model_version="v",
                           experimental=False, heatmap_png=b"x")
    text = " | ".join(validate_findings(bad, expect_tb=True))
    assert "no heatmap" in text and "not a number" in text and "fully transparent" in text
    assert "must be flagged experimental" in text and "must not have a heatmap" in text
    assert "expected" in " | ".join(validate_findings(_ok_results(tb=False), expect_tb=True))


def test_engine_config_from_env_and_settings():
    cfg = EngineConfig.from_env({"TB_MODEL_ID": " org/tb ", "TB_MODEL_REVISION": "", "TORCH_THREADS": "3",
                                 "GRADCAM_ENABLED": "false"})
    assert (cfg.tb_model_id, cfg.tb_model_revision, cfg.torch_threads, cfg.gradcam_enabled) == ("org/tb", None, 3, False)
    default = EngineConfig.from_env({})
    assert default.tb_model_id is None and default.gradcam_enabled and default.torch_threads >= 1
    s = Settings(**GOOD, tb_model_id="org/m", tb_model_revision="abc", torch_threads=4, gradcam_enabled=False)
    assert EngineConfig.from_settings(s) == EngineConfig(4, False, "org/m", "abc", None)
