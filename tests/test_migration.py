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
    # 0004: existing scans get workflow defaults; the activity feed table exists
    assert c.execute("select priority, review_status, assigned_to_id, reviewed_by_id from scans").fetchone() \
        == ("routine", "pending", None, None)
    assert c.execute("select 1 from sqlite_master where name='activities'").fetchone()
    # 0005: reports table, one report per scan
    assert c.execute("select 1 from sqlite_master where name='reports'").fetchone()
    assert "unique" in c.execute("select sql from sqlite_master where name='reports'").fetchone()[0].lower()
    # 0006: profile columns, organisation settings with safe defaults, invitations
    assert c.execute("select job_title, phone_number, avatar_key from users").fetchone() == (None, None, None)
    assert c.execute(
        "select logo_key, radiologist_count, default_priority, auto_assign_to_id, report_disclaimer"
        " from organisations").fetchone() == (None, None, "routine", None, "")
    assert "unique" in c.execute("select sql from sqlite_master where name='invites'").fetchone()[0].lower()
    # 0007: admin-issued password reset links
    assert "unique" in c.execute("select sql from sqlite_master where name='password_resets'").fetchone()[0].lower()
    # 0008: notifications, notification preferences, a job title on invitations
    assert c.execute("select 1 from sqlite_master where name='notifications'").fetchone()
    assert c.execute("select 1 from sqlite_master where name='notification_preferences'").fetchone()
    assert "job_title" in [r[1] for r in c.execute("pragma table_info(invites)")]
    # 0009: only the registrant of an organisation is flagged for the first-sign-in setup
    assert "onboarding_pending" in [r[1] for r in c.execute("pragma table_info(users)")]
    c.close()

    _alembic(db, "downgrade", "0002")
    c = sqlite3.connect(db)
    assert c.execute("select count(*) from scans").fetchone()[0] == 1
    cols = [r[1] for r in c.execute("pragma table_info(users)")]
    assert "organisation_id" not in cols and "is_platform_admin" not in cols
    assert not c.execute("select 1 from sqlite_master where name='organisations'").fetchone()
    assert not c.execute("select 1 from sqlite_master where name='activities'").fetchone()
    assert not c.execute("select 1 from sqlite_master where name='reports'").fetchone()
    assert not c.execute("select 1 from sqlite_master where name='invites'").fetchone()
    assert not c.execute("select 1 from sqlite_master where name='password_resets'").fetchone()
    assert "avatar_key" not in cols and "job_title" not in cols


def test_0009_keeps_the_setup_only_for_admins_of_organisations_still_awaiting_approval():
    db = Path(tempfile.mkdtemp()) / "m9.db"
    _alembic(db, "upgrade", "0008")
    c = sqlite3.connect(db)
    pending, active = ("a" * 32, "b" * 32)
    for oid, status in ((pending, "pending"), (active, "active")):
        c.execute("insert into organisations(id,name,type,status,created_at,default_priority,report_disclaimer)"
                  f" values('{oid}','Org {status}','clinic','{status}','2026-01-01','routine','')")
    rows = [("1" * 32, "p-admin@x.com", "admin", pending), ("2" * 32, "p-doc@x.com", "clinician", pending),
            ("3" * 32, "a-admin@x.com", "admin", active)]
    for uid, email, role, oid in rows:
        c.execute("insert into users(id,email,hashed_password,full_name,role,organisation_id,is_active,is_approved,"
                  "is_platform_admin,created_at,updated_at)"
                  f" values('{uid}','{email}','h','N','{role}','{oid}',1,0,0,'2026-01-01','2026-01-01')")
    c.commit(); c.close()

    _alembic(db, "upgrade", "0009")
    c = sqlite3.connect(db)
    flags = dict(c.execute("select email, onboarding_pending from users").fetchall())
    assert flags == {"p-admin@x.com": 1, "p-doc@x.com": 0, "a-admin@x.com": 0}
    c.close()
    _alembic(db, "downgrade", "0008")  # and it goes back cleanly
