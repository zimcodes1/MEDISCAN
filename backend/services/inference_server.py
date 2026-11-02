"""The HTTP side of the inference service. A plain FastAPI app that wraps any
InferenceService, so it is tested here with the mock and deployed on Modal
with the real models. Imports nothing heavy (no config, database or torch)."""
import hmac
import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette.concurrency import run_in_threadpool

from backend.core.errors import AppError
from backend.services.inference_types import InferenceService
from backend.services.inference_wire import WireResponse, to_wire
from backend.services.upload_validation import validate_image

logger = logging.getLogger("mediscan.inference_server")


def create_inference_app(
    service: InferenceService, token: str, *,
    max_bytes: int = 12 * 1024 * 1024, max_pixels: int = 50_000_000, min_side: int = 64,
) -> FastAPI:
    if len(token) < 32:
        raise ValueError("The inference token must be at least 32 characters")
    expected = token.encode()
    app = FastAPI(title="MediScan inference", docs_url=None, redoc_url=None, openapi_url=None)

    @app.exception_handler(AppError)
    async def _app_error(request: Request, exc: AppError):
        headers = {"WWW-Authenticate": "Bearer"} if exc.status_code == 401 else None
        return JSONResponse({"detail": exc.detail}, status_code=exc.status_code, headers=headers)

    def authorise(request: Request) -> None:
        scheme, _, supplied = request.headers.get("authorization", "").partition(" ")
        if scheme.lower() != "bearer" or not hmac.compare_digest(supplied.encode(), expected):
            raise AppError(401, "Unauthorized")

    @app.get("/health")
    async def health(request: Request) -> dict:
        authorise(request)  # cheap: used to wake the container ahead of a real request
        return {"status": "ok", "backend": service.backend_name}

    @app.post("/analyse", response_model=WireResponse)
    async def analyse(request: Request):
        authorise(request)
        declared = request.headers.get("content-length")
        if declared and declared.isdigit() and int(declared) > max_bytes:
            raise AppError(413, "Image too large")
        chunks, total = [], 0
        async for chunk in request.stream():
            total += len(chunk)
            if total > max_bytes:
                raise AppError(413, "Image too large")
            chunks.append(chunk)
        if total == 0:
            raise AppError(400, "Empty body")

        validated = await run_in_threadpool(validate_image, b"".join(chunks), max_pixels, min_side)
        try:
            results = await service.predict(validated.image)
        except Exception:
            logger.exception("Inference failed")
            raise AppError(500, "Inference failed")
        return to_wire(results, service.backend_name)

    return app
