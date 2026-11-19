"""Modal app: the MediScan API (FastAPI) on Modal, scaling to zero when idle.

One-time setup:
    modal secret create mediscan-api \
        ENVIRONMENT=production STORAGE_BACKEND=s3 INFERENCE_BACKEND=remote \
        DATABASE_URL=... JWT_SECRET_KEY=... \
        S3_ENDPOINT_URL=... S3_BUCKET=... S3_ACCESS_KEY_ID=... S3_SECRET_ACCESS_KEY=... S3_REGION=... \
        INFERENCE_URL=<url printed by deploying modal_inference.py> INFERENCE_TOKEN=<same token> \
        CORS_ORIGINS='["https://your-frontend.example"]' MAX_INFLIGHT_PREDICTIONS=4

Deploy / update (from the project root):
    modal deploy deploy/modal_api.py

Database migrations are run from your own machine against Neon (alembic upgrade head).
"""
import modal

app = modal.App("mediscan-api")
secret = modal.Secret.from_name("mediscan-api")

image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install_from_requirements("requirements.txt")
    .add_local_python_source("backend")  # must come last
)


@app.function(
    image=image,
    secrets=[secret],
    cpu=1.0,
    memory=1024,
    timeout=300,
    scaledown_window=300,
    max_containers=1,  # rate-limit counters and the prediction cap live in process memory
)
@modal.concurrent(max_inputs=20)
@modal.asgi_app()
def web():
    from backend.main import app as fastapi_app  # its lifespan runs on Modal too

    return fastapi_app
