import asyncio

import pytest
from starlette.requests import Request

from backend.core import rate_limit as rl
from backend.core.config import get_settings
from backend.core.errors import AppError
from backend.core.net import client_ip
from backend.main import app
from backend.services.inference_service import MockInferenceService
from tests.helpers import login, make_user, png_bytes, token_for, upload

PW = "correct-horse-battery"


class Clock:
    def __init__(self):
        self.t = 1000.0

    def __call__(self):
        return self.t


def fake_request(xff: str | None = None, peer: str | None = "9.9.9.9") -> Request:
    headers = [(b"x-forwarded-for", xff.encode())] if xff is not None else []
    return Request({"type": "http", "headers": headers, "client": (peer, 1234) if peer else None})


# ------------------------------------------------------------ limiter unit
def test_sliding_window_blocks_then_recovers():
    lim = rl.SlidingWindowLimiter("t", 2, 10)
    lim.clock = clock = Clock()
    lim.check("k")
    clock.t += 1
    lim.check("k")
    clock.t += 1
    with pytest.raises(AppError) as e:
        lim.check("k")
    assert e.value.status_code == 429 and e.value.headers["Retry-After"] == "8"
    clock.t += 8.5  # first hit (t=0) has left the window
    lim.check("k")


def test_blocked_attempts_do_not_extend_the_block():
    lim = rl.SlidingWindowLimiter("t", 2, 10)
    lim.clock = clock = Clock()
    lim.check("k"), lim.check("k")
    for _ in range(50):  # hammering while blocked
        clock.t += 0.1
        with pytest.raises(AppError):
            lim.check("k")
    clock.t += 5.1  # 10s after the original hits, not after the last rejection
    lim.check("k")


def test_keys_are_independent():
    lim = rl.SlidingWindowLimiter("t", 1, 60)
    lim.check("a")
    lim.check("b")
    with pytest.raises(AppError):
        lim.check("a")


def test_idle_keys_are_pruned_and_memory_is_capped():
    lim = rl.SlidingWindowLimiter("t", 5, 10, prune_every=10, max_keys=50)
    lim.clock = clock = Clock()
    for i in range(10):
        lim.check(f"old{i}")
    clock.t += 11
    for i in range(10):  # triggers a prune; the old keys are idle
        lim.check(f"new{i}")
    assert not any(k.startswith("old") for k in lim._hits)

    flood = rl.SlidingWindowLimiter("t", 5, 1000, prune_every=10, max_keys=50)
    for i in range(200):
        flood.check(f"spoof{i}")
    assert len(flood._hits) <= 60


def test_disabled_flag_turns_everything_off(monkeypatch):
    monkeypatch.setattr(get_settings(), "rate_limit_enabled", False)
    lim = rl.SlidingWindowLimiter("t", 1, 60)
    for _ in range(5):
        lim.check("k")


# --------------------------------------------------------------- client IP
def test_client_ip_ignores_forwarded_header_by_default():
    assert client_ip(fake_request(xff="6.6.6.6")) == "9.9.9.9"  # spoof attempt ignored


def test_client_ip_counts_trusted_hops_from_the_right(monkeypatch):
    s = get_settings()
    xff = "6.6.6.6, 1.1.1.1, 2.2.2.2"  # first entry is attacker-supplied
    monkeypatch.setattr(s, "trusted_proxy_hops", 1)
    assert client_ip(fake_request(xff=xff)) == "2.2.2.2"
    monkeypatch.setattr(s, "trusted_proxy_hops", 2)
    assert client_ip(fake_request(xff=xff)) == "1.1.1.1"
    monkeypatch.setattr(s, "trusted_proxy_hops", 5)  # fewer entries than hops
    assert client_ip(fake_request(xff=xff)) == "9.9.9.9"


def test_client_ip_rejects_junk_and_handles_ports(monkeypatch):
    monkeypatch.setattr(get_settings(), "trusted_proxy_hops", 1)
    assert client_ip(fake_request(xff="not-an-ip; DROP TABLE")) == "9.9.9.9"
    assert client_ip(fake_request(xff="1.2.3.4:5678")) == "1.2.3.4"
    assert client_ip(fake_request(xff="[2001:db8::1]:443")) == "2001:db8::1"
    assert client_ip(fake_request(peer=None)) == "unknown"


# ------------------------------------------------------------- endpoints
async def test_login_ip_limit_returns_429_then_recovers(client, db, monkeypatch):
    await make_user(db)
    monkeypatch.setattr(rl.LOGIN_PER_IP, "clock", clock := Clock())
    for i in range(10):  # different emails so the per-account limit is not involved
        r = await login(client, f"nobody{i}@example.com", "wrong-password-123")
        assert r.status_code == 401
    r = await login(client)  # even correct credentials are refused while blocked
    assert r.status_code == 429 and "Too many requests" in r.json()["detail"]
    assert int(r.headers["retry-after"]) >= 1
    clock.t += 61
    assert (await login(client)).status_code == 200


async def test_login_account_limit_is_per_email(client, db, monkeypatch):
    await make_user(db)
    monkeypatch.setattr(rl.LOGIN_PER_IP, "limit", 1000)
    for _ in range(10):
        assert (await login(client, password="wrong-password-123")).status_code == 401
    assert (await login(client)).status_code == 429  # this ip + this email: blocked
    assert (await login(client, "other@example.com")).status_code == 401  # not affected


async def test_register_limit(client):
    for i in range(10):
        r = await client.post("/auth/register", json={
            "email": f"u{i}@example.com", "full_name": "U", "password": PW})
        assert r.status_code == 202
    r = await client.post("/auth/register", json={
        "email": "late@example.com", "full_name": "U", "password": PW})
    assert r.status_code == 429 and "retry-after" in r.headers


async def test_refresh_and_logout_share_a_limit(client, monkeypatch):
    monkeypatch.setattr(rl.REFRESH_PER_IP, "limit", 3)
    tok = {"refresh_token": "x" * 43}
    for _ in range(3):
        assert (await client.post("/auth/refresh", json=tok)).status_code == 401
    assert (await client.post("/auth/refresh", json=tok)).status_code == 429
    assert (await client.post("/auth/logout", json=tok)).status_code == 429


async def test_predict_limit_is_per_user(client, db):
    a = await token_for(client, db, "a@example.com")
    b = await token_for(client, db, "b@example.com")
    for i in range(10):
        r = await client.post("/predict", headers=a, files=upload(png_bytes(i)))
        assert r.status_code == 200
    r = await client.post("/predict", headers=a, files=upload(png_bytes(99)))
    assert r.status_code == 429 and int(r.headers["retry-after"]) >= 1
    r = await client.post("/predict", headers=b, files=upload(png_bytes(1)))
    assert r.status_code == 200  # another user is unaffected


async def test_inflight_gate_refuses_overload_and_releases_slots(client, db, monkeypatch):
    class Blocking(MockInferenceService):
        def __init__(self):
            self.started, self.release = asyncio.Event(), asyncio.Event()

        async def predict(self, image, png_bytes=None):
            self.started.set()
            await self.release.wait()
            return await super().predict(image)

    slow = Blocking()
    app.state.inference = slow
    monkeypatch.setattr(get_settings(), "max_inflight_predictions", 1)
    h = await token_for(client, db)

    first = asyncio.create_task(client.post("/predict", headers=h, files=upload(png_bytes(1))))
    await asyncio.wait_for(slow.started.wait(), timeout=5)  # fail fast instead of hanging
    busy = await client.post("/predict", headers=h, files=upload(png_bytes(2)))
    assert busy.status_code == 503 and busy.headers["retry-after"] == "5"

    slow.release.set()
    assert (await first).status_code == 200
    assert rl.PREDICT_INFLIGHT.in_flight == 0  # slot released
    assert (await client.post("/predict", headers=h, files=upload(png_bytes(3)))).status_code == 200


async def test_slot_is_released_when_a_request_fails(client, db):
    h = await token_for(client, db)
    r = await client.post("/predict", headers=h, files=upload(b"not an image"))
    assert r.status_code == 415 and rl.PREDICT_INFLIGHT.in_flight == 0


async def test_limits_can_be_disabled(client, monkeypatch):
    monkeypatch.setattr(get_settings(), "rate_limit_enabled", False)
    for _ in range(15):
        assert (await login(client, "x@example.com", "wrong-password-123")).status_code == 401
