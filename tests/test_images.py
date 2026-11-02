import io
import uuid

import pytest
from PIL import Image
from sqlmodel import select

from backend.core import rate_limit as rl
from backend.main import app
from backend.models import AuditLog, UserRole
from tests.helpers import bearer, create_patient, predict_saved, token_for


@pytest.fixture
async def scan(client, db, any_storage):
    """A saved scan owned by clinician A, on whichever storage backend is under test."""
    app.state.storage = any_storage
    h = await token_for(client, db, "a@example.com")
    pid = await create_patient(client, h)
    body = await predict_saved(client, h, pid)
    detail = (await client.get(f"/scans/{body['scan_id']}", headers=h)).json()
    return {"h": h, "pid": pid, "id": body["scan_id"], "findings": detail["findings"],
            "storage": any_storage}


def finding(scan, condition):
    return next(f for f in scan["findings"] if f["condition"] == condition)


async def test_image_endpoint_returns_the_stored_png(client, scan):
    r = await client.get(f"/scans/{scan['id']}/image", headers=scan["h"])
    assert r.status_code == 200 and r.headers["content-type"] == "image/png"
    assert r.content[:8] == b"\x89PNG\r\n\x1a\n"
    assert Image.open(io.BytesIO(r.content)).size == (128, 128)
    assert "no-store" in r.headers["cache-control"] and "private" in r.headers["cache-control"]
    assert r.headers["x-content-type-options"] == "nosniff"


async def test_heatmap_endpoint(client, scan):
    f = finding(scan, "Pneumonia")
    r = await client.get(f"/scans/{scan['id']}/findings/{f['id']}/heatmap", headers=scan["h"])
    assert r.status_code == 200 and r.headers["content-type"] == "image/png"
    assert Image.open(io.BytesIO(r.content)).size == (224, 224)
    assert "no-store" in r.headers["cache-control"]


async def test_tuberculosis_has_no_heatmap_and_bad_ids_404(client, scan, db):
    h, sid = scan["h"], scan["id"]
    tb = finding(scan, "Tuberculosis")
    assert tb["has_heatmap"] is False
    assert (await client.get(f"/scans/{sid}/findings/{tb['id']}/heatmap", headers=h)).status_code == 404
    unknown = uuid.uuid4()
    assert (await client.get(f"/scans/{sid}/findings/{unknown}/heatmap", headers=h)).status_code == 404

    # a finding id from a different scan must not resolve under this scan
    other = await predict_saved(client, h, scan["pid"], seed=9)
    other_detail = (await client.get(f"/scans/{other['scan_id']}", headers=h)).json()
    foreign = other_detail["findings"][0]["id"]
    assert (await client.get(f"/scans/{sid}/findings/{foreign}/heatmap", headers=h)).status_code == 404


async def test_images_require_auth_and_ownership(client, db, scan):
    sid, fid = scan["id"], finding(scan, "Cardiomegaly")["id"]
    urls = [f"/scans/{sid}/image", f"/scans/{sid}/findings/{fid}/heatmap"]
    for url in urls:
        assert (await client.get(url)).status_code == 401
    b = await token_for(client, db, "b@example.com")
    admin = await token_for(client, db, "root@example.com", UserRole.admin)
    for url in urls:
        assert (await client.get(url, headers=b)).status_code == 404  # not yours: no leak
        assert (await client.get(url, headers=admin)).status_code == 200


async def test_every_image_read_is_audited(client, db, scan):
    sid, fid = scan["id"], finding(scan, "Pneumonia")["id"]
    await client.get(f"/scans/{sid}/image", headers=scan["h"])
    await client.get(f"/scans/{sid}/findings/{fid}/heatmap", headers=scan["h"])
    async with db() as s:
        actions = [a.action for a in (await s.exec(select(AuditLog))).all()]
    assert "scan.view_image" in actions and "scan.view_heatmap" in actions


async def test_tampered_image_fails_integrity_check(client, scan):
    from backend.models import Scan
    # overwrite the stored object with different bytes
    detail = (await client.get(f"/scans/{scan['id']}", headers=scan["h"])).json()
    storage = scan["storage"]
    key = f"scans/{scan['id']}.png"
    await storage.put(key, b"tampered", "image/png")
    r = await client.get(f"/scans/{scan['id']}/image", headers=scan["h"])
    assert r.status_code == 500 and "integrity" in r.json()["detail"]
    assert detail["id"] == scan["id"] and Scan  # sanity: record still exists


async def test_missing_object_is_reported_as_unavailable(client, scan):
    await scan["storage"].delete(f"scans/{scan['id']}.png")
    r = await client.get(f"/scans/{scan['id']}/image", headers=scan["h"])
    assert r.status_code == 404 and r.json()["detail"] == "Image unavailable"


async def test_image_reads_are_rate_limited_per_user(client, scan, monkeypatch):
    monkeypatch.setattr(rl.IMAGE_PER_USER, "limit", 2)
    url = f"/scans/{scan['id']}/image"
    assert (await client.get(url, headers=scan["h"])).status_code == 200
    assert (await client.get(url, headers=scan["h"])).status_code == 200
    r = await client.get(url, headers=scan["h"])
    assert r.status_code == 429 and "retry-after" in r.headers
