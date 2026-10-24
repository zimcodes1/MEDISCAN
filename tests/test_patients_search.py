"""GET /patients?q= and the scan_count / last_scan_at fields."""
import uuid

from tests.helpers import create_patient, make_org, predict_saved, token_for


async def code_of(client, headers, pid) -> str:
    return (await client.get(f"/patients/{pid}", headers=headers)).json()["patient_code"]


async def test_search_is_case_insensitive_contains_and_scoped(client, db):
    org_a, org_b = await make_org(db, "Org A"), await make_org(db, "Org B")
    a = await token_for(client, db, "a@example.com", org=org_a)
    b = await token_for(client, db, "b@example.com", org=org_b)
    p1, p2, pb = (await create_patient(client, a), await create_patient(client, a),
                  await create_patient(client, b))
    code1 = await code_of(client, a, p1)

    for q in (code1, code1.lower(), code1[3:7], f"  {code1}  "):
        ids = [p["id"] for p in (await client.get("/patients", params={"q": q}, headers=a)).json()]
        assert p1 in ids, q
    assert [p["id"] for p in (await client.get("/patients", params={"q": "PT-"}, headers=a)).json()]
    assert (await client.get("/patients", params={"q": "ZZZZZZZZZZ"}, headers=a)).json() == []
    # another organisation's code never matches
    assert (await client.get("/patients", params={"q": await code_of(client, b, pb)}, headers=a)).json() == []
    # blank q means no filter
    assert len((await client.get("/patients", params={"q": ""}, headers=a)).json()) == 2


async def test_search_treats_wildcards_literally(client, db):
    h = await token_for(client, db)
    await create_patient(client, h)
    for q in ("%", "_", "\\", "P_-", "%%"):
        r = await client.get("/patients", params={"q": q}, headers=h)
        assert r.status_code == 200 and r.json() == [], q


async def test_scan_count_and_last_scan_at(client, db):
    h = await token_for(client, db)
    busy, idle = await create_patient(client, h), await create_patient(client, h)
    await predict_saved(client, h, busy, seed=1)
    await predict_saved(client, h, busy, seed=2)

    rows = {p["id"]: p for p in (await client.get("/patients", headers=h)).json()}
    assert rows[busy]["scan_count"] == 2 and rows[busy]["last_scan_at"]
    assert rows[idle]["scan_count"] == 0 and rows[idle]["last_scan_at"] is None
    one = (await client.get(f"/patients/{busy}", headers=h)).json()
    assert one["scan_count"] == 2 and one["last_scan_at"]
    created = (await client.post("/patients", headers=h, json={})).json()
    assert created["scan_count"] == 0 and created["last_scan_at"] is None
