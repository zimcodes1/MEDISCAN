import asyncio
import contextlib
import io
import json

import httpx
import pytest
from PIL import Image
from pydantic import ValidationError
from sqlmodel import select

from backend.core import rate_limit as rl
from backend.core.config import Settings
from backend.main import app
from backend.models import Scan
from backend.services.inference_server import create_inference_app
from backend.services.inference_service import MockInferenceService, build_inference_service
from backend.services.inference_wire import MAX_HEATMAP_BYTES, to_wire
from backend.services.remote_inference import RemoteInferenceError, RemoteInferenceService
from tests.helpers import create_patient, png_bytes, token_for, upload

TOKEN = "t" * 40
URL = "http://inference.test"
IMG = Image.new("L", (128, 128), 90)
GOOD = dict(database_url="sqlite+aiosqlite:///:memory:", jwt_secret_key="x" * 40, _env_file=None)


def png_of(image: Image.Image) -> bytes:
    buf = io.BytesIO()
    image.save(buf, "PNG")
    return buf.getvalue()


def server(**kw):
    return create_inference_app(MockInferenceService(), TOKEN, **kw)


@contextlib.asynccontextmanager
async def started(transport, token=TOKEN, **kw):
    svc = RemoteInferenceService(URL, token, transport=transport, backoff=(0, 0), **kw)
    await svc.startup()
    try:
        yield svc
    finally:
        await svc.shutdown()


def valid_body_sync() -> dict:
    return to_wire(MockInferenceService()._predict_sync(IMG), "mock").model_dump()


async def valid_body() -> dict:
    return valid_body_sync()


def scripted(*items):
    """MockTransport that replays responses/exceptions in order, then repeats the last."""
    calls = []

    def handler(request: httpx.Request):
        calls.append(request)
        item = items[min(len(calls) - 1, len(items) - 1)]
        if isinstance(item, Exception):
            raise item
        return item

    return httpx.MockTransport(handler), calls


# ------------------------------------------------ client <-> server round trip
async def test_remote_results_equal_local_results():
    local = await MockInferenceService().predict(IMG)
    async with started(httpx.ASGITransport(app=server())) as svc:
        with_bytes = await svc.predict(IMG, png_bytes=png_of(IMG))
        without_bytes = await svc.predict(IMG)  # client encodes the image itself
    assert with_bytes == local and without_bytes == local
    assert [f.condition for f in local] == ["Pneumonia", "Cardiomegaly", "Lung Nodule / Mass", "Tuberculosis"]
    assert local[3].heatmap_png is None and local[3].experimental


async def test_wrong_or_missing_token_is_rejected_without_retrying():
    transport, calls = scripted(httpx.Response(401, json={"detail": "Unauthorized"}))
    async with started(transport, token="w" * 40) as svc:
        with pytest.raises(RemoteInferenceError, match="HTTP 401"):
            await svc.predict(IMG)
    assert len(calls) == 1
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=server()), base_url=URL) as c:
        r = await c.post("/analyse", content=png_of(IMG))
        assert r.status_code == 401 and r.headers["www-authenticate"] == "Bearer"
        for header in ("Bearer " + "x" * 40, "Basic " + TOKEN, TOKEN, ""):
            r = await c.get("/health", headers={"Authorization": header})
            assert r.status_code == 401
        ok = await c.get("/health", headers={"Authorization": f"Bearer {TOKEN}"})
        assert ok.status_code == 200 and ok.json()["backend"] == "mock"


async def test_server_does_not_expose_docs_and_needs_a_real_token():
    with pytest.raises(ValueError):
        create_inference_app(MockInferenceService(), "short")
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=server()), base_url=URL) as c:
        for path in ("/docs", "/openapi.json", "/redoc"):
            assert (await c.get(path)).status_code == 404


# ------------------------------------------------------- server validation
@pytest.mark.parametrize("body, kwargs, status", [
    (b"just text", {}, 415),
    (b"", {}, 400),
    (png_of(IMG)[:60], {}, 422),                       # right magic, corrupt body
    (b"\x89PNG\r\n\x1a\n" + b"0" * 5000, {"max_bytes": 1000}, 413),
    (png_of(Image.new("L", (128, 128))), {"max_pixels": 100}, 413),
    (png_of(Image.new("L", (32, 32))), {}, 422),       # smaller than min_side
])
async def test_server_rejects_bad_uploads(body, kwargs, status):
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=server(**kwargs)), base_url=URL) as c:
        r = await c.post("/analyse", content=body, headers={"Authorization": f"Bearer {TOKEN}"})
    assert r.status_code == status


async def test_server_reports_inference_failure_as_500_without_details():
    class Broken(MockInferenceService):
        async def predict(self, image, png_bytes=None):
            raise RuntimeError("secret internal detail")

    app_ = create_inference_app(Broken(), TOKEN)
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app_), base_url=URL) as c:
        r = await c.post("/analyse", content=png_of(IMG), headers={"Authorization": f"Bearer {TOKEN}"})
    assert r.status_code == 500 and "secret" not in r.text


# ----------------------------------------------------------- retry policy
async def test_retries_while_the_service_is_starting_then_succeeds():
    ok = httpx.Response(200, json=await valid_body())
    transport, calls = scripted(httpx.Response(503), httpx.ConnectError("cold"), ok)
    async with started(transport) as svc:
        results = await svc.predict(IMG, png_bytes=b"png")
    assert len(calls) == 3 and len(results) == 4


async def test_gives_up_after_the_retry_budget():
    transport, calls = scripted(httpx.Response(503))
    async with started(transport, retries=2) as svc:
        with pytest.raises(RemoteInferenceError, match="unavailable.*503"):
            await svc.predict(IMG, png_bytes=b"png")
    assert len(calls) == 3


@pytest.mark.parametrize("status", [400, 404, 413, 422, 500])
async def test_client_errors_and_server_bugs_are_not_retried(status):
    transport, calls = scripted(httpx.Response(status, text="body that must not leak"))
    async with started(transport) as svc:
        with pytest.raises(RemoteInferenceError) as e:
            await svc.predict(IMG, png_bytes=b"png")
    assert len(calls) == 1 and "must not leak" not in str(e.value)


async def test_read_timeout_is_not_retried():
    transport, calls = scripted(httpx.ReadTimeout("slow"))
    async with started(transport) as svc:
        with pytest.raises(RemoteInferenceError, match="timed out"):
            await svc.predict(IMG, png_bytes=b"png")
    assert len(calls) == 1


async def test_request_carries_png_and_bearer_token():
    transport, calls = scripted(httpx.Response(200, json=await valid_body()))
    async with started(transport) as svc:
        await svc.predict(IMG, png_bytes=b"PNGDATA")
    req = calls[0]
    assert req.url == f"{URL}/analyse" and req.content == b"PNGDATA"
    assert req.headers["authorization"] == f"Bearer {TOKEN}" and req.headers["content-type"] == "image/png"


# ----------------------------------------- the client does not trust the server
def mutated(**changes_on_first) -> dict:
    body = json.loads(json.dumps(valid_body_sync()))
    body["findings"][0].update(changes_on_first)
    return body


PNG_B64 = "iVBORw0KGgo="  # just the PNG signature, valid base64


@pytest.mark.parametrize("make_response", [
    lambda: httpx.Response(200, content=b"not json"),
    lambda: httpx.Response(200, json=mutated(score=1.5)),
    lambda: httpx.Response(200, json=mutated(score=-0.1)),
    lambda: httpx.Response(200, content=json.dumps(mutated(score=0.5)).replace("0.5", "NaN").encode()),
    lambda: httpx.Response(200, json=mutated(condition="")),
    lambda: httpx.Response(200, json=mutated(condition="x" * 101)),
    lambda: httpx.Response(200, json=mutated(model_name="m" * 101)),
    lambda: httpx.Response(200, json={"backend": "x", "findings": []}),
    lambda: httpx.Response(200, json=mutated(heatmap_base64="***not base64***")),
    lambda: httpx.Response(200, json=mutated(heatmap_base64="aGVsbG8=")),  # base64, but not a PNG
    lambda: httpx.Response(200, json=mutated(heatmap_base64="A" * (MAX_HEATMAP_BYTES * 2))),
])
async def test_invalid_responses_are_rejected(make_response):
    transport, _ = scripted(make_response())
    async with started(transport) as svc:
        with pytest.raises(RemoteInferenceError):
            await svc.predict(IMG, png_bytes=b"png")


async def test_valid_png_heatmap_is_accepted():
    transport, _ = scripted(httpx.Response(200, json=mutated(heatmap_base64=PNG_B64)))
    async with started(transport) as svc:
        assert (await svc.predict(IMG, png_bytes=b"png"))[0].heatmap_png == b"\x89PNG\r\n\x1a\n"


async def test_client_must_be_started():
    svc = RemoteInferenceService(URL, TOKEN)
    with pytest.raises(RemoteInferenceError, match="not started"):
        await svc.predict(IMG, png_bytes=b"x")


# ----------------------------------------------------------------- warm-up
async def test_warmup_pings_health_once_and_never_raises():
    gate, hits = asyncio.Event(), []

    async def handler(request):
        hits.append(request)
        await gate.wait()
        return httpx.Response(200, json={"status": "ok"})

    async with started(httpx.MockTransport(handler)) as svc:
        await svc.warmup()
        await svc.warmup()  # one is already in flight: skipped
        await asyncio.sleep(0.05)
        assert len(hits) == 1 and hits[0].url.path == "/health"
        assert hits[0].headers["authorization"] == f"Bearer {TOKEN}"
        gate.set()
        await svc._warmup_task

    transport, _ = scripted(httpx.ConnectError("down"))
    async with started(transport) as svc:
        await svc.warmup()  # must not raise even though the service is down
        await svc._warmup_task


# --------------------------------------------------------------- settings
def test_remote_settings_are_validated():
    ok = Settings(**GOOD, inference_backend="remote", inference_url="https://a.modal.run", inference_token="t" * 40)
    assert ok.inference_token.get_secret_value() == "t" * 40 and "t" * 40 not in repr(ok)
    for bad in (
        dict(inference_url="https://a.modal.run"),                                   # no token
        dict(inference_token="t" * 40),                                              # no url
        dict(inference_url="http://a.modal.run", inference_token="t" * 40),          # not https
        dict(inference_url="https://a.modal.run", inference_token="short"),          # weak token
    ):
        with pytest.raises(ValidationError):
            Settings(**GOOD, inference_backend="remote", **bad)
    svc = build_inference_service(ok)
    assert isinstance(svc, RemoteInferenceService) and svc.backend_name == "remote"


# ------------------------------------- the API end to end with a remote service
async def use_remote(transport):
    svc = RemoteInferenceService(URL, TOKEN, transport=transport, backoff=(0, 0))
    await svc.startup()
    app.state.inference = svc
    return svc


async def test_predict_through_the_remote_service_saves_the_scan(client, db):
    h = await token_for(client, db)
    pid = await create_patient(client, h)
    svc = await use_remote(httpx.ASGITransport(app=server()))
    try:
        r = await client.post("/predict", headers=h, files=upload(png_bytes(3)), data={"patient_id": pid})
    finally:
        await svc.shutdown()
    body = r.json()
    assert r.status_code == 200 and body["saved"] and body["inference_backend"] == "remote"
    assert [f["condition"] for f in body["findings"]][-1] == "Tuberculosis"
    assert body["findings"][0]["heatmap_base64"] and body["findings"][3]["heatmap_base64"] is None
    async with db() as s:
        assert len((await s.exec(select(Scan))).all()) == 1


async def test_unreachable_inference_gives_503_and_saves_nothing(client, db):
    h = await token_for(client, db)
    pid = await create_patient(client, h)
    transport, _ = scripted(httpx.Response(503))
    svc = await use_remote(transport)
    try:
        r = await client.post("/predict", headers=h, files=upload(png_bytes(3)), data={"patient_id": pid})
    finally:
        await svc.shutdown()
    assert r.status_code == 503 and r.headers["retry-after"] == "30"
    assert "starting up" in r.json()["detail"]
    async with db() as s:
        assert (await s.exec(select(Scan))).all() == []
    assert rl.PREDICT_INFLIGHT.in_flight == 0


async def test_warmup_endpoint(client, db):
    h = await token_for(client, db)
    assert (await client.post("/predict/warmup")).status_code == 401
    assert (await client.post("/predict/warmup", headers=h)).json() == {"status": "ready"}  # mock: nothing to wake

    transport, calls = scripted(httpx.Response(200, json={"status": "ok"}))
    svc = await use_remote(transport)
    try:
        r = await client.post("/predict/warmup", headers=h)
        assert r.status_code == 202 and r.json() == {"status": "warming"}
        await svc._warmup_task
        assert [c.url.path for c in calls] == ["/health"]
        for _ in range(5):
            await client.post("/predict/warmup", headers=h)
        assert (await client.post("/predict/warmup", headers=h)).status_code == 429  # 6 per minute
    finally:
        await svc.shutdown()
