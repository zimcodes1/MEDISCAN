"""Flag rule: non-experimental and score >= threshold(condition).
The Python rule and the SQL rule (used by stats and filters) must agree."""
import itertools
import uuid

import pytest

from backend.core import flagging
from backend.core.config import get_settings
from tests.helpers import create_patient, make_scan, me_id, token_for


@pytest.fixture(autouse=True)
def thresholds(monkeypatch):
    s = get_settings()
    monkeypatch.setattr(s, "flag_thresholds", {"Pneumonia": 0.7, "Cardiomegaly": 0.4})
    monkeypatch.setattr(s, "flag_default_threshold", 0.9)


def test_threshold_lookup_and_default():
    assert flagging.threshold_for("Pneumonia") == 0.7
    assert flagging.threshold_for("Cardiomegaly") == 0.4
    assert flagging.threshold_for("Lung Nodule / Mass") == 0.9  # not listed: default


@pytest.mark.parametrize("condition,score,experimental,expected", [
    ("Pneumonia", 0.7, False, True),            # exactly at the threshold flags
    ("Pneumonia", 0.699, False, False),
    ("Cardiomegaly", 0.4, False, True),
    ("Lung Nodule / Mass", 0.89, False, False),
    ("Lung Nodule / Mass", 0.9, False, True),
    ("Tuberculosis", 1.0, True, False),         # experimental never flags
    ("Pneumonia", 1.0, True, False),
])
def test_finding_rule(condition, score, experimental, expected):
    assert flagging.finding_is_flagged(condition, score, experimental) is expected


async def test_sql_rule_matches_python_rule(client, db):
    h = await token_for(client, db)
    uid, pid = uuid.UUID(await me_id(client, h)), await create_patient(client, h)
    from tests.helpers import default_org
    org_id = (await default_org(db)).id

    conditions = ["Pneumonia", "Cardiomegaly", "Lung Nodule / Mass", "Tuberculosis"]
    scores = [0.0, 0.39, 0.4, 0.7, 0.89, 0.9, 1.0]
    expected: dict[str, bool] = {}
    for cond, score, exp in itertools.product(conditions, scores, (False, True)):
        sid = await make_scan(db, org_id=org_id, patient_id=pid, uploader_id=uid,
                              scores={cond: score}, experimental=(cond,) if exp else ())
        expected[sid] = flagging.finding_is_flagged(cond, score, exp)

    flagged = {s["id"] for s in (await client.get("/scans?flagged=true&limit=200", headers=h)).json()}
    unflagged = {s["id"] for s in (await client.get("/scans?flagged=false&limit=200", headers=h)).json()}
    assert flagged == {sid for sid, v in expected.items() if v}
    assert unflagged == {sid for sid, v in expected.items() if not v}
    # and the API's own flags agree with both
    for s in (await client.get("/scans?limit=200", headers=h)).json():
        assert s["is_flagged"] is expected[s["id"]]
        assert s["is_flagged"] == any(f["flagged"] for f in s["findings"])


async def test_scan_is_flagged_when_any_finding_is(client, db):
    h = await token_for(client, db)
    uid, pid = uuid.UUID(await me_id(client, h)), await create_patient(client, h)
    from tests.helpers import default_org
    sid = await make_scan(db, org_id=(await default_org(db)).id, patient_id=pid, uploader_id=uid,
                          scores={"Pneumonia": 0.1, "Cardiomegaly": 0.5, "Tuberculosis": 0.99},
                          experimental=("Tuberculosis",))
    body = (await client.get(f"/scans/{sid}", headers=h)).json()
    by = {f["condition"]: f["flagged"] for f in body["findings"]}
    assert by == {"Pneumonia": False, "Cardiomegaly": True, "Tuberculosis": False}
    assert body["is_flagged"] is True
