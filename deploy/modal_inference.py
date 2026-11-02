"""Modal app: the real models behind an authenticated HTTPS endpoint.

One-time setup (from the project root):
    pip install modal
    modal setup                                    # opens a browser to log in
    modal secret create mediscan-inference \
        INFERENCE_TOKEN=<long random string> \
        TB_MODEL_ID=<huggingface repo id> TB_MODEL_REVISION=<commit hash>

Deploy / update:
    modal deploy deploy/modal_inference.py

Modal prints the endpoint URL; set it as INFERENCE_URL on the API, with the same
INFERENCE_TOKEN. Generate a token with:
    python -c "import secrets; print(secrets.token_urlsafe(48))"
"""
import modal

app = modal.App("mediscan-inference")
secret = modal.Secret.from_name("mediscan-inference")


def download_models() -> None:
    """Runs once at image build time, so a cold start never downloads weights."""
    import os

    import torchxrayvision as xrv

    xrv.models.DenseNet(weights="densenet121-res224-all")
    repo = os.environ.get("TB_MODEL_ID", "").strip()
    if repo:
        from huggingface_hub import snapshot_download

        revision = os.environ.get("TB_MODEL_REVISION", "").strip() or None
        snapshot_download(repo, revision=revision, allow_patterns=["*.json", "*.safetensors", "*.txt"])


image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("libgl1", "libglib2.0-0")  # opencv (a grad-cam dependency) needs these
    .pip_install("torch", "torchvision", index_url="https://download.pytorch.org/whl/cpu")  # CPU only
    .pip_install(
        "torchxrayvision>=1.0", "grad-cam>=1.5", "transformers>=4.40", "safetensors",
        "fastapi>=0.115", "pillow>=10.4", "numpy>=1.26",
    )
    .run_function(download_models, secrets=[secret])
    .add_local_python_source("backend")  # must come last
)

with image.imports():  # only imported inside the container; torch is not needed locally
    from backend.services.inference_server import create_inference_app
    from backend.services.torch_inference import EngineConfig, TorchEngine, TorchInferenceService


@app.cls(
    image=image,
    secrets=[secret],
    cpu=2.0,
    memory=4096,
    timeout=300,
    scaledown_window=300,   # stays warm 5 minutes after the last request, then scales to zero
    max_containers=1,       # caps cost: never more than one container
)
@modal.concurrent(max_inputs=8)  # requests queue inside the container; the engine runs one at a time
class Inference:
    @modal.enter()
    def load(self) -> None:
        import os

        engine = TorchEngine(EngineConfig.from_env())
        engine.load()  # fails the container start loudly if anything is wrong
        self.web_app = create_inference_app(TorchInferenceService(engine), os.environ["INFERENCE_TOKEN"])

    @modal.asgi_app()
    def web(self):
        return self.web_app
