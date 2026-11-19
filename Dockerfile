# MediScan API for Hugging Face Spaces (Docker SDK, CPU basic: 2 vCPU / 16 GB).
FROM python:3.11-slim

# libgl1 / libglib2.0-0: needed to import opencv, which grad-cam depends on.
RUN apt-get update \
 && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 \
 && rm -rf /var/lib/apt/lists/*

# Spaces runs containers as UID 1000.
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HF_HOME=/home/user/.cache/huggingface
WORKDIR /home/user/app

# CPU-only PyTorch first: the default wheel drags in multi-GB CUDA libraries.
RUN pip install --user torch torchvision --index-url https://download.pytorch.org/whl/cpu

COPY --chown=user requirements.txt requirements-ml.txt ./
RUN pip install --user -r requirements-ml.txt

COPY --chown=user backend ./backend
COPY --chown=user migrations ./migrations
COPY --chown=user alembic.ini ./
COPY --chown=user deploy/prefetch_models.py ./deploy/prefetch_models.py

# Bake model weights into the image so a cold start never depends on GitHub / the Hub.
# Space *variables* (not secrets) are passed to the build as build args.
ARG TB_MODEL_ID
ARG TB_MODEL_REVISION
RUN TB_MODEL_ID="$TB_MODEL_ID" TB_MODEL_REVISION="$TB_MODEL_REVISION" python deploy/prefetch_models.py

EXPOSE 7860
# ONE worker on purpose: rate-limit counters and the model lock live in process memory.
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "7860", "--workers", "1"]
