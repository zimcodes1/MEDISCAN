"""Inference over HTTPS: the API sends the (already validated, metadata-free)
PNG to the inference service and gets findings back. Lets the API run on a
small host while the PyTorch models run elsewhere (Modal)."""
import asyncio
import io
import logging

import httpx
from PIL import Image
from pydantic import ValidationError
from starlette.concurrency import run_in_threadpool

from backend.services.inference_types import FindingResult
from backend.services.inference_wire import WireResponse, from_wire

logger = logging.getLogger("mediscan.remote")

_RETRY_STATUS = {502, 503, 504}  # typically: container still starting
_MAX_RESPONSE_BYTES = 8 * 1024 * 1024


class RemoteInferenceError(Exception):
    """The inference service was unreachable or returned something unusable."""


def _encode_png(image: Image.Image) -> bytes:
    buf = io.BytesIO()
    image.save(buf, format="PNG")
    return buf.getvalue()


class RemoteInferenceService:
    backend_name = "remote"

    def __init__(self, url: str, token: str, *, timeout: float = 120.0, retries: int = 2,
                 backoff: tuple[float, ...] = (2.0, 5.0), transport: httpx.AsyncBaseTransport | None = None):
        self._url = url.rstrip("/")
        self._auth = {"Authorization": f"Bearer {token}"}
        self._timeout, self._retries, self._backoff = timeout, retries, backoff
        self._transport = transport  # injected in tests
        self._client: httpx.AsyncClient | None = None
        self._warmup_task: asyncio.Task | None = None

    async def startup(self) -> None:
        # Nothing is sent here: waking a sleeping container would cost startup time and credits.
        self._client = httpx.AsyncClient(
            timeout=httpx.Timeout(self._timeout, connect=15.0),
            follow_redirects=True,  # Modal answers long requests with a 303 to a polling URL
            transport=self._transport,
            limits=httpx.Limits(max_connections=10),
        )

    async def shutdown(self) -> None:
        if self._client is not None:
            await self._client.aclose()

    async def predict(self, image: Image.Image, png_bytes: bytes | None = None) -> list[FindingResult]:
        if self._client is None:
            raise RemoteInferenceError("Remote inference client is not started")
        if png_bytes is None:
            png_bytes = await run_in_threadpool(_encode_png, image)

        reason = "unknown error"
        for attempt in range(self._retries + 1):
            try:
                response = await self._client.post(
                    f"{self._url}/analyse", content=png_bytes,
                    headers={**self._auth, "Content-Type": "image/png"},
                )
            except (httpx.ConnectError, httpx.ConnectTimeout, httpx.RemoteProtocolError) as exc:
                reason = type(exc).__name__
            except httpx.TimeoutException as exc:  # waited the full timeout: do not wait again
                raise RemoteInferenceError(f"Inference service timed out ({type(exc).__name__})") from exc
            except httpx.HTTPError as exc:
                raise RemoteInferenceError(f"Inference request failed ({type(exc).__name__})") from exc
            else:
                if response.status_code == 200:
                    return self._parse(response)
                if response.status_code not in _RETRY_STATUS:
                    # Status only: never log or surface the response body.
                    raise RemoteInferenceError(f"Inference service returned HTTP {response.status_code}")
                reason = f"HTTP {response.status_code}"
            if attempt < self._retries:
                logger.warning("Inference service not ready (%s); retrying", reason)
                await asyncio.sleep(self._backoff[min(attempt, len(self._backoff) - 1)])
        raise RemoteInferenceError(f"Inference service unavailable ({reason})")

    @staticmethod
    def _parse(response: httpx.Response) -> list[FindingResult]:
        if len(response.content) > _MAX_RESPONSE_BYTES:
            raise RemoteInferenceError("Inference response is too large")
        try:
            return from_wire(WireResponse.model_validate_json(response.content))
        except (ValidationError, ValueError) as exc:
            raise RemoteInferenceError("Inference service returned an invalid response") from exc

    async def warmup(self) -> None:
        """Fire-and-forget: wakes a sleeping container so the user's real
        request does not pay the cold start. Never raises; skipped if one is in flight."""
        if self._client is None or (self._warmup_task is not None and not self._warmup_task.done()):
            return
        self._warmup_task = asyncio.create_task(self._ping())

    async def _ping(self) -> None:
        try:
            await self._client.get(f"{self._url}/health", headers=self._auth)
        except Exception as exc:
            logger.info("Warm-up request failed: %s", type(exc).__name__)
