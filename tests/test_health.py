from httpx import ASGITransport, AsyncClient

from backend.main import app


async def _get(path: str):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        return await c.get(path)


async def test_liveness():
    r = await _get("/health")
    assert r.status_code == 200 and r.json() == {"status": "ok"}


async def test_readiness_hits_database():
    r = await _get("/health/ready")  # in-memory SQLite in tests
    assert r.status_code == 200 and r.json() == {"status": "ready"}
