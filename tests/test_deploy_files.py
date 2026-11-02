"""The Modal deploy files cannot be run here, but they can be loaded: Modal
validates every decorator argument when the module is imported, so a typo in
a parameter name fails this test instead of failing at deploy time."""
import importlib.util
from pathlib import Path

import pytest

modal = pytest.importorskip("modal")
DEPLOY = Path(__file__).resolve().parents[1] / "deploy"


def load(name: str):
    spec = importlib.util.spec_from_file_location(f"deploy_{name}", DEPLOY / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_modal_inference_app_loads():
    m = load("modal_inference")
    assert isinstance(m.app, modal.App) and m.app.name == "mediscan-inference"
    assert hasattr(m, "Inference") and hasattr(m.Inference, "web")


def test_modal_api_app_loads():
    m = load("modal_api")
    assert isinstance(m.app, modal.App) and m.app.name == "mediscan-api"
    assert hasattr(m, "web")


def test_render_blueprint_keeps_secrets_out_of_the_file():
    text = (DEPLOY.parent / "render.yaml").read_text()
    for name in ("DATABASE_URL", "JWT_SECRET_KEY", "S3_SECRET_ACCESS_KEY", "INFERENCE_TOKEN"):
        assert f"key: {name}, sync: false" in text
