"""Migration 0003 on SQLite: backfill, NOT NULL, and a clean downgrade."""
import os
import sqlite3
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def _alembic(db: Path, *args: str) -> None:
    env = {**os.environ, "DATABASE_URL": f"sqlite+aiosqlite:///{db}", "PYTHONPATH": str(ROOT)}
    r = subprocess.run([sys.executable, "-m", "alembic", *args], cwd=ROOT, env=env,
                       capture_output=True, text=True)
    assert r.returncode == 0, r.stderr


def test_upgrade_backfills_and_downgrade_restores():
    db = Path(tempfile.mkdtemp()) / "m.db"
    _alembic(db, "upgrade", "0002")
    c = sqlite3.connect(db)
    u, p, s = ("1" * 32, "2" * 32, "3" * 32)
    c.execute("insert into users(id,email,hashed_password,full_name,role,is_active,is_approved,created_at,updated_at)"
              f" values('{u}','a@x.com','h','A','admin',1,1,'2026-01-01','2026-01-01')")
    c.execute(f"insert into patients(id,patient_code,created_by_id,created_at) values('{p}','PT-AAAA','{u}','2026-01-01')")
    c.execute("insert into scans(id,patient_id,uploaded_by_id,image_key,image_sha256,content_type,size_bytes,status,created_at)"
              f" values('{s}','{p}','{u}','k','s','image/png',1,'completed','2026-01-01')")
    c.commit(); c.close()

    _alembic(db, "upgrade", "head")
    c = sqlite3.connect(db)
    (org_id,) = c.execute("select id from organisations where name='Default Organisation' and status='active'").fetchone()
    for table in ("users", "patients", "scans"):
        assert c.execute(f"select count(*) from {table} where organisation_id = ?", (org_id,)).fetchone()[0] == 1
        notnull = [r[3] for r in c.execute(f"pragma table_info({table})") if r[1] == "organisation_id"]
        assert notnull == [1]
    assert c.execute("select is_platform_admin from users").fetchone()[0] == 0
    c.close()

    _alembic(db, "downgrade", "0002")
    c = sqlite3.connect(db)
    assert c.execute("select count(*) from scans").fetchone()[0] == 1
    cols = [r[1] for r in c.execute("pragma table_info(users)")]
    assert "organisation_id" not in cols and "is_platform_admin" not in cols
    assert not c.execute("select 1 from sqlite_master where name='organisations'").fetchone()
