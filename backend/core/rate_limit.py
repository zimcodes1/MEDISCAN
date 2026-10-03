"""In-memory abuse protection.

State lives in this process, which is right for a single-worker deployment
(one Hugging Face Space container). If you ever run several workers or
instances, each keeps its own counters, so move the state to a shared store
such as Redis.
"""
import contextlib
import math
import time
from collections import deque
from collections.abc import AsyncIterator, Callable

from starlette.requests import Request

from backend.core.config import get_settings
from backend.core.errors import AppError
from backend.core.net import client_ip


class SlidingWindowLimiter:
    """At most `limit` hits per `window_seconds` for each key."""

    def __init__(self, name: str, limit: int, window_seconds: int,
                 *, max_keys: int = 50_000, prune_every: int = 1024):
        self.name = name
        self.limit = limit
        self.window = window_seconds
        self.max_keys = max_keys
        self.prune_every = prune_every
        self.clock: Callable[[], float] = time.monotonic  # replaceable in tests
        self._hits: dict[str, deque[float]] = {}
        self._calls = 0

    def check(self, key: str) -> None:
        """Record a hit for `key`, or raise 429.

        Rejected attempts are NOT recorded, so hammering a blocked key does not
        extend its block. Deliberately synchronous: nothing awaits between the
        read and the write, so it is atomic on the event loop.
        """
        if not get_settings().rate_limit_enabled:
            return
        now = self.clock()
        hits = self._hits.get(key)
        if hits is None:
            hits = self._hits[key] = deque()
        cutoff = now - self.window
        while hits and hits[0] <= cutoff:
            hits.popleft()
        if len(hits) >= self.limit:
            retry = max(1, math.ceil(hits[0] + self.window - now))
            raise AppError(
                429, f"Too many requests. Try again in {retry} seconds.",
                headers={"Retry-After": str(retry)},
            )
        hits.append(now)
        self._calls += 1
        if self._calls % self.prune_every == 0:
            self._prune(now)

    def _prune(self, now: float) -> None:
        """Drop idle keys so memory cannot grow without bound."""
        cutoff = now - self.window
        for key in [k for k, h in self._hits.items() if not h or h[-1] <= cutoff]:
            del self._hits[key]
        if len(self._hits) > self.max_keys:  # flood of distinct keys: evict oldest
            excess = len(self._hits) - int(self.max_keys * 0.9)
            for key in list(self._hits)[:excess]:
                del self._hits[key]

    def reset(self) -> None:
        self._hits.clear()
        self._calls = 0


class InFlightLimiter:
    """Caps how many predictions are running or queued at once. Each waiting
    request holds an uploaded image in memory, and the real model is
    serialised, so excess requests are refused instead of piling up."""

    def __init__(self, name: str):
        self.name = name
        self.in_flight = 0

    @contextlib.asynccontextmanager
    async def slot(self) -> AsyncIterator[None]:
        if get_settings().rate_limit_enabled and \
                self.in_flight >= get_settings().max_inflight_predictions:
            raise AppError(
                503, "The server is busy analysing other scans. Please retry shortly.",
                headers={"Retry-After": "5"},
            )
        self.in_flight += 1
        try:
            yield
        finally:
            self.in_flight -= 1

    def reset(self) -> None:
        self.in_flight = 0


# ---- policies (hits per window, in seconds) ----
LOGIN_PER_IP = SlidingWindowLimiter("login_ip", 10, 60)
LOGIN_PER_ACCOUNT = SlidingWindowLimiter("login_account", 10, 15 * 60)  # key: ip|email
REGISTER_PER_IP = SlidingWindowLimiter("register_ip", 10, 60 * 60)
REFRESH_PER_IP = SlidingWindowLimiter("refresh_ip", 30, 60)  # refresh + logout
PREDICT_PER_USER = SlidingWindowLimiter("predict_user", 10, 60)
PREDICT_INFLIGHT = InFlightLimiter("predict_inflight")
IMAGE_PER_USER = SlidingWindowLimiter("image_user", 120, 60)  # image + heatmap reads
WARMUP_PER_USER = SlidingWindowLimiter("warmup_user", 6, 60)

_ALL = [LOGIN_PER_IP, LOGIN_PER_ACCOUNT, REGISTER_PER_IP, REFRESH_PER_IP,
        PREDICT_PER_USER, PREDICT_INFLIGHT, IMAGE_PER_USER, WARMUP_PER_USER]


def reset_all() -> None:
    for limiter in _ALL:
        limiter.reset()


def by_ip(limiter: SlidingWindowLimiter):
    """Route dependency: `dependencies=[Depends(by_ip(LOGIN_PER_IP))]`."""

    async def dependency(request: Request) -> None:
        limiter.check(client_ip(request))

    return dependency
