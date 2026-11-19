"""Application settings, loaded from environment variables / .env (pydantic-settings)."""
from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import URL, make_url

ENV_FILE = Path(__file__).resolve().parents[2] / ".env"  # project-root .env


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=ENV_FILE, env_file_encoding="utf-8", extra="ignore",
        hide_input_in_errors=True,  # config errors must never echo secrets into logs
    )

    # --- App ---
    app_name: str = "MediScan AI"
    environment: Literal["development", "production", "test"] = "development"
    debug: bool = False
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    # --- Database (paste Neon connection string as-is) ---
    database_url: str
    db_pool_size: int = 5
    db_max_overflow: int = 5
    db_pool_recycle_seconds: int = 300  # Neon closes idle connections
    db_connect_timeout_seconds: int = 30  # generous: covers Neon cold starts

    # --- Auth ---
    jwt_secret_key: str = Field(min_length=32)
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    bcrypt_rounds: int = Field(default=12, ge=4, le=15)

    # --- Inference ---
    inference_backend: Literal["mock", "torch", "remote"] = "mock"

    # --- Uploads ---
    max_upload_mb: int = 10
    max_image_pixels: int = 50_000_000  # decompression-bomb guard (~7000 x 7000)
    min_image_side: int = 64

    # --- Remote inference (INFERENCE_BACKEND=remote): the models run elsewhere, e.g. Modal ---
    inference_url: str | None = None
    inference_token: SecretStr | None = None  # shared secret; also set on the inference service
    inference_timeout_seconds: float = Field(default=120.0, ge=5, le=600)  # covers a cold start

    # --- Torch inference (only used when INFERENCE_BACKEND=torch) ---
    torch_threads: int = Field(default=2, ge=1, le=32)  # HF CPU basic has 2 vCPUs
    gradcam_enabled: bool = True
    # Hugging Face repo id of the tuberculosis classifier. Unset = TB analysis disabled.
    tb_model_id: str | None = None
    tb_model_revision: str | None = None  # pin to a commit hash for reproducibility
    tb_positive_label: str | None = None  # label meaning "tuberculosis" if it cannot be inferred

    @field_validator("tb_model_id", "tb_model_revision", "tb_positive_label",
                     "inference_url", "inference_token", mode="before")
    @classmethod
    def _blank_is_none(cls, v):
        return None if isinstance(v, str) and not v.strip() else v

    # --- Abuse protection ---
    rate_limit_enabled: bool = True
    # Reverse proxies in front of the app. 0 = use the socket address and ignore
    # X-Forwarded-For (safe default). See backend/core/net.py before changing.
    trusted_proxy_hops: int = Field(default=0, ge=0, le=5)
    max_inflight_predictions: int = Field(default=4, ge=1)

    # --- Storage (local disk for development; object storage in step 5) ---
    storage_local_dir: Path = Path(__file__).resolve().parents[2] / "storage_data"
    storage_backend: Literal["local", "s3"] = "local"
    # Any S3-compatible provider: Cloudflare R2, Backblaze B2, AWS S3, MinIO...
    s3_endpoint_url: str | None = None  # e.g. https://<account-id>.r2.cloudflarestorage.com
    s3_bucket: str | None = None
    s3_access_key_id: str | None = None
    s3_secret_access_key: SecretStr | None = None  # never printed in logs/repr
    s3_region: str = "auto"  # R2 uses "auto"; AWS needs a real region

    @model_validator(mode="after")
    def _check_storage(self) -> "Settings":
        if self.storage_backend == "s3":
            missing = [
                name.upper() for name in ("s3_bucket", "s3_access_key_id", "s3_secret_access_key")
                if not getattr(self, name)
            ]
            if missing:
                raise ValueError("STORAGE_BACKEND=s3 requires: " + ", ".join(missing))
            url = self.s3_endpoint_url
            if url and not url.startswith(("https://", "http://localhost", "http://127.0.0.1")):
                raise ValueError("S3_ENDPOINT_URL must use https://")
        elif self.environment == "production":
            raise ValueError(
                "STORAGE_BACKEND=local is not allowed when ENVIRONMENT=production "
                "(container disks are ephemeral and unencrypted). Use STORAGE_BACKEND=s3."
            )
        return self

    @model_validator(mode="after")
    def _check_inference(self) -> "Settings":
        if self.inference_backend == "remote":
            missing = [n.upper() for n in ("inference_url", "inference_token") if not getattr(self, n)]
            if missing:
                raise ValueError("INFERENCE_BACKEND=remote requires: " + ", ".join(missing))
            if not self.inference_url.startswith(("https://", "http://localhost", "http://127.0.0.1")):
                raise ValueError("INFERENCE_URL must use https://")
            if len(self.inference_token.get_secret_value()) < 32:
                raise ValueError("INFERENCE_TOKEN must be at least 32 characters")
        return self

    # ---- Derived database settings ----
    @property
    def _parsed_db_url(self) -> URL:
        return make_url(self.database_url)

    @property
    def db_is_postgres(self) -> bool:
        return self._parsed_db_url.get_backend_name() in ("postgresql", "postgres")

    @property
    def db_is_pooled(self) -> bool:
        """Neon pooled endpoints (PgBouncer) have -pooler in the hostname."""
        return "-pooler" in (self._parsed_db_url.host or "")

    @property
    def async_database_url(self) -> str:
        """Neon gives postgresql://...?sslmode=require&channel_binding=require.
        asyncpg rejects those query params, so swap the driver and strip them
        (SSL is re-enabled through connect_args in database.py)."""
        url = self._parsed_db_url
        if not self.db_is_postgres:
            return url.render_as_string(hide_password=False)
        query = {
            k: v
            for k, v in url.query.items()
            if k not in ("sslmode", "channel_binding")
        }
        if self.db_is_pooled:
            query["prepared_statement_cache_size"] = "0"
        url = url.set(drivername="postgresql+asyncpg", query=query)
        return url.render_as_string(hide_password=False)

    @property
    def db_requires_ssl(self) -> bool:
        if not self.db_is_postgres:
            return False
        mode = self._parsed_db_url.query.get("sslmode")
        return mode not in (None, "disable")

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
