import base64
import io
from pathlib import Path

import pytest
from PIL import Image
from sqlmodel import select

from backend.core.config import get_settings
from backend.main import app
from backend.models import AuditLog, Finding, Scan, UserRole
from backend.services.storage_service import LocalStorage
from tests.helpers import jpeg_bytes, png_bytes, token_for, upload

CONDITIONS = ["Pneumonia", "Cardiomegaly", "Lung Nodule / Mass", "Tuberculosis"]


async def predict(client, headers, data=None, patient_id=None, **kw):
    form = {"patient_id": str(patient_id)} if patient_id else None
    return await client.post(
        "/predict", headers=headers, files=upload(data if data is not None else png_bytes(), **kw),
        data=form,
    )


async def new_patient(client, headers) -> str:
    r = await client.post("/patients", headers=headers, json={"sex": "female", "year_of_birth": 1980})
    assert r.status_code == 201
    return r.json()["id"]


# ---------------------------------------------------------- contract
async def test_predict_requires_auth(client):
    r = await client.post("/predict", files=upload(png_bytes()))
    assert r.status_code == 401


async def test_stateless_predict_contract(client, db, storage):
    h = await token_for(client, db)
    r = await predict(client, h)
    assert r.status_code == 200
    body = r.json()
    assert body["saved"] is False and body["scan_id"] is None
    assert body["inference_backend"] == "mock" and body["disclaimer"]
    assert [f["condition"] for f in body["findings"]] == CONDITIONS

    by = {f["condition"]: f for f in body["findings"]}
    for f in body["findings"]:
        assert 0 <= f["score"] <= 1 and f["confidence_pct"] == round(f["score"] * 100, 1)
        assert f["model_name"].startswith("mock-") and f["model_version"]
    tb = by["Tuberculosis"]
    assert tb["experimental"] is True and tb["heatmap_base64"] is None
    for name in CONDITIONS[:3]:
        assert by[name]["experimental"] is False
        img = Image.open(io.BytesIO(base64.b64decode(by[name]["heatmap_base64"])))
        assert img.format == "PNG" and img.size == (224, 224)

    # stateless means nothing persisted anywhere
    async with db() as s:
        assert (await s.exec(select(Scan))).all() == []
    assert not any(p.is_file() for p in Path(storage.base).rglob("*"))


async def test_mock_is_deterministic_per_image(client, db):
    h = await token_for(client, db)
    a1 = (await predict(client, h, png_bytes(1))).json()["findings"]
    a2 = (await predict(client, h, png_bytes(1))).json()["findings"]
    b = (await predict(client, h, png_bytes(2))).json()["findings"]
    assert [f["score"] for f in a1] == [f["score"] for f in a2]
    assert [f["score"] for f in a1] != [f["score"] for f in b]


async def test_jpeg_accepted(client, db):
    h = await token_for(client, db)
    r = await predict(client, h, jpeg_bytes(3), name="x.jpg", mime="image/jpeg")
    assert r.status_code == 200


# ---------------------------------------------------------- validation
async def test_rejects_non_images_and_bad_files(client, db):
    h = await token_for(client, db)
    assert (await predict(client, h, b"just some text")).status_code == 415
    assert (await predict(client, h, b"GIF89a" + b"0" * 100)).status_code == 415
    assert (await predict(client, h, b"")).status_code == 400
    # right magic bytes, corrupt body
    corrupt = png_bytes()[:60]
    assert (await predict(client, h, corrupt)).status_code == 422
    # extension/mime lie: a text file claiming to be a PNG
    assert (await predict(client, h, b"hello world", name="a.png")).status_code == 415
    # too small
    assert (await predict(client, h, png_bytes(size=(32, 32)))).status_code == 422


async def test_size_and_pixel_limits(client, db, monkeypatch):
    h = await token_for(client, db)
    s = get_settings()
    monkeypatch.setattr(s, "max_upload_mb", 1)
    big = b"\x89PNG\r\n\x1a\n" + b"0" * (2 * 1024 * 1024)
    assert (await predict(client, h, big)).status_code == 413
    monkeypatch.setattr(s, "max_image_pixels", 100)
    assert (await predict(client, h, png_bytes(size=(128, 128)))).status_code == 413


# ---------------------------------------------------------- saving
async def test_predict_with_patient_saves_scan(client, db, storage):
    h = await token_for(client, db)
    pid = await new_patient(client, h)
    r = await predict(client, h, patient_id=pid)
    body = r.json()
    assert r.status_code == 200 and body["saved"] and body["scan_id"]

    async with db() as s:
        scan = (await s.exec(select(Scan))).one()
        findings = (await s.exec(select(Finding))).all()
    assert str(scan.id) == body["scan_id"] and str(scan.patient_id) == pid
    assert scan.content_type == "image/png" and scan.status == "completed"
    assert len(findings) == 4
    by = {f.condition: f for f in findings}
    assert by["Tuberculosis"].heatmap_key is None and by["Tuberculosis"].experimental
    assert all(by[c].heatmap_key for c in CONDITIONS[:3])
    # files exist under UUID-only keys, and the stored hash matches the stored bytes
    stored = await storage.get(scan.image_key)
    import hashlib
    assert hashlib.sha256(stored).hexdigest() == scan.image_sha256 and len(stored) == scan.size_bytes
    for c in CONDITIONS[:3]:
        assert (await storage.get(by[c].heatmap_key))[:8] == b"\x89PNG\r\n\x1a\n"
    assert pid not in scan.image_key

    got = await client.get(f"/scans/{body['scan_id']}", headers=h)
    assert got.status_code == 200
    g = got.json()
    assert [f["condition"] for f in g["findings"]] == CONDITIONS
    assert g["findings"][3]["has_heatmap"] is False and g["disclaimer"]
    assert "heatmap_key" not in g["findings"][0] and "image_key" not in g

    lst = await client.get("/scans", params={"patient_id": pid}, headers=h)
    assert [x["id"] for x in lst.json()] == [body["scan_id"]]

    async with db() as s:
        actions = [a.action for a in (await s.exec(select(AuditLog))).all()]
    assert "scan.create" in actions and "scan.view" in actions and "patient.create" in actions


async def test_stored_image_has_metadata_stripped_and_is_png(client, db, storage):
    h = await token_for(client, db)
    pid = await new_patient(client, h)
    r = await predict(client, h, jpeg_bytes(5, exif=True), patient_id=pid,
                      name="p.jpg", mime="image/jpeg")
    assert r.status_code == 200
    async with db() as s:
        scan = (await s.exec(select(Scan))).one()
    stored = await storage.get(scan.image_key)
    assert stored[:8] == b"\x89PNG\r\n\x1a\n"
    assert b"SecretCameraMaker" not in stored and b"PhoneApp" not in stored
    assert len(Image.open(io.BytesIO(stored)).getexif()) == 0


async def test_storage_failure_returns_500_and_leaves_nothing(client, db, tmp_path):
    class Flaky(LocalStorage):
        calls = 0

        async def put(self, key, data, content_type):
            Flaky.calls += 1
            if Flaky.calls == 3:
                raise OSError("disk full")
            await super().put(key, data, content_type)

    flaky = Flaky(tmp_path / "flaky")
    app.state.storage = flaky
    h = await token_for(client, db)
    pid = await new_patient(client, h)
    r = await predict(client, h, patient_id=pid)
    assert r.status_code == 500 and r.json()["detail"] == "Could not save the scan"
    async with db() as s:
        assert (await s.exec(select(Scan))).all() == []
    assert not any(p.is_file() for p in flaky.base.rglob("*"))


def test_local_storage_blocks_path_traversal(tmp_path):
    st = LocalStorage(tmp_path / "s")
    with pytest.raises(ValueError):
        st._path("../escape.txt")
    with pytest.raises(ValueError):
        st._path("/etc/passwd")


# ---------------------------------------------------------- access control
async def test_patients_are_private_to_their_clinician(client, db):
    a = await token_for(client, db, "a@example.com")
    b = await token_for(client, db, "b@example.com")
    admin = await token_for(client, db, "root@example.com", UserRole.admin)
    pid = await new_patient(client, a)

    code = (await client.get(f"/patients/{pid}", headers=a)).json()["patient_code"]
    assert code.startswith("PT-") and len(code) == 11

    assert (await client.get(f"/patients/{pid}", headers=b)).status_code == 404
    assert [p["id"] for p in (await client.get("/patients", headers=b)).json()] == []
    assert [p["id"] for p in (await client.get("/patients", headers=a)).json()] == [pid]
    assert (await client.get(f"/patients/{pid}", headers=admin)).status_code == 200


async def test_cannot_predict_into_or_read_someone_elses_patient(client, db, storage):
    a = await token_for(client, db, "a@example.com")
    b = await token_for(client, db, "b@example.com")
    admin = await token_for(client, db, "root@example.com", UserRole.admin)
    pid = await new_patient(client, a)
    scan_id = (await predict(client, a, patient_id=pid)).json()["scan_id"]

    r = await predict(client, b, patient_id=pid)
    assert r.status_code == 404
    assert (await client.get(f"/scans/{scan_id}", headers=b)).status_code == 404
    assert (await client.get("/scans", params={"patient_id": pid}, headers=b)).status_code == 404
    assert (await client.get(f"/scans/{scan_id}", headers=admin)).status_code == 200

    async with db() as s:
        assert len((await s.exec(select(Scan))).all()) == 1  # b's attempt stored nothing


async def test_unknown_scan_and_bad_inputs(client, db):
    h = await token_for(client, db)
    assert (await client.get("/scans/00000000-0000-0000-0000-000000000000", headers=h)).status_code == 404
    assert (await client.get("/scans/not-a-uuid", headers=h)).status_code == 422
    r = await client.post("/patients", headers=h, json={"year_of_birth": 1850})
    assert r.status_code == 422
    r = await client.post("/patients", headers=h, json={"sex": "robot"})
    assert r.status_code == 422
