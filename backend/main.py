import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from backend.core.config import get_settings
from backend.core.database import dispose_engine, engine
from backend.core.errors import AppError
from backend.routers import admin, auth, inference, patients, scans
from backend.services.inference_service import build_inference_service
from backend.services.storage_service import build_storage_service

settings = get_settings()
logging.basicConfig(level=logging.DEBUG if settings.debug else logging.INFO)
logger = logging.getLogger("mediscan")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(
        "Starting %s (env=%s, inference=%s)",
        settings.app_name, settings.environment, settings.inference_backend,
    )
    # Models load ONCE here, never inside a request.
    app.state.inference = build_inference_service(settings)
    await app.state.inference.startup()
    app.state.storage = build_storage_service(settings)
    yield
    await app.state.inference.shutdown()
    await dispose_engine()


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    lifespan=lifespan,
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None,
    openapi_url=None if settings.is_production else "/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
    expose_headers=["Retry-After"],  # lets browser code read it on 429/503
)


@app.exception_handler(AppError)
async def app_error_handler(request, exc: AppError):
    headers = dict(exc.headers or {})
    if exc.status_code == 401:
        headers.setdefault("WWW-Authenticate", "Bearer")
    return JSONResponse({"detail": exc.detail}, status_code=exc.status_code, headers=headers or None)


app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(patients.router)
app.include_router(inference.router)
app.include_router(scans.router)


@app.get("/health", tags=["health"])
async def health() -> dict:
    """Liveness: the process is up. Use for Spaces / Docker healthchecks."""
    return {"status": "ok"}


@app.get("/health/ready", tags=["health"])
async def ready() -> dict:
    """Readiness: the database is reachable (may be slow on a Neon cold start)."""
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception:
        logger.exception("Readiness check failed")
        raise HTTPException(status_code=503, detail="Database unavailable")
    return {"status": "ready"}
