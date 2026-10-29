# MEDISCAN AI backend architecture decisions

**Created:** 9/29/2026 13:31:58  
**Updated:** 10/8/2026 12:44:57  
**Exported:** 10/8/2026 14:27:51  
**Link:** [https://claude.ai/chat/17f7aa78-678a-4a15-8b66-065c1701ffbe](https://claude.ai/chat/17f7aa78-678a-4a15-8b66-065c1701ffbe)  

## User:

> 9/29/2026 13:31:59

> File: MediScan_AI_Implementation_Plan_v3.md

# MEDISCAN AI — Backend Engineering Decisions Summary

## Executive Summary
This document summarizes the architectural, security, and infrastructure decisions established for the **MEDISCAN AI** backend service.

---

## 1. Technical Stack & Deployment Decisions

* **API Framework:** Selected **FastAPI** (Python 3.10+) running locally on port `7860` to align directly with Hugging Face Spaces cloud deployment requirements.
* **Database & ORM:** Selected **Neon PostgreSQL** using **SQLModel** and **asyncpg** for non-blocking asynchronous database operations.
* **Decoupled File Storage Strategy:** Enforced strict separation between relational metadata and binary files. PostgreSQL will exclusively store structured data (users, patient records, prediction scores, model versions, and URL references). Heavy raw X-ray files and heatmap overlays are offloaded to cloud object storage (Hugging Face Datasets / S3), preventing database bloat and staying within free-tier limits.

---

## 2. Machine Learning Engine & Explainability Decisions

* **Dual-Model Transfer Learning Pivot:** Replaced custom model training from scratch after Grad-CAM audits revealed severe shortcut learning (custom models latched onto text annotations, neck positioning, and borders instead of lung pathology). Standardized on:
  * **TorchXRayVision (`densenet121-res224-all`):** Handles multi-label classification for Pneumonia, Cardiomegaly, and Lung Nodules/Masses.
  * **Hugging Face MobileViT (`mobilevit_small-chest_xray`):** Handles Tuberculosis classification.
* **Local Development via ML Engine Mocking:** Implemented a lightweight **Mock Inference Service** locally to skip heavy PyTorch dependencies (~2.5 GB download, high RAM overhead). This unblocks backend API and frontend UI development without straining local hardware. The actual PyTorch models will run in cloud deployment (Hugging Face Spaces).
* **Thread-Safe Grad-CAM Concurrency:** Integrated `pytorch-grad-cam` targeting DenseNet `features[-1]` layer. Wrapped hook execution in an `asyncio.Lock()` to prevent memory hook corruption across concurrent requests.
* **Condition Aggregation & Nullable Heatmaps:**
  * Combined separate DenseNet `Nodule` and `Mass` outputs into a unified **"Lung Nodule / Mass"** condition using $\max(\text{score}_{\text{Nodule}}, \text{score}_{\text{Mass}})$.
  * Formatted Tuberculosis as `experimental: true` with `heatmap_base64: null`, as MobileViT does not generate convolutional feature map overlays.

---

## 3. Security & Database Architecture Decisions

* **Deterministic Refresh Token Storage:** Corrected a flaw in the initial security specification regarding bcrypt refresh token lookups. Because bcrypt uses non-deterministic salting, incoming refresh tokens will be hashed using **SHA-256** before database storage to enable fast, deterministic index lookups.
* **Password Hashing & JWT:** Standardized on Passlib (`bcrypt`) for user password hashing and PyJWT (`HS256`) for access tokens.

---

## 4. Codebase Architecture & Schema Decisions

* **Modular Directory Architecture:**
  * `backend/core/`: Application settings via `pydantic-settings` and async database session management.
  * `backend/services/`: ML inference logic (`inference_service.py`) and cloud storage handlers.
  * `backend/routers/`: Thin API endpoints (`inference.py`, `auth.py`, `scans.py`).
  * `backend/models/`: Database schemas (`User`, `Patient`, `Scan`, `Finding`).
* **OpenAPI Schema Contract:** Standardized the `POST /predict` endpoint payload to return structured findings containing condition name, prediction score, confidence percentage, Base64 heatmaps, model version tags, experimental flags, and clinical disclaimers.                                                                                                                                                                               i'm building the backend for this project the attached summary is all iv'e built so far

## Assistant:

> 9/29/2026 13:32:15

> Flagging security, compliance, and architecture gaps to address.
>
> - Flagging security, compliance, and architecture gaps to address.
> - **Done**

Your file's contents came through in the message, so I've read the whole summary. The decisions are mostly solid, especially dropping the from-scratch models after the Grad-CAM audit, and the SHA-256 fix for refresh tokens is correct (they're high-entropy random strings, so a fast hash is fine). Here's what I'd flag before you go further.

**Biggest concern: patient data storage.** Hugging Face Datasets isn't a good home for real patient X-rays. Repos are public unless set to private, and it isn't built for protected health data. If this will ever touch real patients, look at Nigeria's NDPA 2023 as well as HIPAA/GDPR-style expectations. A private S3-compatible bucket (Cloudflare R2, Backblaze B2, or AWS S3) with short-lived signed URLs is safer, and R2's free tier fits your budget. If it's only a demo with public datasets, say so in the docs and keep the storage layer swappable.

**Things that will bite you during implementation:**
- **Grad-CAM and the event loop.** An `asyncio.Lock` only protects the hooks. PyTorch inference is CPU-bound and will block the event loop unless you run it in a threadpool (`run_in_executor` or `anyio.to_thread`) *while holding the lock*. Load models once in FastAPI's `lifespan`, not per request.
- **Passlib.** It's poorly maintained and has compatibility problems with newer `bcrypt` versions. Use `bcrypt` directly, or `pwdlib` with argon2.
- **Neon with asyncpg.** If you use Neon's pooled connection string, set `statement_cache_size=0`. Also expect cold-start latency on the first query after idle.
- **Refresh token lifecycle.** Hashing is only part of it. You also need expiry, rotation on each use, reuse detection, and revocation on logout, plus short-lived access tokens.
- **"Confidence percentage."** Raw sigmoid outputs from these models aren't calibrated probabilities. Consider naming the field `score` only, or explaining this in the disclaimer, since clinicians may read 87% literally.
- **Mock service.** Define the inference interface as a `Protocol` or abstract class, and pick the implementation via an env flag like `INFERENCE_BACKEND=mock|torch`. The mock must return the exact same schema, including `heatmap_base64: null` for TB.

**Not in your summary yet:**
- Alembic migrations
- Upload validation (file size limit, magic-byte checks, allowed formats)
- Rate limiting and CORS config
- Role-based access (patient vs. clinician) and audit logging of who viewed which scan
- Health-check endpoint and a Dockerfile for Spaces (port 7860, non-root user)
- A test suite, at least for auth and `/predict` against the mock

**Suggested build order:** core config and DB session, then models and the first migration, then auth, then the mock inference service with `/predict`, then storage, and last the real PyTorch service in Docker.

Which piece are you working on next? I can write the code for it, such as the SQLModel schemas, the auth router with refresh-token rotation, or the mock inference service.

## User:

> 9/29/2026 13:33:22

let's go with the build order you suggested

## Assistant:

> 9/29/2026 13:35:20

> Writing and validating health checks, config tests, and lifespan setup.
>
> - Writing and validating health checks, config tests, and lifespan setup.
> - **Done**

Step 1 is core config, the DB session, and an app skeleton. I'll build it and run the tests before handing it over.

> Setting up a virtual environment to fix installation errors.
>
> - Scaffold step 1 (config, DB session, app skeleton) and run tests
> - Setting up a virtual environment to fix installation errors.
> - **Done**

The shell didn't support brace expansion, so the directories came out wrong. I'll clean up and redo it under bash.

> Ran 2 commands, presented file
>
> - Inspect and clean up the malformed scaffold
> - Recreate scaffold under bash, install deps in a venv, run tests
> - Presenting file(s)...
> - **Done**

Step 1 is done and all 6 tests pass. The tests use in-memory SQLite, so nothing has been run against a live Neon database yet.

**What's in it**
- **`core/config.py`:** pydantic-settings, fully env-driven. It takes Neon's connection string as-is and converts it for asyncpg. That means swapping in the `postgresql+asyncpg` driver and dropping `sslmode` and `channel_binding`, which asyncpg rejects. If the host is a `-pooler` endpoint, it also turns off prepared-statement caching, which PgBouncer needs. It also enforces a JWT secret of at least 32 characters.
- **`core/database.py`:** async engine with `pool_pre_ping` and connection recycling, so Neon's idle disconnects don't cause errors. The connect timeout is 30 seconds to cover cold starts. `get_session()` is the per-request dependency, and commits are explicit, so each service owns its own unit of work.
- **`main.py`:** lifespan hook, CORS from settings, and Swagger docs turned off when `ENVIRONMENT=production`. `/health` is a liveness check for Spaces, and `/health/ready` runs `SELECT 1` against the database.
- **`requirements.txt` and `requirements-ml.txt`:** the split keeps the ~2.5 GB PyTorch stack out of your local install. Only the Space image installs the ML file.

**To run it locally**
```bash
cp .env.example .env        # paste your Neon URL and generate a JWT secret
pip install -r requirements.txt
uvicorn backend.main:app --port 7860 --reload
pytest
```
Then open `http://localhost:7860/health/ready` to confirm Neon connects.

**Step 2 next:** the SQLModel schemas (`User`, `Patient`, `Scan`, `Finding`, `RefreshToken`) and the first Alembic migration, set up for async. Three schema decisions affect it:
1. **Roles:** should `User` carry a simple `role` field (`clinician` or `admin`), or do patients also log in? This shapes the ownership rules on `Patient` and `Scan`.
2. **IDs:** UUIDs or auto-increment integers? I'd default to UUIDs, so record IDs can't be guessed from URLs.
3. **Patient identifiers:** do you need real names or MRNs, or will patients be pseudonymous codes? Pseudonymous codes reduce your data-protection exposure a lot.

If you'd rather I pick defaults (UUIDs, `role` field, pseudonymous patient codes), say so and I'll build step 2 straight away.

> File: [/mnt/user-data/outputs/mediscan-backend/backend/core/config.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Fcore%2Fconfig.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/core/database.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Fcore%2Fdatabase.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/main.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Fmain.py)

> File: [/mnt/user-data/outputs/mediscan-backend/requirements.txt](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Frequirements.txt)

> File: [/mnt/user-data/outputs/mediscan-backend/requirements-ml.txt](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Frequirements-ml.txt)

> File: [/mnt/user-data/outputs/mediscan-backend/.env.example](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2F.env.example)

> File: [/mnt/user-data/outputs/mediscan-backend/tests/test_config.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Ftests%2Ftest_config.py)

> File: [/mnt/user-data/outputs/mediscan-backend/tests/test_health.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Ftests%2Ftest_health.py)

## User:

> 9/29/2026 13:38:51

we are exploring alternatives to  Neon presently what options are more favorable to replace Neon with

## Assistant:

> 9/29/2026 13:39:18

> Researching current Neon alternatives and their pricing.
>
> - Researching current Neon alternatives and their pricing.
> - **Done**

I'll check current free-tier terms first, since these change often.

> Checking pooler hostname details against configuration logic.
>
> - free tier managed Postgres comparison 2026 Neon Supabase alternatives
> - Comparing free-tier database hosting options and their limitations.
> - Render free Postgres database expires 30 days 2026
> - Checking pooler hostname details against configuration logic.
> - **Done**

The best replacement depends on why you're leaving Neon. Your code is standard SQLAlchemy and asyncpg, so any plain Postgres host works with only a `DATABASE_URL` change.

**Free or near-free options**
- **Supabase** is the closest free swap. The free tier gives you a 500 MB database, 1 GB of file storage and 2 active projects, but projects pause after a week idle. That pause is a problem for demos that sit unused. It's standard Postgres, so lock-in is low. The bundled file storage could also replace Hugging Face Datasets for X-rays. 1 GB fills up fast with images, though.
- **Aiven** has a free or hobbyist Postgres tier, but the sources disagree on the terms. One review lists a Developer tier from $5 a month, while a community note says a free 1 GB-RAM, 1 GB-disk instance exists. Check Aiven's pricing page before relying on either.
- **Render** free Postgres is a bad fit. Free databases expire 30 days after creation, and after a 14-day grace period Render deletes them with all their data. Free instances also have no backups.

**Paid, always-on options (better if real patient data is involved)**
- **Supabase Pro** is $25 a month with always-on compute.
- **Sliplane** starts at €19 a month with 10 GB included, in Germany, US, Finland or Singapore.
- **AWS RDS** costs about $15 a month for a db.t4g.micro, with 750 free hours a month for the first 12 months. RDS also offers a Cape Town region (af-south-1). That is closer to Nigeria than Europe and may help with data-residency questions, but confirm current regions in AWS.
- **A self-managed Hetzner VPS** is about $5 a month for a full Postgres instance with superuser access. It's the cheapest option, but you own the backups, patching and security, which is a heavy burden for medical data.

**My recommendation**
- **Demo or portfolio:** stay on Neon or move to Supabase free. Accept the pause or cold-start behavior.
- **Real clinical pilot:** use a paid always-on tier, with RDS in Cape Town or Supabase Pro as the leading choices. That gives you backups and no cold starts, and it lets you document where the data lives.

**Code note:** Supabase's transaction pooler also needs the prepared-statement cache turned off, but my config only detects Neon's `-pooler` hostnames. If you pick Supabase, I'll change that to an env flag so it works with any pooled host.

What's driving the move: cold starts, the 0.5 GB limit, cost, or data residency? That decides which of these fits.

---

**Sources:**

- [5 Supabase Alternatives for Managed Postgres in 2026](https://sliplane.io/blog/supabase-alternatives-managed-postgres)
- [Best PostgreSQL Hosting in 2026: RDS vs Supabase vs Neon vs Self-Hosted - DEV Community](https://dev.to/philip_mcclarence_2ef9475/best-postgresql-hosting-in-2026-rds-vs-supabase-vs-neon-vs-self-hosted-5fkp)
- [Database Free Tier Comparison 2026 — Supabase vs Neon vs Firebase vs Turso vs PlanetScale](https://agentdeals.dev/database-free-tier-comparison-2026)
- [Neon vs Supabase 2026: Benchmarks, Pricing & Verdict](https://designrevision.com/blog/supabase-vs-neon)
- [Neon vs Supabase 2026: Postgres Platform Compared](https://www.kunalganglani.com/blog/neon-vs-supabase-2026)
- [Best Managed Postgres 2026: Neon vs Supabase vs RDS](https://www.techplained.com/best-managed-postgres)
- [Best PostgreSQL Hosting in 2026: RDS vs Supabase vs Neon vs Self-Hosted](https://mydba.dev/blog/best-postgres-hosting)
- [Neon Serverless Postgres vs Supabase: Free Tier Comparison](https://freetier.co/compare/neon-serverless-postgres-vs-supabase)
- [12 Best Neon Alternatives for Managed Postgres (Reviewed)](https://nearbase.dev/blog/neon-alternatives/)
- [GitHub - freebase-cloud/render-postgres-alternative: Render Postgres alternative — free Postgres that does not expire after 30 days, plus migration steps](https://github.com/freebase-cloud/render-postgres-alternative)
- [Deploy for Free](https://render.com/docs/free)
- [render.com todo](https://github.com/andyrosa2/render.com_todo)
- [Render Free Hosting Review: Web Apps, Postgres, Limits](https://toolfreebie.com/render-hosting-review/)
- [Deploy n8n on Render](https://render.com/docs/deploy-n8n)
- [gist.github.com](https://gist.github.com/bmaupin/0ce79806467804fdbbf8761970511b8c?permalink_comment_id=5046736)
- [gist.github.com](https://gist.github.com/bmaupin/0ce79806467804fdbbf8761970511b8c?permalink_comment_id=5201245)
- [gist.github.com](https://gist.github.com/bmaupin/0ce79806467804fdbbf8761970511b8c?permalink_comment_id=5659322)
- [gist.github.com](https://gist.github.com/bmaupin/0ce79806467804fdbbf8761970511b8c?permalink_comment_id=5732368)
- [gist.github.com](https://gist.github.com/bmaupin/0ce79806467804fdbbf8761970511b8c?permalink_comment_id=5125231)

## User:

> 9/29/2026 13:40:34

the 0.5GB limit

## Assistant:

> 9/29/2026 13:40:48

> Assessing whether a storage limit fits the metadata design.
>
> - Assessing whether a storage limit fits the metadata design.
> - **Done**

Before switching, check what's using the space. Your design keeps X-rays and heatmaps in object storage, so the database should only hold metadata, and that rarely reaches 0.5 GB. A scan row with its findings is a few KB, which is on the order of 100,000 scans. If you're near the limit, something big is probably in the database. The usual causes:

- **Base64 heatmaps or images stored in a column.** Base64 adds about 33% on top of the image size, and a few hundred heatmaps could fill 0.5 GB. Store only the object-storage key or URL, and return the Base64 in the API response without persisting it.
- **Expired refresh tokens that are never deleted.** These need a cleanup job.
- **Dev churn.** Test data, repeated migrations and old branches all count.

You can see what's using the space with:

```sql
SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) AS size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 10;
```

Send me the output if you're unsure what it shows.

**If it really is metadata growth**, most of the alternatives I listed don't help on the free tier:
- **Supabase free** has the same 500 MB limit, so switching gains you nothing. Its free tier is 500 MB of Postgres.
- **Render free** gives 1 GB but expires and deletes the database, so it's out.
- **Aiven's free tier** may offer 1 GB, but the terms were unclear in the sources I found.

Paid options give real headroom:
- **Neon Launch** is usage-based, and a typical bill is around $15 a month. Upgrading Neon is probably the cheapest fix because you change nothing in your code.
- **Sliplane** is €19 a month with 10 GB included.
- **RDS or a VPS** give more storage but more work or cost.

**If images are your real storage need**, that belongs in object storage, not Postgres. Cloudflare R2 or Backblaze B2 have generous free tiers, though you should confirm current limits. Private buckets with signed URLs also fix the patient-data concern I raised earlier.

I'd first run the query, then move any blobs out of the database, and only then decide whether to change providers. Do you want me to build the step 2 schemas so that images and heatmaps are stored as object-storage keys and never as blobs in a column?

## User:

> 9/29/2026 13:41:43

yes but let me add the previous code first

## Assistant:

> 9/29/2026 13:41:47

> Waiting for the earlier code before continuing the build.
>
> - Waiting for the earlier code before continuing the build.
> - **Done**

Sounds good. Take your time getting step 1 running.

To confirm it's set up correctly, `pytest` should pass and `/health/ready` should return `{"status": "ready"}` against your database.

When you're back, send me any changes you made to the step 1 files, such as a different database host or edits to `config.py`, so step 2 matches your version. If you'd rather I choose, I'll use these defaults for the schemas:

- **IDs:** UUIDs for all primary keys.
- **Roles:** a simple `role` field on `User` (`clinician` or `admin`).
- **Patients:** pseudonymous codes rather than real names or MRNs.
- **Images:** object-storage keys only, with no blobs or Base64 stored in the database.

If any of those don't suit you, say so before I build.

## User:

> 9/29/2026 13:54:36

uvicorn main:app --reload --port 7860
INFO:     Will watch for changes in these directories: ['/home/vincent/Documents/MEDISCAN/backend']
INFO:     Uvicorn running on http://127.0.0.1:7860 (Press CTRL+C to quit)
INFO:     Started reloader process [71595] using StatReload
Process SpawnProcess-1:
Traceback (most recent call last):
  File "/home/vincent/anaconda3/lib/python3.13/multiprocessing/process.py", line 313, in _bootstrap
    self.run()
    ~~~~~~~~^^
  File "/home/vincent/anaconda3/lib/python3.13/multiprocessing/process.py", line 108, in run
    self._target(*self._args, **self._kwargs)
    ~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/uvicorn/_subprocess.py", line 80, in subprocess_started
    target(sockets=sockets)
    ~~~~~~^^^^^^^^^^^^^^^^^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/uvicorn/server.py", line 86, in run
    return asyncio_run(self.serve(sockets=sockets), loop_factory=self.config.get_loop_factory())
  File "/home/vincent/anaconda3/lib/python3.13/asyncio/runners.py", line 195, in run
    return runner.run(main)
           ~~~~~~~~~~^^^^^^
  File "/home/vincent/anaconda3/lib/python3.13/asyncio/runners.py", line 118, in run
    return self._loop.run_until_complete(task)
           ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^^^^^^
  File "/home/vincent/anaconda3/lib/python3.13/asyncio/base_events.py", line 725, in run_until_complete
    return future.result()
           ~~~~~~~~~~~~~^^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/uvicorn/server.py", line 90, in serve
    await self._serve(sockets)
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/uvicorn/server.py", line 97, in _serve
    config.load()
    ~~~~~~~~~~~^^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/uvicorn/config.py", line 511, in load
    self.loaded_app = self.load_app()
                      ~~~~~~~~~~~~~^^
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/uvicorn/config.py", line 434, in load_app
    return import_from_string(self.app)
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/uvicorn/importer.py", line 22, in import_from_string
    raise exc from None
  File "/home/vincent/Documents/MEDISCAN/backend/venv/lib/python3.13/site-packages/uvicorn/importer.py", line 19, in import_from_string
    module = importlib.import_module(module_str)
  File "/home/vincent/anaconda3/lib/python3.13/importlib/__init__.py", line 88, in import_module
    return _bootstrap._gcd_import(name[level:], package, level)
           ~~~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "<frozen importlib._bootstrap>", line 1387, in _gcd_import
  File "<frozen importlib._bootstrap>", line 1360, in _find_and_load
  File "<frozen importlib._bootstrap>", line 1331, in _find_and_load_unlocked
  File "<frozen importlib._bootstrap>", line 935, in _load_unlocked
  File "<frozen importlib._bootstrap_external>", line 1026, in exec_module
  File "<frozen importlib._bootstrap>", line 488, in _call_with_frames_removed
  File "/home/vincent/Documents/MEDISCAN/backend/main.py", line 8, in <module>
    from backend.core.config import get_settings
ModuleNotFoundError: No module named 'backend'

## Assistant:

> 9/29/2026 13:54:44

> Diagnosing a module import error from the wrong working directory.
>
> - Diagnosing a module import error from the wrong working directory.
> - **Done**

That error is a folder-layout mismatch, not a bug in the code. You ran uvicorn from inside `backend/`, but `main.py` imports `backend.core...`, so Python looks for a `backend` package in the folder you're in and can't find it. The `backend` folder has to sit one level below where you run the command.

**The fix**

Run it from the project root, `MEDISCAN/`, using the dotted path:

```bash
cd /home/vincent/Documents/MEDISCAN
source backend/venv/bin/activate
uvicorn backend.main:app --reload --port 7860
```

Your files should be laid out like this:

```
MEDISCAN/
├── .env                  <- must be here (config reads it from where you run uvicorn)
├── pytest.ini
├── requirements.txt
├── tests/
└── backend/
    ├── __init__.py       <- make sure this exists
    ├── main.py
    └── core/ (config.py, database.py, __init__.py)
```

If you copied files into `MEDISCAN/backend/` and put `.env` and `pytest.ini` there too, move them up to `MEDISCAN/`.

**Watch out for the venv location.** Your venv is at `backend/venv`, inside the folder uvicorn watches with `--reload`. That can make reloads slow or trigger them spuriously. Either move it to the project root as `.venv` (uvicorn ignores dot-folders), or exclude it:

```bash
uvicorn backend.main:app --reload --port 7860 --reload-dir backend --reload-exclude "backend/venv/*"
```

**Once it starts**, open `http://127.0.0.1:7860/health` and then `/health/ready`. The second one should return `{"status": "ready"}` if your Neon `DATABASE_URL` is working.

If it fails with a different error after this, such as a pydantic validation error about a missing `DATABASE_URL` or `JWT_SECRET_KEY`, that means `.env` isn't being found. Paste the new output and I'll sort it out.

## User:

> 9/29/2026 14:02:34

> File: 

## Assistant:

> 9/29/2026 14:02:41

> Diagnosing a missing environment file during import testing.
>
> - Diagnosing a missing environment file during import testing.
> - **Done**

Good progress. The import error is gone, and this new one is the `.env` problem I mentioned. The app starts, but `DATABASE_URL` and `JWT_SECRET_KEY` are empty because no `.env` file was found. Settings look for `.env` in the folder you run uvicorn from, which is `MEDISCAN/`.

**Fix**

```bash
cd /home/vincent/Documents/MEDISCAN
cp .env.example .env        # or create it there if you don't have the example file
python -c "import secrets; print(secrets.token_urlsafe(64))"   # copy the output
```

Then edit `MEDISCAN/.env` with those two values:

```
DATABASE_URL=postgresql://<user>:<password>@<your-neon-host>/<db>?sslmode=require
JWT_SECRET_KEY=<paste the generated string>
```

Paste Neon's connection string exactly as the dashboard shows it. Don't add quotes and don't change the `postgresql://` prefix, because the config converts it for asyncpg itself.

If you already have a `.env` in `MEDISCAN/backend/`, move it up one level, or use this change so the path no longer depends on where you run the command. In `backend/core/config.py`, add the import and change `model_config`:

```python
from pathlib import Path

ENV_FILE = Path(__file__).resolve().parents[2] / ".env"   # MEDISCAN/.env

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=ENV_FILE, env_file_encoding="utf-8", extra="ignore"
    )
```

**The reload warning.** `--reload-exclude` only works if `watchfiles` is installed. Fix it with:

```bash
pip install watchfiles
```

Then rerun:

```bash
uvicorn backend.main:app --reload --port 7860 --reload-dir backend --reload-exclude "backend/venv/*"
```

Then open `http://127.0.0.1:7860/health/ready`. If it returns `{"status": "ready"}`, step 1 is done. If it returns a 503, the terminal will show the real database error, so paste that and I'll sort it out. Keep `.env` out of git; the `.gitignore` I gave you already covers it.

## User:

> 9/29/2026 14:04:55

![1790687091654_image.png](data:image/webp;base64,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)

i haven't setup Neon yet

## Assistant:

> 9/29/2026 14:05:04

> Guiding through Neon account and project setup.
>
> - Guiding through Neon account and project setup.
> - **Done**

That's fine. With metadata only in the database, the 0.5 GB free plan will last a long time.

**Onboarding screen**
1. **Organization name:** anything, for example `Vincent` or `MediScan`.
2. **What's it for:** leave it on "Personal projects."
3. **Invite your team:** leave it blank and click **Next**. You can invite people later.

**Creating the project**
1. **Project name:** `mediscan`.
2. **Postgres version:** keep the default.
3. **Region:** pick this carefully, because you can't change it later without migrating the data. The screen defaults to AWS US East 2 (Ohio). From Nigeria, a Europe region such as Frankfurt or London should give lower latency during development, if Neon offers one in your list. Once deployed, the latency that matters is between your API server and the database, so put the database near wherever the backend runs. I don't know for sure where Hugging Face Spaces hosts, so check that before you commit.
4. **Neon Auth and Data API:** skip both. Your FastAPI app handles authentication itself.

**Getting the connection string**
1. On the project dashboard, click **Connect**.
2. Turn **Connection pooling** on. It also works with it off. The config I gave you handles both.
3. Copy the string, which starts with `postgresql://`. Neon may show the password hidden, so make sure you copy the version that includes it, using the show or copy button.
4. Paste it into `MEDISCAN/.env` as `DATABASE_URL=...` with no quotes.

Then run uvicorn again and open `/health/ready`. Let me know what it returns.

Don't share your real connection string or password with me in this chat. If you need to paste an error, replace the password with `***`.

## User:

> 9/30/2026 11:16:25

{
  "status": "ready"
}           this is what it returned

## Assistant:

> 9/30/2026 11:19:22

> Defining scan, finding, and audit log model fields.
>
> - Defining scan, finding, and audit log model fields.
> - **Done**

Step 1 works: the app is running and connected to Neon. Now step 2, which covers the SQLModel schemas and the async Alembic setup. I'll use the defaults I proposed (UUID keys, a `role` field, pseudonymous patient codes, and storage keys instead of image data), then test everything before handing it over.

> Fixing a scripting error caused by unescaped punctuation.
>
> - Write step 2: models, async Alembic config, model tests
> - Fixing a scripting error caused by unescaped punctuation.
> - **Done**

The quoting broke on an apostrophe in a comment, so I'll rewrite the script as a file instead.

> Ran command
>
> - Write step 2 files via script and run the test suite
> - **Done**

These are test-fixture failures, not model bugs. The test session expires objects on commit, and the app's session doesn't, so I'll match the app's setting.

> Fixing a duplicate-user bug in a test helper.
>
> - Match test session to app session settings and rerun
> - Fixing a duplicate-user bug in a test helper.
> - Fix test bugs and rerun
> - **Done**

All 13 tests pass. Next I'll generate the initial migration, preferably against a real Postgres instance rather than SQLite.

> Configuring database connections for embedded Postgres setup.
>
> - Try starting an embedded Postgres for migration verification
> - Configuring database connections for embedded Postgres setup.
> - **Done**

Embedded Postgres works, so I can generate and test the migration on a real PostgreSQL database.

> Testing the migration against a real Postgres setup.
>
> - Autogenerate migration and test upgrade/downgrade/drift on real Postgres
> - Testing the migration against a real Postgres setup.
> - Clean build artifacts, stop test Postgres, list deliverables
> - Presenting file(s)...
> - **Done**

Step 2 is built and tested. The 13 tests pass, and the migration ran cleanly on a real PostgreSQL instance. It upgraded, downgraded, upgraded again, and `alembic check` reported no drift between the models and the database. It hasn't run against your Neon database yet, so that's the first thing to do.

**What to copy into `MEDISCAN/`**
- `backend/models/` (7 files)
- `alembic.ini` and `migrations/` (`env.py`, `script.py.mako`, `versions/20260930_0001_initial_schema.py`)
- `tests/test_models.py`
- `backend/core/config.py` (updated with the `.env` path fix from before, so replace yours if you haven't made that change)

**Apply it to Neon**
```bash
cd /home/vincent/Documents/MEDISCAN
source backend/venv/bin/activate
pip install alembic          # if not already installed
alembic upgrade head
```
You should see `Running upgrade -> 0001, initial schema`. You can also check the tables in Neon's SQL editor.

**The schema**
- **`users`:** unique lowercased email, bcrypt hash, and a `role` of `clinician` or `admin`.
- **`patients`:** a pseudonymous `patient_code` plus optional sex and year of birth, with no names or MRNs. Each patient belongs to the clinician who created them.
- **`scans`:** object-storage key, SHA-256 of the image, content type, size, and status. There are no image blobs in the database.
- **`findings`:** one row per condition with the raw `score`, checked to be between 0 and 1. It also stores `heatmap_key`, which is null for TB, plus the model name and version and the `experimental` flag. I dropped the "confidence percentage" column because the scores aren't calibrated probabilities, so the API can label the value however you decide.
- **`refresh_tokens`:** SHA-256 token hash, a `family_id` for reuse detection, and expiry and revocation timestamps.
- **`audit_logs`:** who did what to which record. Rows survive if the user is deleted.

**Two decisions to check**
1. Deleting a patient deletes their scans and findings, which supports erasure requests. Deleting a user who still owns patients or scans is blocked, so deactivate users with `is_active=false` instead.
2. Findings load automatically with each scan, because async sessions can't lazy-load. That's fine for about four findings per scan.

**Step 3, auth:** registration and login, bcrypt hashing without passlib, access tokens, and refresh-token rotation with reuse detection using the `family_id`. Two decisions before I build it:
1. **Registration:** is it open to anyone, or admin-only, with a seeded first admin? For a clinical tool I'd recommend admin-only.
2. **Refresh token delivery:** should the token go in an HttpOnly cookie or in the JSON body? A cookie is safer against script theft if your frontend and API share a site. The body is simpler if they're on different domains, such as a Vercel frontend and a Hugging Face Space API.

> File: [/mnt/user-data/outputs/mediscan-backend/migrations/versions/20260930_0001_initial_schema.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fmigrations%2Fversions%2F20260930_0001_initial_schema.py)

> File: [/mnt/user-data/outputs/mediscan-backend/migrations/env.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fmigrations%2Fenv.py)

> File: [/mnt/user-data/outputs/mediscan-backend/migrations/script.py.mako](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fmigrations%2Fscript.py.mako)

> File: [/mnt/user-data/outputs/mediscan-backend/alembic.ini](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Falembic.ini)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/models/__init__.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Fmodels%2F__init__.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/models/base.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Fmodels%2Fbase.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/models/user.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Fmodels%2Fuser.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/models/patient.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Fmodels%2Fpatient.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/models/scan.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Fmodels%2Fscan.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/models/token.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Fmodels%2Ftoken.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/models/audit.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Fmodels%2Faudit.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/core/config.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Fcore%2Fconfig.py)

> File: [/mnt/user-data/outputs/mediscan-backend/tests/test_models.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Ftests%2Ftest_models.py)

## User:

> 9/30/2026 11:33:18

which files do i move to models/

## Assistant:

> 9/30/2026 11:33:23

> Listing the backend model files and their organization.
>
> - Listing the backend model files and their organization.
> - **Done**

Seven files go into `MEDISCAN/backend/models/`:

- `__init__.py` (replace the empty one you already have)
- `base.py`
- `user.py`
- `patient.py`
- `scan.py`
- `token.py`
- `audit.py`

The other files go elsewhere:

| File | Destination |
|---|---|
| `config.py` | `MEDISCAN/backend/core/` (overwrites your current one) |
| `alembic.ini` | `MEDISCAN/` (project root, next to `.env`) |
| `migrations/` folder (`env.py`, `script.py.mako`, `versions/...initial_schema.py`) | `MEDISCAN/migrations/` (project root) |
| `test_models.py` | `MEDISCAN/tests/` |

Your project should end up looking like this:

```
MEDISCAN/
├── .env
├── alembic.ini
├── migrations/
│   ├── env.py
│   ├── script.py.mako
│   └── versions/
│       └── 20260930_0001_initial_schema.py
├── tests/
│   └── test_models.py  (plus the earlier test files)
└── backend/
    ├── main.py
    ├── core/   (config.py, database.py)
    └── models/ (the 7 files above)
```

`alembic.ini` and `migrations/` must sit at the project root, not inside `backend/`. Alembic finds `backend.models` from the root, the same way uvicorn finds `backend.main`. Then run `alembic upgrade head` from `MEDISCAN/`.

## User:

> 9/30/2026 12:35:55

alembic upgrade head
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Will assume transactional DDL.
ERROR [alembic.util.messaging] Could not determine revision id from filename ...initial_schema.py. Be sure the 'revision'variable is declared inside the script (please see 'Upgrading from Alembic 0.1 to 0.2' in the documentation).
  FAILED: Could not determine revision id from filename ...initial_schema.py. Be sure the 'revision' variable is declared
  inside the script (please see 'Upgrading from Alembic 0.1 to 0.2' in the documentation).

## Assistant:

> 9/30/2026 12:36:06

> Diagnosing a missing revision identifier in a migration script.
>
> - Diagnosing a missing revision identifier in a migration script.
> - **Done**

Alembic connected to Neon fine (`Context impl PostgresqlImpl`), but the migration file it loaded has no `revision = ...` line. The file was probably copied incomplete or empty, or overwritten with the wrong content. The original file I generated declares `revision: str = '0001'` near the top, so this is a copy problem.

**Check the file**
```bash
cd /home/vincent/Documents/MEDISCAN
wc -l migrations/versions/*.py
head -20 migrations/versions/*_initial_schema.py
ls migrations/versions
```
A healthy file is roughly 150 lines and has `revision: str = '0001'` in its first 20. If it's empty, truncated, or contains something else (for example the `.mako` template), that's the cause. Also make sure there's only one `.py` file in `versions/` and no stray copies.

**Fix: regenerate it on your machine**
This is more reliable than re-copying, and your Neon database is empty, so autogenerate produces exactly the migration I tested:
```bash
rm migrations/versions/*_initial_schema.py
alembic revision --autogenerate -m "initial schema" --rev-id 0001
alembic upgrade head
```
The first command should list the detected tables (`users`, `patients`, `scans`, `findings`, `refresh_tokens`, `audit_logs`). The second should print `Running upgrade -> 0001, initial schema`. The failed run didn't touch your database, so there's nothing to clean up.

If the regenerate step also errors, paste the output with any password removed. Once the upgrade succeeds, run `alembic check` to confirm the models and database match.

## User:

> 9/30/2026 12:40:18

alembic revision --autogenerate -m "initial schema" --rev-id 0001
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Will assume transactional DDL.
ERROR [alembic.util.messaging] Target database is not up to date.
  FAILED: Target database is not up to date.

## Assistant:

> 9/30/2026 12:40:32

> Planning steps to inspect and reset the database state.
>
> - Planning steps to inspect and reset the database state.
> - **Done**

This error usually means the database records a revision that your `migrations/versions/` folder doesn't contain. Alembic compares the version stored in the `alembic_version` table with the migration files. Since you deleted the broken file, a `0001` stamp in the database would now point at a missing script.

**Check what's in Neon**
In the Neon dashboard, open the **SQL Editor** and run:

```sql
SELECT * FROM alembic_version;
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
```

**Reset and redo**
Do this only if the database has nothing you need. It should hold only these tables, since you set Neon up today. If the tables listed are anything other than `users`, `patients`, `scans`, `findings`, `refresh_tokens`, `audit_logs`, and `alembic_version`, stop and tell me.

Run this in the SQL Editor:

```sql
DROP TABLE IF EXISTS findings, scans, patients, refresh_tokens,
                     audit_logs, users, alembic_version CASCADE;
```

Then, in your terminal from `MEDISCAN/`:

```bash
ls migrations/versions        # should show no .py files (an empty __pycache__ folder is fine)
alembic revision --autogenerate -m "initial schema" --rev-id 0001
alembic upgrade head
alembic check
```

**What you should see**
- The `revision` command lists six detected tables and prints `Generating ...initial_schema.py ... done`.
- `upgrade head` prints `Running upgrade -> 0001, initial schema`.
- `alembic check` prints `No new upgrade operations detected.`

If any step still fails, paste the output, with passwords removed, along with the results of the two `SELECT` queries. Those show me the database's state directly.

## User:

> 9/30/2026 12:46:43

![1790768794533_image.png](data:image/webp;base64,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)

this is what it looks like

## Assistant:

> 9/30/2026 12:46:47

The editor has both queries typed, but they haven't run yet. The status says "Ready to connect" and the history is empty. Click **Run** to execute them.

**If the first query errors**
If it says `relation "alembic_version" does not exist`, that's fine and useful. It means Alembic never stamped a version in this database, so the "not up to date" error came from somewhere else. The error may also stop the second query from running. If so, delete line 1, leave only the `pg_tables` query, and click **Run** again.

**What the results tell us**
- **`alembic_version` shows `0001`:** the database thinks the migration was applied, but the file is gone. Run the `DROP TABLE` cleanup from my last message, then regenerate.
- **`alembic_version` doesn't exist and `pg_tables` shows nothing or only unrelated tables:** the database is clean. Skip the `DROP` and go straight to the `alembic revision --autogenerate` command.
- **`pg_tables` lists any tables other than the six plus `alembic_version`:** stop and tell me before dropping anything.

If you'd rather not interpret the output, screenshot the results panel after clicking Run, and I'll tell you which case you're in and what to do.

## User:

> 9/30/2026 12:48:12

![1790768881545_image.png](data:image/webp;base64,UklGRhC7AABXRUJQVlA4IAS7AAAwaQOdASoABdACPm02l0ikIyIhIrNZ6IANiWdu/u1+x/5nU8cm/KrG/Q3+j9QL8s/in9y/mHjQeKkA/L3+l/rXq3/DeRj4B/lfYZ/qf+k/Y7oRJAPzh5hP+n/tP9J7Iv0T/M/9//P/2/4If0D+uf8z8/+9z9Enzg6s7HKf+xngr9AKqOBfkg1R839AD+Kf8DZDuYY8y3kT/l/oG/h38g/5vYJ+gB4qlK6tu/VsXPodk4+v/V4ufLf+PyvawH03/5//c9hn+6/23/d9wT/NfiR77f+r+3nun/d71GfsT+4nvC/9f9wvc7/jv+H7AH9c/x/qxf7r/+/8H/3fIn/VP9T///+N/5fkI/lH9+//PtY//D96/hM/z3/s/b/4Iv9F/2P//7AH/89sD+Af/Prh+ov9b/rX7Cf2H5F95f33+z/47/a/330n/I/oH8f/Yv8v/1/8Z7F39r/a/B75/+zf7z/Cf6T2C/kH2w/Nf3D/F/+P/GfNr9m/0n91/Jb0T+AP9T/eP3d/yfyC/k/8+/zv9t/x3/k/z3xgfD/6z/I/5r/t/43xg9I/vv+4/x/7tfv////sF9d/oX+l/uf+T/9X+f9C7+d/vv+S/8n+H/////+hfzb+vf6z+/f4//1f6X7AP5P/SP9P/c/8l/6/83/////9g/6T/rf4/9//Ro+z/6X/qf4/8yPsB/m/9j/5n+C/zf7gfSl/Gf93/Jf6z/6f8L/////4p/nf+H/7n+S/1f7g//////oN/Mv67/yf8D/n//z/uP///+vvd//fuL/dn/+/9n///Lb+4f/8/6duYvh5GrXVe5KJ3DxvjUr1QLqsOL6jxfnD2Hmqw4vqPF+cPYearDi+oxQ2Xi1AXHkQGG7Cwv4wT3mwFEhkdQrpGg94CWwUGRTuEQjJRQDNY1hMI4vqPF+cPYeUzLmIRtWYobKqkhHSMA/ATcXVcgfGlxOOMeIhR8aS3LdrIiftKtZt/tbfV9SMiUK7VRcJ7bDUZfJlSCE/k1HT6SME33BUIa8hJJZRjtdXU0wCgbkmldKuYBIndVOs9ysKeHX1cU0Cyen5UsD6gWGkUON+JIWo34khajfiSFqN+JIWo34hCrCeNlHt+gyR0MhERsvtkAx7Nn9FwbshGWzRHquDXxgsz//PZC1G/EkLURaVwipR2PmZo4tK6++tutYrUoDGs1q/eCV9za8VK/CMAk/8pd06wo1Q0mqaHm4xw9xhg+MprNb8K3HBkCpRvn++pEQIoI7r7Q24mjhWkzeYAMHcv/dVO5fcA9t1rlygR+fHzcnQEtm1Yjl3lumj6fS84Lolp1lV9QkKGaFUwqmFUwqkUHmVn9y3x9V25SWxKuIu20Jm/RxLaNlVgxj47ZnBSRLtXJ8TeSAxrVIMBpfJPCqYPgtrDaxhxXFPeCjHPKh3gKwptSBs2i4AeY5UVgkodlEB7PvZgQvLfH5AF+9KWp3viLgYKNS3RDB7xdynS94+pvfGm0dPUtmGGzp28Oq3QOPCDDrrdPgiWhch1JGN1g+CmqOEVFp8fCKZvZg5B6GC2obvkb9cNsd5hzSOF9mKMwHpwRVN0ETezUOV4G1LOgNDFXQ8dAiGbNQFqh2MpcywPBajVB0xlO/qnHYf1y0szjQRTCqDsxswTrnT9lb6GCvBvicFx+hwAYFjBgWLCo56rT6hKjiQdyV3FxpDj4KTge1oHj0QYF+NMNqj2PdS1R3t5VpALxaPfB8ha7KJgv6sFsbgnSftJYJuvIYmffI1mjmkxO4u+7NRyEMjBjgKUNpwJEqnorv+UkRfvrupSe3TmWMDUIVcNn+QM5yuYRMp29/L/DsufvDBZ9WJmPHHPYU9FlFpEGybH5ig/GqZqSP07Y2Qq9ODFg7z4BCDDBQejZGj1LdhevGxVIRrdhz2VmCto8LJuZS6JiG4QeJQW3T43n8L/xBXlrQ/HIuYarEgPyfnSpL+v9xdwfBExoOU7c0BfzhMkgKDwSw69/TsBs4uJo53oL4CBhSg97uWYAFyR3GTMxItQIX4NthrIuXzq4dMen+xrw+e+nxavKuT+5Qp6PzrMnhk5DtOstqE/2nWqKKKJ/UJVmOMpDbzznPPPPPPPPPbzzznPPPPPPPPPYhc+nNSTiXdrxxy7A0ZGDoI3Rez4/X0ZZDPOGiK2JCWKizLuPXw0lWnj/TtFs95Ppv+rXzLLIwi1lY7jiy69T+Hkblm/A2jh2ekegFq0i83qCGKUxAymWTFaWHYwxLMnPNWiyCaZ7cfEjbviAu4ohl+x56hYHivuer+2rlypoKZZ8fcWkEV8ly5Uhit8HFaxtUoButyKq6WQR9EUhljqnlFUufO0+S0Q7zdFydGL3irWKgP5ATgfeOuRpApxe/DJl5Y3T4sxxXW5iRI8zlKkX4oLpBN4TASSSjAncfI8ZWYcaK3fk/h9wSOPWHT25vEmFp8ZVzy7HmIxsoLJEl3C1bvmjPlEQvuHC9XhYVAbWH24hP2X1XkR9iLRKjxKpTPbPjhOEDdDvltnwtKM/kYhsRIN6L43FT70OuMNlapIovChtF0ZhYADXlygCZB6/wBZe+ll9nYMhqioNn1ctSr5NgBu1W/rABGk9twv518pblwwJL7Lduo80PDDWB4MMTDiGZOnhrEhZkJej957bnRH65XJy6X9fWuH/+Icxeq/B3IiD458G24vDM1v2xLnusVAhv0ayi33tIZJYebq3cSXx737ZAgGx8123gsm3x7YMk4CRCoNQ0AJ5OeaXB2zOkoC3F8S4Epc/cDqifum9BnPgojh0qN/5HGQMABXwBnHJPipxjP96moTyfQmPH1Aj8uskepjWYN6pN+F/R/LqdX6TWnF5/pMUjd/cPvUcv2gsZKPPrf6Iz//xmORzd2b9Ieuidnk3E0GBqt4lDN0hTcynCmP30m+Dj/dwNRfL/cnUyT/4m4ENX3J9zYJb1R5Lb7Yb/5n+1bueJf3SCGIbhbLqLQcHtYJ0atLA+r/VFajXUkZroJHFS+f78cqIFPVHmFFq+2V6J8zFG9j5IfIi+ruA201SDnL8fTP9cyt4LKvKPs8joh88F/CtOf8LO1TakDe9KG9QnJz0OTlDQ3vShvelDe9KG96UN70ob3pQ3vShvelDe9KG96UN70ob3pQ3vShMhma4kT/PUvolZth9xqW4Ss2r6CSpJFtMij3OUzR6lJTNHqUhowq0emLRHnBskuzAS0odtc554XSQVyfb3DY4kNrd/FXShS0wzwB6WkvBbSnMmpHMAM1vD0GMzi8BajfiSFqN+JIThssoPhlJUCuR/oBu7CRC2ctPGeUM+QR/hoC9Y1QzyLxk3NHOKBbKLNpzHi8bU7AvuzQRe3wVh+TrlSeS3Blvp8UgYG4Gg7Mc5pDXP/U7sLAFLpsmQvgFl9jwQgxEkLUb9VK/vcmAsP6dwCd3mHbZvAaP9pBLwH6zyFNmVIrnPxDPBP8KVqN9waGxYxGtyY/x2ZtzxoolKFJESBfOjJqWbYDf+3wq8IWV/npBPo2IqtRvxJC1G/EjwqnzwUhA3xSc4iYa+wiHxHVL6/Bd6RPLT892//9q06t/J7MRfwYHgIXNcpb6eAcKWGIOSCEznRrCac8v/5QfCi9joU+tto1PngUnMVwfcHXyfyYyXEQVOUmRBNnBVqB0V2Vajfd57JHNPVXXWwlhidZRwO98zRwOMJmjenrTOoFymCjFz8bXXSFcn298zRwOMJmjgCGQVIUmj/Rj+sQUmLDjCZomTRgVkjXQ/0YTIgT2NuFO5FzAyd4wiwxfPbx+Q8hhCbBBuxqZQn/uM8/nn2+7xHwTmENPIGMn8a5e7nvlTCWi//vG4JiPgnGu0fTDO9J+/SZUO+UZfnt4cYmofc+PEXWRtzrgLM6uBfWL6tXEkNB68wJ0jN+qgSyXMjJ38ek/M/0XEQKaE6GYO6LQlKRhGSR8o/jnJy9jvcqsrAK10NKBc8Rp5rYJYkDskbIylS+wbhyyoOeUOdZNp0N6/99X5lP/Y9fakCBhdVfSDwS8Yw1P29J3J7Gg6MMEk59C9nromQfsWbfuSccccccJEEwoTQbVMsuVlH8GNb9+uAtVa3EfH29P+ZLExR2SBF9vmujhAaOC9JId9b+2y2VWp7RPb1w+XbT5uiQqUVas/KMuIOf1d1m/oXF/NuYTQ/DHuCFZVRZWsBTe76EWCEvc1uHQQ/EEu748Dp21FU+yAoqZzEN+wC8liga6c3lWZoV/B52/Plr8Bk/04UsTs+80xdWKnEY1Jz8eRnvlQcQhoN2ELUTmoYvSa7QjNi4viRpWNMbyXm4Wpe59/Gv6x9KkmBQH32LYpXqFsWbhNaArXCjISAjg18uRhqphStvft/I32e83Twk9mmJfbgAN193Y0xAIL4Gk1k8lvXI5RFjIxvfySWSEube61PD44x1t67ILJply8gX0xF5hzqtNnyn5/asggMRCMD165AwGeVElw3URFu7Hb4eMzttBfap7m/PjyzKGCRM0+wvXCKMEx2K7RlL7I64iRBocK8BCDpRgZ2m0n/j2EFgU5Nppd6JSVWc7WvdI8Db5W+aAqPH5f9/y9OGFoberLVyS4yrcD6cOaS9MD6ZJ/gf6ndpV2m4Y6vSTF0aEsVFmW/PJY//lBVIZ7eeeeectqrbNExgrJ+yaeysCooFP7jtz097Fh6poo6Tzpgg9JplsV4feFSISuiVm2GexwNmpMF6C3IcSAvQP9g/DxeLdw1S2IJlMT3vee5wR06xZhthqQ0e3tGU9s1h5sOWVuKk1kd7LemDXP9UsUrr1dZVd8U2j4Afyu7IN9UDd0p1jxlHU/+cdUG4fwcKzTAOSV3E6wTJm6ltGTExWadRySu4oWWPax6NoyY8KzTqOSJUs56OBtKqn2qmEfPxXMFKmBAA7k8ArHL4VoElKoO4Q8PsXJOlNhsARzyl4n7h/gpYJoeyCQSFaVoiDatAy5Dd1fUVGnqsCzaIEfnCroCSmIUs+yngtYNWMdeSdp2OyM3m1fPpRnThw/br2sI8eiAcakTPy/tISWO/Z+mUzsubHjyAJgBEh7ASsqKZ1JWRMKOZ8LtElY7jo9NPYO0SIFnQcUo1xOF5aXOs7T+1HJrCRkd39vP6SCmSVLnqgaeW0bSNHlIUBDmxtEyX9c2Nkv65sbJf1zY2S/rmkNM6zINvayfcYfuC/Nq7k9S+RLmZoXXrAXVQ3Rxg+g9eIs+jWXLkBDgP8V+NmqRon4tMHzdxFI9oYgVuvzjS3/nXjtUr9Ky0dSpsRl3mvRjLPANX+Zljw/FblXCJd9s/JC/H6BOC1y/dLLXL14GJ8TT5ql4CrifCa5UGKlfoqVckrL67ZLDCoP9+G5FdwxABt77ob5tI5I32jTyl7V+1a/oUvu/3btE9OUGiOnRt74cYHpxySXPdOJ6OmL1N/6wQ7IEL6v1eF5m+VPkhzgsAa4+3EPjcOi3ofrRALgvdc+VDipzjMxtywg/gX0Q8pLql8ks9HvSXfNqulCtjaOBxhM0cDjCZlG6rsFORa9x/4o9yiTni4GF5LaqgC/EnUJtz/FL2+3wCla78Ue9KA/wRilBhvwQjAmtRajfiSFqN+JIWpaS+xt5yOGDqYC4rOXeoug90iQtILXvxoGblouMNfRfVnk/XVCP+UMAO/ESQ9uPeno7eEOLxufme81rNMPj8xuXYaL+PUpKZo9Skpmj1KSmaPUpKZo9Skpmj1KSmaPUwr8MpeeM8EIMRJC3DWaUpEhdoUwsiDK/4OY1/ZACaGuxb3X0jPrKC6W4DnS1BC2wzRJqBNrfQEMV+4uqSmaPUpKZo9Skpmj1KSmaPUpKZo9Skpmj1KSmbD1NAK8jFsxoiR9kAKGWlBcXQnopJ6+xWPhYh1dQBgsKBCk01VOkZiLaQtReMkHqS4+zn2D0gk+QPpGTl+Jh+iuInYULajfiSFqN+JIWo34khajfiSFqN+JIWo34khajfiS5ETV7GOo34khai8+JwClXbszSS7ZhGBylpCPLfH8kLW5/G1iHrQCmHQI/S6Mo6x4yjrHjKOseMo6x4yjrHjKOseMo6x4yjrHjKOseMo6x4yjrHjKOseMo6x4xnJyfEoOHqQQlbKtA39p/toqFJfqzAV2zP2zi/p89InFtjN4JaPX8jO1UbeHnnPNm2Jy5b27NkQQh6OBwB/5cOrlR5A1F+xcWomoPX8wLHOPABmJS/0w5/BZyNwl8Z/jGfW6Zjay/CQs9KRQHgKYmQbN7VbxUrHe67h/OI5iFbrqa+BioCS0l2J65A9Rxck9x/4o9yf8uHVqx4isXJqOLknuQVm95F0OMRJC1G/FaS/x6lJTNHqUhppd0LQnAS/F7nyFjyj5bdrFuGr67x1VZIJ0bovNNrVlDlnZG0cDjCZo4HGEzRwOMJmjgcYTByPLo+yYnH9O+xbjCrmdP7ZQ2TGVfeUc6i0D+w2hAKp4+jOVmGC7z9u8YcikZv/khsGHQlNkQQYiSFqN+JIW6eK9a3F7rVB5yqs9W/bYZ/JsZOC3lesiMzTHoVPbLusuLZCgNmTmMbDGEDpCJcIFZHLMfoKrm1iOfNl/GrsIV5P7QTl5ekft2vrgl9s7nC1G/EkLUb8SQtRvxJC1G/EmAeGS0LIG9uzNHqY994IQYiSFqN+KxbaAqNkx+1sTBz2yyA2KqA+4ZlLB2Jxss7vayHhkb0Lc+lqXOX+a08nxeUl9PTm5iG1JtjOLk3Vc1YPrhMDBr3nMpTZ5nCvlViUJTNHqUlM0epSUzR6lJTNHqY1twsBVQaiV3+FImpXKi7K98T78PuSxuYNX2tTQNEPwbW/YfsIG0NCAxFaS/x6lJTNHqUhriWB7w9MmsItjZMARbGyawi6JpxhM0cDjCZo4HGEzRwOMJmjgcYS5CGfqFZemNpxhM0cDg7d9qKKrUb8SQtRvv11ajfiSFqN+JIWo34khajfiSFqN+JIWo34khajfiTAQYiSFqN+JIe3HC1G/EkLUb8Viz8/NTBDaxELPDOR/CtXH8K1cfwrVx/CtXH8K1cfwrVx/CtXH8K1cfwrVx/CtXH8K1cfwrVx/Cr+gDKxClFbzVNTzW/IZrbUOyD94EzDybRRgVSFjOjZAyWjmDSDArd+hKEVcaBTh/zub8eRWRkM9BwtoLxRd8/M60OGX8UEqqjcIGIhCe+2iraIAX3wvirsq1HJ1E8aRx4ZxviaDKofgO3DqqL+aIN5VDqzBCTI7faMQArFcziXabssN6JoM2D5XSb88LHPZ4EjFNXyCvFuljutWPEVi5NRxck9LJ2FoaGxMUNFy+o1Sl4BB4S0pmdKXLCYtZb9qLkYneqmxlRlWjiv8exBHdcywr4NH/wh51thafDe/bADInP+Dz/Df8Ws7+Gba+dztTA+vV7l2PRXlx+/+HCDVBUFl+lU1LuRg3j8r6QdL6tCTpLyfNI51jfRtVbtRrE+huXce+wVSsTssI9P7DbjBHzd6RE1zH38QcNnMxIP+bcw9M1g+zgV27D26Vv0VirqphJsP3RgUdmndpfpPW5gxum94AG1viYYP5k0bD//d9n+rsUGgT/sO3g6rf4ScZ/930gzsiVtE41t/5zTfGg1XY2sl13jV8nlnX23825aClKSmaADlufWKo2Y6+icMPS4uZnbUe9WU9epzbLxKf6pxWdHTpY4by2xheNcYQMiXEVPBSdYI5A7lhemN0nFeSEnOrAhKZsPWX2OCpQK/UzmEi5v5rvSAWEK0ljV7SzNz2xekJC1L2fFaV4bfamcrRFd9CIyBUShR8qLdRtNpQrub5t5e/GO3cmTyWP4QXgu34/n0nx7X+0p/RaImEv4m5Vlak/6H/2bTIBhD1fi2qH+qq81TgM4q5x0+h0NRQoEJ6S2L6iWexjznlOIWqxcso9JnnxJ/GqPG48EIMP2fSSpZ3+cAKhS0KeN1yCIAI7vHEwRgL3AEFdrmlhvC47ooMGbPn9lE7uEYr+uEeOh7kVczPo+i/EjOmHzLIiQp26m+ZELEpmkRGN1Ny1JdgR592BHkp4at6qTcPqy9lwXElEGoxtZUuFQH56wzkfwrVx/CtXH8K7V3ghBh7ZX2PUCE4MIUdofILPxWkDxRxh7heHx2Zy/UDo3EKIQCfsQ9YWFVFhWqUlJ9s3BBeNdQJMyltvmtvQb98cK2pPB2dF42ZC3Uk+rPz1t8klSgsXlnbb5VxaoCsQ9Jot58L27yJ43y14RfVhF35xCTUVb+ZtBGNal7HjyEMcrRsatwiQT2o2NW4RIJ7UbJdcIkE9qNkuuESCe1GyXXCJBPajZLrhEgntRsl1wiQT2oENKMc3mDEOKTZmnEab/2d4GXji9aJRH8sPWR7+DYT/RwH9hid4Nf7ThrujJzzOaGcds0r9pSCWeYh/lzRUv1iQ9amFyT3H/ij3J/y4dWrHiKxcmo4uSe4/8Ue5P+XDrTdUixox4zXt7fMfp5ATbufQwfKoMPcM+wOjui9Unu/7lkayVRKzRQMyfUTkdAAtR0ACjCdJ82psn28QM76cHdoP8wobhAx9DK1G/EkLdUuyrUb8SQtRvxJC1G/EkLUb8SQtRvxJC1G/EkLUcnu/V6cHHtMEkVcJpK1G/EkLUb8SYCDESQtRvxJC1G/EkLUb8SQtRvxJC1G/EkLUb8SQt1SYjzyNRu4nrUcx6PKo+p8AQjzrNFDfsz2X9qjzbpKhPL7s9IwG7EZweXsGRgXrH5fQlNkQQYiSFqN+JIW6pdlWo34khajfiSFqN+JIWo34khajfiSFqN+JIWo5Pd+sZzAoZMlWXbs2RBBiJIWo34khbql2VajfiSFqN+JIWo34khajfiSFqN+JIWo34khajk9wKE3IRZHam3O6RVvfXTLxIjUwKT772TfzEuXZ25N5MA0eE2BZiwN3N+JMFj7HghBiJIWo5PeCEGIkhajfiSFqN+JIWo34khajfiSFqN+JIWo34rKDxUyRz2hwYiSFuv7e3Zmj1KSmaRFgxEkLUb8SQtRvxJC1G/EkLUb8SQtRvxJC1G/EkLcFxhghyzcFETUfmtkbKU5vxJC1G/EkLUvmPBCDESQtRvxJC1G/EkLUb8SQtRvxJC1G/EkLPmYzRHO/1Hc0InuKI8PBoIP/GN9gMZOGvPATZnP+MeH9RWmTrfczEth+ed4jabkolv2Q4E+GmB3XzHghBiJIWo37kCEGIkhajfiSFqN+JIWo34khajfiSFqN+JIWo3LpaHvFedaWucdpu99/lIxPo7OBHDov3OXuepSGF3BRetU7YdR+a2RtHA4wmY9nFfcPfb3zNHA4wmaOBxhM0cDjCZo4HGEzRwOMJmjgcYTNHA4wmaOAO9Sgx5gAP7EtRkbyTvUFHn0QqAlr4oUfL3+WFAGHwRBNzaldrzeP4OvrwmvR1vCnPUvB0mJAh8z/EfPWEhKFswpc9AHAM0pqAvIvmbYvwlC2YUuegDgGaU1AXkXzNsX4ShbMKXPQBwDNKagLyL5m2L8G9ZEGuH8AN/ilFP72t5ZyuLwdK2wcCT+FmmbjGAaRZWscMutsY8cFRWZ/GYuwUB3YNlvCWCClt9CsX9fr/NTw+zzyr3X+b2jjHW7ASj1INp4APtNl6TfwEDKr2NEa5pAqTuTRpc7YZSJwq8653j444mVTerzRUGgk7G1IowZ7OJxUquz916DJSqCADV7vD1smeldhpG0/rmW6SM85XgbnmWXTcZ69iapf7MERaEXnKrWV/7EfGeq6Yiv4mQ2a9gPyuTIYySBB1j4UpXJFONj98qdfRmlwUBsBA4wz17hBOIstkmZ7zvKWm3XD5G2RNWTP2QhH8BsNOZaSF02vWqmRCZ42and3tC9w6snVBskUjYqddxsqHJ8gV2+iZ8C5VWC0ZZlkHGpVE5Q4L1n7E5N9QSsfoIWmZT0xpb1EvC8i27FzJ8RxVg/Ne33cWN7ASk8Xjoq7i/fQbLRcpiF0ILEFbGzIO0jkMphB/2XSX6XxnKP/+BxnXgKIC4MuuS9OTcZdoY9dQQKpVA3wOmXvW6i2YUuegDgGaU1AXkXzNsX4ShbMKDSsG9qdf4NVlP3Jz//qJ2KWt/LNGthxinirmA3yeYSkwqrxDQTO6L64KjxRyTrEgqsypn1ohw4F3pet+YpPhTqdqKOd9TGhDDVq9d49ik4ndnaT4fxRVQO8+284Lm3wl1f8d7FtKSoK6zPC2saXpb2/MvJs2dDo3hooqoej8upbPpNKUinU29G2r3cSgvbcuVJEuWASjgt9klLEHtZ2C6Nb0g3qKl48usMUaK1GxDbKfQ+qPxp81qQPf3HuFrCmiledVO31OXl+C0BL16mbnL52Jtfw9dmwIHzwnvuiMfCh7BCjTUXAdNLUNJF5sU1WqhzuDhOb+yMcTdxoJuTGYJ2icWVdinoU7OSiwXPL72erIoIQuVXimWjwOS2oPdVB1JEHZOSiiw7Qsh1JmIQJHe24x1oKiZWh3KyaHAjQj+gDN2TpvejdsylyIv6rMQDU7Z+O+ShiZNGwDLQqW6fQykZ8IG5nN4Tu0RuUB7khmaseyIVuc65xypGF1Ao3ZnFp/gEzsHg7EhYU8EHkUl2WaAuJvW+h8LhyCPnnypnVFuSUrW5SalN96aQ8jipMKGY2uurqL5Bd700izTOMn5H7ahZx9qgXaI48KEWjVZJ7zCz5I4UaewqDJtUsV8EX/S4m7Xzczpd1etHZIbG/M0WKWG19LK+WSPaJg0cnrBc9h0O4+WKggP00XZE9kMV/8G8SbM23xNK8vqQfkl1rBBXAcSQmu1sNFAbf+DaCk0rYxA576PIeLbWKwBc+JZqwW9aQtmQHHD0HQZX/6JFOtTKNXPMic8/AgFsPsuqGVchQ44iJKCsJ742sLhSquD8VhccJDHTCUqZ75Da3r/cvKSHbfe4y1t/bzKuF3M3pP9cekGR1gn29/QICXAHa2sHb/wClWEDqKsgLU+LA6/0+snRBI6k3tvx6lGmz7KiEC7Ys5umTQSJmmdmhorZ269ux89Hdpe6ZhlsOyr4OGXBKZwN5SGRH5mzxnsImEnkj0TqjkxMmp4Uxe5MfWABAnKQwksSJVrHT5aLvyEZGHkBt5wpix7+SeQsNfywXPDvTmwWVNbGWKWpKmGOO48JJGCgCCZnzWIHjovOPiVdjjfbr37CC42Gewiir9wAxn+S7DYHK6LBfka/BD1Oo0qzaRrOUr/UtAhnc21ZYlyyNfW6zgwnedlVVoNHujHPnqDv4jpmqFB7PRZuljsgQVKcpTkPb4yTEQs88MKyBYUj45kmvCncPiLsLzLmVKuNs5SEQiGNtFfTIVIcCODj8WtOLt+t5Lbm4gmAKFvUs7yN8f3VT5wW4+HDjxsHvf7mS7UDbNZSjiqx84QVns2fFGPMmwHuB2o1h/NE3c3+P1IU3Xs9GOQNv5WpLSnZbWpjYaZQsgMxlF4Qh3HKnjf2F+OJNZerZiMAFgrNulKeoktTToZPdpPHUApWlHa6AqUCfoX1fsB+W7vaQ7/s1pGKesRgle9jDKhA5g2RS+N/cjQ24HwYdEVyRWjnQiDc7xJXU+b9Lks5fRAfiLGXLqCj6N0RMaAXCu7bMHhQRcvjsmcLaiUQeyU1pzuYTA3SYCj9HfxKoX8cUktLpZ5qHF0+IKwP+7H9HGbb0hARyY07Fcc8dseVaFJ9uPNbC/8hAdLmBFRR7wWh25LBdOW2rneuNO1yKNVUWFgT/iORow6RsycBGUThSanzHgUojp0nxSAK/3L+5loE3TFTQjONxc0rO8+iTmXfJPNUbndRoFYVvSUnxFamZDyYrFSeDPcEBxXuS4KCKGhR5Pg5/xIKZalQiTpy93pq5Kaqf+IJN4fK3ZOuxLbM37Jjlykj8I1CNQli0+As/Knu7LyT2Jr1e0c024QBL/eeXKjSk4/9TI3B9Qa6OUCUJnIUbrpuc5kP1C3FbumgST1KsPK6LgAZDCUWgOxzjeCltYPrzhp9IFJ5slfpoiRsB5om0/t7572Fm1BDC6114Y3y5xzb8PiNUSUh/8/cfqbY0Ad9hKT2xxvm4/3C8FpzfWLsua3E+/QN6t7pi0QYEHb+IctQqM0F+1mWRC2lDmZxwGv4BIX+7n9Zui8SAMeds8G0bvDm5KMFb2PfNUKANE6e+fArzbilecGnzWwaAh8TVaWe4nBueL+6EUI7Wf/fbdnqP7G6GGW6xND+Bkd2STXf3flc4WqWI4NSbb5jG8Qqzny7hPYkqsF/MlRY/nOlBiA+yVjSYQ8+vSkFRYx39bAioY/0FAEod/IX0cPLKvMETqENehEZQzCFcvy8k/3NRXOvafWVA4FVv9brDzttlGG193AEmGxwbezKVRXNrCN6lYoBiLn/K2wFtSMZi2xxiFMprJhepe3lS6gWRv0KmsBMbhc1p3jtPBKLz84TktIDpi5E9RDrEEZWThcC+B3iWf5scriAE8zyxx95CgqJOe2iXmBSzPfXRj985IfiU/uOoleQUKI1MzS6RazNTqjCDnPC3vYcr39yVE5LQV4QfKTulWsf1g9EPW246JoFQqCtZpH/ZXQBFkH+h7v6VRra9Mgb9eUXe5djQqALdqxupFPRQmFAlp7SEPox2tXddiyjrcBdsohMtlj9nnQ+JspdYj/dWfG5DQjaQ3rHylW9HcxIh6AO9yOPBZmWs3hZpwza2hV5zKduPdCZPYeHKvkdOuRKQxzAHa4mzSLHZCPrW6Z7ljr1jz07g5evvvR+HYLqIkI1x3GR+wVMcgzSi61UxcmRk7pS1VmfQfQgyHkFeZ83vnISvZBwPRTxwRRQSeiyx15SzXtZPx5T8nGuztJBEVqQwAvrx/e9EWixo8HmryJotjt6/lkywqEn0eH55X59tUzSMFLh7hvXO5Vv1Ad1WRmrJj0Jy2MRMi8SI1PENdisFZO4k9r8YzK+Rr7OkZwgcXCz0wMhMK8lRMVmhXf//8Ry3VDCpm/f6Eyk5ttvD0hnS1vBvgCSIIcxAMh5p/tTGyWC6VYSBDeTpaY3E4IIvemaxKgYo7RxccuPgXy00RlFTPNdkOSLR0Wh3mfxubfF+b7AVi6mgMmWDq5uy1cObxFdaTDgB5wikRIMlCe0gkdMtgvoWMEvkEDf2ehybO6maminbHXp0diOc+NRcmelC6lCn5sFG2y0+/eEWKjBWhh6NUsze4y4IRrT03Fabw7T794RYqMI3w65go22ditoaqMuBMW/2sjX1wU/4ktQNojEwyGxzvFTOmi3hSKZbznKza+lacayD0KvOdT4fwckTXBsY+2BJyzCLgYjh/eK9Cb4x4jwKxYvO6TFxDBMPwYbL5tCh+6V2j3LvYpiFvyIiJXFaDA/e4soxh334piS0bGyHyQD6S+mFrcicJB5IVwHiau4KqfMdYOzO1tu7MZo7hZzZRB7QmZBNeJdH3ZUtufhFn8hOFxJIL+6VqEZTfJfyodVCBNZYw4mU8o4mCRtGqDvqzV/I/y05/AaAKN2HRN/mW6n1iu+fdKlPYEOKBqC1OjzwUk+bqdW+DaAVEScvih1mwYyAcPui3cyvNglQeu5S4sBsakWhX6SpzWkZLDMllh/yEr5Jjt+/puiMIU3Qtfn2v6DaPeOfEP7ZetdlXpjfpzdmGV/oFKMfKs+ogQIQB2A1dHZzMXkd7JsnU8JZEujlQmGY020LX0AruRFVueMhiialjsdxhqxDQx4ahP9d+UsH+M+ZvHaBrjKIkCK4/dMn9PheI1J38z0KXTclaG07FTOSKK6UbpPQMHBYCdjFa2TCLkBGsWArsWSNA5oe/NoqZPm6M5Yg1P6oP0P1Z0CBjKwbNwc9CMnHmgU9m7EyvRK3HU2vxcaoQDt5Baa0YmJ4tVq8cj07EgsHosjFwtvhWm65pmrXywtBmB7byv2o2uqeyRU7ebrAy9pBR8auW7Tnbh6eZaAtnIocnYPWMwsy0q2ZgIAlgczxskb+iJtmP0mQ8DGvBBwThnk825PzCFxjdkDx3bZY3nTWw4uhz0IxaonKJ4hug6CUmaWW8OdaRKkflvbGWWDUxmVqdMUpgse435Lf+nQdWBC4makNyTkVVeUdOanS7ZADZNCWzpKoHX/rRRCbebV766ChGz+DEE0WUQBtxE2ioVjrIlFlEsxBvDH56pwIznxUbewSlMh/DfIFzl/Hdxzf5P5suASlhWYz4bjLNZC3cIUj28j71k0CzkMYci74jQolTWhcPG+x6CKGRALgfE2RNTVnGkfuKFmVMFakxJgeK1L//c7wJypsfldyFrdRKSLcPoPseMJGBOWhtRe7WotFoaERGC6tqaDuYt3EjyMVgobdkWf/Z0cs7dYeMRynAeVbibKRdzkBPfbNdnFkOeV/KI8kI1Q0taiXYHaBVQNx52udIaINaQE9pywsDpLqD3iKZmIDMxBMyylkWc1SDcbGY5EZvo/VM3F2x7RL7eqfaJMz+bJBxDIsW2iaeFcaMo/IwenSqXO8USRIoSKAq26M2nPIBUvJ/K4yDmKzMXNYi7MbMSOCSS6ObHlosU/WWJN8XDh3t9DLeBSkkUoS4+qFMwDW+P6n5B2qRAnWMtczDG17IGdhhzqnLtXwcx2zXJr71iVAGlGbc4c6n5org+EmdEiw0qBj2a5hLoiKz6xnXvPV8v7jDkHNKiAMj1lozrUaSoVJISkGb1/uUsYX1TZ8EJ+K6vbedXDfHUDFfDVhQjayh628v5PD/xwZ5qqnu9YZNanmQcRqjygWU6fDjGPkabq2dA5bhoqjou5ECeXuEze6l+xzy6xcMQeVIo2zF0sCIj58fXdUCEm6Ll+2SFlHrQMNHO7Ura2OFeAHdHp/uSlS2QbrtQqyvEJOUi+2fbgedi6HPQjaOZlxZc3EKxsevobcjtJc+0a8YjrFvXtNJe7eFtWbiS/ilS/OBzoh1x5asohqALeAT7llwA23+e9wJteNintOe9IfhurmH7gsi9dHPjGgUjCVfShFO26n18XnATI3IuPFtGR1U+vDaXPKfzJCslq0BbRSgEAkz71SVEVRT2UCVwJ4SNOWwNUGIA5sMiEjiDWCB/KOYgZxbPtdpGgROqhGsGaejmNlHnyhlhhNRR97CYrR1ezWwoCuBcH0IYg4MESL7xLd4EzIFIw/T/ZITLbb1K7w1q51kPhX5iQFh+wtF3USYPz7L+OWDH2TA7SSuNgVqcPOVBBbl/NTh7Mv7/WCG1ELEtNe2jxeSMX3sed6xP+uQu+gt9Zgo8wcHz3vNSSoD1v993xJFgqkBAglm4b+NDPdbyIMJkENbZwEBMpazK+XdipFGdpaYjFjC/eIJBxLYvKyacR17aTFOffUlAGusn1eUQRpG+7sb70N63A79etfZxiJ9+sqPiPgiBF/YKC84vUI+cNDlAshkLnLjEp9RTugeVCe7cB9xrseqzyUWE+DiJ7FxsVG9kpU1NB/jKA+1I051SseOWG8c8fEZx0d+Q8PHuf9q2HbWqDKl89zJlL715Y89eckoW6xjzLRcu7mYxI5fsV2mIJ4iZn/0We1+12k0sLQPYrubNnAVQmsHPdzcgd6SY1Mce5+6A9ZJRfWAjI12bPn5KpjM4ndSmnu9Lxyp+QsH6cNHu0Wh3R++WmScSVj9njQexUbR7fRIScroWmF1CmTC0aB498dkpmhZvCWkwRixBSC4z0Y3SFa97peBoK4zJYCQvhWDGRzKccMlvK13tudEdh/yoE/3KcwIz62iHtD/XrCpcnD7DjrAaJHp3g123SS6eD6WIpIzCAvdXNiRTqsMeiIprD+NjrbqFirCHNIoOvYMRZCIEJXQVNVnJIkQq++/E/T0DmAuh51iJ+myCALFigpl7DWeE8Xy+Y23GslH5Tjewc7eFxYUUhozgqLguB9ymKqoNXu2Gbm53Am7/3m1zmnD9FjfxDGp7nrUhDJxJvZ/qXi02dlLuXyAg9lQs7Lg5Qb0RU965tHpmZ4WOxbUJj/Uxo/Ad3+qeTtVfu2f2vstLswG85lJE+vUlvgK3EeFR9lRBTh+9Ck0+uxvBKTxECOG5RUz2UP6b6Kt+uPbq8XGLJNI+ai9gQFinmMl7lnekoTMGgU64O5Tw9s2MwQZPY79uZi/5i/f+VnYor+dCIqlLhqLZvlHfA6BK7/9YJ/8/QouCR7vKNSt21UW2TQpg3SV7giSrIfjJb4E1MQCP1kGkvB/REUvP4lCzj0CcPpi7hu0PTixV2prLW/Ar0ArIx4p4DTq4ozp+0206kUwYNmQWM6D876/MdgeUvBGKr/rAI118IMHwXvKB77Lf/iCiSJiHKKVxlObhxRunhLV6o/4rlP+bgRCMqv33U6Xjx17g1aeUkHJEoG1sZwLd+D6WdbH4ODxRQ5qUeuAHjsgx/wV9n1DyDaSGj3cNMK9SeB/GtTRjzvkKe+WX2RboFgo69qpFUCpZu33ooR22e4XxXlHlLIg7lFuyBzoImNPJ+EPAFIFPZfzchIdS7uWecAGwYanVPJ3gsfLE6uq1ZkcSaZca/EGyOlTbS+gak1yisFxOvDYI3Xd/jGXlexwkyTvDlVwLnBVKqRk8nszMURH5tn4eQgVXRRXRN6YXVgTK/WUcHNIUSb7xFEA5KbyLLPjJYl8XE6b5p5smg5uJ2O6MjAUdt0q3MCpcWY7KSWh7e/uBy+carcmee8daemy+4YvudKluJKphRwbxRGQ0lAMt4Sxzu5TRBLRdQj0u1MAH+DRpSHVOHnrNYXil2aCh1JDC7+Iy51TbD3QjIYWrRHlsmjwhAravT8uyA6T9AQGnvdz3Wsgt4EKkshLceTgMzHrXiCKsAONDkOjWHv9Mm9j4FwAcn5b5aMG6GJXHa9Weh/4erNg4/z5CEs/YSeiVRD9R6S3MBSjdar2Oq83y/tQdyTkskunrzwEw7EZy3rLoTSqwYdvUpn/SXdVFajzfJA4HxDEXob8WXeTuQ0iQqhfRrbJK2XKR7j2wm/LnFkJvhWHk7HsMyeY75CgHPz/VWPV9MGwAZ1kv48jMRGM3hZBIcFYPybskp1pGW2q5C6zk5zZLkD+5RpxTKhWDWhF4bKFahA4WmxkicpS64gFk8nCyHUFP3S8UBt5Bu/CXDMxcMOL4rNjpmnyVMn4RZ9TyPMykRZdvsXIU4YjeC3RdUnR5fCKh6+UGbp+jU2vpdAOxROr2vEb0+Hyf54AL1mX4KzK2GNTAnmQyKS+uZUYx0BhOK79qVr2q/fo1e66FzTg4eb4H5jUJ0leBcdCS1mLn+0iDij5jYQugTWb5jRvaRKDp9VsnFSAERusV8LUQPNZOEq1HwGcYR3ou3eqOdsO2UQ+fMY2iWN/89ZmOPL3U74rQIiEosj4Bc7ntN7gTMKlIoxYDZ9upxM3Cy4yKTppU1fHpYLkjkhh1xcnXVpwo7wRe8Zy0EBxlA4onM/WVMyA7Rq+IRywu5+G5cLFEjUN0KXwbzZUTf1ZCO4DlLPneqYGCXsqbSVfdo/iKnKXYi1IC89xpTe54f7P4XjYcvohg/hxsqk1GYPIvUcUo7wKNO9qBFmin1U19niUqJJaKCtnnQnOxCZxtcgAlZ/qPPrcSn69skHTuNCzntUI8fTE2+Lm0xbp5DXHTbBv4T4vfLUM3QOpucbx//T3cmu41rZjph1M7QgdBBz8BDn6tJuIHNA3t6TUbd28d4jZLY2oTpdmIdqV8GExZch9MTwkTULMF1Itn8XoHyvhbdkS3rtwO2MsfGp/DUgjybRMt9OBH6Lyw5I8fHnSW2Fkd8zFbsjJZfPEB11UcKOL1KXgBtnAQVNnjx9uxXb9984GEvAKdyK7Ezcn6Kbp8ZDrC+iobBw1Y1EISIptXB/0SzpPQpetbb7oy7XNA0qbBCCU+ZSTsYtnhxDdNa+h/O0rBNb0QX9lPgToHiQ5A784vyJIFFhcxarPUsPpwmUMQF2T8Jb8vIrnFu2U/+iTr7BkGLZZAItBg5+z/heMkAAcizcuIdKw3n/8FbY0JsSm6Bff44+R3pRCXpW05SmLtjIkjCy40n/3T3p2RsrlRa349zi77UpZV9DCYt8YWmTD0ALBDNsw3rRO5thYrTLWxp4J2bnwxDxuIfbyxvDLs2DG6k2V76I6h5Ml2zPbEu6gxUvG4Hb1u/PejXwPyTsnl4mZoAWnlPY3XdYoABU8fhPgAeck4t2oCYCWkaRJh1nZAzgtAAO4AZRCanGt9C7bmmI13Ro4AeUbBdtXkm9cUEPsQwVGgDzU+8S1AYUJnqxpCEq6zeO/8TwbU6/yEjj222eGmA6bE6a/HzkgmQ+FtvXLO8wlTUbo7R25xGGafd8P6aA9ZP+NnQ2MwmqDJIZg8knD7ZJPaHcMSzDDeNev3DafRKxxEM/3Sk+lnhmJ6S9+abVIa3owWUAaoAWAj6XaUBgCVRdytTk5+9lgOM7yXSY/qfz2sYmkTms22IXxW796PFV2QLTucHWOatlGKqQqm8nQC3EEjPkkdl7ui+PGy0zRY0l/gTmrAN9yniDY9UJwv9Th7Rbjp+yVD4atEUh61Z6MFsfYuEdm44IG5v6XsHbD9mcxuI8LiwCADyJi1faBpALBjVLK25nL0hE/22JGXiB1Zl7fjqQEV2qRlAhgYm+Pf5DjwM4FBkQgjSS9PYyhhaouHgKtb37zZpQh93xCCempfPV+QI69iRxNFl+3BTzP+H0inWck0Jk7g3wWuOUPDYSvkEmLakAhO3sJYTcfCV+Az30iFOo3uHHExJomFGG6ExRPP2ZQ2Dh1bM19owbKDtjlz3yAGZeume5ZA8/Qdigjz8UaVxUVjOouBKUoZC3JAPNeHuZ9Dwg3emW3AavbJSEkbWZvutLAnpsDnWnRKh4SfrP19/MWNU9wp4hpZKRrCzWoTWq+TXozSSzfaav5uInGbfO8NUgqs1oCid0udDu135LnxsgH2Ny2Xmx2Ait8lfx7GS3HpjT5GXj0U3fz2c5c6CCe2gEa3xq8d7K5ppexO+FiK1Cx9gOZ7NKaFnjJsmalKKw2q1NSRyhKSZbYVeLn23HA3otIKoOu2lpHqbxOKNVTbdzO0EivbHt1PRQti5ytX8bl7MBARpaCHQyKWBvrZ4OAV4AWExjxB5ojK7d4cbMZM7tqpMyPSQdTnKWwrGNJkeEu2rH2W2CDj5fnBXpiL6jV+X6vCaOKkn6P1k9MuUgvYF2HR0zPL7Xoa4KIsVef5ktX2oqDTL6+ZRbEF38PM55TnhRE+ca+c/VXp1XTR9Lbhnm9xJwxoGrU5I8rVVOXW1OXR7KGaC7rPgU3BwFWMENoBSCpJw76tlLBWJbxx9slHuakAbl33KEjBowQ+d/NS7pr0aFvi+dvjneKKa8JtIc9xaCGElNvqixMBizqfK+9T00JGwfuL6+eDoDdXFXrcGzr/HM24s+LzUu6hPVGWLZowId5yJ83JNYXQHZZ4WCo2meO33CSAIlEUhSL1w36CM7iwRILUtwEpyuEnyl9Lu8fBH9iKbWVkKUvLimoawPs/MB7kfaDOD61OjNZd15LQEaB+50AkIeByB6SKA1+QPVXaE9snJq9nmENbDIXLiM8nkqGJdgI5XRhJeM+0bXBK/UVjwwTb7kUe92aU/aJkVeiEu39I5AfFITlpt2bM55IoQUzhuuKYPd0cdktaRMcUjMsOluOcsc0zxcQVGuOlLD0HSRznC7YSlI1/z8j58AMXnkhjO/284enzk4gnpsaDAYnWzsEW4RdkpQoESyrB8gtKOcYvEmC4pFe5KECzjYF8/zDt7CLnKkSs+wFdBfmMT9eoTu0c6vHC9okc21JjmEN7bzKFCWaRWxCxHDe/SCVXC5ZVAIgZcCa0yIouNc4nRLjB86Detr8X1tEzdV/9hhew/Rau1xFg+Tb0XLefE5751tDzLgbbK33I4e9AWG4zbTjwnDLDjTBoc57QY9MWOyY3yNAPAGRkH4tusBAJGxXyKBM6wDi7TiQpt5svkJrhm66iGucuvTAktizADV4pX1ha2GY3WFH3wF6+ZqSxNJB5uw/UDJlZGX8TD0bEhh+rgYKnEGaZiRHcNqg2q+zYLLeN4nK4wwSbOx8eKMjCdizeeeI5Oui83BXCUp7+PY9t/euC8WIwgvjUa9Hc5QFtlV/oP+iuTuoh/CMUlQEmToRSxwbMxFZ8TO5Q4gHELzA7m/W/RnO5ND7rc8SQKugvfpapyb1rKHDk0oVf1W2xcqRKz7AVoj71TQAu98Vn4T53Az3xy+j1iKXEQKEtcVpzVRTu/2S9fy5tYvdPsAukrS/q6qweqYScrINPjBzNFaerF1UU5yirQI9Lvij+osNJMS15A7E1o5GGzBbmdJuZofjYGJEi+F2pup682Zb4lJxNUgCm2eFSUlk87roi0Xcefd/labZxn37Pta09JudIlVh1AAGPoEo6KXTwo73QFoOhp4lPtRMz1U1huNq99ySvj60kLE4MAef86drTXX77QNhtz7gQDu8lvInNeb2z/44H/mIq6Aq66EGuByMQD9/OnqC2pOVbhJpFZ89dJ3uCiJNsKZztVbfvAM7uA3QRpVPxvrWSTl18n5yiyJQAaRbHxSTHJy4H/fCiyi8KKjGjv2GaqUrrx4NaHZnOQUWah9BSezZg6Q+ebLowuaXMcRyQAyAVBeLB/fL3qQ4rJI4ddX0AmS0oEXXMLSWCG1E8njoCRTTh6JPCzd3fdDaPB08WV1tjt3f9uvJAsk2HDSh8CDukta9jCGPXwO/L7ieFNWlP2CyOVFfIlOA4UkTYel1QCTQRhYkd7nMM7eq3Di8/NFlvnafVRt7bzKtNCQ1Vw+j8r8q2SaOWN77vWxMdNGQszGbgZCXSnvZ+j4wH/A1Abmv6oj292k8fo62OxyeJgravUC0rK7XtL7IDIniH+7Way0XlLMSl3mS3j4528bsyDZOFNrMSDVElEt4pp6jgAhHXL4YWycwfw+nFnjR/3GJjBbjPRAqUG9NqNoF9QpRrwTGHhHYn83U+w+CCnjtW50f92s5iaQSlC7rqL7JLn4HDm2A7Xy631f/75szxo/tfN5zHUE8MNunP/E9KPfQIGBdMUxFnaWJVIi2kqob5vZ0QEwz7kDuuRyELP5fXLIfz1xi2/4v5ELc5qc2a9q8E7IlL4DsSIEGRW6161dsAkpii6VynknBz076XVxd1YaEjkdnPfVA8iv3UHqY3ga7sY2E3uuzbt8gqADZ8BtdtHFi/deiL7D6uYH1jDFym3us6Tm2+pI+QwzmsYlUTNWr6bzb0CIhmj+liTpsHSZwSKr7lUYZZ/ne/LUQMLnw9Gd6PxO5l3sZ7ziSAcwUrQAXE2Id1GvYjB7/DKRO3okn2Rv+s5MbXGp6MK6yw+9xtNQjYfUxJFtNwVqbLXAUPz0MqnHZ0XKgkYnYLfauvRYW01QG6NvubwURqQ9rulGP+yMHNAzAUum4SEETOIJLA5RX3EyoNWd4auGgB4MPAm+/i1IHLZBR7S1U5T6S0gHqw9Q3P91TIR64nQnvkYDBKExta/LebUX+oodFtoeBwG79uOvkwEKtT7pXy3Wr4VwB4QMYovMqZr2lxybLxUoN7lFItm1dz7PLGxOG/K3iDH1+XAnyAaHKuE9fhKqitHTE5PdiAHa+hFjxu0SYFiMPQyQVlZPOsmvUHQl/Dgtndbf4if9EQqc0NOLQS3GzmWNy70ONC7UlOetRgGcz0lj5rd5rvccW/NoXtJ8ZUm7wYJtFhwSmUCyMxISC7iCd0Cma2tcDkV2YVowME3x0fD4xTCB+tV+DcdueZEpdNxsELkXAibQytYJYvSU1GRj2CAw4XmYVXv2xQH3kkVUGD/uxr/FKstQl6SCIbGdSISr6ir8whNv6ao6OfqdoZAscLaZ056eJaJ6kK9wikirtPKPD7v/lsQDiHT+vBHwfOJmMxwnJ3zG27ZOGBgm33Io97z1jVyLxzGc/2Tq9avJ10VpNLPsezDHF3c1spAEsn3ZBuOxAFSJST7nKPvcGV6bx6FQVbEn6YwgSG3+fTtTD1XNrZs6n7CIPOa2mkXi0S3B5CIqM7AD1JZCNQQz9qAICO6JptKvp2CLLfbPFrPA+il/bryQLJNg9kSsvWq3m0GU/Gb0xQzmsnUly9Sf9lHwG/fNozRwOq4zncmh91qmz/l7WwuT1kXf69uHmGxNuaIFzqA7V6ZChumfD/o3yvGclZRMB1DjGLT2g9blesOAbHw3svV8uij3HlajSswC2L7EchlmAGMuDhgPW5cTwYANbh4vzQoETtp8RI9O5BuTRokdgkwUI0lOHLKSokV9zceN/DD86ZnRQmL4uws3trG1cGhQvrVFE3mJE7Hpshy6B2TXTbA3J9ccblIL5xTHzStmJzxJps7+Sm126fGlfw4DL49OHJhy0ZDYej8V1Uf+cP1FYEl6QFsP+aZMaauYdReRJaQLAoVXDOGj1pEL5Y1BcjYFavU0mlvz2+VBGsJWb/KUFy7CrIGb1TGPoL/D8QnkRFdew0V1MymLu5sywjm9IT9M8k1pn1bWXFO/ppo3e76Nb4IdJRLoH1/53YduS+/m+oiWkBLQvdtlBAXUyM2GOEOI6kXJ4kxOs4l1E8YSk9yPfGXUiBVG51G5EJbA6x58h6J6/p8jBlMX6I0SDJxqck0Rzqd1zXFD8MBF5wlL9L+08Nv/wxsQ1V+P5rQWLJq45ofBPnGRqpIVBpKW4OSCc95+kcCGPfXhcZad8h/rhsIrcBNpSrpyhKbQPyC1Mr+xL89puyhvHTvN9OQsCPMtGY7tZK7PPz+pvNZOb6iSRUfejED6qKNpi3vXavktR6EUrO1Ysol7cQNnFE3dK3FXgSDNBbtwESH5mWgrwwDb7bjbClIcbPjsVZ0LAIbNb2nVse52Dxz72yqQnwk2ZnxCThD05txvTI5lMKJM8wMvYPHOWLOIZWwlpCXXXMCCXfnwOPHqBB3oPSNXsR1WJCwcicq8/wbaT8ufOAPCrJ704hskNqMqJ77CQKktwpJA7B3j8dAzQEv135LUBW3KPe5P6sb/jXPcuEQdH6kRy/pOS6E3DcYfXAbAeX7QDnPke3ipazIqbZdXu0HnYZoQ8+0zVKmE1APxP66ioQQzLN5kyTLf0SsugLknM7s4hYZJ2c5lp5/5U35dIgExs4HkMgLIhWLtAJGSFzW+cYRiLu5xUNgt6yb+8sqFNMN8nwytqgLS0NHfKRy5iM9b6NepVgF+SeR+C9Cy46ORg5DkRhthcuc5+EFEwO7+LlirPxKphU4Xk7zf7gTTMaFWh7WIbp5zc44wShpa2Dr7yZVUcWAIhE2pRx6hsP+jSRVHV8LI7N6jyFTihmY1vNR9PB77VVyOFSvbhHX0wWf6GuaYAR2rsjbevrcbYGyEPN6T+Bt/KLAHcf30/BGFRqq7RrNjUISqbg7Us+17OqigGecv62tkaWkvUa3V3su/CSU8mDY1lqT0xXy3Grsk38KPgIogXGDcJqado44JR3o+VawEEQAN0DOMdDWsusYzaKa5YtJniKv8+DvPx1PtHcALUImG/tuy72CCFEzw1TygnHENBM7qwuYfAbtG0FZYk1VTaqGXcFw0c2Pg+dvjmCqY4UcsGwYTXGFfixHVyjgnKi64cc43VeKpXUMQ8wzdIXp40A/rE3dMGLV8Ayqve42nXuNbMu2S3fCD+b+AQ+Q0aww+wddf1cramJvTUAlAo1AKAHoIlSfwupIN2LJMXymtGWbX+WS2PjhM3sa+tvQeYc1KAomBiSghkoRnrtV8hO1sFe5hEOnl+fKlZmsvcKw+qDZOueqhBuPjijo8OZ8BbwT88FwRVVf2PwprHkn3IBaEszTh7jGWHVmTaVCUkakDeR7eyukAwLzJRf369gBqGAJ1umKhX5GvzxMVo0zccjDN8iltC1Z3e0y6YRxJFJrVlVYZ1KCLsnc36N+ni9//RmhzGjBJUcd1Q60e7noIoYaumzPt1Bo7fzB8WgHdcI6ya05sAv7CXHIcWJeF2bdQcodh0WWM8sh8eZ/5BWR27pKJOpYpb4SFQUeydObNEYq/75cvOqCCzocL7Lbl2lSYEPyMh4yBkDlM7hUsHx6jUIlD5BmTVTHH+Cut2O82EwMKqpoJ7mtS+evVTsoDn025Mp0Lys1pt2/qYCmSJSaMuRx65KxT+xvvvS8CIuxqgm/EDEftmIEH9/rmU1tZCvGyw/RehOV5wp//9Ug2R8NVDn9gvCUxMbcj/CeZpAUENduULNJjgOfYiLQ+v6ORxBjOpsi/mYaxt0tf4QivPjk45WrupZhCfSr36TcahxaXU8nzWktxf/viNQB4ijdYmtXWt2YJ4ZK+zw/BJqHcNJOHsuWGuXc0Pv2+kwmNLcuJSEsehmiWUgLliyEAMNrvSDrUNSl9jlF+NsfceiTzhXk3IX3A3amsGA11ThRuvknmNEdqEUcnl535kE9Z8/x2Y9E6+ELswFZk/1A4zyu4/xCULgvxC6xy7Yw77yiKl1XuDa/KgR1Wl2xR0iHKqOkWMdBGH0+SEBG25VeVCuB5a6o1pQi0KnOaMMGKiTtDBrTpdefF+xL8jeDAMTMWRE+PiOvM67tiVq2CeRfWJ2VIIH+q2Lk41A70ekzN7dxp0fS4p5/fK9TvoL/xCzhtVU3qW0vKjmHqVxgfJDO7VqWYec0DCWzlU9iKSeQ80y4g6Y3CkGinPYpoheE7uOENu3EMW3OnvTRedLVr3t4d3bMqMOp/hNi2d+I+UlFOagnfgBnz19bsSWPPDNUDoMm1nF04lI1lUrEBnBh88SCzOy7H1iQVrFbnm+uhfXbgVYAZw/VS6O7qw6/x67wD1uw4djfOc5pmGyVIg3AsP5oyLBpnpQchbMFzE5zO7dTXThoAcqa8NzeCxlkFFMoUdyfFYmVU+1KbZn4pMNgCN0Ey4phdaKv+fi8gxz+jFy15WxZxWNMjtzeq9H1u4s/N9PjCbMsdNELGVIZ5cu/F2KOt5BZ4ofTV9u1kALSXdwqIA28kmUM5TWNhjVZ3cJkmzSFqZFhO0PD2r7TyY/koG8+YtDJVsgL8Nrz+jl7fq8xVuL3CkY9SdJlAg7/M3SEELSySyWKMoNmSG05OwYPlGTYOjNJNCqTThHaxO1snu802ywtv1G88xCP/BIXh7il9JlnqMI92sJwp8olx1dJ1LQKz6hW4y+TmBu1/qj9exf9ozponUxau6ATDluP1JdG9bAU0+RZ00iVjCXn4LE/dUzSSsoGChLh9DABFQP8snnPPIAPEJ806a8DBNhtD+HVccLdjuVSyMrdmHxaF/3hLU9KmjKgwvfj4hZVY/bAzaFR6E7rKVwM/M++b7m7KsWrMapLIlPc/2mkyydKb+rZPq9Lp8nvftOiDdiUuFqz8mlMFn39Rrzh9jLBNT75az166KKgHLSEvLrvtycGRGg17LtJNZZ3GAYi5xTy+QqXoJCYshK9k7LzXgGxeki4FxOs/mURny/uBrEUfQuH8aKuQIvDx9cA0RqtVeqmrhQl41orghJFoRr6453SlocDMrNTr92FXBQQJz3NZO/8/5xHNzzt+3O8DSRuEOq2yaLv7KGGrVg2a9YRrGNYiMwurff4PuptTMAiiX1JPAGGqALv34Ed1m33YtvNH4eLNXpdSYxa7w4a70ZoICbpfF74jv5Q8YVYAhjJ6vYtR5Y3CZp2PdgDgQTCzS74qGAJ5ngJ08IGBPUAdAmwjrjGJBZCG32duuZ+374kBjRIxLxA1zqRPkoEYQ8tjxIfJKVJsruit9+B+BM/wFuJJc2kBiZhb+udAZvxl8VZBYGZB408Wq54IhVdkMwTkjBzpksGgaIOdY6n7hmHNnqJEagmncfoVWJYPUrgScI8JILhldWuQyPZZBRKQisEnZezMPsku2bZ0j+uOW28Onxpzzmxb2BnBN4UcK9yA4jPg/jQ8knHeXcU8AJqJYqpE1xMdiLLa/HLwEHAvc3RwuH6JOvf7LorMSgCdyh+/+3AJYx2QcZpxImkj3Z89rk/PFNyBjblMc6rQEdwQTLkBZhuRUQ6k3Ys9OMsKCEg2xXX+vs1hON3NeI2avH1r4tAXZgQ6RnRBU5u6Gi5ZZPDTfKLznDOMHhq0xnclTCkvFMgX4jatqI+oo4FwINcxkI9lt/y/8vnbD/RgIWfiDC5afTS2/GCG49/OiyKNZiYD+51A3J0nAkJGDyXypM35HvTKGSBkMcuydOYz9PIWtmADXkPRW0a2FFWLl8orG+Q0fJWHlzQhxsjKHWIcTk+t7fqMXwNMvPcU+BMYBKbdN2dRX0pQCLGn0LhbpxV/R8tSMHhPIBWLqaAyanqdcuqQXRMN77sqRFneKL5ibgWyjIcHTrI9i7PKkDJlTROiY6OfefKKGuEDErvSf8qPGwlTtSf8t9TYEBJIeGWoDkfNgo4TY9cx2xCf+EQ+oeRWcd/kal/7bNteSXY4H7+PpjX44i8/l8MUpzcMMCgGW6bAEca4OhZMO9ve1Ph31jiLLeUuNdR5hTEENRDl0vx2lSh9uFXm2lshBewgqn+rICdEViE1hXBMhOWgX/CNofQvHV9f0O56MdRFoyOPADS4dTqaBVtQEFNBZx7p2RkRbVOba+4eFGziwcZgzymJJoPjvmfcK1FqMHjY8lziDwguAi0RJf3SzZ2i5A9u5bM/gCpHslujDHq8rlNX2BrBMIYcQE0HeLqCLCX9Eu644XSI+pU0mBKoxIasK7AMiU/Cxeew7KKfpe1gJ5ffIKBivhDDi4ZTtoV/BM4GVcsYHyYp+CBTbH5P7zK7uHv61P6z/15/hy34N1njCucmHYSjGF3ZaQyidNVTQfGfjGs7ybMh/JhUb+6ubUYpE395UUUIJIVVl+BQV8V7jgWZXENSl4CONMkl03kemBkbNTTghhvRNRPZuh8Vc1HEoXIvQjhjiuiNJUSTaNjjrMvGHwCENa686Dqc6AqzibohIzsT/HB5nbiErfBbViGrtzamNzJHOgp0aFmzZBh7rWsl4IlLV1QsZUF0TdkgCiTpcEnrSlX8B0t0TK/cI80Ge147yWUPlkGp+we4WTg413fqCZzc1Vcif+xXcRBqtoSWsFEWgEllYw12Oi7RmlhW9aB8hcr4FhjAmYuLVui7WhAyoWxKh5jt2orrQLCgTzUcNhtTyMss3cbniPkZRPY305X7k8NkfJCJ3g+ICNy/9xaYQQn2nJo4t6lQy6J1b0rNhZMRPjh3WQYIiaFSlY+mOf1b9Clh9TMqDssEKmDwbN6xixrpS3H1vCBitI9xkMaHxtBhQraG7/+ZNoTLrJ7U0ixSNbNYBhnn7mx2ZXBmfoCyQrWBrhhJ0pMs8AzcElECoX1sit4l2u+peT+IiQKw1Z8weLm5SA8T5+117PwHRUW/QNkXfdJTfFnFnlMSoExiBIKepPspMAQGVTl+90BjS9tVhoG655ktqf+3ai+nkJ/ncatGsHiAu5kPlQ053yAmq7gVBLgRUjlNj+Msk4OMzb7xDEaeKjnGpQwGibZ0kMETFJ/e3g0XtJvuYSCOnO/UTNAsz8JMgOy2m5gS1BYVn/NOSZQwMSvMIY4SAneX5UAfUrUkPjNMYNPEIqFkBT2xtKf6QHWqLmdNHfcFqYmJXaWnI1QU0fwH3TL3mURg8kBk41JBfvWO9eQ5WO/aWqDNqe+A9lJRY81OHS+KKQPN5j3YZ41UxzGUq2S8h7h3YlpFuw8Y7MTbzqXK+iu95rKf/dMVNruEL46TtHK/T5H/JabdACUBGTY01/5DDXyzvL/QFf3iSvECzHwm5X/OaQcaBdZuas2yeE9JGOFsUTNjQHvZ2Yt0Kd7T0/EttzzWi4iMXI3XFp2P6HvZ7/Lw9lx2vdFmAZYXqGDobQuh6gwzBp9zLN9A8MN/adsHfp/L/AoAh3k22EOaFuyGUPaWk1msG1ydqiMDsWe+x1iP0rZ+89rMohHlkoBNZFdMaO62rtePS6YtEX/RbliS4YNT3T9YaXRN/c4OkuhgCMbLq5JJU3yZBKWbMsnWVg+Trum1Ngar6U0aFlo+bxd4yemXrdr84OH808JYIQ6CEh0DMeZrtgFYB7a7z56xB2zBlPss8VDOmb4i3Yj5SP1Lv/I+cZxhYQddHn9ur+NO5duICTolQlsdSBgkSc/5QUu3lWJ8H7GTZKt5s3Hh9xsye5PKHRox/+hold6ClWV6DjCNOTd4akOMmwGNnN+Oq0CZwYiNqsj2URGhovHBkn+0YJOwsmWz84/0bTNyx5pGVUcapvaGde1g3Mc9QAm+aPzmX8XeNEtp/wDFw5aFT8D/qHW35Gs9HPqvzNGGJvRlmACaPZ8cA9GlNH8iRmxZl37wM5mYwMX9FdP8ScicbuDiDHltQ5hWtIU8QGYzNcue2HC3k0qdgIaAYkHEMUDnBDBMlQVPLOmPmmaDKensBtmuSUS62J+DOp04a4zUpoxKwvQ0uE77jIYA3T0yJmjBLHHIhOBbkID8WSqOuUwnl6qkJfcGU/iKF4ZXq3gl+TWeNn61c9rYnyA04P2JsgNveZc/mXo/xDS+XqTPwkZyDUhZxC674EwHbxgEiJDlicgwayyD8CFoOc0chbM/ehaeYAfkAjJm0yQnp83AUHc48VzAKWDym+O5Pg3grGa+/7YZ1Vd65/KQ5kpLMtw++mdUrTCTN8ASDqdtGkYeTQbUDwIBX4KWqwaNo3GGSFGODwUH+vWzjtH6EZ+wPeTACexQj9KJsrdZWl3G+LIlY0geM4gfej3Baq5dpeo2LaniJWEA3unJ1Z+FFYJoj7o73+KRxZHHYJxhfBE7sJBT83Zaa05wDcf7kqejiifjmwsu3n3IDuvYF3J0311c1lNuMOODZV7ubjG1I/FWmP228aniAYbb/Nl/QogxbX+tK/fUxxpJAE4tjIQbWLMQiKjrzUj5W5qbO+DIUDA0Z3TTNHIUYpsDDrW2MNzOWv1jpUn7lzBorMSfc3xZ0P7TeShI4gD9CtD+N9tJjes9QfxIewkDPcaMQi3bqwkS9fVZBvlzvtw6YdGTfZ2DYYc0WPctyvAFrRzAV1aUXSbMk0ibB6blT/UusQv6+hV0l+5GfOFLBZhcW3kNGQUMxo5sB0HOGtHiSQ3RiqkYYKnq9mPwto+kWtHYSYuIPVhx/GwRSp6AMY/I6e6tTdpSwIBlTNV9xyhNDbQiD/9U8uiQP6N69pvxGHwf7/socMPmaRk88L4sw7X66EPByXmlhn2jRT+oSJthkLY09hHYK/rpQrOxcZDYNjtQhs+akS+LeZannw/B3Pm6M/C5awqQZRZJF8kRpc163mAzZWQaTi99ZyK58szcRCXJcUel4w2Bu6UaukBqqREarAlSi8P8ykC5ySWZBAWcyDOy+HMzl07YUiJPNVL4vIHCQsTY8lFT651qyDK2CGHoCOmD0ElYOlGRz23sAxGXahXEc6ksX8CHL4Y467GdC1TrXiY9v1HGf3VC5NnyFBihU/r+xOJfSXBGpwt3ECKp8S2X8s3+HGP6jESM/wyti3UDxK5z6tY3tVbtYO44HPZ/ruat2wypCd+5AvzTRstR1EqAEM5lTRL1MyRXGq9P2k95gvcP4kePAEhqHImaPpMHzGY8V1yG+0/vlm0d8nGrNsQJYz/uHEeoiaMq5dRvMBO2PyzfdSteXJjIS9s0we3fEvHQ0Hs9N3HQVE28cbwbfXYQJzshwX5o/0mKz50mZIZkJW7Z/vrkTjKu3WXI3cS66RxN35mruWlyjLeV1l6wN5lC5tUK0iwAq2/Aa8izEsDoznVCJxG/LvYvUsVTmapwXl+DlSOm65yHVLA7P9rBm7ukgWptoMfSFD84G93kwUEuATSNs4jnsmL5Losr5jhm6k75J4q7z1j2fz9/gu9PxY1MfjvnTRuf3R/yjZst+K8fK2wUYQPg2gDZBW3yVgnAifGVPPTHxXwQmldLojuCFpyh5AbKb4VA6DyHebcXlHoyluvK/0y7Zp9xiYeNe+5ty6nCcuwFneUwya+h+faKNjg/QGHOW5fK4pdx2bhoasoInmg0pSAAJfd62XsU9hYwieQVwb7ihuyntHoE/aAB207pfaAwwJftmO/srY7W7UI20tK6WH/Hp8GNAKmEEezR9p3H2OEGf9VpFmJ4xrWAM1++Xv3Pz+VJEZDwntvgoStZo1agYTYLzATvo53G2v1YRaZXtaUqS/y3wHqQt1zOTssUTUS40RDwOjAOnKxc/W1XhD1bJLsZqJydae6YXKG8RERnwcX3gBZB45NwHOMvheG6jn3CABzE3FvjIThwRz2fvYaQdOaKoVKmcocXkb1cPWkvUsMgm0hejepSaN5LGDifCsTvGI0t8UM+jAa3x7WVc+UfZC0jqUIYkGjbJXp7pP3Mu4Mzto/iZD0GWBAjj3y3CbLyZwYg7NFXQX6KV/4lfafXG93AExGk57aPwzor+mCFIfNg2X49Tlt2MaQM+Vw/kAO6eVThk1958Zcvma+0YO2OjVsQJQCjwHos4NO1tChggv05yBvf/4o5z/m0w6NW8IGKxdMFDsBrl+VGrAv+on3EZHgBjiR1jdhsXANLqGTBARUMJwWW0iDuVBLnax791OQViu6TVGVHkJs0SLkfy8+hExyOFZRaUmGuSqCz7oVWq2pd/jFGJ1Xla1FwjBSlR7vg70sLLso7/d8gWUDXtZbkLQTxLGmsqtW/tfk044axJ15FNU97/qhCbNpU2VGgCB7QoxpzmepWRCWaWdqbdrP3YzRqnfI5O0tRIIqV1fta7Aw5hw+3jIBJdJir+7GHQNx02DWMEUzxLTHK8m0h6iPYveqeigPAvptt27c3AK4T+/mLCF7i2ZuguEScNH8dHHEEap9W3X2jv3mSkQ95a1Qh1N35Juj4oMbqXlVeeURqGDeWyVmBm4fHyzs7Da1aiG3mpVqsrL07YrHD4sYyFPDc+R/iiFPsQLR0dpdynw/9PrbC9hmKGi8btRNx0GE6A1tUcupo5DMiDIR+iYxcUV2OAW9CM4Ejj4vUppk+1mnjVgSKI5WhR8odUDJPAfsz7+tT8bWjJNL8QVCrbY+y1qD24ltqKZrp4RbEBBerV6W4ef3tGU4XZmEtvAwmBLJzqlBLss08ZiTW/bsPlV27RU9gjf82INf4Rnjw6ztotC7stDMBFrzIOghLQbqMrQCHY8MEGgtWZXYcAeRzHlurRgifBEP00B/ovVxq2PgF0sCAAts2GXHKxGPkQAvycRj+ne9oPeNZiVbpNm5GeuP3XKsoTL/GjoT8Ww0uRBlsV7YDXT3p+UcXBOjZEY0hYTr33XtxEZ6UqYLn3UX111+DxkcCPnkZOxVP0Vw7NYQOsQ+FuDVQ1BQllLlOEoouyxqnDBIVxfzLbFtZmXGh7mBY0htdNtCIs2+WH1dT56bhclJaq79BbXZ08+N+bpuUmFZCJmx9R+M8ra87ay1MwqVhMmCxwExuPeJdt45ulC71cEyW6LMok572rq6GcIZ7xRuWz9Iugs8ehVjdWtUN6SSqeRo+eP7X9/XpgpIQNltlOtXVJo8BkfcZHQpEH2XIpPqsmkJyFweHOjQ+Rz40KYE3vXSw8Os7NZUIst60BHci5nGYMXmL1+Nw0RwT58QJd1s/yUjd/yaV8YAaeU4o5urJF0EiLjlT49ugC9ld+B+bzUC4hUQXJAournM8hn6CYGimdqxGY3zCB66hjUixESZxqgVSZLuPvb+uXhGs1meAuiY3ICNMdnDimA0W3F9rKlN8/zsUX1hRwAdPNhYIlBMjjAl0IWq980AboSoddz6ky19VTWPwxMCu6sKzIoFBEWBqOH558G4b4FGhqy+aEADzuxxqaf1X+sBH7ZhP6r+q/cTNuTZ/dpIsQTUvFYIVMmFNB8hvlma9Khr6G3xRBYOWZOsor8yHpF4oHi4krKzS1EfwykK17uTH/r6vtoNyFcztYiqAxrFViY5dZMxYPj2GTqm9pdZ9AGvaXJIOM3x3gTi4Gv2g842d2BLpmC1EYxLyBfNvIxopxmkDnkWhZRGPPbcDa5FHPFlJoir60ShKmAc5IR7t79/rjvnKMi8qRBL/26ZN2FJ3cd5O6svzEyImNtzA867yQdCNKk7/UNe8h8NPX/a2q+6CESHFgbMm3Rhuq4M7AcR8XjSuxf19vpvEyMB28A1vuDS7hqojkdEF3mU/MejHZkcyyWHzAtD2nxZfTuKySyczaxFR73C3hO/yQIy8x6Lr9GZTIgxyugLMgWMhmMme2aS+B9sTkt+gK6z7jl5gEmnabtkjna+mFE0qhkFwQ+4p0pHga/ojipCepiyC0iGF5WAoFhfnv69rkfp36cPEGI6+HJ7XDkak1mSHHVEfv4kUC3Cz/D0fJfpZm1ny6adcoQkTF7jJ3Z4AhVg6ie1O1idaNWeQef1nIoF5cYYfaUaLAXuJMvU59KizdCUMUqDNC2hyD3AECK0cjwI5+1mIFRkB/bqGZiVl0haFJW53izBcAQFT6A4bxQppLwxSHdC39gNwnnj+3aX9T1dC9eNHq1fbW9Wo4NmQkp1jfYl4CNvTSvVii3cWylP/OrsTKT47utBm7pUWboXOQHes4MzdCkdq4bcPQQuwyoorPi19u7C4eQn5SXAmqiCaq109gJU5k4rOwqYS99mAEevhpoAsA1aBfb6LJP3RnbNaSgSY8sEyDWLjsVvyEmDnVRHPzO4RBLKMww4n2eQM+vgpY0kvCKrFOjZ2N5MqDRKkTgODluvUteEVYvoP7aF8gv3wXiK37Jd0AJaffJivvV8JP3miYwdYxpH0HjA9LZunHzcwIUIW+G4vUlKZAjduh4SnyWGkFPzYrM1F+PWykvlNxqDiqV6pVyql0pfcfcrdAZYD+GIcRAQMMH1y3xB//N3vSRnWflGSihx0mnGWIXpHXW0kYREpoHLMd3XGrWi+NaghsOGY6Fk2m+74be/KodQZbNnP0JzbVi0915vC9ihdte/O0+oKOo9knqXDeYF+D70XzZDDOTd/N75M/SNx+ERFcjiWSMpm5E1UyXgfnsIJ/2pyjoRk7X7PnA2ajWi7NLu7gTJzB0HyhRkzrKX4e6foG2ygSUmzB8AdBCvQIoOIziP+bPo8vPDQpkbBgjyIU08MJj2JY8RnJsGiW4m34sQ7LbfBPR4JuMrsqWBwlUmIe7Zg82p3EZ/uT6GihVttFURUDA+GQpqUtgov/Kxt6GDfOmhsDbG1jmJ3PZx2qMIeJxIBy6NLuVYPIhWfyTWVVwad2/vgKyCQkoL7SMunb4bSZfwBKtpx1Axn5QOWDnngCbNVkmqM1G9MfsjI1HsK+oKocVTM4768T3TvGcolubqVVHabHgKzxLc1aDIrelPB4OFHPulYW1sG8CsjeISd6cZbkJ9amgbmvOeI3Eltx2ZQeKhupEMcFnep9TvTEKjYMUdHGBX3w94TlTNDF3XTD5FeYMsPsCQ6ODAs5T4KiDLPVdkoM2QD3X1AOdQyQexSyYCKPF0cwdI9EIrpNE5JRjStLhA36mxtr5vCudn+b3qWHITADv8c5eSJRvRv9ZKerExf3DRSWdq+zzjdjStvJ8D/nWnKwrgoYbxCaxFrX/7BC5m7/4TEykwQj0LFTPa71EwYgBaaH8776X7OOlnvFdVEQ1jvYFsuGlShXN3vyxfVYjqfpY+JgwGy+TgJAm2XVhgh+vd361eYQKtR/kyChThttLqz6RUTCJmuajdtwP07zY1nOWuxu7UdpE7nHeq8+POgaosqVdJ4xbgd0o9zFnGZlZJhjQFJ8DukeXOGt7cjOTyGPvDoJghA73ko5N76azLZbVuSCW0fKzAuDwapUFmKHOlcZf3EdbLtFx5J2nY69xEA4aOKUsmolwEzNVf87VPL+UXgt5PnZe7ys9ysYlU3w65xAnLL1obtR4E7uyfTaaVumyTa/5/bQTCCCEfhlZgHkbbzjdnSD1lGmaos8auunFK82bf3eL21j5yFD9qyprox5ur4iJ/00zVEJLUG2l2xJmao+BIZ4B839PRVWMXebp/ixyI0hXQnmwWaGI0uWdM7usHZPcogO78b+3yq27/U1EOp3/6igKk4lgZAasei9ABqN1Mc2Or78xlZupErvx9AvU549gXPcO610RkU7hObC8GESjsM3kQxvs4T8iOThV73yJBrOT5e/hyeX1GC3w5AFgCkVrY/DV5wsGZlWRxm8GZinYt6eyvq+5Mg4w6bFzZqDfn3G/OmGoOP+Eb3/Ur+tWwMt8UeAouI+CQunR5JhvH0QgqZTW/z6w5Ea4jJaWG85wIqRK5/82Ca7TQTai/DbUqYtQ+UCiGeWCqbOBdGm73QXMH2gKlh5Vpir4wk4jAVccKWaerOdY2Kw47q/nzJwt4hmGWxB+n8MVDKCdp5YucP9e80bA5ora4pVshdV1lpPvqFyrFTeDQOd5cKDrA9RuYoKtwJQFnsQDXa8impdqMcwWMKABX/Wdy2zJp7A5ui+Iv9T5uf4pJ4LDAaKPfCUmXTrLE6P13x8g77F2PqvPeVM/m/odIQYw6YftL2lt9jcIqlSYCtr/ug+9FmfLFfglnjPVjoAxpoMsSyjWQI6FXuEXJp3FYOLdAEj1kv4/9VR7viWNn5Myt5Qk8evPV+5/pCSr28PeQUBUC3/lhTyhMVzE2GWaOJTSn6FzZj3NeE2Vu3UG82z7rIfovCuDnV4wAvKzbIXpTjWGnR6ESHCociZavDWf32dRDkKz/cFr+QzMrdpetirYgz5ZEg/EIERPo4JPcICSD+aZ+/XegRBNDWGTyLyEQMLnu1TfD8XsvxR9TOtKAcluTWWoutCEQ8gQMikdMFF3fliBk3CDjdJXsrdohvAlPTHuvuVXovg2450Aja2X6Troov2aaZRG6QcMS31J1Rg9dSWbl3Hz2IU2DTKVYbE21H87vaRyR8gmOCCzPGgp3BjE+Ng6Vt3J1+i4uXNGXi8WewPZ9kbm9Fh5deF7EK2HMSeXX4QkHi1DA3GiJGTU7f745knQATQwu3D8w6Jwmb3l8SRQ+RVY7sSaighP6onMLFN47oPwF8R9O+Y0yErB6SNVKvM5MkrEqWpF897Iy1Wm3U85GjULyHKfgIq6XyvdWwydl5cHjXhAkdmQeOUeHRHOWrZXanRlpmWH62Strn/FNypy0K87G3o0r/wcMzsG4fD1WPK/iEbsUZOdJs0VKQjWdsA5AxFNhcqfKnly4TxOSD5wZFVgT+r2TiM5KrqSYmsfrp6jdwxSPAC2YufyVxEywOoZMFIhBlxK/erss965s16bU67cyLFGh3jBome6I8sIcGft6OKj9M+2tJOwqVVQ+StQ9jkbBCVhwq9rNbe0GacJRRXeZS6/BOmrdqaMiPBbcPVye3uM4wLOyo5wyxg+R720Tsj3hCdRKGp11tOT5+CGmwyPy1zll/t3yju/mhoGUyWE7V8P7/9WUtPl2Kfi7iLlRWexmAuGSy9g4YwRdAc7VXFnNsjO0FbaESj0hYUN4FqUeNUlUZVmKycYApgnm2FSIPReYpJW1B4Bk05YUfKfwD+j71l2YQyitj7SEflHaVrf88vhgEuH5y9PN0v00QNW8QhCFI9vhy3QlQko0TgEsJu50tH8CXXu/Zf2RyLiyhIzQUl+jXBvfrU971LIGM3O1pbHDYzOBLG/R4WLcx+CZW5JkIhik4kvQgx3gRwHt0+U2vIKy5LsnPigrzncnUhvLph3Lw/1J33ko7opvuSPB6u5SXUbtDfxCpMn1nc1hnYz2qnDfXCKdUROmmHkDDiY43XAKs/+vxkTpZsEZoS4if5SZR64QNz/Biu6o8wvNrhsePQbZgNPrAkiW3/q5+oC+/SLaLQ9FVrNRcX9sgmbnYfZsXgPUGXClz0b1/fOTSi7/wSGCMmjVJtuvXCgu9+A5a5N1UJkzA+q8ltBTZUsNynjVWQX5uBAm32HCckEqeUVOoQT83abIadf0vx9bd1KvpAP6vISuZkNW32nXavl3eftptlw5fu0wSJXOOnwueUF/NkyQzDQalYNwXAIMrJ2M1uAOVeglH9CEDXePEzKVnoqNuOMI2o7S60gPQ8v5Cm+RAblYlDoeasMP8BJ3llI4MdU+gxAZaUauw8L0LKQV+ra3Wg7jK7aZxpmLYSTOCy80WsdDg6rfxAXNPbPmzuw1i5RuYBMD5aLK/d2u3L7MelujjD8Vjodktc1UPTSFEMBWF7PoNFltkKcJb80hwVNlBJd+2rAj1Le52VYrxMVIrrPhjH7IUAhNKtK0hV2FHRrdnhmyQAlVectpyJBKiD0RHcffjIj15UWxzyLswQh+bqw1P2U/Fo1JrcdjOCQC+GCXxekpp4KBjJz+cR0wgcxnt0HLrD2b6EUM32ElqQHJx96tdwTz6gnl0i915DH0KwOYxeCQxHph5B56sZnBYQMxo3Uhg6FW1wuMNF2ZmV3IFlKkmaNhxGowiZesAEPdTPSiN7wk5wb9LhcFugD/PN/XmRnZYYFcrXIzSskvmA+zOWbBhXJZAuAFED3hamM0LQXj1PbpzrPgx3vm4iLXa6dRf7uBA0WsQY5xyasprfmjpk5EQaswwKZaYjufyeIQzz2rYI9Ksn5Lv8Y+k62srgJgfe10s5Eul/ALNdWoCwVawrHOUGsx2Fn6fJ6YVChOolxFITTZ/FL5zlZKDxY+vHTcbquUd7trdY4JXOD20ULw5hGuilkBqzw2OCEdpxXGbuNnCwFAi/NZSkLs6VWQkjMCAAgPLkb6/xBM5oDpHmtsgfLwcBM+8ew3PcUw8LD1BvaN0IUbcf3H4Oc4iB0EdkNcYJpfCZ2+Mz8PW9+XIW7y7+eU+NhBDmOJSqLW4pQyZ+M5HOJSR6GHHqOncjeb2CggkjWaidWHK6W59y1SXkIYJ7FkV7a8/C/QHAjFNQMkY/kukMkN+0jiBdKQIRKj0sVgfZnepkOhZXM7klIFxoAllOBWmKsWvXtzbZRZR/IIYrpmX5IPaE3GAfuoLYKPDh1rXeAqzwMY6UlOeqyFRBw4OIpPxQow08tqPXVHvcDMehRV27JwlcuFZD2f3D3NXl2OE200Ouv8ipkse5lEWKjlP1t8dPHm8ltJ3vQBBixxVYy10ytzzPqhhZIWnnizgposCHPWqYdeiT9P1O8Ddss+TxLk/qfcGz0CzvQOlF4mZ/Zk1YDhbwfzWAK6+rYQPJi+sTGiE1Y5PGdHXAkAD+xRHa66U1smq2fExZrsVffF7XVgfizw+AfSBN93N4Q0KWhpL+ORetmTR8RKvaTRbyA+LPVUrquFJQIKFs+/34H2doUEKm//GWJ8yKsplaVSbe1gXN97ZMt1/VVagJKaaiW2PvNpjLSK1jlx2L/odikI8lLw4sXuv2Apuk1+4B8NodrWZM4M23kC/uj7Rk1pJorw1gtE5v8Rs8LTkZ36If4VRsleKke+S4ndUVCYwaikUo+xJkofIHdI2/xklUJjbisn27BRlPlQmRhceO9J44UxvhjL3WsDUmnlIbZc5CVYTw1oVCH0k0PQNFTiP64k7lbfsygRdiYCbUn9muIEqaf+A6qCwhECTjdazO7LHvJOYWalQ+K4LQe3YZjibL+jdQH1+4AgRKTWejOyIDzeR/F9PAKtkI0z+nmqx29rJSFbnPxdgkcyuhy/k5orPmc9u7e8rRWYa9gOhmHT/glzJOCmoRoK3P/MkRzg59ROPCPjGe/kUltY4pBpKAxV4hab4Xv1OFIyWwXiAP1KPgflO9Q+DpLjjKgMU8JeDv8z8hSrOC7+pZAAQypjVSrvnYpm60H3HRZ2SBGVYUNVc3SvLVKl9+TDCO/d02L+6lOUHJCDgbk87cEv7lqpVwQQpzYarzzZI5OzZI5OzPzTXlFK5/prkFCpAE/JNmNdbfy4iqFuVsUXbwvRc+CeGvd6lfp+vpD/6rsUxr71gztu8BurPJ1dT/JDxYf/JLFUyy6XLqp24JIz6Wd9SLUDOokORK0kSiFqhXeSDgsGGsc0TJEIK/y11qHN55dpCdlZq05LAC7k1ocHD7iVq6ffbnWy9nfu5c9j6hO5T0xwMttcc+nRHBcDe6iLjAdZQVaonWw1iYfnW/12BM64fr/76TuBf6Fb+KJZb5I+w6U2r0iuBH/ZcLe4X9QvzvKFv/palEDvqcMNDMM9ztXu94I1RUZLB8zD7RDQ2bScP/sTO0qCwUj796Izi1eyd/0mIRxYFdRQz9YphOJEzQjV9EsjL5kLaLinkiA2XTvyBKzzOFGPOnEmO6WUYa+YBYtY07MToCJtJ1WfH6OBXDN9dhDxJ1WIzi3eWWqODjJdTFnvr5M2WQcrPlXbuK4vNyXtfMLa1jS7pGWk0OwfhVH7NqQD/Ln2bwt3vRdmMrqmIsP9bjwhnAsNPfsWUoT61mfO09eWpPJeP41K0yBOun4dX1vikoFKNhQWkyqaaqCA5YGdA3g9DMFD32rRXNQeDSttGEHXNJoUq0PhJnt/q9tMxECvkwB6agn/RzzrGsIkek5hInk9me8T+4iSwW+OmTGJbxEXvEVCfiSOdK9yxosUgU8LYtCaE8CgF/iRUULNYqvkMgp1GVUpwqDQ/ERF2WDZP7vvNdm3VDAsBE8Fzoeai16dZXZ90GUIUgA7EYlNi9a6Yv1Wb8/Ob5oS377YsszUe3LtWdQ9niRqkavKtbCEHuYAUlQB50YsyKz6UhuLNlPPjXFrGxJRdM4av7E93JnYuCfw3wCbjgauZef47K1pKRfGositW6lrZ0aScdD9VUdRbsjScYcvo7GK5AQpdrLoUcHRrWytjYkPekoevnetB15Zza81QDPFpQjw6eMLvPUpc+vcP2uh8mvCgN16szBEvjq8yKWDPbkHJwsjbiqUOykbZpTbA0g8VEn8a9TXThCf2CNFBAhkZ6nTnMDt8Uz1MXKEaBYeBLSt875Nb1+8lDCSzsdZxBPeNB/XiUygtJjSD+a5N+sxRbe50yvRmTtVqiH9mNyY7Aw/USvnr2g7J4xn0yrFiFsYTiJOeQ7NNsPIikRHo6vB4gGyYb/03zvV29LdXyvXlvkdfPLX2UOEyIEuCdWE0JSKPfZ3BN66TYW6SN84oheuD2r2BD7CUBxbh5v3G+Yj1hgcgn4nN8fVRqbJdCWo9MX+Z6QUq/ojdLE2zR2ztFeC9h34kHPqrUqeUOCIdTjc9xDtOMjDEz4V+5TcFegQ69NOZuVlaOtX2z8FhE8t2dsrjgycwYSE0pRfotbdgqeCuxo6eXxNqbAZNkmZuqMn3jIFQ0/8HpSabPjZ/ncV7bnF8eiqbUDUOxhgK1bCYIzm+V5AQQecbH1iDXeMGHQsYDLbgoeHGKACEM4K7PvhTieLg/U0l1xzMLYcRuTmmlcmxt0BYAxqWEajVhpRx2GMq0i0fyVYr/C4PQ3glNLRsKZ16kJYZtUELOnC7Ixl4VM3fWx37k5tbaUxo+33n/t4kE+OoBKYS7NtlSQcFqMMBt5XR/DiSIOu0vT7Ktgfl5syclKW9EXTcSZSYcePGbltYxJq5OZgaQxS2vhO6XOdE5EvSHyxd4kVnTAImo7vdL5mbCYX6Qqyysay1Q8Y4ZuCJrVYLoRvvRXUoAv1rgnsv0237bFq7CY/eARrQgahrIsTAA6kifMdgA/eLK09HPs56q24uv/d6VIgpUao772u+JknO4BJ+7eSGTbDdsXgjINl1L595/mBxWEjsERIeX+q9G4zMwcF2WtYnFPug1RRgTMtjc5bHf9ITL89Rjbq2IOK9Kv2TEMJsdmyV0yUqGNMeCUsVvSzSYUGUKm4f5Iz5p/VBUIsWZRGDHT1si6wPdpurKUg2EJ/dCzPAYMSCXCnAx0UF6z8OfRKUej/fgnZLN73xs8aN+8bGEh3K0rgqIThzF3hjDtqZ74Y0ROQOYbhy3lxWVTSMHTptudK2Bt+6s4VYqnlTko/dBJySpLwgR/GrbQzBjcrVlydjut9eRx0oRdL0f2q2AgZq02s2arzhQqkFMfjtFaGLzhFe6LucKlK/RODMM8s83goXZgUt9qpCqgIsE8rqrIntr9Oduwe2vv8c+0iD0b+Bof8+jGdOCOzYE+utLfzWqid/woeEm0Br+8gAsjc4cKLr2+4DQ6QTfsmehGXDigP+6C0BPivhPUdV1MKsZBNMWKneQ7JLukbiTLWJXud8SiR7Vl5dlDrSz6cREc2uOHYr5CHlLr83WvgXokJIqO62zP8bs7JDabbdErwg2V9En5w2DB8URbJz9nHZPKe3SnlDi8iZ5O8ZKszqBSm+0RSmuOOjdSbgMvgzKfuftbnecox438CjPjVp82AALhtX/kIYRSMRNzaVPulOFHu81ZpDMyjBkUnhpjtfhih7YRhhjhDWp5C1aHE90u2F/d3xSy0yw8ZTmiajUPHca2QuC4A2c9M8+iQclXGqonIdpVe43jetJxdFUEUPXOdOZzCytNhzf3/FMbuqibhXFx713JucMIubUA53r1IvHl72Y/pRg8VhuOo628ArFd1C6FQjKCnyqItFDsNtERZzoAoUy406bHErXf1krXS3lrZo9f/e+CUrBcJiVuIWHomosZ2qRbLj3WAEJ0JB1HbrJQ1hc+CnkYdg8RSfZCZJpZimJALcvix/zVUohwRk1omVjeqMjgncvN78tgDy42cHrvAaRF71aTgqy64Tcj6pNwCWrdwxsSvSBINez38sAJuheSP+u6b0Kh21h7G8B/hex1uS9KgOwH0mtmk8lz2I2OrvPLFF6kydZGL0qA7Af9o56zxpT5D3COOLEhydmtmJodsLUHVqNpbF97fE5rgV8bZtOGw7jzRjPaotQJzAlPDaRpQzTWslZJDXGOnTE62itBSjZOQpRm7K/6UCZeg8tXfr2e5xyBqN6Nq0qsxzVpIkGI10Mkd7X/dX+SuuNfxc5cY5Oe2Qihw4UD+r2uIMyGjusC5oiXPdm9KSl0x+AxbKaSvdmTNPtCT+yTpkVWJ7MWy1R9PXLCJKAs5Rd1Am/QXynrofg3UpNuRzc4JesD5tAODQTo9XmBIH5rThMB3LCIkQae24JkPzHG85WmaXxlmb9yH9k8F+FF0/dOFzljbVAE55q4qlSh2JpUTqEVrIGD/6mvRDwVvyNBhP0E4UgI+xOO0o50tgybjsgz0RpNPty9pgpIuQQuTK++lG2HUxmUojtRnce1jwRtfxVPuoeIgZlouqkeMLFkhMcgOb5Y9ulj9kIrcxvThYonLY9rTrjY4+98RBiy7LpGxL/A7auBkd9qtIrO+4bHn84jjaQXA/aGC700bl/iRwDjn8Nsh4VlEs0xmLKSe42QRd6u7vit8Y0DQdvZCUMWlAp5Zz5VCknzPgl23/4/9bg+df3jrKgnMyC3j7nqkiZ176w/p2GelpLD+9v2mDxpAQL3GHWO9KY4o4khoNEofrVZbclW68RwyXCWAt2Z5ny+tOIZLPkTA6wEKZ5TwY6sXEVdrgM4IIpGgvmyU4XLTspIDkmQ4EpQQqu5bxqtIiVkB4xYQxyaiw+JDMu22UvpirbMoncF1kWFYzfQJO2mPVpCvD+okGwrSDtQ4H7iZimKVPpB+q2vn9VqvEsb1ubIP0L/Js6ANpnh2BsJ7nUYEGoFHnQIzPsxYbkM325gPA8NICHmYh/IPauzoSu/37z9O7k2Tv9BQocxnS8B4lcqRYZQPKgNBPrJI/wkidSZBJYN+llx6PjmDB3vVXKKcSVlYuzgVc+IJFyNgMsCTn+DqstCkyB/OalyDZGIS8EeYyZ46n8Jj3fYX+D1XsQV7YMUUJqDwIK41jw67m3mBurYbgvmBBesc+27mgl63QPm7tK37dY7/HSomX9ZjxI4daOSY+GPWRi3KblK9XnWYGTTvPh6B0N2I8pESF+4qf39bRwPNE/CKQN0XqKZfArN5EwJvMT4IGjeVzj+WI9YJ10QhJERlPETVfMHT5cqA96hDNPmPCEEIsyCXeKAU0QXRF2aYaizj4CMsNoAEwuJdcdjJkbLUzrVkVBKiQHdQRNGJpDmenuveOCc9uhB28PrwFRouQb0yohcsWjeQ+8gxGheKfK+X6wvRSHnOSlMlNflUDMn7o2wX5/llJz99ElW6dV87SGHsXf0geSmAuvB3OvhaHp59sCiscahO6+wv2vCKaGO9LJkU8icTYZlGxqETMrrgb5e++wj6ERP6JuSuKcRo0mviVQaUHP5Rdz67g69jWU7mdgBazdXroeaDXj2t6mqXTW0oj8HCuGb3g9N7iOaBDDwqsophaPC7ByxzRVOpd+XRGBw8MTeuH6pNucmM5rEeBS4yit9LQCjT/sbxiV7gHOIn/jZOzYGiDMQeEW18x3LHWM7KxUmfoAYSh9xy7gI95QDOAeR9JntkwvICVnTiiFGpCKl66t8ywTazAMcV6+AXKIGau7qS/m2MuOQoSbZysAM+cCHIfFcVazHXvsbwhTrmSpAHzkaFMDPBw4MZpUeSO395fuHk+zWUvSuqJ/vu9ka46e4BajDk/pDT9KR8lOJ2xMLPAKPQCkeLMntA3bl5G2g8xDkbECLS4IvZLtC0ul57x+iJClFA1fDtHOceSmrJkDVOHL2AiYTullNJtTPaTI9rqPdWVNNqguSfCOWOQrx1u5OsNTGFxcU7hnSuJ3RETTDIbCBNe/dPchetaiHe6ppqPg7ZMiyZS0RMnbPn/EgoCf7VYeeh60ZBnDDs5M2TpwXqEgbSMTd4cZbD1yyoUEzetTkmZQDOrphGGQ1YFsYq5NnAlzCK6FvbKdQOHdje+ZaoNzLO25VHE7v++g96l3bydfmgkfGBgJTMZPMw3vnfvuyN7H5VnM8YnhQwFZ//XmhX8+2btn5zr17yPh0yMPxBlZXVoHhC4fOyMvw+RRvWqe3rV5i+BKbFCs9p8eSWoIOmOQPCpgG0S6s+0KWzqoUHvVKlgZ5+21z2wd8c6TMJ1z3QcrDsEfJnNFvvMkZh28RRl0FDE0sLxcDvePXkvnqxvEAotzU0p5fvbLlErsD0k/ynJioJsMBcMOXYvn1IKlIzrBAMgPtldmGvYv507MY5ljTeoB5Y+Qo482FFDqNcEZIqXkYBilCsBiqb76kBbErXmC+dj6DsynKsGHIAFW+daNO6WE+0u4j/D45McQCegH7iqUNNbk6BzYw8balzOlMXCHNWdw53QXHpKBxzCI9vi04Cq3XGdnECHdOJQgbWUVI5s/FufcXgSu1wm9HttBipI+QKY7+x4FgFsC5A445UGRXY/esyPdey8LBNPz8bIW5/+re6zE00QrxVUw/5DSJ/vcNmr18m+uPsu1pgXNrbC30PDXUhkwcn5xbu6yE0w7KyysJC4hiO6Hqi38By4CmvOa79VjpA7KNkOkGtxrs0q1d1jrvR34HOVU+MsuSTM0ZHbQA4muUiq89AOpHz8khgbfP7Sgb2xVzcPXbS+5NzgcwL/p9/Y06jmq9JjSrTvntuu4uIAmavq7m1z3K78dY3u0H+IzEzo0/uWbfcj1piFE9YVr2ifTbZXOHYbxRFe5E8zTWs6nfh3XW+Kd9JYg7kf/XRsekVh+L5fVukIDjb66MwbMV2ersWydYfQTMRKFfWsOXbFvCBisx8zX2jB2x0at4QinfO82kxonV6cdDirGgkAWYowAUhCoqbul1MTl/C8MWGhAup7kBkcMQoFZ/fY5YVAiuR9KW4T4hsNFdwqD/uZWcxGdv6fMpA2vczTISqXzNxZcbMV2iOQTsti4a8Y5Lt+lqER3mUy+IqXFNmz4trs5oshqW0TFQ+he5hLGaEgVOmEF9lG8AO2BXxG2Qg4HKakw9GGJ7DPmuhc+65Dsib6keCaS1p/ui3Rh20Q3BCbUUvJoUN4VXIp7bFT0URQ7aUzwjnVxnvYPU93VVtjkP4HG1vdKe+sWEnY/EDC/X2bZgIODRgz5NUDgw7JaLlf4/8mdB3UQYnozU+Sxt7IM+TpspInXsQZwa+Viysnz5vpUdXAnthwCc3quTk0zmryacLSoyMRXwibN8V2M18NKTHeWTaZxxaNiiP7ucUQLzGEBkEbkMXtxEDhGRJGb0j7Ew7yiYoouJfYgTLYsrmo33aCbcpfNfYQxhnZkiTvS4R2/MiRjvQ3tDSyU5XC4ogvukYr/6hdlABz399hOGXxrdlQPGz1vNbrU5OYl922Nf0fM9AUHyYw+Iydt1n0pjx237EWtfHDgkktaYk0VlLHsPYyBchQImuSv536LRZ6dCPYD+0CIYT8MbeqFv0+W8kKiAfCOZOzC0KyFLQLtxuYSIauLyIeP73DjJphhS4bF9pmQeQr8YdZnjFaulb4GAevRl5tn+fkHFk2J+dLpd9z4cxYc1z27KFENYspqIWnPglqTFJZSkpi/3IuC3dAEtAE3A3KisTiELlUQrrULV1sYsD1b3LcQp/w8ADdOOwj8caZxBi/b+dZw+9e0j2mwQtmAvice4aRC7tnmYEZLtVH0oGr3/LrkCI4U4hfiUxD4hkPmwNfjD67uIGeHkfVLll34jIKFejAA9O59pj9+Pq0WzQhTO9g+6HZawN5fpfwR4imARoxyLucwzxlcwTABaDkXk8ldF+cwBlbiesSLhNR5uW9DO6UdyQUhhFbPYw1L3OxPG8/3iUU4ffjZujJXMR1bYgrwjy/9zZa5h9XEb1Pg+O57oFrl89b7tRtlyGm3vh01chinGnnUQExhI+uwoUTdx/51y9fwgTuPsNO26OAdDmz+4w1sEKY5snr27Xfc3MiRfTY7rST5ns9JBffRsMkenjj3DAseCCNIuPjAz1DgnL1OWypaPU4S5ya2XDgtlQnjn6gADQ/esZEgDSJk4hClyNUQ881czzhE7p6LwPVrysG8czncHfFCfttgYN9Z7u+i/0KBPtNpWOtmCHg7USoSB3EMs7GTol8/HqtBo5BZKSKwXVc4oQeh0B0/UDbjHesA4RafjVGdu0oxoU8/SIdWGazxQmJrnA7elS0x4RYGyt4W5hFRO85Ky7QYYDqsKnNonT/DznseBwkW3SS5rNdg1DiOzbHV164eIVE0UAmLGu8LPTW6nbRn6z6OcOKtsAGcL3dSJ5X/ADPUQQylncongft7bQ/on5fA083g2QJjd3tghTHyNYYjC8TeojNjlV87++Bsy+/Bf6aqo31T0aabvkB1Y5wB1rfCfO3vcsGBjvZQmEhIs6FJDp9wwFvT+chhMtCUnOrP8OHX+mjDCxhzJR/CeArWoDqOPBsnldql+WfGDf9zI35R/JYKD7oh/MppPO1wtnBz1NVyQWBdiMppNa8orr1DMXERXtiGlS8fcmgmq7JtDdGFUB9hT+s/jhUrME5FGik/nC8MyBxYXmR6cT+L6HLiF53wQmd37oKX3cKGOtdZRzzIA0sUAgx4kCPoGrL2pE9+Hdbu5H0K1W0brUAl/sDcU5xb/Y+K7R6Q1r7Peg0TZyCPkOdV/6wCEA00o0anFtWa2r+tNiA3QT0cuGmJrkORj9hZ6j2Ga7LcVu5cagUKgdSnUEKYI+C5key6rNqj5SUceDEHLd6bju2a6Cgt1+yCAE68SR13SGLtSImIT16spUl/TjDx304L3nyVTG5c4UXOMhJS5LevesmbxKIVAJucS+Wz1fUfwF9Q/LXLwb6Rf9Qzescvf+QOWjeawE+nyCQKx3pMiySF/T8CdytI/bjXae1L55sITSpGJYiATM5r4sT9REvRCFY/8Vpu/k+xS5VGIb8nh/l8LdJSYocBU/j483ToA23XwQuv0Abbr4IXX6ANt18ELr9AG26+CF1+gDbdfBC6/QBtuvghdfoA23XwQuv0Abbr4IXX6ANt18EK8f95/ah/fAuOtiXfABiEjqBf6lvNzJO7dW02Luc0m7CGnk163a0eHn5XhGHn75v493MHmfYpJvupHgawyPvqrwKhMTPCr3AIOpKUEe5QglqGWzNN5Q8Ohn9UUKquv3mk9Zp6qOCMYJwaXq5Kzvhdv/aJdRs9aIPcBkTe7pCfQe7V9Yq+S3HH0T5VuZKfDwhrqWvkUV01a/PNJxwGggcXPEEiWPukobYUvDnyaPkz9iNXeMXFKnWSDTAlwy874//7IOujADx/pH3P+tFwWQm1lD3mYtiSqiQC+jWUhmnYebwhAbXBscen1TWaTF5dnqcMjbkLz5CC0fUWdx27LTiEJzkQEtSCAmNE8Sj0t1pOcWqRtCHaPlb8uYv3IcIOXhPFDZi7K/AiEHKyBif2pHAewp2WCJclQaDHb0/266H/boF53V2cxDCwsRnfgfPy8XYqEk+O53s07QVE8T+i4UKXYOiG/jcQR1OCEOgrJNvU3Eg8hxltV9gRY4dNj1oG9LoL8JRkN9QpbOKPCxI6zRx+4uQ2nBPJMa32mvwB6kWgBQvlYD7R6YVZ9pmyI+oQPeUY0okLbkppTItD6KrtFqeqsyrIjvZ4UUwQGgekFfveMCITeERd+KjOOCFEtfR7z5XpKzwsuu51zdiA6v+Gt3fHZY0kZzxV5skuEsWM3PYMJWbvbnzj5aP+aqZ/YbaDcd2q8wrHOw80BUmbjs+0lPVJi1pF6raaMlDswbvKAQp2Q/16n6w1NuIctbL7bIHk12PteFtiyE0TqRG+5uDKUtIqvSkocmoIB/ezXI8wE1XAittrc0ctOSSStLjVHYD38v4iiRw2DVudyY3mlj8W7w1nAmNNTgrHbRyIDLv3YFRq2Y57Bad2HS0tWmDM9cfLVMN4AfYLIv4Bjz+H7bFvXs/ApjFOWWGidCzWKCds8oRLM4FabPep9x93A4OVtJbEDWA+5MzrPjkNW3zt4LtuW6xS/Z0GYPfxyaP4mW9i1JI3/ch2DkPM44vzUhdYCHHX3q4qVxZdxP94ifoqnnVwdwNDxjkm8NrA6uhHNpNfFTYi3OpMxH767z0bM+ryNQw5G8J9gGXuStX511BZrQLXbBl+dS1PJytCLCR1sPl4LNtPMmkKtSVkn4mYeqKeMKNwdfTTI6K5mS+1j54dZb/fwj4uu4OFKHufpKUezEsGfYS/hxH+8Q2aGHsK310qVhsFmZ9JRVu3sTWahYeQqqLpuw+xeAz0TqY1GIw0DbZKGNGl7tWqVPCJoxOqcj1Tw5RJlGG3xRKDCfwqy7+r3KF0CkAbaKHsQN0oi4v1oSh9iQQIYUeYtGLPg7uPv/m0E1WvaVO2MUSyxaqU05TJFk3O75Xcn/yLkKef0h0of9KAjrP7XWEQ6/6Y9KFpFgBBRPfkIjSY6ekr7aTFnPwexmBiA/hop+8olMJEV3wKFHeSJKVZMM9g9N/zBlFXeeibwfxa1xuqntwPTCL0AGH+RTZvoXKyR/rLiZB6ahYJg3AcqMe/vL0hLW+nqdNV254ihk/drxprgrn3pgywTFsIofA2tY6pBA/f/GIhNZ+jaMTQtt5udjeQdTDLwX+tyfA5bU9Fb93ThvRBb96vZPVDx7gVnpOaFOe76XRS9uuOiiaEOAdlgc35bnxnNNQtsWxVDx3Cn/1/rjXU8Yuk+488YrDRXvmlquu5cOdF48Dfj5bFjFcIHNeQt79I7KqCO3XtN/slGHO5VRooOcA3acYo59kuGYOfS7rqRUDxno/jWfLgAO9oF9fT5DNU6X/sb2KBz3hwLpf1rbYmYZVd1ZG96WPblTxt7A7J8tgA3nMQwGw5Y9gdk+WwAbzmIYDYcsewOyfLYAN5zEMBsOWPYHZPlsAG85iGA2HLHsDsny2ADecxDAbDlj25ZmXi4cFg++wDm/6jUP+/1J4+oHcnvZ02t++WQVOW9EdGeYiSkpxvpYITPGnqARD/G9dqrT9LfAoARbxEukq98MHcszpfZ8ONIwxYQFbfdw86r9n0aLS4PfcmimCmhkpa1NfTJfUJyeusDkzTrmwjrfhH7WhDcBlYzuW6x/L2qIst8IiLg6R0sVRNLkTYy0qc2SaUphJezaBydVldk+imZDIXswJ/nZfN8J0CPlV1OhoB1WLVPE+isE1jb2Am+Q7gUlNH6jeTU9U5MfIRD23rctJWaasPVdnG9MV7onleKolA+PfyqCJgm6FGEWWfg2mB1QsbNGsdCBrnKf1eJoidHI5ceXLnbvRFGuvmHQiwsCx1vUbmkWhQwpYBtgbVyQK9sXwHHeHAS4s/p/Eqy86nXj0c5IX9Rp52cF/gaFzaHU6fxO2pNjkjFrB8DahJ2DOKfB2ntRwExh2xhSWDrZHyuZ29TluKJzOEv6YUKxVvBXBDQLFQQeHZjr0gfad3KsmkYVABQxfZyyx+8X0/rnicYhJxEKG1LNvl7BefeJAe+K5kLWm5QNsQqIn4L48T9ulaGlFmEe+w1jgxIDqTDVidf1kUN7i8pZsVEA1cn3QiJF6ay+qO4QB6RVj1fnAXa+AHi/PZIpqSvsQ+u1HJiFEVC99UldYPTCXjp8VoPppiRuG4GbsYF/yfRl4y/lpoG/3k6iwthzSnvLdKQVRwlrjAAQVZilzpLM5NzI2mkW5NcE/ePo46obN6V56Mx5duJ0wuaD+RIRqbnSWYzszNBCGocZC7+dDBavhqOjU3GObD4v2J8194ifi0cYFSRavlTDpYF4yB9+NfGoGmPgIMwKgQyI6NLlRSpEpe7WcitpMi4elGZzch92q2WSKrGa/B19G1oCXp9CkGLA0gnHio+GCxO7zB25Cs+vwZM1c/s40wFi+KNqO5N+t3C9VLyTh++EnUuXx1kpSE/PYNtPxOLsF+BrX0p4STDfFhpwBBR+lvggxdUSXQ/iOi5mLMFlZktm2DhbXiFVaj3vH6hOpv6yCS0NdkSv2TQWKQzS+aROvt/WPpMdS1GcXmdp9Vtq/B83XWh/sXlZagwOxit5vuBmA5QiDfGYMWvRdw8wQe7IzvKvuVO1T+znDcBjnM37Gpml/PiGT3kzeBWiYlFG3rM/seMe9Dvcl+U2LLo1ZoSvI9lKVBzUhqQmT7nZZQh6FcXb0xbUDjyAx/VUZ3HS6pXn6UGEpKyvXxAj+sK7WHcgT4v2sITjTaEMNWsqBWr4pTHi+JUr7SMmz7bmy6Lfm5W+nMfBwZp5m2044jbx4Nk2i9DQaWj2XOb3nbm2EZYIsMRLFELqij5r77b7BOKMqiQUkSY5rJARrUgD+0CF3M6ve1QmFEYrfb2IAuUZDIpxlhIS9U9uy96FuQXFKV9x3yv+qjVtqoXc3fv4cvtmV/h5ROEByS3lM1KgLFHfsMeu8MOByuus3TUAUjKSqyQnyFwzJQp7BbERizaWHIfv2lFYUh0RlQ+lPbkjWP6QhAEREejX7mNPyFgvhbexppwqiB/JG/9FViZ7yjk0n3allCtgoHO19ppQYDF822RTYxLhMk0Goo5ZZFBIAynIIUSLW9jVbYTHJQ58zV1azDMZGrpSKY7EcwYi50mKQdiaikC4arTsAwhil4zTkFd21CQpkeHH2Uq7i56uIrrpRGuYl///HAR4BjYz8yf1dfJ5QCqZPv2yN5p9uo2Vgv+YNWaAnfqBDfE712XwO9bFoSXcgeFdMF+PzPrRt2wtbLsuaHxmNsE9ziRAtXPkqnRdJVWgbbviekkq1W962yfSAaa+iE2Ny/5kKXJa35QH2csMhAq7wPGCYXuTKIV/s0snESgvVdJa7BlCjQ0+2Shk1I6swuMIq2FiCQY03+TMLA9vQptegCbR4ftOLMa5jbLYjpmCWmoT3wKAv9+0jPTEX03Ua3IlxmPXqJfLiJSCFS5SwA1YOQAc0MgXnkvMbHCUFzx5SJWNKW/GwGIKM6Tbl/bD3HvcLxPeYOjNcVBv6A53EZYQVrzuvi9jHPjYUEpzZ3rD0CC8Wbx2+/9n98Cw3CP7V7JDIgOO4UyjXhpFHrzzvbKdRUa/9rLSFfncWCicde91VK7HAT5HB+QUXyefNCKwgtMR7PUwp5YCExk5PXFDHcfmOZqbuPPXcZoRo5XHi5cR6BUvogcXlsq+jAV6OB7aEU8gQa+4IRXRMPnrHG0rkfSCAQ6TShyf7vmBo3axcSnpxyk+7ic0IISeUg5eF5uEfBhXRZahSAMvlPIExVBLCQ7gIAiYfI+60pW6RfUyXN/hxHrdO4hE3A7q9KQPZmfYvWPZjQL5MWoSYWGk5BRFwHRdji+OdC9H8eo1wp3cSAhV7JwbRzuL2gIxpc8SwpRHQ49t58khopfFXypsxd3p/+eqf0WSIsbXVJcRVfxXDhQFMe6KCl5dvH/guAwbApl+ESYxqEF4puKFPCjKlEnj2tDpLU7Ce/BqwYRnSleL6IIZUP5EaR5nNzSCpnUUwwMNWofYi3CJ2gNzRb/hMJ6jyrdIrs+hyNF19r3f7mA/x7e9vxNGtUu37SUNVD9w4CcOltxINTYvHnlk1t/rk3tHJoLD+nEGpQmGStkEpwHa4DFWoASu46RvmkbSDMae48vf2Xv/wtoV0+3DJae7hdg6W3rG8IIG3tZk+HYTjwcv6aNT8p3fyBnH/55MLq2//KM+vlY5zfhFYT9F9QLXBEWwg+Y8JlYT9F9QLXBEWwg+Y8JlYT9F9QLXBEWwg+Y8JgVVETOSz3xTUfG705U1frb259T4PjxQggwyn+cD2GlNQiObdhViYiczbAK15AmnaGw0kZVK66Tk7jLj6htYjCU1NGDpcQRMhkGaa8aIeWtqMwH/TD/7lNrM+q3RuTDCUeb8TEy3tf+omD+vk1eazsnAvB+51S4hJ2dAtsJzd9h1bQkSkcZ0nJo41Xfg2i+ormuBB9SA2VCvxGpQgRtbDVRCxB11T+78LibWCGpFsMCIr/pyRfVzFHIoZOGW9eGQoRhnNHKWoKLwUhvQStVaU8QkOYEVyjzHX02BhW9zJBzDKuZykuqY5SVx9J8og/uLWOzhknaiWvNFa8LxYc5rXJyj8aPRj/PO8za+NCwYq83W0ypA3rIDKAFCo/6BzMrLuREiyh+PeuzM3L8t5D4BChjFregN1KjxwOX/A5sWPTfUAU8JMThOSBTGH9cngmTeFva7JLqLfb6+CqCNVp/f/7XNaIzWw9T+766QgJNw9sKL/bn1Lg7oETOwarfG8ckaD+z/8MDp5t2k6UM0ITiQjBqvzyKtf+zohJvuvwr/7MnvTL6T+Sw0Ni0jWyxz7DHL8q+/Kqu5B/+Y7mt5uvdIC44XYkI7IxJJCwx0PSjZ8kRcMaa+48sa6Z1ddhlXV1BuA6WHoHBfhbuxbeLwbh2zWFkw7IQktogZ9sSoS6q415x3W2mQaM6rAB5ehfxSA41JzSlGMaFZOnMvKbrTFcM+KweJ9qINgQ+gE3VM/o8zv+dxp2x0THI4p0gYcRfxcxSmQmFQv6kAUImuqxoJnwJt98A3rC9YJFEeRFuhfahQdBcZCdQo1sVEku3vE42iGPCwmWF+staHCnA9JVxCwbkOC6oD0mfwa1BiN9XcNh1SGStGVSm+p9kuwGLOaLlV7dvtpND0mqRmXyfCZSmCmdDIb8W8uKjehydo7CZ1uGAxyz8JndBpvqap9tn97CsqdrBdO59iuBxFAhjY7710ZbfZto5XNB3ZD91tFnEd/8RwL7tRLXmnWVUo1cUXmfjLKDZEixKaZiwK1EREFDaH9YG8lHCnHO7haYgQtgZLOQ4CbjomTS5harewn/SJ9ozCZ28Bn8jJppAjwmgHgqpltuna0p3YLX6wZ0ynilKaVbbFBwoZBbjqrvpwhjubzw7w0zo/vtd84oKJU35J110XLw2BIWJh4dbB6uYAopO/OuXKOh9nONZ4jZfaAb18+WdVh4sniUA6XYCvcrIkGQ79l+nEVFf/whYy98eLxFmBM5lvHRxokOwyc0Gb84WrZy5cVEcymwhBWwdB7XEFTXUBeN8ZjM5oHTU8Bv/Me0M0VbC+FTdRUJt1ZCAkXyCW6Fpmxz3UVTt8OWGqyAVWuMPlntTnaPUPSHyLuUP7f1bmx/YALQUyT4XgiZrd3ReVhyj209eySYefh8uC+3rDDhXUUIY6msqXCuR3RFuMBhk23eOWvC/IbGCcB+5dJDg+GOs6r1xHON7jr5tVcUhsUKoEXStq74bHsed9XEbAyJmkTGgA8D5++ER49XOAl6x9M+Ic22//2U6yvcqso1DwDk7aw5N/9hr3d6ff2EzK+CD1NTyl+AZZvkXkpX8SLkthdr0bBEDcz/RRCj1eRAXrUkFRgnUnEfqYxshmbKrxpssZMdlOsr3KrKNQ8A5O/ICdtcawQ05ADZBapw2gvH92vVT106dVP6k//y/x3is/itusUL82+6TlC+uro/6OxtkqnsOMJj60BCoSIKuPLbgZ+hAldPtjIKUJ3HCWnpgFs9mpmz6q4fQPV2MjewXlrT9NWWycy/Ux5iAAvzWt/tppks1tCNjuIW/D+QGujetHckmfURap0uByqsMi5785KXuAh8SOEYiEIvkQFoIT5OhS+h/oogdvRU2zVFGpsRAcVHHiz6YexBrIq3GnOk1ex2I2Bb7CVr+7g/wgcpEc6c3LB5AC90dlh/afUfF9uQMOcimWUO4aMDammgCxVy6Vi8xm3Ki8iSF313yauiA1dk1dEBq7Jq6IDV2TV0QGrsmrogNXZNXRAauyauiFJw0R1MNjhhQEJMMuOYbJk4NADUvjjYGlcLB1CZX2N6UQcOQiCIfvRiDLXyv0ewo3N8C4uD4KM8XIWK7fdaUMqCIfRa9/4JcQ6ZSglv9HbaQKtpqRWvz4FXiag6365SmZT1hQ02lBZ6UI0fkmY3TDDda/ZdbpDCsy8tSgkOLLTsxtUn4MFVd1PS3u0u6I8l4TclbKWGy1g6dN5gQ9Ie6bS0rMOGGRDS1mbTrpmBoKz4wZSappvF9iVPQ8YMwShRaSM+COZ8rrQhF2x8ROYdTFLmuuD+uZAO6zm3wZSnyDmnRu15B2vMHKSWKi3/wiKNqdPEejKRENKba/Yf1MUVNk7DS2pNCwHNs/RVJq/bBRR3oUdVL5WO4IOlnqoXPxSnD4VjGhNZiJVwcTtDMBp/tv+ExsJ+OsVXCy2vUdvEzTNlK4vasqvszHk4+rIccc0Modltb5brgMtJriuze13FsDL82uL9MncLBv76GumFMoYvYWlv+icWbFKzlpImSvapoFrW/ALUCMPAIXSBUZRydqui7Y7NYZDcDbrp6YEeRm+jhWHLuHcomFSoI6cCTv/MCpDpY94IRGMp0GwfLxewX4scR1PyKa/gLvgNfsnnl7QLNyOoAXRYabATT57gKKRQTyiQmJBNhSiifCEBO/RVG03wZpb/mDQ0XAuRlzerzrQ0+yEsGUKrIzm5HrP5aGYMIuRPL9p9gPQoxxSyEnxM2Um1UQcg+a4hPM6h1bOWLZC4I6orjfRIVfs6K8D6kggy5E64rlzj//EcWS1R9GHP5dDIWEPiXgBVwyR3CiBK2NBRWVuQ2BwWSd/sKfyKYyCf7TRHOAv1rK3w27DSVtFJITvCO7yIMHkciJwCfUWELERt6KB9aeow2I3Wc8lrqcYMEW1tqIYnGUvEDx7GABh91FNDIzJfsTjLSjkQSIeDN0rmBVXSNkDMVP0q4t65gR6xCFZPWsirx+m4Z5S8qT8yao5kZSrxn3dGEqYox3cXtVXmChXtmEptQs9N/D/juCU5z6TZRyzIDQLwbVjkwL9PZZy4LhxUQpWla4gT7E1rXteTa7Ws+8IUdVj1pxmECInY00jcO/TTCu2ckPCTW7Y0kDeOebJYslAWPwakZ8J+4iChAgQAnRleu+IO/GuEpTjAnz5nTfdU7kJTuxcioCCOe2eizK1DFz1gjgKRpgaAdLwbHiZiqFRdJZnpdIeGUYuo8Po2wHuNnAe7R22FCXEsXwCvEsiKdNL1u0xGa/eR6WchR3JkaBlmw9Nl4EsznNpzDZKu3qikJq+K4pObIQ1etStuSsFZ4qrqb8xYiBMn7bLXIFk2QrWPUjSFlgppcoSKt8cpGIQBlOok/MjGbyaAK0+U42HW8zwwwsHaCVJQrbHN/YN9pPfeIpWFpIoTiPWIQrJ0uUcRhsHEjiqhbnldzEvY5RC+Eg0Gw9BVwpPBCkNk0BIVe2NWXzaT3VoGcvUbJNGJx45QfoXw54M8y1biz0IGK+fPuXwCJMHsEM1KvZC1KhpDGNVuFAMYjnMqKs79rShryKDic/Ml8R7AwB/L11/Q7sCzywaa2CNy9AG7jUsNVTk3zWowqX7yg8mlGeY00Smtks5b0z18isxk8e+Y0yYk4gzuMEaq/hKyNe5ErxDHw2gsJK0FgF9ant/eHd5vrjWlsv6qfW+9feEDrtiODBiW1mifQ2GpOQR4PFHUBBj28LwVWwLS8u2retNoAWajdlsgKhBP4LX51SIHnkqJ5K19doOx6E0RlRSLYEqgim5SQhzFCKdxOAWMrZ4HeEAT0+SkEB3UP/t4Nk0iqTo7kzi0wIjYWvM6WkZJAsi98iEWblt+rVODWo8J4a2SXoYNUdw2efdZRop+zjPLaF6QEmlYS0W+2oFsFPTzPgIviYuKwSQ0V58oPBOMOiR51jzkmxuseNPlBsQ/eaTSJt6xTn41UJoUcumWc9yhrGZr++68EEm6b12Lh3PqHN0jR5e5xmYpl7X1RvFAAdD54hLPdbXriZowA+/Idy3ayVJZ5Oo+KjfxEV4nNI0Anaom33Tcj4AnmSvWdzXi0vKYoXz0E3vb+hX8KieRxmpSFk9ByvyXhecfwJ0SnFGv3kfIzPDR4pJ56tiIZcf652IZ0gPryGfIYmNbU3sPnGapGs4AjABuysVK+7zNgRvWhlENdwgUcTfHcstg6KR0pp4sXWBBQzZIKlwkK1LQ6f3rbnHyusUKkinhvGWWq5f7YYzWjtWhIzChMtUQde8+8OtKKHaeMI+MCE0vCApYEHU+snXFUOrss5MTEC224qduGXT3pn8o55u88yb4i5vZcbpjLGkQW+sFzX85Guc6rmn/0azccdg/mWkq0w3mSeANxLmb2u2w/kJq2W+qhCjlj/gPWuiL/dN/JA7XSlWALgeYC3iOtshOAwG6Vd8LCtO3flWVIcfpeHSIrFt7VIQZvf1O1Jp+lddh+BHwGL345t1yl2da8y0d4e7/NNej4wPn1kbl2Kfm4+44L7Cd/myCo3gfvkgQS+MlMy8KcyZgWScuigujjAi34DN0smzNHwVw5Rvtwu1dW1Dku3TASVkcSg//qzKLP6TornVSqIED3sKxoXElAG/miYVltIpqjtP62xYZ7zXkc0xz13HEhYXvsRYoMGWRjwwBqOz095lneVvAYXjzL97zfKZWIcaEDMRI1CzwzphNAbQTbqVeg3V7k22bKetWZVPotUjoQhNtOtpY2ZsbkVc+lvj0bweha9f8cyKru/RndF6nFAWHZC/dqMOfP03y38NFVT/NVJMQtM9eUEqEkfARr2AlfNYnTUb9Hr4Vh6AkDwAd8D6dgth4YN/UrC8CHWTgLcPw6WZIQWXxuCGAcpXcjEwnBzYHlTelNG2z+qrfTt2qinEEWlFbj21/eCcqW1QRxpDqFVOS5XLbQOp0wukXBRQClF4+CAmvqbaLy2wz70D9NUhaRidjWJgKfAt68uwQ5OSky1qXiCNFmeEmfcId5MCBdNUNvkHQX1nZUxZ98sASNWN3PawSFEhjL0TRi3297A7oNeWsvaMYcSOG68dVumubSTNhIC2rDcpwXuk3MBCeUxB/Ycquow/M+pZ/9Zn4wfG6UgPHIz3anvmUOets375rL+h565mtagIrmEkwCw95tqMKWDLLTJooNXzKVlEf2LfghWrdvbrNvV1eCmCKowiOCgngCFFhMOou0L3xM3Bo5lJpBhaMlUYNbrHaC1/AgIb2hjjn2Aza2VjVIprShBfxTqYXSKHoZ5EjCVYEnLrGwM126d7CsOe11i2Mw/4K8SjciZv6HOmS+oqBuIVWL4W6+vsxN2a2ZMu9FrEJgHWguJnyJ242hIDzjbgbauPu3DROTk2RETURO20gr8ST4X30jldyiCUMC12aLnlt6ndLGDsiqY9jiyfN/kohDdrWXCrX4zUPBqWldDQwGu8uOBFNw3eCR2I2IAX+X68+VSfalMfcFEL4MX+O4WgkPmhKSRzongN+RzPgoICJGTNcivHYdvnOG2MQV1F6Dh9jSrpCGvfN99a4mOGNV1fjk/egQdVvh7IRxLMcd6AHCTqKT1W88FS8lvWac/NeNoYrMQ6b+x6mNkOu8gcLUaCfDwLueLZsGj5189CNd6sSiXbkG6WOhPjaDjzt8wN6PTxh+AseFF5Ked7cHBN6PFgA/uwipwwP2OguteMa6LkPgon+BerWD0iiGbQJ4XSkQn3XtPNZ7gmC8moWGPBMYCcxPa1Sg+SJJiFTUHrUz7esRpXCZW9QNeGH5Ue6bWVlhnCgJMMrwlhUbxjZvbOmobcmZm/eqVYo0tquHfy0eKqIX4KCwA74clFVjupmLZRzTCb+ICyJoUZDGJ4RlkZrDtmNsafDGoIEzQVDQlUSg2AIhEzyYBHfpTZVxWgbdZCvQJ0VjaFYGqanBFlJaq2SoGeS62iu7BNFL9SwZIJvsUq8idYGP0VWJwrhIBkCa90yNGg1jjoIvZwI0X61UZo/ysddekMyYxQfSOxtjuSPVj47mSRmHIGEGA36ipeTQ/zGhPpLQ/7nBwJwOQ4ITb7x0rkCyC0VajayhSoXQ3cJi/uhbN8VFA9tLEFYAqwTjBTdw293pYkltfnbwnE4Nu2xwTkulr8fOWmlmv7IdW8vXlrPpbb6c363rXJSk03eKp4cWao6b+ECV6cZrd1TYj5pMqSzV8crlqp5xOe93US7Kcf2dwY6cXoSoguVOugA9Ot0u9keqXqRB9ISp1dF0lhAsziynr54Ho2eLhdGF5Pv7YCm2X8OgZBYJ/zqv5KW3BP0t4h9OzFNaW7vesdQokPeANO2vbRHT8GauV/8pqAX+pHsnN96KfSFppO37KC5eyMRApWMQdMS9XdFpBaFnn0tVGGWlzvfULQGx6e4dp80gNaFHt8lF4eC7rtTD9m/Qp7FUansgbJFpTJcRDmY+w2yF9qCLv+NBCERexrhS9h0MzTT7Wfus/ubUSy6pJMmzc6Sz2jsUhF+hzzEfKqkw/Fy7OnVzSs5IVajt/pwstoSPGqpko1TvGM/Sxux5ua5wGWBvMzuqecdxgSxgKBu9fxzcgGtnwqtARvT85SvLW4z1YcS0H1cUk0XakfV6ZLMBy1yYaencNvSpmOgGyIse7MoN+Bv1KU/LEguXbegM8lSoXbkdQYVbk0HgtVyMcdCfaiSmDScT+2E/awPBcsFuWGbjhbjRVtCKBhxi7kd2bAoKv3JzJZdxvBW1C0K1ObAt1et15LZUq45r1NjH+vbFh4BUto5E7WExArAFOuNFfFUomygKl3pg/qVQ/nbXXH8ZKnXVeYCTNXajx9hKO3hX3MUc8e+qpv6k8mQED2TlVMov91XsvJw9pC/RygVprRd1P8/2GLDpyaSvoVqu8AGaHcd2FauyycmQuBPytKDrZ31fVoz2ibHCsU4uQSQUZyeaarlmim52y69OPdJMXCoDRHLR7bgskyTMr1YloLg6DIJ3pLPDs5cDn2CKg3rA6jFOUGRB325oILVhDGQ+epZuI48EBPwL8YhqqeAIoIAVHA8QkfbS/7GslF23jZBLgHxOOkOZaXnh6l9cL8K4fbZ5VdWdgleKNvGvN9MyxLkrlMo3lUDZ5t7V5PqI5Z1bBoqqoU3Jr8D8PxaZu27rw7h10ypOxGdfmavNXENgu0w971Bct/0qkwv1C5QmL1FZBUZ7qx7B1vq9ZBeaXvr1st08Kdu13jFllu/b+IprBBXYCvpseAMO22sS/8G/GwUBGllV9u1MRibUKlrTJnzVbCcewTad5j4hblH+1SFvGn+BtbbBJf5GOwiE2BJxgl3jOAzMAUcJz716v4ufJmUXzVOiua/8U3bQYLyirhpt+kyr0m9uWt+Ugr/UlTiT2dlxvlYE0pwCSG2iszKA9nhG7XYfGTQ9Nn4q7hxSdzNtOjC20xqxEBvOQ3s3uQjejmhu7990Q87vIP0T+UJdY3WjNCDqubQdOEq2EcJZ3RKNiEEwTaMY38lLPnBhYb1GRgCOaKmF4cXlKda2L7KDLLOtoN1xi3z4UvzGyHbTKlLpbsFsRVysA0IcH8m4fLlgHr+kAh4YpNpLOR5ayLtPcF3OZB95yEclkSfssJYOsRaIduRcU4gDTmdOAtkeHFxMOjzcVbnuDSylcqo5YJ9m/imXl7bze8hPBg/bifg4FfbOe2XDMlHFA4GnLliaPW5CygNXZa0cx3BArVAPLmhDNHUmEPfKJNJBmDK0SLUFvbIf16j7CANZRsgPSQDXq1fuR4ps61ti6C1B40nfr8LsjOa+MTyXD9Q3fGunaz1TSQjCkadteg1o9YDNKOvXVFk+MlePonv/OQWUhmBc7aGw5G8L29Vkge7DEesg22/jXF9QimGfwYaXxf5licRsHvgRujWLVVbsTHkDjwWxR6BLWdwgZ4+StVlw+JpDBxyy6VYaIiu+zvcDZKs270t1hxCsKR2SRkBo3MBsOP0L22CFDer0wOZZR0Yd3kdS2fMkVpepkuag5bZCdSVTIRzpmyzr3iepsIb5Xsg1X5nG35c1ibs6PDYgguPq9NUpBVHqEFqWGphtNlhU2wwzgYW6b+cozzyAOPfpn4OKuPefve6UgPd2wts5GFec5/LeB4Y5zYcdylQKBOIycn0cDsu7+WgIoUEbn9IG1q9Flz5xc0KaPNLELoZYUeqStG50NdtlGykKtBNy2N2uNZUe5hpno3fjr4mB+d3Qvj5J6dut84KBud67a18xj+bwE+0k0rRBB/P3bzL2ZFvRDvANj8cwF45AyBEZ8GWCp3Pt8BKJeqdI6kK6T6YrobEpDQ31ZhOAQsREJGqFqNFzPFFq7n5ufomts1oGytfzGEfIDwOl+TwOokZrpmhSGrmAMe1qxf/16NbRe+WrY+wgVzkE60Wv/8/2ZUmdcS/YPC9mqZu7d91EmC5lHACjcQRZZwl7ewW906xqOtxf1jOBlfJ/VCppeHlCFc+HN5jDshg9XQTeyEu7fdtc8og5nURqsNqVOxWY6GBqj9EQCC9XPrFQaGpuyvK809P2Ex8Rk32+PbJH7S49QeUpYIID/aABU8e5u350cpxx+GnbPaKTbo1gLmPB7NfgUX8weFvZZPl6KI0a6mcB669XPc4yDzDxLjPHD8avOjSSbK/J3vrdmv7PhmPTvBVr6NrFZ5aeUlTnEsrDIbAGXE2ZiGOXoSvKIfVo0+Y2Dkq2USp4RxEu8CEEBnEomO3SwHN2yvZA2wMuaRvRhgzqND68wFHEpTnZXy3zGc9bkH/DNw4f96Q28PNtJKyl/ToF7gFAasHrbz7ffeFUk9/MlPzaS5kn5cPvBCslcIGGOTg2yhPd3HFHK7hNmfnae787Kss69BXEU68IvJJhRO6dEWS67KdafmslUUbPJw5E81P8p+0dUB5r9tWFIehIwoTjhQfndbe6T6JTEuMdRPCdIayxPVhnsx93ZI5fOxqmfvgCjlM0azP7dY/4kxMWlg+THJcIlmuAxM5yoSQt6ojmYHDvBkCk9MaQ3dWWZHDR+xGKJqnkimBEQQSzsG6qGaZUvE71oDC6gk2XgB73ZkyF7aveXREvyY+vHf0DXUpTW00E2uewKvnRAqJFnDZUfM44HAlb2ZG2j4u6aQXn3yQ/RcgGPwycYtdSppMFFpan7975mvs4oXK+ke5oEZMg+J53kP9jtVY47a2FlpHHIPoHpDnSwvn4ra/HXaLzc2t56qtNE84axA7YYlQtob9npznnJ0fuJyMxMcimMCARU2BpP7m6Odttl915/y6X0EFDkiTTSl9DIJvIyGOJEBWKmDcPHK6L9MWbqx6WFu/arsVlLA3YDDRVNYFMHWWhHxseDX5frmok1rSb6VydWeBNIQuUAK6OyPc4LaN95JGafTckeoTsPMp+nE59TqJt6fOMQF5lvDu7ob5xKjZZGVA8OrVchyNUUyF2Dn+B5WgFactI4oZeJeDrG4Ln9agCHhGBVvKSV53LIF8YLLL4RXBW7dEaSEabbRzd61ISPtUAYdAATaJCI1ivvfgtWldEH5vOFlmmKS12MTE3KpdfK42PyZwGwBYW1D0gMt/1hsXwWYhCKBGCv0QFOW/t4U0Cx5BpdfdaTPfkP7uJ8b4CDW0VKWXzau58wp/fHmfaNWljjfV2LoSIdU+iiJWxV7hRlvaZYVqfvDV36MQhCjTJ54XBwRwj2emad9ONnJ5crcn5zkzc4g+QmKh3IQERDKjlPu1/Uc8r4bzlQ+AlBG9R1z5S1QyAj82kNdbJeRNsMTIcb18Lw21CilYN9hdZ5TKfGHZ1WQkysRBdq56/kvzpIBDb6mReU6e46oEboChF9FortpJj1/W9tJv8L82JXsUmmNUUkf2YcDpYPQ7BYyov2Yg8qBSTcQffMvT9U2JlSkW6FyH7XV9HqQWS6rgK1Lh9kgbkBSVaoPTeM9QMEldXyefV2cdR0x+YecoBppYk7xzVIZL4FnrqlNYDkqo9ZyU7IMIy6kdANN7Qm8j55+NRm87VZtlklFo/dswNWRvwHWdkI27TEVpdxBOucs4H72TMyGDdVWI37tns5Oz3pTJmNrKvJ0J3QS+W5rAE/7KbVz1r091KYYSV47XeTlKfqffvB45Z6f24p1pkP0dc2hLpB1u+Dk309NJ2MtQVu+Y8gG5lwtwVMq9WyrnClLzMzgRmpk0t1jZFUtzQa5Xe9Xi9mj7d8SZMVpxkdbpJsoK1K4JzxEIm/sAhBS857GYD76zcEmPtIHvvlvKsRV6Z2TNeK+/oDBl/a6eqPo0r7u6DA6JS0TWa2+fbfDxpBJ/L3mVyUMBB6M11EuLOAm3nSClN7WapBSB9d2ZcaO17qkFIH13Zlxo7XuqQUgfXdmXGjte6pBSB9d2ZcaO17qkFIH13Zlxo7XuqQUgfXdmXGjte6pBSB9d2ZcaO17qkFIH13Zlxo7XuqQUgfXdmXGjte6pBSB9d2ZcaO17qkFIH13Zlxo7XuqQUgfXdmXGjte6pBSB9d2ZcaO17qkFIH13Zlxo7XuqQUgfXdmWf61n/F+Fgb6tydVT1VqDU6p8v7TeWEk4j0dtdjwCMaLLwvT9lsVpwEZcXFKn6s2iE5PMLw0izmiJdSN4K6GlzJdl92EApCmhJUkgUw3asX5rblltqlrCiCInR8rph8bvd4Yd6umr8vtG18O01+ytuWJz3BwZ4HN2cFFoVIrbFvC9LGR3cnncBA9lbW/U3CLThq+v2W1HGODsRDsreI+vcCKxnLlk3XFjisz0j+AazXHHbOfnzZwCpg8+bY9Rr8Zc7pENHPpH4wc2edd/3rXdUrh0I+TK05O1sR/jwa93zCHL5BbSh5re0HY20aH70+M9QpRny2UZpCKVsDOXk4uYGV1XvLfqn3NCoslLRq81prApUOMpZ+x7b1ckFqp/6cImw4kuhhmEQuD6Az2ShKHVNXZFAyywOV8Pzi+EkajiFOJscJqRx31TnvuZuUqVwqTNQHQy2sR6+CmNs1++mCv/iYSKI4nmvuRZda6t2GnEmSYQXZauxeCH5JiA/XPHk8eisQMKohivOm/IezDUOm2ZWkz+ioyg8kVWSTqnAdZtaeCx+ql+uOomjlgi0WS4DrE/ElXMc/6frRqkLsWvC24F094jttMbICM1zlo2AXpCyqgKEAY8zc/UXxpJrOr5AVKATdUz+j4GPwd7oix+8CbgrfeyMuG22C8cB6xl/nXXr0s43/cF2M0D4jJyva1pU/xwcaOtDLLFfhkt/sgcpT+DM5HGdGkxbrn1JqSh5aGIsdmyHArSPsexmFATBlaDUu5Gd+LUnGiC2upKY1rtJRuNoacMLyQ3zwebiEpqVRlc2vs+exc/PEGkVf6b/Q/U0Sz8T2qf3AvRXFUud3aINTwCOB57hyELhN6PjeDWjHYcCNBuSL8chVE/lRhATr95/Y1+RpmU92ce/UnIxteBOt0eBgZXXRBm9TW4AjfOOkPhB4aBGlbmkDzhAzG+R7LoIbp1XB5En2xUNYDwRPcrFoTH1hrCjcWBdtmQKwEaCRUFpvG0i1ZeuOqWIuhRxiKHZxVxn6SAaVzVruODyRZOzVnaLKZuh/z8v/ae3sug1TiA5PaW2H2YFMk0lH+6KqSCBNb7aP2nl0BBSkDPKM0nzFAee5G88OZFc9Jg8yiARD2kgYEsQhct3G4ml0RkTqb9K8dhr4XeFsyc3OhgVfvdXrHqo3tx5byR7b5t36Zgjy9xbNZQR2nWXXv+pb5zMyIgu+P/palyXLICvwHMawSEnmB06Xkewuyo9V/PCDBIJchDag1PJ9m8U1p1DSI1c+5gNlvSUwaax1RNgnuOts2bvFjnZBilzsT9lyeX1WL2ijr4zgh6CaV2OvfkQ7qOnNt8l+mLFZwwT43jOV6IGiVkJ8ges6JiRLIEmYcjQEwZS3WtNqgxCYZ0Wpre2kFfzrRe5aCb04e8nil+Z0pqrLLiyLsbdYUw0aRbMPd+i8Ul6sZR4VwchFwtkT+XrB7UWSAcGIklVSPQNXA0jG9O1Y+UQaklnQXgfjloSyW6Ph1CyyHHgSfmY0VjULFBcfNP+GmOmoPZsuhdo8IrgnLOr3sJpt9loClA3tRmrRL1xVs0PAdbXvwBv4x+iR1Kkshf5l4pTXNOZujBDgd/V5/A/SeKVgwdkFAevqBC7HWyQoZRiQI5UxHa4qKM1LG/juOa4iLS9F2T7BC59rErQoelSZ9alPvSRqni0rV4DrPpaAiVaSNjlUD9wROEaChhUJA6e22t2xzpMly6BBk+DH7WHgtULO8DFwYMcnattK4vX6U6+9nBg5JFyvrTbGLpQnZ/4hTFTYQbXYAjdtUS2AhMBI8Hc7HD1H+Hoyt4C+rjBm6cU2hyNaj0QvOP9nRzY8nKrfHgbc35Y8cksmsFhM1gyXwmm66W5aNF8iKtadJ71j5VTAgepZeC1ajh4PpIVaZtjGN5GnLARjgM4qk1PQyuwpcewTu3E7LE7VyQ2Y1ftuBZXeUdVp0C0R3N37F8N1H4aqrL6MvkqY3cmI3f6eWX1jTOGsbLK0hstJKKU18E3c6taNVZWnDKwDiEUVzb0VgfwM9S1uVNATfFz7nlrFFgkt0hPELQDph22lg0xAclL0WthkVZL7M9rInvVff5jkiXvjtP6Puomxp8AZfPwLVy3azYeWAMxL6FmndoSGAL4dquZPpoEHwyfmDM+fRbApvAkyniKhfEomyx5yBWamUgioqQK+vEFo1nU084i09nduj4di2vhMniPTn93UTCCIWLZ/5OcOhdo5gzkOa2U0doXJduO7ikg5i/FVftsK2wTT85KIj6mVf5DzUTMM8q7IeiEzlQrkMhceYxojWiHjcmRpw1vDlrv/bU3PbbiQsW8jpGTKmsqiT02nlV2/6To2/T89IlBeK78cCL1NC2j3cXTsyBOsm61vBo/NtwxIc4zqnWdUzeQM1K91dNA2/+/pWifd0tFjYRuxQ2zcfbX+GWFL1S7kq8DAwY0wzPbQJrPouMoV5qWQPWINnC0OmqUfGGl9olgZcTI6vhWvK5IcmEpuz3BWMwRA4c+nfUZ0kgMlbizws1UMYJ3jKjkiPk/caa7av4aoAl9tuOJqOkVD9PX1fg7NZHXzOMSGxvN74Yr9pwhG8VHh+OH8zkyycdWBtJLP5BcdrQyA7LYtXT4ylNhcD6RK8qmi+y7h329dO7PV/7eupATKVupLbNz42/Z3KUtqlT0zxa0JIf/30iJrn+UenWhBSRgI6Qyp2+/DG9K2HroLKIAy+DYKpmE7n/HRfHaNKPljw99g8inwDeLa1KIy4EQrt5Am+XSek8AwMr4wIBqx0aD7r0ljIZFyc26Y7GubgigZApv+hbnPCUY4stTzlshoevAJy5FZwuwxuP1rDDMkVio8axlDW0r+Hp+4qsZ7JynS188xkT5Q5eVJ6yjqW6jowqRhGIjcAOvFFB/izFJsFJTZAHFa+Fml7z6fg7+DU69EUcvNovxFyxVEbxCk6fokdqG0WJpB5dJrPxAAAA==)

## Assistant:

> 9/30/2026 12:48:23

> Tracing whether an existing migration file has a valid revision.
>
> - Tracing whether an existing migration file has a valid revision.
> - **Done**

That error is what I hoped to see. `alembic_version` doesn't exist, so Alembic has never applied anything to this database, and there's nothing to `DROP` or reset.

It also explains the earlier error. "Target database is not up to date" means your `migrations/versions/` folder now contains a migration that the database hasn't applied yet. `alembic revision --autogenerate` refuses to run in that state. You don't need to generate another migration. Apply the one that's there.

**Confirm the database is empty**
The first query's error stopped the second one from running. Delete line 1 in the editor, leaving only the `pg_tables` query, and click **Run**. It should return no rows, or only unrelated tables. (Ignore the "Fix with AI" button. The error is expected.)

**Check the migration file, then apply it**
From `MEDISCAN/`:
```bash
ls migrations/versions
alembic heads
```
- If `alembic heads` prints `0001 (head)`, the file is valid, so just run:
  ```bash
  alembic upgrade head
  alembic check
  ```
  You should see `Running upgrade -> 0001, initial schema`, then `No new upgrade operations detected.`
- If it errors, or lists a file other than `..._0001_initial_schema.py`, paste the `ls` and `alembic heads` output and I'll fix it. The usual cause is a duplicate or stale copy of the migration in that folder.

## User:

> 9/30/2026 12:49:29

![1790768960054_image.png](data:image/webp;base64,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)

## Assistant:

> 9/30/2026 12:49:31

"No result" means the query returned no rows, so `public` has no tables and Neon is clean. You don't need to drop anything.

Now run the migration from `MEDISCAN/`:

```bash
ls migrations/versions
alembic heads
```

If `alembic heads` prints `0001 (head)`, apply it:

```bash
alembic upgrade head
alembic check
```

You should see `Running upgrade -> 0001, initial schema`, then `No new upgrade operations detected.` After that, rerun the same `SELECT ... pg_tables` query in the SQL editor. It should now list `users`, `patients`, `scans`, `findings`, `refresh_tokens`, `audit_logs` and `alembic_version`.

If `alembic heads` errors, or the `ls` shows a file other than `..._0001_initial_schema.py`, paste both outputs and I'll fix it. The usual cause is a truncated or duplicate migration file.

## User:

> 9/30/2026 12:54:17

[{
  "tablename": "alembic_version"
}, {
  "tablename": "users"
}, {
  "tablename": "audit_logs"
}, {
  "tablename": "patients"
}, {
  "tablename": "refresh_tokens"
}, {
  "tablename": "scans"
}, {
  "tablename": "findings"
}]

## Assistant:

> 9/30/2026 12:54:22

> Setting up database tables and preparing authentication configuration.
>
> - Setting up database tables and preparing authentication configuration.
> - **Done**

All seven tables are in Neon: your six plus `alembic_version`. Step 2 is done, and the database schema matches the models.

Run `alembic check` once from `MEDISCAN/`. It should print `No new upgrade operations detected.` Commit `migrations/versions/` to git, since that file is now the source of truth for your schema. Every future schema change gets its own new migration, so don't edit `0001`.

Two decisions shape how I build step 3 (auth).

## User:

> 9/30/2026 12:56:24

Q: Who can create user accounts?
A: Self-registration, but an admin must approve each account

Q: How should the refresh token reach the client?
A: Not sure, pick for me

## Assistant:

> 9/30/2026 12:59:36

> Verifying token-rotation locking with a real Postgres migration test
>
> - Writing endpoint routes and setting up authentication tests.
> - Implementing account approval and token refresh logic
> - Write step 3 (auth) code and tests, run the suite
> - Testing schema migrations against a live database.
> - Verifying token-rotation locking with a real Postgres migration test
> - Generate/verify migration 0002 on Postgres and smoke test auth end to end
> - Presenting file(s)...
> - **Done**

Step 3 is built and tested. All 32 tests pass. I also ran the full flow against a real PostgreSQL instance: login, refresh, replay detection, registration, and the admin listing. It hasn't run against your Neon database yet.

**Where the files go** (in `MEDISCAN/`)

| File | Destination |
|---|---|
| `security.py`, `deps.py`, `errors.py`, `config.py` | `backend/core/` (`config.py` overwrites yours) |
| `auth_service.py` | `backend/services/` |
| `auth.py` (schemas) | `backend/schemas/` (new folder, add an empty `__init__.py`) |
| `auth.py`, `admin.py` (routers) | `backend/routers/` |
| `create_admin.py` | `backend/scripts/` (new folder, add an empty `__init__.py`) |
| `user.py` | `backend/models/` (overwrites yours) |
| `main.py` | `backend/` (overwrites yours) |
| `20260930_0002_add_user_approval.py` | `migrations/versions/` |
| `conftest.py`, `test_auth.py` | `tests/` (`conftest.py` overwrites yours) |
| `requirements.txt` | project root |

**Run it**
```bash
pip install -r requirements.txt          # adds email-validator
alembic upgrade head                     # applies 0002 (adds is_approved)
python -m backend.scripts.create_admin --email you@example.com --name "Your Name"
uvicorn backend.main:app --reload --port 7860
pytest
```
If your `0001` migration file has a different date in its filename, that's fine. Alembic goes by revision IDs, and `0002` points at `0001`. Open `http://127.0.0.1:7860/docs`. Log in with `POST /auth/login`, then use the **Authorize** button to paste the `access_token`.

**Endpoints**
- `POST /auth/register` always returns 202 with the same message, even for an existing email, so it can't be used to discover which accounts exist. The new account is pending.
- `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout` and `GET /auth/me`.
- `GET /admin/users?status=pending|all`, plus `POST /admin/users/{id}/approve`, `/deactivate` and `/activate`. These are admin-only.

**Security behavior**
- **Password errors:** a wrong password and an unknown email return the same 401 with the same timing. Account status (pending or disabled) is only revealed after the password was correct.
- **Refresh tokens rotate on every use.** Replaying an old one revokes the whole token family, so a stolen token is cut off at its next use. The database stores only the SHA-256 hash.
- **Deactivation takes effect immediately.** The user is re-checked in the database on every request, and their refresh tokens are revoked.
- **Auth events are audited:** registrations, logins and failed logins, reuse detection, and admin actions.
- **Self-registration can't create an admin.** Only the `create_admin` script can.

**Frontend notes**
- The refresh token lives in the JSON body. Advise your frontend to keep it in memory or `sessionStorage` rather than `localStorage`. Refresh the access token shortly before `expires_in` runs out.
- Behind Hugging Face's proxy, `request.client.host` in the audit log will be the proxy's address. We can read `X-Forwarded-For` once you deploy.

**Not built yet:** rate limiting on `/auth/login` and `/auth/register`. Nothing currently slows password guessing beyond bcrypt's cost, so I'd add per-IP limits (for example with slowapi) before any real deployment.

**Step 4, mock inference service and `POST /predict`:** an `InferenceService` interface, a mock implementation returning the exact response schema (including `heatmap_base64: null` for TB), and upload validation with a size limit, magic-byte checks and image decoding. One decision affects it: should `/predict` require a `patient_id` and save the scan and findings to the database, or should it be a stateless "analyze this image" call that saves nothing? Saving fits your `scans`/`findings` tables. Stateless is simpler for early frontend testing. I'd recommend supporting both, with `patient_id` optional.

> File: [/mnt/user-data/outputs/mediscan-backend/migrations/versions/20260930_0002_add_user_approval.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fmigrations%2Fversions%2F20260930_0002_add_user_approval.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/core/security.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Fcore%2Fsecurity.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/core/deps.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Fcore%2Fdeps.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/core/errors.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Fcore%2Ferrors.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/core/config.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Fcore%2Fconfig.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/services/auth_service.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Fservices%2Fauth_service.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/schemas/auth.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Fschemas%2Fauth.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/routers/auth.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Frouters%2Fauth.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/routers/admin.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Frouters%2Fadmin.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/scripts/create_admin.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Fscripts%2Fcreate_admin.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/models/user.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Fmodels%2Fuser.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/main.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Fmain.py)

> File: [/mnt/user-data/outputs/mediscan-backend/tests/conftest.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Ftests%2Fconftest.py)

> File: [/mnt/user-data/outputs/mediscan-backend/tests/test_auth.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Ftests%2Ftest_auth.py)

> File: [/mnt/user-data/outputs/mediscan-backend/requirements.txt](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Frequirements.txt)

## User:

> 9/30/2026 13:00:24

i have to commit the changes done first can you provide commits for each change made so i can commit it to git ?

## Assistant:

> 9/30/2026 13:00:56

> Separating authentication logic from app entrypoint wiring.
>
> - Separating authentication logic from app entrypoint wiring.
> - **Done**

Because you're holding the final versions of `config.py`, `user.py`, `main.py` and `conftest.py`, I've grouped the changes into four commits. Each one leaves the repo consistent. Run everything from `MEDISCAN/`.

**Before the first commit**

Your virtualenv is at `backend/venv`, and the `.gitignore` I gave you only ignores `.venv/`. Fix that first, or you'll commit thousands of library files:

```bash
printf '.env\n__pycache__/\n*.pyc\nvenv/\n.venv/\n.pytest_cache/\n' > .gitignore
git init        # skip if the repo already exists
git status      # confirm no venv/ or .env appears in the list
git check-ignore -v .env    # should print a matching .gitignore rule
```

If `.env` ever shows up as tracked, run `git rm --cached .env`. If it was already committed anywhere, change your Neon password and `JWT_SECRET_KEY`.

**Commit 1: project scaffolding and configuration**
```bash
git add .gitignore .env.example requirements.txt requirements-ml.txt pytest.ini
git add backend/core/config.py backend/core/database.py tests/test_config.py
git add $(find backend tests -name '__init__.py')
git diff --cached --stat
git commit -m "chore: scaffold FastAPI backend with settings and async DB session" \
  -m "pydantic-settings config that normalises Neon URLs for asyncpg (SSL, pooler)." \
  -m "Async SQLModel engine and per-request session dependency. Split requirements so PyTorch is only installed for the torch inference backend."
```
`config.py` already contains the `bcrypt_rounds` setting used later. It's harmless here.

**Commit 2: database schema and migrations**
```bash
git add backend/models/ alembic.ini migrations/ tests/test_models.py
git diff --cached --stat
git commit -m "feat(db): add SQLModel schemas and async Alembic migrations" \
  -m "Tables: users, patients (pseudonymous), scans, findings, refresh_tokens, audit_logs. Images and heatmaps are stored as object-storage keys, never as blobs." \
  -m "0001 creates the initial schema. 0002 adds users.is_approved for the admin-approval flow."
```
`user.py` already includes `is_approved`, so both migrations go in this commit to keep the models and migrations in sync.

**Commit 3: authentication logic**
```bash
git add backend/core/security.py backend/core/deps.py backend/core/errors.py
git add backend/schemas/auth.py backend/services/auth_service.py
git add backend/routers/auth.py backend/routers/admin.py backend/scripts/create_admin.py
git diff --cached --stat
git commit -m "feat(auth): bcrypt passwords, JWT access tokens, rotating refresh tokens" \
  -m "Self-registration creates pending accounts that an admin must approve." \
  -m "Refresh tokens are stored as SHA-256 hashes, rotate on every use, and reuse revokes the whole token family. Login does not reveal whether an account exists. Auth and admin actions are written to the audit log." \
  -m "Adds a create_admin script to seed the first admin."
```

**Commit 4: app wiring and integration tests**
```bash
git add backend/main.py tests/conftest.py tests/test_health.py tests/test_auth.py
git diff --cached --stat
git commit -m "feat(api): wire auth and admin routers, health checks, auth tests" \
  -m "Adds an AuthError handler that sets WWW-Authenticate on 401s, plus liveness and readiness endpoints." \
  -m "Integration tests cover registration, approval, login, refresh reuse detection, logout, and role checks."
```

**Check before you push**
```bash
pytest -q          # expect 32 passed
git log --oneline  # should show the 4 commits
git status         # should be clean
```

If `git diff --cached --stat` ever shows files you don't expect, run `git restore --staged <path>` and check them before committing. You can then push with `git remote add origin <url>` and `git push -u origin main`, using your own branch name.

## User:

> 9/30/2026 13:03:45

i'll add the new files first before making the commits

## Assistant:

> 9/30/2026 13:03:49

Good idea. Once all the new files are in place, this quick check catches anything missing before you commit.

**1. Check the layout**
```bash
cd /home/vincent/Documents/MEDISCAN
find backend migrations tests -name '*.py' -not -path '*/venv/*' | sort
```
You should see all of these:
- `backend/core/`: `config.py`, `database.py`, `deps.py`, `errors.py`, `security.py`
- `backend/models/`: `__init__.py`, `audit.py`, `base.py`, `patient.py`, `scan.py`, `token.py`, `user.py`
- `backend/routers/`: `__init__.py`, `admin.py`, `auth.py`
- `backend/schemas/`: `__init__.py`, `auth.py`
- `backend/scripts/`: `__init__.py`, `create_admin.py`
- `backend/services/`: `__init__.py`, `auth_service.py`
- `migrations/`: `env.py`, `script.py.mako`, `versions/..._0001_...py` and `versions/..._0002_...py`
- `tests/`: `conftest.py`, `test_auth.py`, `test_config.py`, `test_health.py`, `test_models.py`

The `__init__.py` files in `schemas/` and `scripts/` are easy to miss. If a folder lacks one, create it with `touch backend/schemas/__init__.py`.

**2. Confirm the code runs**
```bash
pip install -r requirements.txt
alembic upgrade head      # should apply 0002
alembic check             # should print "No new upgrade operations detected."
pytest -q                 # should print 32 passed
```
If you're missing `0001` or `0002`, `alembic upgrade head` will complain. Regenerate `0002` on your machine if needed. Your Neon database already has `0001` applied.

**3. Then commit**
Follow the four commits from my last message, and run `git status` first to confirm no `venv/` or `.env` is staged.

If `pytest` or `alembic` fails after you copy the files, paste the error and I'll fix it.

## User:

> 9/30/2026 14:27:08

alembic check 
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Will assume transactional DDL.
INFO  [alembic.runtime.plugins] setting up autogenerate plugin alembic.autogenerate.schemas
INFO  [alembic.runtime.plugins] setting up autogenerate plugin alembic.autogenerate.tables
INFO  [alembic.runtime.plugins] setting up autogenerate plugin alembic.autogenerate.types
INFO  [alembic.runtime.plugins] setting up autogenerate plugin alembic.autogenerate.constraints
INFO  [alembic.runtime.plugins] setting up autogenerate plugin alembic.autogenerate.defaults
INFO  [alembic.runtime.plugins] setting up autogenerate plugin alembic.autogenerate.comments
INFO  [alembic.autogenerate.compare.tables] Detected added column 'users.is_approved'
ERROR [alembic.util.messaging] New upgrade operations detected:[('add_column', None, 'users', Column('is_approved', Boolean(),table=<users>, nullable=False, default=ScalarElementColumnDefault(False)))]
  FAILED: New upgrade operations detected: [('add_column', None,
  'users', Column('is_approved', Boolean(), table=<users>,
  nullable=False, default=ScalarElementColumnDefault(False)))]

## Assistant:

> 9/30/2026 14:27:12

> Diagnosing a missing migration on the database.
>
> - Diagnosing a missing migration on the database.
> - **Done**

This isn't an error in your code. Your `user.py` model has the `is_approved` column, but Neon doesn't yet, because migration `0002` hasn't been applied. `alembic check` compares the models against the live database, so it correctly flagged the difference.

**Fix: apply the migration**
```bash
alembic current     # likely shows 0001
alembic heads       # should show 0002 (head)
alembic upgrade head
alembic check
```
`upgrade head` should print `Running upgrade 0001 -> 0002, add user approval`, and `alembic check` should then print `No new upgrade operations detected.`

**If `alembic heads` shows `0001` instead of `0002`**
The `0002` file isn't in `migrations/versions/` yet, so copy it there. The file is `20260930_0002_add_user_approval.py`. Then run `alembic heads` again. Don't run `alembic revision --autogenerate` to make a new one, because that would create a duplicate migration of the same change.

**If `upgrade head` errors instead**
Paste the output with any password removed. The most likely cause is a `down_revision` mismatch, which happens if your `0001` file has a different revision ID than `0001`.

## User:

> 9/30/2026 18:18:15

there were no errors       but these files appeared in git status

## Assistant:

> 9/30/2026 18:18:21

> Sorting out unexpected files showing up in git status.
>
> - Sorting out unexpected files showing up in git status.
> - **Done**

I can't see the file list; only the text of your message came through. Paste the output of this and I'll sort it into the right commits:

```bash
git status --short
```

**Files that should appear** (all the work from steps 1 to 3):
- `.gitignore`, `.env.example`, `requirements.txt`, `requirements-ml.txt`, `pytest.ini`, `alembic.ini`
- `backend/` (`core`, `models`, `routers`, `schemas`, `scripts`, `services`, `main.py`)
- `migrations/`
- `tests/`

**Files that should not appear**
- `.env` holds your Neon password and JWT secret. If it's listed, don't commit it.
- `venv/` or `backend/venv/`. If you see either, your `.gitignore` is missing the `venv/` line.
- `__pycache__/`, `*.pyc` and `.pytest_cache/`.
- Anything from `anaconda3` or other paths outside the project.

**Quick fix if any of those appear**
```bash
printf '.env\n__pycache__/\n*.pyc\nvenv/\n.venv/\n.pytest_cache/\n' > .gitignore
git status --short
```
If `.env` or `venv/` still show up after that, they were staged or tracked earlier, so unstage them with `git rm -r --cached venv backend/venv .env` (this only removes them from git, not from disk). Then check `git status --short` again. If `.env` was ever committed before, change your Neon password and `JWT_SECRET_KEY`.

Also tell me whether this repo was already initialized (`git log` shows existing commits) or is brand new.

## User:

> 9/30/2026 18:18:23

git status
On branch backend
Your branch is up to date with 'origin/backend'.

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
        modified:   .gitignore

Untracked files:
  (use "git add <file>..." to include in what will be committed)
        backend/Dockerfile
        backend/core/config.py
        backend/core/database.py
        backend/env.example
        backend/requirements-ml.txt
        backend/requirements.txt
        backend/routers/inference.py
        backend/routers/scans.py
        backend/services/inference_service.py
        eval_metrics_pneumonia_final.json
        files (8).zip
        model_card_pneumonia_final.md
        model_training/
        models/
        pytest.ini
        requirements.txt
        segmentation_findings.md
        tests/test_config.py
        train dataset ISNetPneumoniaDatasetUpdatedWork.md

no changes added to commit (use "git add" and/or "git commit -a")

## Assistant:

> 9/30/2026 18:18:49

> Drafting diagnostic commands to verify tracked versus ignored files.
>
> - Drafting diagnostic commands to verify tracked versus ignored files.
> - **Done**

Your status output shows two things, and one is a problem.

**1. Files that shouldn't go in these commits**

The rest of the list looks like your earlier ML and deployment work, not the backend work from steps 1 to 3:
- `files (8).zip` is a download, so don't commit it.
- `models/` probably holds model weights, which shouldn't go into git. Use Git LFS or the Hugging Face Hub.
- `model_training/`, `eval_metrics_pneumonia_final.json`, `model_card_pneumonia_final.md`, `segmentation_findings.md` and `train dataset ISNet...md` belong in a separate commit or a different repo.
- `backend/Dockerfile`, `backend/env.example`, `backend/requirements.txt`, `backend/requirements-ml.txt`, `backend/routers/inference.py`, `backend/routers/scans.py` and `backend/services/inference_service.py` look like your older files. You now have two `requirements.txt` files, one at the root and one in `backend/`, so decide which is the real one. The old inference and scans files probably use the old flat imports (`from core...`), so I'll rewrite them in step 4 rather than have you commit them as-is.

Don't run `git add .` or `git add -A` for this reason.

**2. Missing files**

Only step 1's files appear as new: `config.py`, `database.py`, `test_config.py`, `pytest.ini` and the root `requirements.txt`. None of the step 2 and 3 files show up: `backend/models/`, `migrations/`, `alembic.ini`, `security.py`, `auth_service.py`, the auth routers, and so on. They exist on your disk, since Alembic ran, so either you already committed them or `.gitignore` is hiding them. Run these and paste the output:

```bash
git log --oneline -8
git diff .gitignore
git ls-files backend/models migrations alembic.ini backend/main.py
git check-ignore -v backend/models/user.py migrations/env.py alembic.ini backend/core/security.py tests/test_auth.py
du -sh models model_training "files (8).zip"
```

- If `git log` shows commits you made for steps 2 and 3, the leftovers are just commit 1, and I'll give you the exact commands.
- If `check-ignore` prints lines, a `.gitignore` rule is hiding your new files. The output names the rule, and I'll tell you how to fix it.
- The `du` line shows whether `models/` is large enough to need LFS.

## User:

> 9/30/2026 18:20:55

git log --oneline -8
370ca9a (HEAD -> backend, origin/backend) feat(api): wire auth and admin routers, health checks, auth tests
26326b2 feat(auth): bcrypt passwords, JWT access tokens, rotating refresh tokens
c01f5d8 feat(db): add SQLModel schemas and async Alembic migrations
3f14aba chore: scaffold FastAPI backend with settings and async DB session
5bb29c1 (origin/main, origin/HEAD, main) feat: update implementation plan to v3 and create phase 0 --frontend audit file
738a744 refactor: add dynamic handle back function system for 404 page
9a7da44 minor refactor
67ff6aa refactor: update onboarding page to use the custom color scheme and update ui

## Assistant:

> 9/30/2026 18:21:23

> Drafting fix-up commit steps and .gitignore restoration guidance.
>
> - Drafting fix-up commit steps and .gitignore restoration guidance.
> - **Done**

Your four commits are in and pushed, but two things need fixing before you move on.

**1. Check `.gitignore` first**

Earlier I gave you a command that overwrote `.gitignore` (`printf ... > .gitignore`). Your status shows it as modified, not new, so the file already had rules. Since your repo also has frontend work (onboarding page, 404 page), those rules likely covered things like `node_modules/` or `dist/`, and the overwrite may have removed them. Check:

```bash
git diff .gitignore
```

Lines starting with `-` are rules that were deleted. If any are, restore the original and append only the backend rules:

```bash
git checkout .gitignore
printf '\n# backend\n.env\nvenv/\n.venv/\n__pycache__/\n*.pyc\n.pytest_cache/\n' >> .gitignore
```
Duplicate rules are harmless.

**2. The scaffold files were never committed**

`config.py`, `database.py`, `test_config.py`, `pytest.ini` and the root `requirements.txt` are untracked, yet commits 2 to 4 import `config.py` and `database.py`. A fresh clone of `origin/backend` would fail on import. The likely cause is that one of the `git add` commands in my commit 1 listed a file that doesn't exist in your layout, such as a root `requirements-ml.txt` or `.env.example`. Git then rejects the whole command and adds nothing. To confirm:

```bash
git show --stat --oneline 3f14aba
```

Whichever way that looks, the fix is a follow-up commit. Don't rewrite history, since the commits are pushed:

```bash
git add .gitignore backend/core/config.py backend/core/database.py \
        tests/test_config.py pytest.ini requirements.txt
git status --short        # only these six should show as staged (A/M)
git commit -m "fix: add config, database, config tests and requirements missed from scaffold commit"
git push
```

Then verify that all the core files are tracked:
```bash
git ls-files backend/core
```
This should list `config.py`, `database.py`, `deps.py`, `errors.py` and `security.py`.

**What to leave out of this commit**

- **`files (8).zip`:** a download, so don't commit it.
- **`models/`:** run `du -sh models`. If it holds weights, keep it out of git, using Git LFS or the Hugging Face Hub.
- **`model_training/`, the `.json` and `.md` reports:** your earlier ML work, which can go in its own separate commit.
- **`backend/Dockerfile`, `backend/env.example`, `backend/requirements*.txt`, `backend/routers/inference.py`, `backend/routers/scans.py` and `backend/services/inference_service.py`:** older files from your flat layout that likely use imports like `from core...` instead of `from backend.core...`. Hold them until step 4, when I'll rewrite the inference and scans routers and the Dockerfile to match the current layout. That's also when we reconcile your two `requirements.txt` files.

Paste the `git diff .gitignore` output if you're unsure whether rules were removed.

## User:

> 9/30/2026 18:23:33

git   diff .gitignore
diff --git a/.gitignore b/.gitignore
index 6a4358f..ecfbc04 100644
--- a/.gitignore
+++ b/.gitignore
@@ -1,7 +1,6 @@
-backend/.env
-backend/db.sqlite3
-backend/Pipfile.lock
-frontend/Mediscan/package-lock.json
-.codex
-design/
-IMGS/
+.env
+__pycache__/
+*.pyc
+venv/
+.venv/
+.pytest_cache/
(END)
+++ b/.gitignore
@@ -1,7 +1,6 @@
-backend/.env
-backend/db.sqlite3
-backend/Pipfile.lock
-frontend/Mediscan/package-lock.json
-.codex
-design/
-IMGS/
+.env
+__pycache__/
+*.pyc
+venv/
+.venv/
+.pytest_cache/
(END)
+++ b/.gitignore
@@ -1,7 +1,6 @@
-backend/.env
-backend/db.sqlite3
-backend/Pipfile.lock
-frontend/Mediscan/package-lock.json
-.codex
-design/
-IMGS/
+.env
+__pycache__/
+*.pyc
+venv/
+.venv/
+.pytest_cache/
(END)
+++ b/.gitignore
@@ -1,7 +1,6 @@
-backend/.env
-backend/db.sqlite3
-backend/Pipfile.lock
-frontend/Mediscan/package-lock.json
-.codex
-design/
-IMGS/
+.env
+__pycache__/
+*.pyc
+venv/
+.venv/
+.pytest_cache/
(END)

## Assistant:

> 9/30/2026 18:23:39

> Reviewing a gitignore overwrite that dropped key config files.
>
> - Reviewing a gitignore overwrite that dropped key config files.
> - **Done**

The diff confirms it. My `printf ... > .gitignore` command replaced your file, and it deleted seven rules:

- `backend/.env`
- `backend/db.sqlite3`
- `backend/Pipfile.lock`
- `frontend/Mediscan/package-lock.json`
- `.codex`
- `design/`
- `IMGS/`

That was my mistake: I should have told you to append, not overwrite. Your new `.env` rule does cover `backend/.env`, but the other six rules are gone. If you'd committed now, `design/`, `IMGS/` and the Pipfile and package locks would have become commit candidates.

**Fix: restore the original and append only the new rules**

Press `q` first if you're still inside the diff, which is the pager showing `(END)`. Then run:
```bash
git checkout .gitignore
printf '\n# backend (FastAPI)\n.env\nvenv/\n.venv/\n__pycache__/\n*.pyc\n.pytest_cache/\n' >> .gitignore
git --no-pager diff .gitignore
```
The diff should now show only lines starting with `+` and none starting with `-`. If any `-` lines remain, run `git checkout .gitignore` and try again.

Then continue with the follow-up commit:
```bash
git add .gitignore backend/core/config.py backend/core/database.py \
        tests/test_config.py pytest.ini requirements.txt
git status --short
```
`git status --short` should show only those six files staged, with the rest still untracked (`??`). If that matches, commit and push:
```bash
git commit -m "fix: add config, database, config tests and requirements missed from scaffold commit"
git push
git ls-files backend/core
```
The last command should list `config.py`, `database.py`, `deps.py`, `errors.py` and `security.py`.

To avoid the pager in future, run `git --no-pager diff`, or set it once with `git config --global core.pager cat`.

## User:

> 9/30/2026 18:27:38

alright then

## Assistant:

> 9/30/2026 18:27:42

Once the follow-up commit is pushed and `git ls-files backend/core` lists all five files, the repo is in a clean state. A fresh clone of `origin/backend` should then run.

Step 4 is the mock inference service and `POST /predict`. It will also replace your older `inference.py`, `scans.py` and `Dockerfile` with versions that match the current layout. One decision decides how I build it:

- **Save results:** `/predict` takes a `patient_id`, stores the scan and findings in your database, and keeps the image in object storage.
- **Stateless:** `/predict` just analyzes the image and saves nothing, which is simpler for early frontend testing.
- **Both:** `patient_id` is optional. With it, the result is saved. Without it, the call is stateless. This is my recommendation.

Let me know which you want, or just say "both" and I'll start. Also, if the old `inference.py` or `inference_service.py` contains logic you want to keep, such as the Grad-CAM code or the TorchXRayVision loading, paste it or upload it so I can carry it over.

## User:

> 9/30/2026 18:29:48

before that about the auth and admin endpoints added   i should just follow  the instructions listed in the script right ? what other files did you add instructions to

## Assistant:

> 9/30/2026 18:30:03

> Listing each file's documented setup instructions in detail.
>
> - Listing each file's documented setup instructions in detail.
> - **Done**

Yes, follow the instructions in `create_admin.py`. They are the only manual steps needed for the auth and admin endpoints.

**Setting up the endpoints**

Run these from `MEDISCAN/`, with `.env` in place and the venv active:

```bash
source backend/venv/bin/activate
python -m backend.scripts.create_admin --email you@example.com --name "Your Name"
uvicorn backend.main:app --reload --port 7860
```

- The script prompts for the password twice, with no echo, and needs at least 10 characters.
- It writes directly to your Neon database.
- Run it once. If the email already exists, it refuses and exits.
- The admin must exist before the `/admin/*` endpoints are usable, because self-registered users can't approve anyone.

**Trying it at `http://127.0.0.1:7860/docs`**
1. Call `POST /auth/login` with your admin email and password, and copy the `access_token`.
2. Click **Authorize** and paste the token alone, without the word "Bearer".
3. Try `GET /auth/me` and `GET /admin/users`.
4. To test approval, register a second account with `POST /auth/register`. It will appear in `GET /admin/users` as pending. Approve it with `POST /admin/users/{id}/approve`, then log in as that user.

**Other files with instructions in them**

| File | What it says |
|---|---|
| `.env.example` | Generate the JWT secret with `python -c "import secrets; print(secrets.token_urlsafe(64))"`, paste the Neon URL as-is, and write `CORS_ORIGINS` as a JSON list. The repo may not have this file yet, since your status showed your older `backend/env.example` instead. |
| `alembic.ini` and `migrations/env.py` | The database URL is not set in `alembic.ini`. It comes from your `.env`. |
| `backend/main.py` | A comment marks where step 4 will load the inference service once at startup. |
| `requirements-ml.txt` | Only the Hugging Face Space image installs it. Locally you only need `requirements.txt`. |
| `tests/conftest.py` | Test environment variables must be set before any `backend.*` import. Keep that order if you edit it. |

**Setting I didn't document:** the new `BCRYPT_ROUNDS` setting (default 12) isn't in `.env.example`. Leave it at the default. Only the tests override it, to hash faster.

There's no README yet. If you'd like, I can add one that collects these steps in one place. It's worth having before you deploy or bring in collaborators.

## User:

> 9/30/2026 18:40:56

> File: 

got this error

## Assistant:

> 9/30/2026 18:41:10

> Weighing network and cold-start causes behind the timeout.
>
> - Weighing network and cold-start causes behind the timeout.
> - **Done**

Your code is fine, and nothing was written to the database. The traceback shows the connection timing out after 30 seconds while waiting for Neon's server to answer the secure-connection request. The script reached Neon but got no reply in time. Since `/health/ready` and `alembic upgrade head` worked earlier from this same machine, this is almost certainly a temporary delay and not a configuration problem. Two likely causes:

- **Neon's compute was asleep.** Free-tier compute suspends after 5 minutes idle, and the first connection wakes it. That's usually a few seconds, but it can be slower.
- **Your network was slow or dropping packets.** This is plausible given your earlier speed readings.

**Try these in order**

1. **Run the script again.** The first attempt usually wakes the compute, so the second often works. You'll have to retype the password.
2. **If it times out again, test the connection without the script:**
   ```bash
   alembic current
   ```
   If that also hangs, the problem is your network or Neon and not the script. Open the Neon dashboard and check that the project shows as active, not suspended or over quota. Try another network, such as a phone hotspot, and turn off any VPN.
3. **Give it more time.** Add this line to `MEDISCAN/.env`, then retry:
   ```
   DB_CONNECT_TIMEOUT_SECONDS=90
   ```
4. **Try the direct endpoint.** In your `DATABASE_URL`, remove `-pooler` from the hostname, for example `ep-xxxx-pooler.region...` becomes `ep-xxxx.region...`. The direct endpoint skips the PgBouncer proxy, which is sometimes flaky on slow links. The config handles both.

If it succeeds, you'll see `Admin rhishamah28@gmail.com created.` The line break in your email address in the paste is just the terminal wrapping, not a typo.

If it still fails after the 90-second timeout, tell me whether `alembic current` worked and what the Neon dashboard shows, and we'll narrow it down.

## User:

> 9/30/2026 18:42:56

the admin got created

## Assistant:

> 9/30/2026 18:43:00

> Setting up admin access and planning next verification steps.
>
> - Setting up admin access and planning next verification steps.
> - **Done**

The admin account exists in Neon, so the auth setup is complete.

**Quick check that it all works**
1. Start the server: `uvicorn backend.main:app --reload --port 7860`.
2. Open `http://127.0.0.1:7860/docs` and call `POST /auth/login` with your email and password. You should get a 200 with an `access_token` and a `refresh_token`.
3. Click **Authorize**, paste the `access_token` alone, and then call `GET /auth/me`. It should return your account with `"role": "admin"` and `"is_approved": true`.
4. Call `GET /admin/users`, which should return `[]` when nobody is pending.

The first request after a pause may be slow while Neon wakes up, so don't read a delay as a failure.

**If you kept the 90-second timeout in `.env`**, you can leave it while developing. Before deploying, set it back to something like 30 seconds, so a real outage fails fast.

**Step 4 is next.** It's the mock inference service and `POST /predict`. I still need your choice on saving results:
- **Both (my recommendation):** `patient_id` is optional. With it, the scan and findings are saved to your database. Without it, the call is stateless.
- **Save only**, or **stateless only**.

Saying "both" is enough for me to start. If your older `inference_service.py` has Grad-CAM or model-loading code you want to keep, upload it so I can carry it over.

## User:

> 9/30/2026 18:50:46

both

## Assistant:

> 9/30/2026 18:54:31

> Rewriting application startup and test helper scaffolding.
>
> - Rewriting application startup and test helper scaffolding.
> - **Done**

I'll build step 4: the `InferenceService` interface with a mock implementation, upload validation, and `POST /predict`, which saves the scan when `patient_id` is given. Saving needs patients to exist, so I'm adding a small patients router, read endpoints for scans, and a storage interface with a local-disk implementation. Step 5 swaps in a private bucket.

> Ran command
>
> - Write step 4 (inference, storage, predict, patients, scans) and run tests
> - **Done**

## User:

> 9/30/2026 23:42:48

did we delete any notebooks in the project ? i can't find the notebooks i used in training the models

## Assistant:

> 9/30/2026 23:43:02

> Searching other branches and locations for missing notebooks.
>
> - Searching other branches and locations for missing notebooks.
> - **Done**

No. Nothing I gave you or ran touches notebooks. I can't see your machine, so I'm going by the commands I gave you in this conversation. The only ones that deleted anything were:

- `rm migrations/versions/*_initial_schema.py`, which removed one broken migration file.
- The `DROP TABLE` statement, which was optional and only ever affects Neon database tables. You didn't need to run it, since the database was empty.
- `git checkout .gitignore`, which only restored that one file.
- `git rm --cached ...`, which I listed conditionally and which only untracks files, never deleting them from disk.

My `.gitignore` overwrite removed seven rules (`design/`, `IMGS/` and others), but none of them covered `.ipynb` files or notebooks, and you already restored the file.

Your earlier `git status` also showed `model_training/` and `models/` as untracked, so they still exist on disk. Notebooks are most likely inside `model_training/`, or were in a folder that was never committed. Try these in order, from `MEDISCAN/`:

**1. Look on disk**
```bash
find ~ -name "*.ipynb" -not -path "*/venv/*" -not -path "*/anaconda3/*" -not -path "*/.ipynb_checkpoints/*" 2>/dev/null
ls model_training
```
Also check `.ipynb_checkpoints/` folders, which hold autosaved copies, and your desktop Trash (`~/.local/share/Trash/files`).

**2. Look in the zip**
```bash
unzip -l "files (8).zip" | grep -i ipynb
```

**3. Look in other git branches and history**

You're on the `backend` branch, and the notebooks may live on `main` or another branch.
```bash
git branch -a
git ls-files '*.ipynb'
git log --all --oneline -- '*.ipynb'
git log --all --diff-filter=D --name-only --oneline -- '*.ipynb'
```
If the last command lists a deleted notebook, you can restore it from the commit before its deletion:
```bash
git checkout <commit-hash>^ -- path/to/notebook.ipynb
```

**4. Consider where you trained**

If you trained on Colab, Kaggle or Hugging Face, the notebooks may only exist in that account's history. Check Colab's Recent notebooks and Drive, or Kaggle's Your Work.

If none of this finds them, tell me what each search printed and which folder you last remember them in, and I'll help narrow it down.

Step 4 is written and all 45 tests pass. I still need to run it against a real Postgres instance and package the files for you, which I'll do whenever you're ready.

## User:

> 9/30/2026 23:47:43

they are saved on github but i can't find them on my local machine did the commands in  this git branch -a
git ls-files '*.ipynb'
git log --all --oneline -- '*.ipynb'
git log --all --diff-filter=D --name-only --oneline -- '*.ipynb'                    switch to other branches ?

## Assistant:

> 9/30/2026 23:47:51

> Checking git commands for ways to locate missing notebooks.
>
> - Checking git commands for ways to locate missing notebooks.
> - **Done**

No. All four of those commands are read-only. `git branch -a` lists branches, `git ls-files` lists tracked files, and `git log` reads history. None of them switch branches or change files. Your earlier status said `On branch backend`, and you should still be there.

If the notebooks are on GitHub but missing locally, they most likely live on a different branch (for example `main`) or were never fetched to your machine. Git only shows files from the branch you have checked out, so notebooks on `main` won't appear while you're on `backend`.

**Find which branch has them**
```bash
git branch --show-current            # should still print: backend
git fetch --all                      # refresh what git knows about GitHub
git branch -a
git ls-tree -r --name-only origin/main | grep -i ipynb
```
Repeat the `ls-tree` line with any other branch name from `git branch -a`, for example `origin/<branch>`. Paths that print are the notebooks on that branch.

**Get them without leaving `backend`**
Method 1 copies specific files into your working folder:
```bash
git checkout origin/main -- path/to/notebook.ipynb
```
Replace `origin/main` and the path with what the `ls-tree` output showed. This stages the file, so run `git restore --staged path/to/notebook.ipynb` afterward if you don't want it in your next commit.

Method 2 checks out the whole other branch in a separate folder, so nothing in this folder changes:
```bash
git worktree add ../MEDISCAN-main origin/main
```
The notebooks then appear in `../MEDISCAN-main/`. When you're done, run `git worktree remove ../MEDISCAN-main`.

Avoid `git checkout main` or `git switch` for now. You have untracked files (`model_training/`, `models/`, and the older inference files), and that's the riskiest time to switch branches.

If `ls-tree` finds nothing on any branch but the notebooks are on GitHub, they may be in a different repository. Check the repo name, or GitHub's web view, for the branch dropdown and the file path. Paste the `git branch -a` output if you'd like help reading it.

## User:

> 9/30/2026 23:48:47

i'm on a different branch now so i guess that's why i cant see the notebooks

## Assistant:

> 9/30/2026 23:48:56

> Clarifying how branch switches affect notebook visibility.
>
> - Clarifying how branch switches affect notebook visibility.
> - **Done**

Yes, that explains it. Git only shows the files that belong to the branch you have checked out, so notebooks committed on another branch won't appear while you're elsewhere. Nothing was deleted. They're safe in that branch's history, and on GitHub.

**Check where you are**
```bash
git branch --show-current
git status --short
```

**Notebooks and backend work are on different branches**
Your backend commits from steps 1 to 3 (config, models, auth) live on the `backend` branch and are pushed to `origin/backend`. If the notebooks are on another branch, each set of files disappears from your folder when you switch away from its branch. They aren't lost, and switching back restores them:

```bash
git switch backend      # backend code back, notebooks hidden again
git switch <other>      # notebooks back, backend code hidden
```

To work on both at once without switching, use the separate-folder approach from my last message:
```bash
git worktree add ../MEDISCAN-notebooks <other-branch>
```
That gives you `MEDISCAN/` on `backend` and `MEDISCAN-notebooks/` on the notebook branch, both open at the same time.

**Before you commit anything**
- **Check the branch first.** Run `git branch --show-current` before every commit so backend changes don't end up on the notebook branch. If you already committed on the wrong branch, tell me before you push anything, and I'll give you the safe fix.
- **Your untracked files** (`model_training/`, `models/`, `files (8).zip` and the older inference files) stay in place when you switch branches. If a switch ever complains that it would overwrite one of them, don't use `--force`. Paste the message and I'll tell you what to do.
- **The follow-up commit** for `config.py`, `database.py`, `test_config.py`, `pytest.ini` and the root `requirements.txt` should be made on `backend`. Switch back to that branch before you run it.

**Step 4**
Step 4 is written and all 45 tests pass. I'll check it against real Postgres, then package the files with their placement instructions. Should I go ahead with that?

## User:

> 9/30/2026 23:49:53

i don't think i'll want to switch branches now let's just continue building the backend

## Assistant:

> 9/30/2026 23:50:56

> Setting up database migrations to verify deployment steps.
>
> - Setting up database migrations to verify deployment steps.
> - **Done**

I'll run step 4 against a real PostgreSQL instance, including the migrations and the full save-and-read flow, before handing over the files.

> Verifying end-to-end flow and tests pass on PostgreSQL
>
> - Verify step 4 end to end on real Postgres
> - Checking concurrency behavior and benchmark scores under testing conditions.
> - Verifying end-to-end flow and tests pass on PostgreSQL
> - Presenting file(s)...
> - **Done**

**Before you copy anything:** three of these files have the same names as your older untracked files, and they will overwrite them. Those are `backend/routers/inference.py`, `backend/routers/scans.py` and `backend/services/inference_service.py`. Your old `inference_service.py` likely holds the Grad-CAM and model-loading code, which I'll port in step 6. Back up all three first:

```bash
cd /home/vincent/Documents/MEDISCAN
mkdir -p ~/mediscan_old_files
cp backend/routers/inference.py backend/routers/scans.py backend/services/inference_service.py ~/mediscan_old_files/
```

**Where the files go** (in `MEDISCAN/`)

| Files | Destination |
|---|---|
| `inference_service.py`, `storage_service.py`, `upload_validation.py`, `patient_service.py`, `scan_service.py` | `backend/services/` (first one overwrites your old file) |
| `inference.py`, `patient.py`, `scan.py` (schemas) | `backend/schemas/` |
| `inference.py`, `patients.py`, `scans.py` (routers) | `backend/routers/` (`inference.py` and `scans.py` overwrite your old files) |
| `constants.py`, `errors.py`, `deps.py`, `config.py` | `backend/core/` (`constants.py` is new, the others overwrite) |
| `main.py` | `backend/` (overwrites) |
| `helpers.py`, `conftest.py`, `test_auth.py`, `test_predict.py` | `tests/` (`helpers.py` and `test_predict.py` are new, the others overwrite) |

Then **append** to `.gitignore`, without overwriting, so locally saved scans never get committed:
```bash
printf '\n# local scan storage (dev)\nstorage_data/\n' >> .gitignore
```

**Run and test**
```bash
pip install -r requirements.txt
pytest -q                                            # expect 45 passed
uvicorn backend.main:app --reload --port 7860
```
In `/docs`, authorize with your admin token. Then:
1. `POST /patients` with `{"sex": "female", "year_of_birth": 1980}`, and copy the `id`.
2. `POST /predict` with a chest X-ray PNG or JPEG. Leave `patient_id` empty for a stateless result, or paste the patient `id` to save the scan.
3. `GET /scans/{scan_id}` to read the saved findings.

**How it behaves**
- **Mock results:** they're deterministic, so the same image always gives the same scores. Every model name is prefixed `mock-` (for example `mock-densenet121-res224-all`), so mock data is obvious in the database.
- **Finding fields:** tuberculosis has `experimental: true` and `heatmap_base64: null`. The other three return a 224×224 RGBA PNG overlay as raw Base64, with no `data:` prefix.
- **Upload validation:** PNG and JPEG only. It checks file contents rather than file extension and enforces a 10 MB limit and a pixel-count limit. Images under 64 px per side, corrupt files, and other file types are rejected.
- **Stored images:** they're re-encoded as PNG, which removes EXIF and GPS metadata. Keys contain only UUIDs, with no patient identifiers.
- **Failed saves:** if storage or the database fails mid-save, the files already written are deleted and the API returns 500 "Could not save the scan", so no orphaned files are left.
- **Access control:** clinicians see only their own patients and scans, and admins see all. Someone else's patient or scan returns 404, not 403, so it doesn't reveal that the record exists. Every scan view is written to the audit log.

**Decisions to check**
1. **`confidence_pct` is still in the response**, to match your OpenAPI contract, but the `disclaimer` states it is just `score × 100` and not a probability. If you'd rather remove it, it's one field in `schemas/inference.py`.
2. **Storage is local disk** (`storage_data/`) for development only. Step 5 replaces it with a private bucket, and nothing else changes because the code uses a storage interface.
3. **I deferred the Dockerfile to step 6.** I can't build Docker images in my environment, and the Dockerfile depends on the PyTorch setup, so I'd rather write and test them together.
4. **Rate limiting is still missing.** It matters more now because `/predict` will be expensive once real models run.

**Commits** (switch nothing, but run `git branch --show-current` first and confirm it says `backend`). Make the pending scaffold follow-up commit first, then:
```bash
git add backend/services backend/schemas backend/routers backend/core/constants.py backend/core/errors.py \
        backend/core/deps.py backend/core/config.py backend/main.py .gitignore
git status --short     # check that only backend files are staged, nothing from model_training/ or models/
git commit -m "feat(inference): mock inference service, upload validation, /predict, patients and scans APIs" \
  -m "predict saves scan and findings when patient_id is given, otherwise stateless. Images are re-encoded as PNG to strip metadata; storage is behind an interface (local disk for dev)."
git add tests
git commit -m "test: cover predict, upload validation, storage cleanup and patient/scan access control"
```

**Step 5 is object storage.** I'll add a private S3-compatible implementation (Cloudflare R2 works and has a free tier) with short-lived signed URLs for viewing the original image and each heatmap. It needs three details from you:
1. **Provider:** Cloudflare R2 (my recommendation), Backblaze B2, or AWS S3?
2. **Account:** do you already have an account and bucket, or should I include setup steps?
3. **Image access:** should the frontend receive signed URLs (the browser fetches from the bucket directly), or should the API stream images through itself? Signed URLs are simpler and cheaper. Streaming keeps the bucket fully hidden but loads your API.

> File: [/mnt/user-data/outputs/mediscan-backend/backend/services/inference_service.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Fservices%2Finference_service.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/services/storage_service.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Fservices%2Fstorage_service.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/services/upload_validation.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Fservices%2Fupload_validation.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/services/patient_service.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Fservices%2Fpatient_service.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/services/scan_service.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Fservices%2Fscan_service.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/schemas/inference.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Fschemas%2Finference.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/schemas/patient.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Fschemas%2Fpatient.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/schemas/scan.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Fschemas%2Fscan.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/routers/inference.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Frouters%2Finference.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/routers/patients.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Frouters%2Fpatients.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/routers/scans.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Frouters%2Fscans.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/core/constants.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Fcore%2Fconstants.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/core/errors.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Fcore%2Ferrors.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/core/deps.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Fcore%2Fdeps.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/core/config.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Fcore%2Fconfig.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/main.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Fmain.py)

> File: [/mnt/user-data/outputs/mediscan-backend/tests/helpers.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Ftests%2Fhelpers.py)

> File: [/mnt/user-data/outputs/mediscan-backend/tests/conftest.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Ftests%2Fconftest.py)

> File: [/mnt/user-data/outputs/mediscan-backend/tests/test_auth.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Ftests%2Ftest_auth.py)

> File: [/mnt/user-data/outputs/mediscan-backend/tests/test_predict.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Ftests%2Ftest_predict.py)

## User:

> 10/2/2026 1:03:06

all the tests passed and iv'e pushed all the commits i think it's time to add rate limiting now and for step 5 i do not have an account and bucket yet

## Assistant:

> 10/2/2026 1:06:23

> Sanitizing proxy IP headers for safe audit logging.
>
> - Sanitizing proxy IP headers for safe audit logging.
> - **Done**

I'll check one deployment detail first. Behind a proxy, rate limiting by IP only works if the app can read the real client IP. If it can't, every user shares one limit.

> Testing rate-limit responses with a live server run.
>
> - Hugging Face Spaces FastAPI client IP X-Forwarded-For proxy real client address
> - Wiring the in-flight gate into the prediction endpoint.
> - Confirming X-Forwarded-For spoofing risk before finalizing proxy header handling
> - Add rate limiting, client IP handling and tests; run suite
> - Testing rate-limit responses with a live server run.
> - **Done**

All 61 tests pass. I'll clean up and package the changed files.

> Ran command, presented file
>
> - Clean artifacts and spot-check patched files
> - Presenting file(s)...
> - **Done**

Rate limiting is built, and all 61 tests pass (16 new). I tested it with a simulated clock and in-process requests, not under real network load.

**Where the files go** (in `MEDISCAN/`)

| Files | Destination |
|---|---|
| `rate_limit.py`, `net.py` | `backend/core/` (new) |
| `errors.py`, `config.py` | `backend/core/` (overwrite) |
| `main.py` | `backend/` (overwrite) |
| `auth.py`, `inference.py`, `admin.py`, `patients.py`, `scans.py` | `backend/routers/` (all overwrite) |
| `conftest.py` | `tests/` (overwrite) |
| `test_rate_limit.py` | `tests/` (new) |
| `.env.example` | reference only. Copy its three new lines into your real `.env` if you want to change them. The defaults work without them. |

No database migration is needed. Then run `pytest -q`, which should print `61 passed`.

**The limits**

| What | Limit | Counted per |
|---|---|---|
| `POST /auth/login` | 10 per minute | IP |
| `POST /auth/login` | 10 per 15 minutes | IP and email together |
| `POST /auth/register` | 10 per hour | IP |
| `POST /auth/refresh` and `/auth/logout` | 30 per minute combined | IP |
| `POST /predict` | 10 per minute | logged-in user |
| `POST /predict` in flight | 4 at once (`MAX_INFLIGHT_PREDICTIONS`) | whole server |

- **Blocked requests:** they get a 429 with a `Retry-After` header and a message such as "Try again in 37 seconds". Blocked attempts aren't counted, so hammering a blocked key doesn't extend the block.
- **Login lockout:** the per-account limit is keyed on IP plus email, so an attacker can only lock themselves out of an account. They can't lock out the real user.
- **Overload:** if more than 4 predictions are running or waiting, the next one gets a 503 with `Retry-After: 5`. With the real model, each waiting request would otherwise hold an uploaded image in memory while the model works through the queue.
- **CORS:** `Retry-After` is exposed to browsers, so your frontend can read it and show a countdown.

**Setting for deployment: `TRUSTED_PROXY_HOPS`**

The default of `0` ignores the `X-Forwarded-For` header and uses the socket address, which can't be spoofed. If your Hugging Face Space sits behind a proxy, though, every user may appear to come from the same address. In that case all the per-IP limits would be shared by everyone, and 10 logins a minute would apply to your whole user base. My search didn't turn up how many proxies Spaces uses, so I can't tell you the right number yet.

When we deploy, we'll check by sending a test request and looking at the IP recorded in `audit_logs`. If it's the same address for different clients, set `TRUSTED_PROXY_HOPS=1`. Don't raise it without confirming. Too high a value lets clients pick their own IP and bypass the limits. Many code samples online take the first `X-Forwarded-For` entry, which is the one an attacker controls, so mine counts from the proxy's end instead.

**Limitations**
- **Counters live in server memory.** That works for one worker or one Space container. If you ever run several workers, each keeps its own counts, and you'd move them to a shared store such as Redis. Counters also reset on restart.
- **Distributed guessing isn't capped.** An attacker using many IPs against one email gets 10 tries per IP. Bcrypt's cost slows each guess, and every failed login is already written to the audit log, but there's no alerting yet.
- **Registration:** 10 per hour per IP may block a whole clinic behind one shared address. Adjust it in `backend/core/rate_limit.py` if that happens.

**Side effect:** the audit log now uses the same IP logic, so recorded addresses will be correct once the proxy setting is right.

**Commit**
```bash
git branch --show-current     # should print: backend
git add backend/core backend/main.py backend/routers tests .env.example
git status --short
git commit -m "feat(security): rate limiting, in-flight prediction cap and trusted-proxy client IP" \
  -m "Per-IP limits on login/register/refresh, per-account login limit keyed by IP+email, per-user predict limit, and a cap on concurrent predictions. Client IP counts X-Forwarded-For from the trusted proxy side only (default: ignore it). Retry-After is exposed through CORS."
```
Check that `git status --short` lists only backend files before you commit.

**Step 5: object storage.** You said you don't have an account or bucket yet. Cloudflare R2 has a free tier and works with the S3 library I'd use. I'd write the code, then give you the setup steps: creating the account and a private bucket, an API token limited to that bucket, and the `.env` values. Say "go ahead" and I'll start. Tell me if you'd rather use Backblaze B2 or AWS S3, and whether the frontend should fetch images with short-lived signed URLs (my recommendation) or have the API stream them.

> File: [/mnt/user-data/outputs/mediscan-backend/backend/core/rate_limit.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Fcore%2Frate_limit.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/core/net.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Fcore%2Fnet.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/core/errors.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Fcore%2Ferrors.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/core/config.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Fcore%2Fconfig.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/main.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Fmain.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/routers/auth.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Frouters%2Fauth.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/routers/inference.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Frouters%2Finference.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/routers/admin.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Frouters%2Fadmin.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/routers/patients.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Frouters%2Fpatients.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/routers/scans.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Frouters%2Fscans.py)

> File: [/mnt/user-data/outputs/mediscan-backend/tests/conftest.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Ftests%2Fconftest.py)

> File: [/mnt/user-data/outputs/mediscan-backend/tests/test_rate_limit.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Ftests%2Ftest_rate_limit.py)

> File: [/mnt/user-data/outputs/mediscan-backend/.env.example](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2F.env.example)

---

**Sources:**

- [request logging](https://huggingface.co/spaces/xnikkon/prmpt-ar-be/blob/main/middleware/request_logging.py)
- [File size: 315 Bytes](https://huggingface.co/spaces/Rivalcoder/Issurance_Agent_Rag/blame/836bc0e5f2b180c78f04ffa1c060d7c68d0b1948/utils.py)
- [huggingface.co](https://huggingface.co/spaces/SuperAPIs/flash1/blob/main/main.py)
- [fastapi allowed hosts](https://pypi.org/project/fastapi-allowed-hosts/)
- [Rivalcoder's picture](https://huggingface.co/spaces/Rivalcoder/Issurance_Agent_Rag/blob/836bc0e5f2b180c78f04ffa1c060d7c68d0b1948/utils.py)
- [#  How to Get the Client IPv4 Address from REST API Requests in Python](https://oneuptime.com/blog/post/2026-03-20-client-ipv4-rest-api-python/markdown)
- [how to get client ip in fastapi](https://leyaa.ai/codefly/learn/fastapi/qna/how-to-get-client-ip-in-fastapi)

## User:

> 10/2/2026 1:21:05

git add backend/core backend/main.py backend/routers tests .e
nv.example
fatal: pathspec '.env.example' did not match any files

## Assistant:

> 10/2/2026 1:21:11

> Sorting out mismatched environment file locations in the repo.
>
> - Sorting out mismatched environment file locations in the repo.
> - **Done**

Git rejected the whole command because one path didn't exist. Your repo doesn't have a `.env.example` at the root. Your status earlier showed an older `backend/env.example` instead. Since git stopped at the bad path, nothing was staged, and you can run the corrected command now:

```bash
git branch --show-current     # should print: backend
git add backend/core backend/main.py backend/routers tests
git status --short
```

`git status --short` should list only backend and test files as staged. Leftover untracked items such as `model_training/`, `models/` or the zip should still show as `??` and not be staged. Then commit:

```bash
git commit -m "feat(security): rate limiting, in-flight prediction cap and trusted-proxy client IP" \
  -m "Per-IP limits on login/register/refresh, per-account login limit keyed by IP+email, per-user predict limit, and a cap on concurrent predictions. Client IP counts X-Forwarded-For from the trusted proxy side only (default: ignore it). Retry-After is exposed through CORS."
git push
```

**About the example env file**

The `.env.example` I gave you only adds three optional lines, and the defaults work without them, so you don't need it for this commit. If you want an example file in the repo, you have two choices:
- **Use your existing `backend/env.example`.** Append the three lines to it:
  ```bash
  printf '\n# Abuse protection\nRATE_LIMIT_ENABLED=true\n# Reverse proxies in front of the app (0 = ignore X-Forwarded-For)\nTRUSTED_PROXY_HOPS=0\nMAX_INFLIGHT_PREDICTIONS=4\n' >> backend/env.example
  ```
- **Create a fresh `.env.example` at the project root** from my copy, then commit it separately once you've checked it contains no real secrets.

Your real `.env` is never committed, and `.gitignore` covers it.

Once that's pushed, say "go ahead" and I'll start step 5, the object storage with Cloudflare R2 plus the setup steps for the account and bucket.

## User:

> 10/2/2026 1:23:28

there's an  .env.example file in the project root

## Assistant:

> 10/2/2026 1:23:51

> Suggesting diagnostic commands to pinpoint the mismatch.
>
> - Suggesting diagnostic commands to pinpoint the mismatch.
> - **Done**

Git is saying it can't find a file by that exact name from the folder where you ran the command. I can't see your folder, so let's find out why. Your earlier `git status` listed `backend/env.example` but no `.env.example`. If you created the root file after that, a few things could explain the error. It may be in a different folder than you're in, or its name may differ slightly (for example `.env.exmaple`, or a trailing space).

Run these from the folder where the `git add` failed and paste the output:

```bash
pwd
git rev-parse --show-toplevel
ls -la | grep -i env
find . -maxdepth 2 -iname "*env*example*" -not -path "*/venv/*"
```

- **`pwd` and `show-toplevel` differ:** you ran the command from a subfolder. Go up to the folder that `show-toplevel` prints and retry.
- **`ls` shows the file with a slightly different name:** use that exact name in `git add`.
- **`find` shows it inside `backend/`:** it's `backend/.env.example`, so add it with that path.

**Check what's inside before committing it.** If you made `.env.example` by copying your real `.env`, it holds your Neon password and JWT secret. Open it and make sure it only contains placeholders like `user:password@...` and `change-me...`. If it has real values, replace them with placeholders first. If real values ever reach GitHub, change your Neon password and `JWT_SECRET_KEY`.

**You don't need this file for the commit.** The rate limiting works without it, so you can commit the code now and deal with the example file separately:

```bash
git branch --show-current     # should print: backend
git add backend/core backend/main.py backend/routers tests
git status --short            # should list only backend and tests files as staged
git commit -m "feat(security): rate limiting, in-flight prediction cap and trusted-proxy client IP" \
  -m "Per-IP limits on login/register/refresh, per-account login limit keyed by IP+email, per-user predict limit, and a cap on concurrent predictions. Client IP counts X-Forwarded-For from the trusted proxy side only (default: ignore it). Retry-After is exposed through CORS."
git push
```

Once the `find` output shows where the file is and you've checked it for secrets, add it in a separate small commit with `git add <path>` and `git commit -m "docs: add .env.example"`.

## User:

> 10/2/2026 1:26:52

it shows the name as env.example

## Assistant:

> 10/2/2026 1:27:01

> Resolving how to add and rename the example env file.
>
> - Resolving how to add and rename the example env file.
> - **Done**

That explains the error. The file is named `env.example`, with no leading dot, so `git add .env.example` found nothing. Either name works for an example file. The leading-dot version is just the common convention, and I referred to it by that name in earlier messages.

**1. Check its contents for secrets first**
```bash
cat env.example
```
It should only have placeholders like `user:password@host` and `change-me...`. If any value looks like your real Neon password or JWT secret, replace it with a placeholder before committing.

**2. Commit the code first**
The code doesn't depend on this file:
```bash
git branch --show-current     # should print: backend
git add backend/core backend/main.py backend/routers tests
git status --short            # should list only backend and tests files as staged
git commit -m "feat(security): rate limiting, in-flight prediction cap and trusted-proxy client IP" \
  -m "Per-IP limits on login/register/refresh, per-account login limit keyed by IP+email, per-user predict limit, and a cap on concurrent predictions. Client IP counts X-Forwarded-For from the trusted proxy side only (default: ignore it). Retry-After is exposed through CORS."
git push
```

**3. Update the example file in a separate commit**
This adds the three new optional settings if they aren't there yet:
```bash
grep -q RATE_LIMIT_ENABLED env.example || printf '\n# Abuse protection\nRATE_LIMIT_ENABLED=true\n# Reverse proxies in front of the app (0 = ignore X-Forwarded-For)\nTRUSTED_PROXY_HOPS=0\nMAX_INFLIGHT_PREDICTIONS=4\n' >> env.example
git add env.example
git commit -m "docs: document rate limiting settings in env.example"
git push
```

**One cleanup to consider:** your earlier status listed a second file, `backend/env.example`, which looks like it comes from your older layout. Two example files will confuse anyone setting up the project. Since settings now read `.env` from the project root, keep the root one and delete the old one once you've checked it holds nothing you still need. If you'd like the conventional name, rename the root one with `git mv env.example .env.example`, or `mv env.example .env.example` if it's still untracked. This is optional.

When that's pushed, say "go ahead" for step 5, the object storage with Cloudflare R2 and the setup steps for the account and bucket.

## User:

> 10/2/2026 1:28:49

go ahead

## Assistant:

> 10/2/2026 1:35:13

> Planning tests with mock storage to verify both backends.
>
> - Planning tests with mock storage to verify both backends.
> - **Done**

Step 5 needs current Cloudflare R2 details, so I'll check what R2 offers today and how to set it up correctly.

> Debugging a server shutdown command targeting a specific process.
>
> - Cloudflare R2 pricing free tier storage operations egress 2026
> - Cloudflare R2 sign up payment method required enable R2 free plan credit card
> - Checking payment requirements for cloud storage setup.
> - boto3 Cloudflare R2 request_checksum_calculation when_required fix NotImplemented STREAMING-UNSIGNED-PAYLOAD-TRAILER
> - Resolving an SDK checksum incompatibility with storage compatibility settings.
> - Backblaze B2 free tier 10 GB sign up credit card required S3-compatible API 2026
> - Adding rate limits and writing shared test helpers for image endpoints.
> - Wrapping up storage provider research, moving on to implementation
> - Install boto3 and moto for storage development
> - Build step 5 (S3 storage, image endpoints, checker) and run all tests
> - Validating storage tests against real S3 semantics.
> - Validating R2 compatibility against a local S3-compatible server
> - Verify S3 code path over real HTTP: checker diagnostics and full flow
> - Preventing secrets from leaking into error output.
> - Diagnosing test harness issues and planning a credential-safety fix
> - Fix harness, harden config errors, verify S3 path over HTTP, rerun tests
> - Debugging a server shutdown command targeting a specific process.
> - **Done**

The `pkill` matched my own command line again and killed the shell before anything ran. I'll move the whole check into a script file and stop the server by PID.

> Ran command
>
> - Check for leftover processes and see which edits already applied
> - **Done**

None of the edits were applied, and no server is left running. I'll redo everything from a script file.

> Confirming S3-compatible storage flow passes all tests
>
> - Harden config errors and verify S3 path over real HTTP, then rerun tests
> - Outlining Backblaze B2 as a backup storage option.
> - Confirming S3-compatible storage flow passes all tests
> - Presenting file(s)...
> - **Done**

Step 5 is built and passes all 110 tests. I haven't been able to test it against a real Cloudflare R2 bucket, since I can't reach one from here. Once your bucket exists, `python -m backend.scripts.check_storage` is the real test.

**Where the files go** (in `MEDISCAN/`)

| Files | Destination |
|---|---|
| `storage_service.py` | `backend/services/` (overwrite) |
| `check_storage.py` | `backend/scripts/` (new) |
| `scans.py` | `backend/routers/` (overwrite) |
| `scan.py` | `backend/schemas/` (overwrite) |
| `config.py`, `rate_limit.py` | `backend/core/` (overwrite) |
| `main.py` | `backend/` (overwrite) |
| `requirements.txt` | project root (adds `boto3`, and `moto` for tests) |
| `conftest.py`, `helpers.py`, `test_config.py` | `tests/` (overwrite) |
| `test_storage.py`, `test_images.py` | `tests/` (new) |

Run `pip install -r requirements.txt && pytest -q`, which should print `110 passed`. Nothing changes in your database. Until you add the settings below, the app keeps using local disk exactly as before.

**One change from my earlier advice:** I recommended signed URLs, but I built authenticated API endpoints instead. Medical images are better served that way, for these reasons:
- **Authenticated and audited:** every image read needs a login token and is recorded in `audit_logs`. A signed URL would be a shareable link that works for anyone holding it until it expires.
- **Not cacheable:** responses are marked `no-store`.
- **Simpler:** no CORS setup on the bucket.
- **Cost:** your images are small, so the extra load on the API is minor. Signed URLs can be added later if bandwidth ever matters.

The new endpoints are `GET /scans/{id}/image` and `GET /scans/{id}/findings/{finding_id}/heatmap`. Scan responses now include each finding's `id`. The frontend can't use a plain `<img src>`, because that can't send the login token, so it should fetch the image and display it as a blob:
```js
const res = await fetch(`${API}/scans/${id}/image`, { headers: { Authorization: `Bearer ${token}` } });
img.src = URL.createObjectURL(await res.blob());
```

**Safeguards**
- **Image integrity:** the stored hash is checked on every read, and a mismatch returns 500.
- **Missing objects:** a missing file returns 404 "Image unavailable".
- **Rate limit:** 120 image reads per minute per user.
- **Production guard:** `ENVIRONMENT=production` now refuses local storage, because a Hugging Face container's disk is wiped on restart and would silently lose scans.
- **HTTPS only:** remote endpoints must use `https://`.
- **Secrets:** the S3 secret key is hidden in logs, and configuration errors no longer echo values.
- **Startup check:** if the storage check fails, the app logs `STORAGE CHECK FAILED` with a plain-language reason but still starts.

**Setting up Cloudflare R2**

R2's free tier is 10 GB of storage, 1 million writes and 10 million reads a month, with no egress fees. That's roughly 250,000 saved scans a month before you'd pay anything.

1. **Create a Cloudflare account** at cloudflare.com (free) and verify your email.
2. **Enable R2:** in the left menu choose **R2 Object Storage**. Several sources say Cloudflare asks for a payment method (card or PayPal) before you can create a bucket. You're only charged if you exceed the free allowance. This may be a hurdle: you need a card that supports international online payments, or PayPal. If you can't, use Backblaze B2 below.
3. **Create a bucket:** name it `mediscan-scans`. Keep **public access off**. Don't enable the `r2.dev` URL or a custom domain. For location, pick Automatic or a region near where your backend runs.
4. **Create an API token:** on the R2 overview page open **Manage R2 API Tokens**, then **Create API token**. Choose **Object Read & Write** and limit it to the `mediscan-scans` bucket only. You'll see an **Access Key ID**, a **Secret Access Key** (shown once, so copy it now) and an **S3 endpoint** like `https://<account-id>.r2.cloudflarestorage.com`. Use the endpoint exactly as the page shows it.
5. **Put them in your local `.env`:**
   ```
   STORAGE_BACKEND=s3
   S3_ENDPOINT_URL=https://<account-id>.r2.cloudflarestorage.com
   S3_BUCKET=mediscan-scans
   S3_ACCESS_KEY_ID=<access key id>
   S3_SECRET_ACCESS_KEY=<secret access key>
   S3_REGION=auto
   ```
   No quotes. Never commit this file. Add the same values to your Hugging Face Space secrets when we deploy.
6. **Test it:** run `python -m backend.scripts.check_storage`. You want `OK: wrote, read back and deleted a test object.` If it fails, the message says which part is wrong: access key or secret, token permission or bucket scope, bucket name, or endpoint.
7. **Try it for real:** start the server (the log should say `Storage OK (s3)`), save a scan with `/predict` and a `patient_id`, then look in the Cloudflare dashboard. You should see 4 objects under `scans/` and `heatmaps/`.

**Fallback: Backblaze B2.** It has a 10 GB free tier, and my sources disagree on whether sign-up needs a card, so check on their sign-up page. Create a private bucket and an application key limited to that bucket. Use the S3 endpoint shown on the bucket page, such as `https://s3.<region>.backblazeb2.com`, and set `S3_REGION` to the region in that endpoint. The code is generic, but I haven't tested it against real B2 either.

**Commits** (run `git branch --show-current` first, and use these exact paths so the old untracked files don't get staged):
```bash
git add backend/services backend/routers backend/schemas backend/scripts backend/core backend/main.py requirements.txt
git status --short
git commit -m "feat(storage): S3-compatible object storage, authenticated image endpoints, storage checker" \
  -m "S3Storage works with R2/B2/AWS S3 (R2-safe checksum settings). Image and heatmap reads are authenticated, rate limited, audited and integrity-checked. Production refuses local storage."
git add tests
git commit -m "test: cover storage backends, image endpoints and config safeguards"
```
Also add these lines to your root `env.example`, with no real values:
```
STORAGE_BACKEND=local
# S3_ENDPOINT_URL=https://<account-id>.r2.cloudflarestorage.com
# S3_BUCKET=mediscan-scans
# S3_ACCESS_KEY_ID=
# S3_SECRET_ACCESS_KEY=
# S3_REGION=auto
```

**Step 6 is the real PyTorch models and deployment:** the `torch` inference service (TorchXRayVision for pneumonia, cardiomegaly and nodules/masses, MobileViT for tuberculosis), Grad-CAM with the lock and threadpool, the Dockerfile for Hugging Face Spaces, and the proxy-hops check for rate limiting. To port your Grad-CAM and model-loading code, I need your old `inference_service.py` (the copy you backed up in `~/mediscan_old_files/`), or I can write it fresh from your summary. Which do you prefer? Also tell me when your bucket works, or if the account setup blocks you.

> File: [/mnt/user-data/outputs/mediscan-backend/backend/services/storage_service.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Fservices%2Fstorage_service.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/scripts/check_storage.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Fscripts%2Fcheck_storage.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/routers/scans.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Frouters%2Fscans.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/schemas/scan.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Fschemas%2Fscan.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/core/config.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Fcore%2Fconfig.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/core/rate_limit.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Fcore%2Frate_limit.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/main.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Fmain.py)

> File: [/mnt/user-data/outputs/mediscan-backend/requirements.txt](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Frequirements.txt)

> File: [/mnt/user-data/outputs/mediscan-backend/tests/conftest.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Ftests%2Fconftest.py)

> File: [/mnt/user-data/outputs/mediscan-backend/tests/helpers.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Ftests%2Fhelpers.py)

> File: [/mnt/user-data/outputs/mediscan-backend/tests/test_storage.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Ftests%2Ftest_storage.py)

> File: [/mnt/user-data/outputs/mediscan-backend/tests/test_images.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Ftests%2Ftest_images.py)

> File: [/mnt/user-data/outputs/mediscan-backend/tests/test_config.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Ftests%2Ftest_config.py)

---

**Sources:**

- [Cloudflare R2 Pricing: Costs, Savings, and Alternatives in 2026](https://filebase.com/blog/cloudflare-r2-pricing-costs-savings-and-alternatives-in-2026/)
- [www.spendbase.co](https://www.spendbase.co/de/?p=35561)
- [www.spendbase.co](https://www.spendbase.co/fr/?p=35561)
- [Cloudflare Workers Pricing Calculator](https://makerkit.dev/pricing-calculator/cloudflare)
- [www.spendbase.co](https://www.spendbase.co/es/?p=35561)
- [www.spendbase.co](https://www.spendbase.co/nl/?p=35561)
- [www.spendbase.co](https://www.spendbase.co/tr/?p=35561)
- [how you cut egress fees with cloudflare r2](https://test-partneway.prod.spendbase.co/blog/cloud-management-tools/how-you-cut-egress-fees-with-cloudflare-r2/)
- [Cloudflare R2 — Overview & Pricing](https://subger.com/en/service/cloudflare-r2)
- [test.spendbase.co](https://test.spendbase.co/?p=35561)
- [BetterLink Logo BetterLink Blog](https://blog.eastondev.com/en/posts/dev/20251130-r2-picgo-setup)
- [DEV Community](https://dev.to/leonwong282/the-complete-beginners-guide-to-cloudflare-r2-image-hosting-2025-2g4k)
- [Welcome to Centmin Mod Community](https://community.centminmod.com/threads/cloudflare-queues-delivery-latency.29331/next)
- [DIY free image hosting: A stable setup using Cloudflare R2 + PicGo](https://eastondev.com/blog/en/posts/dev/20251130-r2-picgo-setup/)
- [account setup](https://docs.edgetag.io/hosting/self-hosting/account-setup.md)
- [How to Set Up Cloudflare R2: 12 Steps, 70 Min [2026]](https://tech-insider.org/au/?p=824)
- [s3 cloudflare r2](https://gitea.astro-vps.duckdns.org/bruno/remotely-save/src/branch/gdrive/docs/remote_services/s3_cloudflare_r2)
- [How to Set Up Cloudflare R2: 12 Steps, 70 Min [2026]](https://tech-insider.org/au/how-to-set-up-cloudflare-r2-2026/)
- [s3 cloudflare r2](https://gitea.astro-vps.duckdns.org/bruno/remotely-save/src/branch/master/docs/remote_services/s3_cloudflare_r2)
- [github.com](https://github.com/developmentseed/multistore/pull/93)
- [spreecommerce.org](https://spreecommerce.org/docs/developer/deployment/assets)
- [cf-r2-sdk 3.2.7](https://docs.rs/crate/cf-r2-sdk/latest)
- [github.com](https://github.com/storj/docs/pull/477/files)
- [github.com](https://github.com/ServerSideHannes/s3proxy-python/pull/129/files)
- [Allow configuring S3 request checksum calculation (blocks PBM on NetApp ONTAP S3)](https://forums.percona.com/t/allow-configuring-s3-request-checksum-calculation-blocks-pbm-on-netapp-ontap-s3/41147)
- [s3: disable checksum calculation for test_object_create_bad_contentlength_negative](https://git.frostfs.info/TrueCloudLab/s3-tests/commit/a40c28fcc35a363f3320de9ce6586c4ca7fe09ef)
- [www.backblaze.com Open in urlscan Pro](https://urlscan.io/result/298303ee-4c57-4539-a25c-8363d098af31/content)
- [www.backblaze.com Open in urlscan Pro](https://urlscan.io/result/eb603e35-8a8e-44cc-ad41-6617b0793a16/content)
- [developers.qodex.ai](https://developers.qodex.ai/backblaze)
- [backblaze b2](https://www.tinycommand.com/integrations/backblaze-b2)
- [backblaze b2 cloud storage](https://freetier.co/directory/products/backblaze-b2-cloud-storage)
- [Cloud & StorageReal-timeUpdated June 2026](https://site.tinycommand.com/integrations/backblaze-b2)
- [backblaze b2 cloud storage vs simplebackups](https://freetier.co/compare/backblaze-b2-cloud-storage-vs-simplebackups)
- [Where Backblaze B2 Cloud Storage's free tier stops](https://freetier.co/alternatives/backblaze-b2-cloud-storage)
- [alternatives backblaze b2](https://enterno.io/en/s/alternatives-backblaze-b2)

## User:

> 10/2/2026 1:36:16

go ahead

## Assistant:

> 10/2/2026 1:36:45

> Verifying model output normalization and feasible installation steps.
>
> - Verifying model output normalization and feasible installation steps.
> - **Done**

Step 6 has a lot of moving parts and I can't see your old `inference_service.py`, so I'll write it fresh from your summary. First I'll check what I can actually run here: the real libraries, the model weights, and the exact Hugging Face model ID for the tuberculosis model.

## User:

> 10/2/2026 11:21:51

the scans got saved to the neon database i used Backblazeb2 instead of cloudflare but the scans did not get saved there

## Assistant:

> 10/2/2026 11:22:18

> Pinpointing a reload quirk missing env changes.
>
> - Pinpointing a reload quirk missing env changes.
> - **Done**

Your scans were almost certainly written to local disk, not to B2. The app still thinks it's using local storage. Here's why:
- **A B2 failure would have rolled the save back.** If the app had been in `s3` mode and the B2 write failed, you'd have gotten a 500 "Could not save the scan", and no rows would have been left in Neon. Rows in Neon mean the files went somewhere that worked.
- **That somewhere is the default, `storage_data/`.** With no `STORAGE_BACKEND=s3`, the app writes there.
- **The likely trigger:** you started uvicorn with `--reload-dir backend`, so editing the `.env` in the project root doesn't restart the server. It keeps running with the old settings until you stop and restart it by hand.

**Confirm it**
From `MEDISCAN/`:
```bash
grep -E "^(STORAGE_BACKEND|S3_ENDPOINT_URL|S3_BUCKET|S3_REGION)=" .env
ls storage_data/scans | head
```
That `grep` skips the key lines, so no secrets get printed. If `ls` lists `.png` files, the scans went to local disk. Also check what the server printed when it started: `Storage OK (local)` versus `Storage OK (s3)`.

**Fix it**
These are the B2 values the `.env` needs:
```
STORAGE_BACKEND=s3
S3_ENDPOINT_URL=https://s3.<region>.backblazeb2.com
S3_REGION=<the same region, e.g. us-west-004>
S3_BUCKET=<your bucket name>
S3_ACCESS_KEY_ID=<B2 keyID>
S3_SECRET_ACCESS_KEY=<B2 applicationKey>
```
- **Region:** `S3_REGION` must be B2's region, matching the endpoint. `auto` is only for Cloudflare R2, and B2 will reject it.
- **Key:** use an application key limited to your bucket with read and write access, not the master key.
- **Format:** no quotes around any value.

Then test the configuration before running the server:
```bash
python -m backend.scripts.check_storage
```
You want `OK: wrote, read back and deleted a test object.` If it fails, paste the output. It prints only the endpoint host and bucket name, never your keys.

After that, **stop uvicorn with Ctrl+C and start it again.** The startup log should now say `Storage OK (s3)`. Save a new scan with `/predict` and a `patient_id`, then open **Browse Files** in the B2 dashboard. You should see `scans/` and `heatmaps/` folders in the same bucket you configured.

**About the scans you already saved:** Neon holds their records, but their images exist only in `storage_data/`. After you switch to B2, requests for those scans' images will return 404 "Image unavailable", because the files aren't in the bucket. If they're test scans, ignore them. If you want to keep them, I can write a short script that uploads everything in `storage_data/` to B2 under the same keys, verifies each file, and optionally removes the local copies. Do you want that? `storage_data/` is already covered by your `.gitignore`, so it won't be committed either way.

Once the checker prints OK and a new scan shows up in B2, I'll continue with step 6 (the real PyTorch models and deployment).

## User:

> 10/2/2026 11:25:28

let me test it again

## Assistant:

> 10/2/2026 11:25:32

Sounds good. Here's the order, with what each step should show.

1. **Save your `.env`** with the B2 values, then run the checker:
   ```bash
   python -m backend.scripts.check_storage
   ```
   The first lines should say `Storage backend : s3`, then your B2 endpoint host and bucket name. If you see `Storage backend : local`, the `.env` isn't being picked up, so check that it's in `MEDISCAN/` and that the line reads `STORAGE_BACKEND=s3`. The last line should say `OK`.

2. **Stop and restart uvicorn.** Press Ctrl+C, then run `uvicorn backend.main:app --reload --port 7860` again. The startup log should say `Storage OK (s3)`.

3. **Save a new scan** with `POST /predict` and a `patient_id`, then open **Browse Files** in the B2 dashboard. Refresh it if needed. You should see a `scans/` folder and a `heatmaps/` folder.

4. **Confirm the read path** by calling `GET /scans/{scan_id}/image` for that new scan. It should return the image.

**If something fails**, paste the output and I'll go from there. For the checker, the message names the problem. The common ones are a wrong key, a key that isn't limited to this bucket, a wrong bucket name, or a region that doesn't match the endpoint. Remove any key values before pasting. Startup logs and the checker output never print your secret, but a `.env` copy would.

Tell me what you see, and once a new scan shows up in B2 we'll start step 6.

## User:

> 10/2/2026 11:50:43

the scan showed up in B2

## Assistant:

> 10/2/2026 12:06:23

> Weighing model package sizes against sandbox download limits.
>
> - Weighing model package sizes against sandbox download limits.
> - **Done**

Storage is confirmed, so on to step 6. First I'll pin down the exact model IDs and APIs.

> Resolving the PyTorch CUDA dependency setup.
>
> - huggingface mobilevit_small chest xray tuberculosis image classification model
> - Verifying details about a referenced chest X-ray model.
> - "mobilevit" "chest_xray" huggingface MobileViT small fine-tuned chest x-ray tuberculosis
> - Finding a trustworthy model for chest x-ray analysis.
> - Checking sandbox for DenseNet and Grad-CAM support
> - Check sandbox resources and network access for installing real ML stack
> - Working out package installs without pulling in GUI libraries.
> - Installing the ML stack in the background
> - Start installing torch (no CUDA extras) in a separate venv
> - Install torch pure-python deps and test that CPU torch imports without CUDA libs
> - Resolving the PyTorch CUDA dependency setup.
> - **Done**

Importing PyPI's torch needs the CUDA libraries even for CPU use. I'll check which ones it wants and install only those.

> Debugging a race condition in cancellation handling.
>
> - List CUDA dependencies torch requires at import
> - Untangling dependencies for the required CUDA libraries.
> - Install torch with its CUDA runtime dependencies in the background
> - Planning how to bundle and deploy backend files separately.
> - Working around missing torch to test step 6 without it
> - Free disk space by removing the failed ML environment
> - torchxrayvision README DenseNet densenet121-res224-all normalize XRayCenterCrop XRayResizer pathologies op_threshs
> - Working with a chest X-ray classification model library.
> - [Introduction — TorchXRayVision 1.0.1 documentation (readthedocs.io)](https://torchxrayvision.readthedocs.io)
> - Excluding stray files and old artifacts from the bundle script.
> - Confirming TorchXRayVision model details before drafting the Dockerfile
> - Hugging Face Docker Spaces user id 1000 app_port 7860 secrets variables build args CPU basic 2 vCPU 16GB sleep
> - Splitting requirements files and planning config validation details.
> - Structuring step 6 with lazy model loading and testable core logic
> - Write step 6 (torch inference, imaging, deploy files, tests) and run tests
> - Debugging a race condition in cancellation handling.
> - **Done**

One test failed, and it's the case I was most worried about, so I'll look at the details before deciding on a fix.

> Rerunning the bundle script via bash
>
> - Inspect cancellation test failure
> - Untangling a race between a cancelled task and its worker thread.
> - Fixing a race condition in concurrent Grad-CAM analysis
> - Fix cancellation race with a thread-level lock and rerun tests repeatedly
> - Testing the bundle script and backend configuration imports.
> - Verifying tests pass, now checking deploy bundle and model startup behavior
> - Test bundle script exclusions, ML requirement resolution and missing-package startup message
> - Troubleshooting a permissions error in the deployment script.
> - Rerunning the bundle script via bash
> - Run bundle, requirement-resolution and startup-message checks via bash script
> - Presenting file(s)...
> - **Done**

> File: [/mnt/user-data/outputs/mediscan-backend/Dockerfile](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2FDockerfile)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/scripts/check_models.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Fscripts%2Fcheck_models.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/services/imaging.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Fservices%2Fimaging.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/services/torch_inference.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Fservices%2Ftorch_inference.py)

> File: [/mnt/user-data/outputs/mediscan-backend/deploy/make_space_bundle.sh](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fdeploy%2Fmake_space_bundle.sh)

> File: [/mnt/user-data/outputs/mediscan-backend/deploy/prefetch_models.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fdeploy%2Fprefetch_models.py)

> File: [/mnt/user-data/outputs/mediscan-backend/deploy/space_README.md](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fdeploy%2Fspace_README.md)

> File: [/mnt/user-data/outputs/mediscan-backend/requirements-dev.txt](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Frequirements-dev.txt)

> File: [/mnt/user-data/outputs/mediscan-backend/tests/test_imaging.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Ftests%2Ftest_imaging.py)

> File: [/mnt/user-data/outputs/mediscan-backend/tests/test_torch_inference.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Ftests%2Ftest_torch_inference.py)

---

**Sources:**

- [Hugging Face](https://huggingface.co/runaksh/chest_xray_tuberculosis_detection/commits/c2cea4b7da36cd76845435dc5cde3709c7c8a256)
- [Hugging Face](https://huggingface.co/runaksh/chest_xray_tuberculosis_detection/commits/main)
- [Hugging Face](https://huggingface.co/runaksh/chest_xray_tuberculosis_detection/tree/main)
- [Hugging Face](https://huggingface.co/runaksh/chest_xray_tuberculosis_detection/tree/c2cea4b7da36cd76845435dc5cde3709c7c8a256)
- [tb classifier](https://huggingface.co/Owos/tb-classifier)
- [huggingface.co](https://huggingface.co/papers/2409.11644)
- [Chest X-Ray Classification (Normal / Pneumonia / Tuberculosis)](https://huggingface.co/realsudarshan/chest-xray-classifier)
- [radiovision/Pneumonia-Detection · Hugging Face](https://huggingface.co/radiovision/Pneumonia-Detection)
- [A Lightweight Hybrid Deep Learning Model for Tuberculosis Detection from Chest X-Rays - PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC12731716/)
- [mobilevit x small](https://huggingface.co/tensorboard/kedimestan/mobilevit-x-small)
- [mobilevit small finetuned](https://huggingface.co/jorgeduardo13/mobilevit-small-finetuned)
- [MobileViT (extra small-sized model)](https://HuggingFace.co/apple/mobilevit-x-small)
- [mobilevit small finetuned eurosat](https://huggingface.co/loucad/mobilevit-small-finetuned-eurosat)
- [MobileViT (small-sized model)](https://huggingface.co/Matthijs/mobilevit-small)
- [A Robust Tuberculosis Diagnosis Using Chest X-Rays Based on a Hybrid Vision Transformer and Principal Component Analysis - PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC11640000/)
- [A Lightweight Hybrid Deep Learning Model for Tuberculosis Detection from Chest X-Rays](https://doi.org/10.3390/diagnostics15243216)
- [huggingface.co](https://huggingface.co/torchxrayvision/densenet121-res224-all/blob/dbdf2b4df9f064a94116743c626a27e70e1276d1/README.md?code=true)
- [license: apache-2.0](https://huggingface.co/torchxrayvision/densenet121-res224-all/blob/main/README.md)
- [TorchXRayVision: A library of chest X-ray datasets and models](https://pypi.org/project/torchxrayvision/0.0.37/)
- [torchxrayvision.readthedocs.io](https://torchxrayvision.readthedocs.io)
- [docsearch.algolia.com](https://docsearch.algolia.com/mcp/docs/repo/mlmed/torchxrayvision)
- [pypi.org](https://pypi.org/project/torchxrayvision/0.0.30/)
- [github.com](https://github.com/danbider/torchxrayvision)
- [replicalab / docs /max /deployment.md](https://huggingface.co/spaces/ayushozha/replicalab/blob/main/docs/max/deployment.md)
- [docker spaces](https://huggingface.co/spaces/liaoch/mermaid-rendering-docker/blob/main/docs/docker-spaces.md?code=true)
- [Docker Spaces](https://HuggingFace.co/docs/hub/spaces-sdks-docker)
- [huggingface.co](https://huggingface.co/spaces/nikhtu10/HuggingRun/commit/a3bfafd2a7cb1bb0dea1675427e91a57c9cb27ce)
- [huggingface.co](https://huggingface.co/spaces/sheanineseven/llm-app4/blob/f1ab6596d837c3291ab2ca8f397f2a592bc494c8/README.md)
- [Container hosting: Hugging Face Spaces with Docker#](https://tds.s-anand.net/2025-09/huggingface-spaces/)
- [# Hugging Face](https://docs.flowiseai.com/espanol/documentacion-oficial/configuracion/deployment/hugging-face)

## User:

> 10/2/2026 19:07:21

> File: deep-research-report.md

iv'e added all the files but there's an issue with hugging face spaces docker is a paid option so i'm seeking alternatives go through this though

## Assistant:

> 10/2/2026 19:09:34

> Exploring free CPU hosting alternatives with enough memory.
>
> - Saving stated project facts to memory before replying.
> - Updating memory
> - Read the file-reading skill before opening the uploaded report
> - Check size and read the uploaded research report
> - Exploring free CPU hosting alternatives with enough memory.
> - **Done**

I've read the report. Before judging its options, I'll check your Hugging Face problem, because my earlier sources said Docker Spaces were free on CPU basic.

> Settling on a free-tier recommendation and preparing a follow-up question.
>
> - Hugging Face Spaces Docker SDK free CPU basic still free 2026 create Space Docker blank pricing
> - Designing a lightweight model export to fit free hosting limits.
> - Verifying Hugging Face Spaces pricing before checking remaining claims
> - Render free web service 2026 512 MB RAM spin down 15 minutes no credit card required limits
> - Checking free-tier hosting limits and requirements.
> - [https://flywp.com/blog/9769/](https://flywp.com/blog/9769/)
> - Railway free plan 2026 $1 credit trial $5 limits RAM no credit card; Koyeb free instance 2026 RAM credit card
> - Weighing alternative hosts for running inference within limits.
> - Flagging unsupported claims in the report, checking serverless alternatives
> - Modal free plan 2026 $30 monthly credits credit card required CPU containers FastAPI inference scale to zero
> - Settling on a free-tier recommendation and preparing a follow-up question.
> - **Done**

You're right: Hugging Face has paywalled Docker Spaces. New free accounts creating a Docker Space get an error saying Gradio and Docker Spaces on free cpu-basic need a PRO subscription. Static Spaces are still free, and Spaces created earlier keep running. My earlier advice relied on older sources, so that was my mistake.

**The report**

Its core idea is right: keep the light API and the heavy PyTorch inference separate. The advice to use platform secrets is also right. Several of its specifics don't hold up, though:

- **Railway's free 2 GB VM:** I found no support for it. The permanent free plan caps services at 1 vCPU and 0.5 GB RAM on $1 of monthly credit, and the 30-day trial allows 2 vCPU and 1 GB. Neither fits PyTorch.
- **Render's free tier:** It gives 512 MB RAM and 0.1 CPU, and sleeps after 15 minutes idle. Waking takes about a minute. That's fine for the API alone, but it can't run DenseNet and Grad-CAM. Sources disagree on whether Render wants a card for web services, so check at signup.
- **Loading the model per request and `--limit-max-requests 1`:** don't do this. Every request would reload PyTorch and the weights, which is slow on weak CPUs. The restart also wipes the in-memory rate limits and prediction cap I built, and `torch.cuda.empty_cache()` does nothing on CPU.
- **Its Dockerfile stub:** it has wrong paths (`backend/backend`) and ignores the one we already have.

No free tier without a card gives multi-gigabyte RAM, except serverless ones.

**Your options**

1. **Hugging Face PRO, $9/month.** This is the least work, because everything we built deploys as is. You'd need a card or PayPal.
2. **Free split architecture.** The API runs on Render's free tier, and inference runs on Modal. Modal gives $30 of free credits a month with no card required. Some reviewers report international card verification problems, so I can't promise sign-up works from Nigeria. The costs are a 1-2 minute first request after idle, three more providers to manage, and X-ray images passing through Modal, which matters for patient data.
3. **Oracle Cloud Always Free.** It offers 4 OCPUs and 24 GB RAM but requires a card for identity verification. It's the best free hardware, and our Docker image would run on it nearly unchanged, but I can't say whether Nigerian cards pass verification.

For option 2, I'd add a remote inference backend to the API and a small Modal service that reuses our model code. I can write both, but I can't test the Modal deployment from here.

Do you have any card, virtual card or PayPal that works for international payments? That decides between options 1 and 3, and building option 2.

---

**Sources:**

- [Hugging Face Pricing 2026: Is It Free? Complete Cost Breakdown](https://www.metacto.com/blogs/the-true-cost-of-hugging-face-a-guide-to-pricing-and-integration)
- [Hugging Face pricing explained: what you actually pay in 2026](https://www.eesel.ai/blog/hugging-face-pricing)
- [Official Community Complaint: Revert Free CPU Basic Spaces and Remove Anti-Developer SDK Restrictions - Spaces - Hugging Face Forums](https://discuss.huggingface.co/t/official-community-complaint-revert-free-cpu-basic-spaces-and-remove-anti-developer-sdk-restrictions/177703)
- [Docker SDK now marked as "Paid" when creating a new Space? - Spaces - Hugging Face Forums](https://discuss.huggingface.co/t/docker-sdk-now-marked-as-paid-when-creating-a-new-space/177580)
- [participatory-planner / HUGGINGFACE_DEPLOYMENT.md](https://huggingface.co/spaces/Thadillo/participatory-planner/blob/main/HUGGINGFACE_DEPLOYMENT.md)
- [Hugging Face](https://huggingface.co/spaces/hong-shu/Mistral-7B-Instruct-GGUF-Run-On-CPU-Basic/commits/main/resourse/style/blank)
- [Hugging Face](https://huggingface.co/spaces/hong-shu/Mistral-7B-Instruct-GGUF-Run-On-CPU-Basic/commits/717b0bb2e4efa330d6a34f069fa4eb04b8fab16f/models)
- [run-hello-world / README.md](https://huggingface.co/spaces/qgallouedec/run-hello-world/blob/main/README.md)
- [Inspectech_segmentation / DEPLOYMENT.md](https://huggingface.co/spaces/MLBench/Inspectech_segmentation/blob/main/DEPLOYMENT.md)
- [9 Best Free Docker Hosting Platforms in 2026 (Tested & Ranked)](https://flywp.com/blog/9769/)
- [Render Free Hosting Review: Web Apps, Postgres, Limits](https://toolfreebie.com/render-hosting-review/)
- [Render Pricing 2026: Free Tier, RAM Limits & Alternatives](https://www.srvrlss.io/provider/render/)
- [Render Free Tier 2026: Limits, Pricing & What Changed](https://agentdeals.dev/vendor/render)
- [Render Pricing Guide: Free Tier, Compute and Database Costs • Kuberns](https://kuberns.com/blogs/render-pricing/)
- [How to Deploy on Render: Complete Guide 2026 • Kuberns](https://kuberns.com/blogs/how-to-deploy-on-render/)
- [Server Compass](https://servercompass.app/blog/render-pricing-is-it-worth-it)
- [Render Performance: Benchmarks, Latency & Limits 2026](https://comparedge.com/tools/render/performance)
- [Heroku vs Render: I Tested Both (2026 Pricing Inside) - ExpressTech](https://expresstech.io/heroku-vs-render-an-honest-comparison-for-2026/)
- [Is Render Free? Free Tier Limits, Sleep, and the 30-Day DB (2026)](https://justinmckelvey.com/blog/is-render-free)
- [Pricing](https://railway.com/pricing)
- [Railway Pricing 2026: Free Plan, Postgres & Alternatives](https://www.srvrlss.io/provider/railway/)
- [Railway Free Tier 2026: $5 Credit, No Credit Card](https://www.saaspricepulse.com/tools/railway)
- [Railway Pricing 2026: Free Tier Limits, Usage Costs & When to Upgrade — Nayan Kyada](https://nayankyada.com/blog/railway-pricing-2026-free-tier-limits-usage-costs-when-to-upgrade)
- [Is Railway Free? Yes — Paid Starts at $5/mo (2026)](https://costbench.com/software/developer-tools/railway/free-plan/)
- [Railway Free Tier 2026: Plans, Credits and Limits • Kuberns](https://kuberns.com/blogs/railway-free-tier/)
- [Railway Free Tier in 2026: What $1/Month Credit Actually Runs](https://www.toolpick.dev/alternatives/railway)
- [Railway Pricing 2026: $20/vCPU, $10/GB, and Pro Is Not Per Seat](https://www.budgetforge.dev/tools/railway-pricing-2026)
- [Railway Free Tier 2026: $5 Trial Credit Guide - DeployBase](https://deploybase.app/blog/railway-free-tier-2026-5-dollar-trial)
- [# Modal llms-full.txt](https://www.modal.com/llms-full.txt)
- [Modal Pricing: Plans, Costs, and Value Analysis (2026)](https://www.modern-datatools.com/tools/modal/pricing)
- [Best Modal Alternatives (2026): Serverless GPU Pricing](https://www.buildmvpfast.com/alternatives/modal)
- [Modal $30/mo GPU Credit: Practical AI Use](https://nahornyi.ai/en/news/modal-free-gpu-30-dollars-month)
- [Modal Review 2026: Serverless GPU Pricing & Alternatives](https://aitrendtool.com/tools/modal)
- [Modal Pricing 2026: Serverless GPU & CPU Costs](https://costbench.com/software/ai-gpu-cloud/modal/)
- [github.com](https://github.com/mnfst/awesome-free-llm-apis/wiki)
- [Modal Pricing](https://www.usagepricing.com/blueprint/modal)
- [Modal Pricing Calculator (2026)](https://www.buildmvpfast.com/tools/api-pricing-estimator/modal)

## User:

> 10/2/2026 19:12:48

let me try signing up on oracle cloud first

## Assistant:

> 10/2/2026 19:13:29

> Checking ARM wheel compatibility and deployment hardening details.
>
> - Preparing guidance for setting up an Oracle Cloud account.
> - Adding to memory
> - Oracle Cloud Always Free ARM A1 4 OCPU 24GB 2026 signup card verification out of host capacity idle reclaim home region cannot change
> - Checking ARM wheel compatibility and deployment hardening details.
> - **Done**

Good plan: Oracle's free hardware is the strongest option if the signup goes through. Some things changed in 2026 that could affect your attempt, so here's what to know before you start.

**What sources report about the free tier**
- **Smaller ARM allowance.** One developer reports that Oracle quietly halved the Always Free ARM allowance from 4 OCPU / 24 GB to 2 OCPU / 12 GB on 15 June 2026, with no announcement. Oracle hasn't confirmed it publicly, so check your actual limits in the console. 2 OCPU / 12 GB is still plenty for our app, which needs a few GB for PyTorch.
- **"Out of host capacity" is common.** It means Oracle can't currently allocate the shape in your home region. Try another availability domain in the same region or retry later. One 2026 write-up says fresh Free Tier accounts effectively can't get ARM capacity, and recommends upgrading to Pay-As-You-Go, which is still free within the limits. That would put a card on a billable account, so only do it with budget alerts set.
- **Idle reclamation.** Oracle may reclaim an Always Free instance if, over 7 days, its 95th-percentile CPU, network and (on ARM) memory use all stay under 20%. A quiet API fits that profile, so we'd need to handle it. Pay-As-You-Go reportedly exempts you, but I can't confirm that.

**Before you click Sign up**
1. **Pick your home region carefully.** It can't be changed later without a support ticket. Always Free compute must be created in that region, and ARM isn't available in every region. Choose the nearest one that lists Ampere A1.
2. **Use a Visa or Mastercard.** Oracle accepts Visa, Mastercard, Discover and American Express for identity verification, with a temporary authorization hold. Make sure international online payments are enabled on yours, since many local cards have that off by default.
3. **Sign up without a VPN, ideally from your phone's hotspot.** Signup rejections are routine, VPNs and proxies are rejected instantly, and the hotspot is the most reported fix.
4. **Make the name and address match the card, and have your phone ready for SMS verification.**

**When you create the VM**
- **Shape:** Ubuntu 24.04 (aarch64), `VM.Standard.A1.Flex`.
- **Size:** start with 2 OCPU / 8-12 GB. Smaller requests may find capacity more easily.
- **SSH:** use a key, not a password.
- **Billing:** set a $1 budget alert in Billing.

**If ARM capacity never appears**, the free x64 micro VM (about 1 GB RAM) can run only the API, always on with no sleeping. Inference would then go to Modal, as in option 2.

Once the VM exists, I'll write the deployment files: Docker Compose, Caddy for HTTPS, a firewall setup script, and a small check that the image builds on ARM. I haven't run our Docker image on ARM yet, so that check matters. Let me know how far you get, and paste any error messages.

---

**Sources:**

- [Oracle Cloud Giving Away Ampere Arm A1 Instances Always Free in 2026?](https://www.itechguides.com/oracle-cloud-giving-away-ampere-arm-a1-instances-always-free-the-2026-limits-explained/)
- [How I stopped fighting Oracle's "Out of host capacity" and let a script catch a free ARM server for me - DEV Community](https://dev.to/alexpua/how-i-stopped-fighting-oracles-out-of-host-capacity-and-let-a-script-catch-a-free-arm-server-for-41a6)
- [oracle-cloud-free-tier-guide · GitHub](https://gist.github.com/rssnyder/51e3cfedd730e7dd5f4a816143b25dbd)
- [FAQ on Oracle's Cloud Free Tier](https://www.oracle.com/cloud/free/faq/)
- [Beating “Out of Host Capacity”: How I Automated My Way Into an Oracle Cloud Free Tier VM](https://medium.com/@isameer3056/beating-out-of-host-capacity-how-i-automated-my-way-into-an-oracle-cloud-free-tier-vm-9935af02f4ab)
- [Is Oracle Cloud's Free Tier Still Worth It in 2026? Rejected Signups, Halved ARM Limits, and 1,500 Failed Launch Attempts — Draft](https://draft-publish.com/articles/is-oracle-clouds-free-tier-still-worth-it-in-2026--0c75b5b7)
- [Always Free Resources](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm)
- [Oracle Cloud Always Free Tier — Grokipedia](https://grokipedia.com/page/Oracle_Cloud_Always_Free_Tier)
- [Resolving Oracle Cloud "Out of Capacity" issue and getting free VPS with 4 ARM cores / 24GB of memory](https://github.com/oeufmeister/oci-arm-host-capacity)
- [oci auto](https://github.com/Dedupline/oci_auto)

## User:

> 10/3/2026 13:53:50

what option is best for me

## Assistant:

> 10/3/2026 13:54:13

> Planning a staged rollout starting with the free option.
>
> - Planning a staged rollout starting with the free option.
> - **Done**

**Try Oracle first, as you planned, but set a time limit.** If it hasn't worked after two or three days of signup and capacity attempts, move to the free split with Render and Modal. Here's why that order fits you:

- **Oracle** is the only free option with enough RAM to run everything we built in one always-on place, with no sleeping. The costs are real, though. Signup can be rejected, ARM capacity may not appear, and you'd run the server yourself: updates, firewall, HTTPS and backups. For an app that will eventually handle medical images, that security work is yours.
- **Render plus Modal** is the free fallback that doesn't depend on Oracle's capacity or a hard card check. The trade-offs are slow first requests after idle, three providers to manage, and X-ray images passing through Modal.
- **Hugging Face PRO at $9/month** is the least work, but it isn't free and needs a payment method. If you ever get a card that works and your time matters more than $9, it's the simplest path.

**Time limit:** if you try three or four capacity retries a day and the signup is rejected, stop there. Don't spend a week fighting for a free server.

**For real patient data:** none of these free setups is a good long-term home for it. Fine for development, demos and anonymized research. If you move to real clinical use, plan a paid host in a region that fits Nigeria's data-protection rules.

Tell me how the signup goes. If Oracle works, I'll write the deployment files for it. If it doesn't, I'll build the Render and Modal setup instead.

## User:

> 10/3/2026 14:00:43

oracle only accepts visa,mastercard and amex cards and i only have a verve card we will have to use the render and modal option then

## Assistant:

> 10/3/2026 14:15:37

> Specifying environment variables for the API's production secret.
>
> - Specifying environment variables for the API's production secret.
> - **Done**

Understood, and sorry that Oracle's card rule blocks you. Before building, I'll install Modal's SDK locally so I can check its current API names against the real package instead of relying on memory. I can't deploy from here, but I can confirm that my decorators and parameters are valid.

> Diagnosing a hanging test in the suite.
>
> - Install Modal SDK and verify decorator parameters and ASGI lifespan support
> - Simulating retries and warmup deduplication with mock transports.
> - Confirming Modal compatibility and planning a host-independent API design
> - Write remote inference client, server, wire format, config and router changes
> - Reviewing dependency changes in the requirements files.
> - Confirming settings fail safely, moving on to deployment configs
> - Write Modal/Render deploy files and tests, then run the full suite
> - Diagnosing a hanging test in the suite.
> - **Done**

The command timed out, so something in the new tests hangs. I'll run the new test files separately with a timeout to find which one.

> Fixing test helper signature causing rate limit test to hang
>
> - Run remote inference tests alone with a timeout to locate a hang
> - Tracking down the source of a persistent test hang.
> - Fixing async test helper, then investigating deploy-file test hang
> - Fix test helper and run remote and deploy-file tests with timeouts
> - Verifying test suite and deployment checks succeeded.
> - Updating deprecated Modal attributes before rerunning full test suite
> - Find non-deprecated Modal app introspection API and start full suite in background
> - Debugging a test that suddenly started hanging.
> - Fixing test helper signature causing rate limit test to hang
> - Fix the hanging test and inspect the non-deprecated Modal introspection attributes
> - **Done**

`registered_web_endpoints` is the non-deprecated attribute, and it confirms the endpoint names. I'll switch the deploy-file test to it and run the full suite.

> Checking test suite stability with repeated runs.
>
> - Update deploy test to non-deprecated API and run full suite with timeout
> - Checking test suite stability with repeated runs.
> - **Done**

All 184 tests pass. In-process tests can hide real network problems, so I'll also run the inference server on a real socket with uvicorn and call it from the actual client over HTTP.

> Noting security caveats and drafting explicit commit instructions.
>
> - Run the inference server on a real socket and test the client over HTTP; repeat suite for flakiness
> - Noting security caveats and drafting explicit commit instructions.
> - **Done**

Everything passes, including over a real network socket. One last check on how Modal's CLI loads secrets, since a `.env`-based method would save you a long command.

> Ran command, presented file
>
> - Check Modal CLI options for creating secrets from a dotenv file
> - Presenting file(s)...
> - **Done**

> File: [/mnt/user-data/outputs/mediscan-backend/deploy/modal_inference.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fdeploy%2Fmodal_inference.py)

> File: [/mnt/user-data/outputs/mediscan-backend/deploy/modal_api.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fdeploy%2Fmodal_api.py)

> File: [/mnt/user-data/outputs/mediscan-backend/render.yaml](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Frender.yaml)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/services/inference_types.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Fservices%2Finference_types.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/services/inference_wire.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Fservices%2Finference_wire.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/services/remote_inference.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Fservices%2Fremote_inference.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/services/inference_server.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Fservices%2Finference_server.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/services/inference_service.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Fservices%2Finference_service.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/services/torch_inference.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Fservices%2Ftorch_inference.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/core/config.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Fcore%2Fconfig.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/core/rate_limit.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Fcore%2Frate_limit.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/routers/inference.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Frouters%2Finference.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/scripts/check_models.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Fscripts%2Fcheck_models.py)

> File: [/mnt/user-data/outputs/mediscan-backend/requirements.txt](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Frequirements.txt)

> File: [/mnt/user-data/outputs/mediscan-backend/requirements-dev.txt](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Frequirements-dev.txt)

> File: [/mnt/user-data/outputs/mediscan-backend/tests/test_remote_inference.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Ftests%2Ftest_remote_inference.py)

> File: [/mnt/user-data/outputs/mediscan-backend/tests/test_deploy_files.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Ftests%2Ftest_deploy_files.py)

> File: [/mnt/user-data/outputs/mediscan-backend/tests/test_torch_inference.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Ftests%2Ftest_torch_inference.py)

> File: [/mnt/user-data/outputs/mediscan-backend/tests/test_rate_limit.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Ftests%2Ftest_rate_limit.py)

## User:

> 10/3/2026 18:55:53

> File: 

iv'e added all the files and committed the changes and iv'e uploaded the model inference to modal.com i want to host the API on fastapicloud.com  but i ran into this error

## Assistant:

> 10/3/2026 18:57:21

> Diagnosing why the deployment upload is missing files.
>
> - Listing verification commands and required deployment environment variables.
> - Investigating why backend.models is missing from the deployment bundle
> - FastAPI Cloud fastapi deploy which files are uploaded .gitignore ignored files .fastapicloudignore
> - Noting an alternative ignore-file option and updating stored deployment facts.
> - Updating memory
> - Diagnosing why the deployment upload is missing files.
> - **Done**

**Cause: the `backend/models` folder never reached the server.** Your settings loaded fine, so the environment variables are right. The crash is the next import: `security.py` asks for `backend.models`, and the uploaded bundle doesn't contain that folder. Every other `backend/` package is there.

The likely culprit is a `.gitignore` rule. FastAPI Cloud's deploy tool builds its upload archive by walking your project with ignore rules, and a `.fastapicloudignore` file can un-ignore paths that `.gitignore` excludes. If you added `models/` to `.gitignore` to keep your model-weights folder out of git, that rule also matches `backend/models/`. Git still has those files from your earlier commit, because ignore rules only stop new files from being added. The deploy tool follows the rule anyway.

**Confirm it** from `MEDISCAN/`:
```bash
git check-ignore --no-index -v backend/models/user.py
```
It prints the matching rule, such as `.gitignore:14:models/`. `--no-index` is needed because the file is already tracked.

**Fix it** by editing that line in `.gitignore` to start with a slash:
```
/models/
```
The leading slash limits the rule to the top-level weights folder. Then check that nothing else the app needs is hidden:
```bash
find backend migrations -type f -name '*.py' -not -path '*/venv/*' | git check-ignore --no-index -v --stdin
```
This should print nothing. Then commit `.gitignore` and redeploy:
```bash
git add .gitignore
git commit -m "fix: anchor models/ ignore rule so backend/models is deployed"
```
If you'd rather not touch `.gitignore`, create a `.fastapicloudignore` containing `!backend/models/`.

Also run `git ls-files backend/models`. It should list 7 files. If it's empty, `git add backend/models` first.

**Once it starts, check these three things:**
1. **Health:** open `/health` and then `/health/ready` on your app's URL.
2. **Proxy hops:** FastAPI Cloud likely sits behind a proxy, so every user may share one IP in the rate limiter. Log in once, then run this in Neon's SQL editor:
   ```sql
   select ip_address, action, created_at from audit_logs order by created_at desc limit 5;
   ```
   If the address is a private one (10.x, 172.16-31.x, 100.64.x) instead of your public IP, set `TRUSTED_PROXY_HOPS=1`, redeploy, and check again.
3. **CORS:** set `CORS_ORIGINS` to your frontend's address. If the dashboard has an instance count, keep it at 1, because the rate-limit counters live in memory.

Then call `POST /predict/warmup` and a real `/predict`. The first request may take 30-60 seconds while Modal wakes. Paste any new log output, minus secrets, if something else fails.

---

**Sources:**

- [github.com](https://github.com/fastapilabs/fastapi-cloud-cli/pull/106/files)
- [github.com](https://github.com/fastapilabs/fastapi-cloud-cli/pull/115/files)
- [github.com](https://github.com/fastapilabs/fastapi-cloud-cli/pull/106.diff)
- [About FAVV (FastAPI+ViteVue)](https://libraries.io/pypi/streamlit-antv)
- [Python Firebase Authentication FastAPI](https://www.github.com/rahulprakash11/Python-Firebase-Authentication-FastAPI)
- [Python API Development with FastAPI](https://notes.kodekloud.com/docs/Python-API-Development-with-FastAPI/Deployment/Setup-Git)
- [claudskills.com](https://claudskills.com/skills/fastapicloud-deploy/SKILL.md)

## User:

> 10/3/2026 19:00:51

find backend migrations -type f -name '*.py' -not -path '*/venv/*' | git check-ignore --no-index -v --stdin
.gitignore:21:models/   backend/models/patient.py
.gitignore:21:models/   backend/models/__init__.py
.gitignore:21:models/   backend/models/token.py
.gitignore:21:models/   backend/models/base.py
.gitignore:21:models/   backend/models/user.py
.gitignore:21:models/   backend/models/audit.py
.gitignore:21:models/   backend/models/scan.py

## Assistant:

> 10/3/2026 19:01:00

> Tracking down which gitignore rule excludes the model files.
>
> - Tracking down which gitignore rule excludes the model files.
> - **Done**

That confirms it. Line 21 of `.gitignore` contains `models/`, which matches all 7 files in `backend/models/`, so none of them were uploaded.

**Fix.** This command rewrites line 21 to `/models/`, anchored to the project root, and prints the result:
```bash
sed -i '21s|^models/$|/models/|' .gitignore && sed -n '21p' .gitignore
```
It should print `/models/`. If it prints anything else, open `.gitignore` and add the leading slash to that line by hand.

**Check the result.** Run these three commands:
```bash
find backend migrations -type f -name '*.py' -not -path '*/venv/*' | git check-ignore --no-index -v --stdin
git check-ignore -v models/
git ls-files backend/models | wc -l
```
- The first should print nothing. That means no source file is hidden from the upload anymore.
- The second should still print the `/models/` rule, which confirms your weights folder stays out of git and out of the upload.
- The third should print `7`. If it prints `0`, run `git add backend/models` before committing.

**Commit and redeploy:**
```bash
git add .gitignore
git commit -m "fix: anchor models/ ignore rule so backend/models is deployed"
git push
```
Then redeploy the same way you did before. In the logs you should now see the app start without the `ModuleNotFoundError`. When it's up, work through the three checks from my last message (health, proxy hops, CORS), then try `/predict/warmup` and a real `/predict`.

If the deploy fails with a different error, paste the new logs. Redact secrets first. Let me know too if the `sed` command printed something unexpected.

## User:

> 10/3/2026 19:07:26

> File: 

## Assistant:

> 10/4/2026 19:25:20

> Testing the exclusion logic with a sandbox reproduction.
>
> - Testing the exclusion logic with a sandbox reproduction.
> - **Done**

The new logs show a new deployment, but it fails with the same error. Before guessing, I'll reproduce the deploy tool's file selection to find out how the folder can still get dropped after your fix. FastAPI Cloud's CLI uses the `rignore` library for this.

> Assembling clear diagnostic commands and a concrete fix plan.
>
> - Reproduce FastAPI Cloud's file selection with rignore under several .gitignore situations
> - Assembling clear diagnostic commands and a concrete fix plan.
> - **Done**

Same error, but this is a new deployment (the deployment ID changed and it started around 18:03 UTC). So that bundle still doesn't contain `backend/models`. Everything before that import ran fine, so your settings and the rest of the app are not the problem.

I reproduced the upload's file selection with `rignore`, the library the FastAPI Cloud CLI uses, and found four things:
- **Your original situation:** a `models/` rule added after the files were committed still hides `backend/models` from the upload, even though git tracks them. `backend/core` is included and `backend/models` is missing, which matches your logs.
- **Anchoring the rule fixes it:** `/models/` restores the folder.
- **My `sed` command can silently do nothing:** if `.gitignore` has Windows (CRLF) line endings, the line stays unchanged. The `[[:space:]]*` version below handles that.
- **A hidden second rule can take over after the fix:** git only reports the strongest matching rule, so a rule in a global git ignore file or in `.git/info/exclude` could have been shadowed by line 21 until now.

A `.fastapicloudignore` containing `!backend/models/` overrides all of these, whatever the source.

**Fix, in order:**
```bash
git check-ignore --no-index -v backend/models/user.py   # shows which rule is still hiding it (file:line:pattern); empty means none
printf '!backend/models/\n' > .fastapicloudignore
sed -i 's|^models/[[:space:]]*$|/models/|' .gitignore
```

**Verify what will upload, before deploying.** This runs the same file selection locally:
```bash
pip install rignore
python - << 'EOF'
import rignore
files = [str(p) for p in rignore.walk(".", additional_ignore_paths=[".fastapicloudignore"])]
print([f for f in files if "backend/models" in f])
EOF
```
You should see `backend/models` plus its 7 files. If the list is empty, paste the output of the first `git check-ignore` command.

**Then commit and redeploy:**
```bash
git add .gitignore .fastapicloudignore
git commit -m "fix: make sure backend/models is included in FastAPI Cloud uploads"
git push
```
Run your usual deploy command again.

If the verification list looks right and the deploy still fails, tell me how you deploy: the CLI from your folder, or a connected GitHub branch. A GitHub deployment builds from the pushed commit instead, so the cause would be different.

## User:

> 10/4/2026 19:28:37

git check-ignore --no-index -v backend/models/user.py   # shows which rule is still hiding it (file:line:pattern); empty means none
printf '!backend/models/\n' > .fastapicloudignore
sed -i 's|^models/[[:space:]]*$|/models/|' .gitignore
.gitignore:46:!backend/models/**        backend/models/user.py

## Assistant:

> 10/5/2026 17:02:04

> Confirming the file is no longer excluded from uploads.
>
> - Confirming the file is no longer excluded from uploads.
> - **Done**

That output has an unexpected line, so I'll test what it means before drawing conclusions. A rule starting with `!` is an un-ignore rule, and I need to know whether it can actually override a `models/` rule.

> Ran command
>
> - Test how a negation rule interacts with a models/ rule for git and for the uploader
> - **Done**

## User:

> 10/5/2026 23:40:32

> File: 

iv'e deployed it successfully but i'm testing the api and i got this message from EchoApi for vscode 

```json
{
	"detail": [
		{
			"type": "missing",
			"loc": [
				"body"
			],
			"msg": "Field required",
			"input": null
		}
	]
}
```

this is the link for the api at fast apicloud.com  https://mediscan.fastapicloud.dev     i was going through the logs and i got these

## Assistant:

> 10/5/2026 23:42:12

> Explaining the JSON login fix and verifying proxy security.
>
> - Structuring the script around a reusable session-based reset function.
> - Flagging urgent security issues before building a password-reset tool
> - Add a reset-password script with tests and run the full suite
> - Presenting file(s)...
> - Explaining the JSON login fix and verifying proxy security.
> - Updating memory
> - **Done**

Your API is up, and the 422 is a request-format problem, not a bug. The urgent part is the password.

**1. Change your password now.**
Your two `/auth/login` requests put the email and password in the URL (`?email=...&password=...`). FastAPI Cloud logs full URLs, so that password is now in their access logs and in this chat. I'm not repeating it here. There was no password-change feature, so I wrote a reset tool and tested it (187 tests pass). It resets the password and signs the user out everywhere.

Copy `reset_password.py` into `backend/scripts/` and `test_reset_password.py` into `tests/`. Then run this from `MEDISCAN/`, with your `.env` pointing at the production Neon database:
```bash
python -m backend.scripts.reset_password --email <your admin email>
```
It asks for the new password twice, with a 10-character minimum. Use a genuinely new one, and change any other account where you reused the old one.

**2. The 422 error.**
`/auth/login` reads the credentials from a JSON body, and your request sent them as query parameters, so FastAPI reports the body as missing. In EchoAPI:
- **Method and URL:** `POST https://mediscan.fastapicloud.dev/auth/login`
- **Body:** type Raw, format JSON, with a `Content-Type: application/json` header:
  ```json
  {"email": "you@example.com", "password": "your-new-password"}
  ```

A 200 response returns an `access_token` and a `refresh_token`. Send the first as `Authorization: Bearer <access_token>` on later requests.

**3. The 404s on `/`, `/docs` and `/api/docs` are expected.**
In production the interactive docs are switched off, and there's no root page. Paths that exist include `/health`, `/health/ready`, `/auth/me`, `/patients`, `/predict/warmup` and `/predict`. A good test order is: login, then `GET /auth/me`, `POST /patients`, `POST /predict/warmup`, and finally `POST /predict` as a multipart form with a `file` and the `patient_id`. If you'd like the docs page available while testing, I can add a switch for it.

**4. Check that rate limiting sees real client addresses.**
Your logs show two different client IPs, which suggests the platform passes the real address through. Confirm that it can't be spoofed with this request, which uses a fake email so no credentials are involved:
```bash
curl -s -X POST https://mediscan.fastapicloud.dev/auth/login \
  -H "X-Forwarded-For: 1.2.3.4" -H "Content-Type: application/json" \
  -d '{"email":"nobody@example.com","password":"wrong-password-123"}'
```
Then run this in Neon's SQL editor:
```sql
select ip_address, action, created_at from audit_logs order by created_at desc limit 3;
```
If the newest row shows your own address, leave `TRUSTED_PROXY_HOPS` at 0. If it shows `1.2.3.4`, tell me, because the per-IP limits could be bypassed.

**Commit**, after checking `git status --short`:
```bash
git add backend/scripts/reset_password.py tests/test_reset_password.py .gitignore .fastapicloudignore
git commit -m "feat(scripts): reset_password tool; chore: deploy ignore rules"
git push
```

Tell me what the login returns once you've changed the password.

> File: [/mnt/user-data/outputs/mediscan-backend/backend/scripts/reset_password.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Fscripts%2Freset_password.py)

> File: [/mnt/user-data/outputs/mediscan-backend/tests/test_reset_password.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Ftests%2Ftest_reset_password.py)

## User:

> 10/6/2026 10:32:23

login returns a status code of 200 and also the refresh and auth token

## Assistant:

> 10/6/2026 10:32:33

> Verifying the login fix and checking the password reset step.
>
> - Verifying the login fix and checking the password reset step.
> - **Done**

Login works, so the deployed API, Neon and your credentials are connected. First, did you run the password reset? The old password is still in the logs, so please do it before testing further.

Here's the test sequence, with the result to expect from each step:

1. **`GET /auth/me`** with the header `Authorization: Bearer <access_token>`. It should return your account with `"role": "admin"` and `"is_approved": true`.
2. **`POST /patients`** with the same header and the JSON body `{"sex": "female", "year_of_birth": 1980}`. It should return 201 with a `patient_code` like `PT-XXXXXXXX` and an `id`. Copy the `id`.
3. **`POST /predict/warmup`** with the same header. It should return 202, and Modal starts waking in the background.
4. **`POST /predict`**, set as a multipart form with two fields. `file` is a real chest X-ray PNG or JPEG, and `patient_id` is the id from step 2. In EchoAPI, raise the request timeout to about 120 seconds, because the first call after idle can take 30-60 seconds.

**What step 4 returns:**
- **Success:** a 200 with `"saved": true`, `"inference_backend": "remote"`, and findings for Pneumonia, Cardiomegaly and Lung Nodule / Mass, plus Tuberculosis if you configured `TB_MODEL_ID` on Modal. Model names should have no `mock-` prefix.
- **503 with `Retry-After`:** Modal is still starting or unreachable. Wait about 30 seconds and retry.
- **Heatmaps missing:** Grad-CAM failed inside Modal. Open the Modal dashboard logs for the `mediscan-inference` app and send me the error.

Use a real X-ray rather than a synthetic image, so the scores mean something. Step 4 is also the first time the real PyTorch code runs anywhere, because I couldn't run it in my environment. If it fails, the Modal logs will have the reason.

Two things are still pending from earlier:
- The `X-Forwarded-For` spoofing check from my last message, which shows whether rate limiting sees real client addresses. Run the curl command and send me the `ip_address` row from the Neon query.
- Your access token lasts 15 minutes. After that, call `POST /auth/refresh` with `{"refresh_token": "..."}` to get a new pair.

Send me whatever each step returns, with tokens removed, and we'll fix whatever breaks.

## User:

> 10/6/2026 11:03:32

auth/me keeps returning invalid or expired token

## Assistant:

> 10/6/2026 11:04:02

> Weighing optional hardening versus quick, safe diagnostic logging.
>
> - Weighing optional hardening versus quick, safe diagnostic logging.
> - **Done**

`Invalid or expired token` means the server received a `Bearer` header, otherwise you'd see `Not authenticated`. The token itself failed validation. Check these in order; each takes seconds:

1. **Access token, not refresh token.** The login response has both. The access token is long, starts with `eyJ` and contains two dots. The refresh token is a shorter string without dots. Sending the refresh token as the Bearer value produces exactly this error.
2. **No doubled prefix.** If you use EchoAPI's Auth tab with type Bearer Token, paste only the token. If you add a manual header instead, its value is `Bearer <token>`, and you shouldn't also use the Auth tab. `Bearer Bearer eyJ...` fails with this same message. Also check for surrounding quotes or a trailing space or newline picked up when copying from the JSON response.
3. **Fresh token.** Access tokens last 15 minutes (`expires_in: 900`). Log in again and call `/auth/me` right away.
4. **Look inside the token.** This runs locally and needs no secret:
   ```bash
   python -c "import jwt,sys,datetime as d; p=jwt.decode(sys.argv[1], options={'verify_signature': False}); print(p['type'], p['role'], 'expires', d.datetime.fromtimestamp(p['exp']))" "PASTE_ACCESS_TOKEN"
   ```
   - **Healthy:** it prints `access admin expires <a time in the future>`. Compare it with `date`.
   - **Wrong token:** an error like `Not enough segments` means what you pasted isn't an access token, which points to check 1 or 2.

Don't paste tokens into this chat. The output of that command is enough.

If all four checks pass and `/auth/me` still returns 401, the cause is on the server. Two possibilities are a clock difference between server instances and a mismatched `JWT_SECRET_KEY`. I'd then add a log line recording why a token was rejected, never the token itself, so the FastAPI Cloud logs show the exact reason. Tell me what the decode command prints and which check you think applies.

## User:

> 10/6/2026 15:59:32

now to integrate it with the frontend

## Assistant:

> 10/6/2026 16:00:29

> Drafting CORS checks, PNG test setup, and README documentation.
>
> - Drafting CORS checks, PNG test setup, and README documentation.
> - **Done**

I know your frontend lives in `frontend/Mediscan` but not which framework it uses, so I'll write a framework-agnostic API client that works with React, Vue or plain JS. I'll test it against a real running copy of your backend. First I'll check what the sandbox can run.

> Ran command
>
> - Check Node availability for testing a JavaScript API client
> - **Done**

## User:

> 10/7/2026 11:11:17

iv'e already integrated the backend to the frontend   the lecturer in charge of the course is requesting for a progress report on the project i need a detailed report i can write down and submit to the lecturer it should be a summary not something too long

## Assistant:

> 10/7/2026 11:12:21

> Evaluating suspicious embedded instructions within tool output.
>
> - Noting security fixes, deployment hurdles, and remaining tasks.
> - Adding to memory
> - Batch
> - Evaluating suspicious embedded instructions within tool output.
> - Artifact
> - **Done**

https://claude.ai/code/artifact/6c7f8ba6-9cf1-4d7a-b5ef-fa611cd06757

The progress report is ready, about one and a half pages. It covers the project summary, architecture, completed work, key decisions, next steps and limitations. Because you've already integrated the frontend, I dropped the API client work I had started. You can edit the document directly, and it should export to Word or PDF.

**Fill in before you submit:**
- **Header:** your name, the course, your lecturer's name and the date are placeholders.
- **Real-model testing:** the report says end-to-end testing with real X-rays on the deployed models is "in progress." If you've already run real X-rays through `/predict` successfully, say so in section 5.
- **Tuberculosis model:** the report treats it as the next step to enable and validate. If it's already running, update that line.
- **Patient data:** the report doesn't say whether real patient data was used. If only public or test images were used, add one sentence saying so, because lecturers often ask.

If you want a shorter one-page version or a different format, tell me and I'll adjust it.

## User:

> 10/8/2026 12:06:32

done so what;s next

## Assistant:

> 10/8/2026 12:06:53

> Outlining verification steps and evaluation plans for the models.
>
> - Outlining verification steps and evaluation plans for the models.
> - **Done**

Here's what I'd do next, in priority order.

1. **Confirm the password reset.** Your old password is still sitting in FastAPI Cloud's logs, so if you haven't run `python -m backend.scripts.reset_password --email <your admin email>` yet, do it first.

2. **Prove the real models work end to end.** This is the biggest unknown. The real PyTorch and Grad-CAM code has never run anywhere I could test, so your deployment is its first real run. Upload a real X-ray through `/predict` with a `patient_id`, and check for these:
   - `saved: true`
   - model names without a `mock-` prefix
   - non-empty heatmaps for the three chest conditions
   - the first (cold) and second (warm) response times

   If anything fails, the Modal logs for the `mediscan-inference` app will show why. Send me the error.

3. **Enable tuberculosis.** I still need the exact Hugging Face repo ID of your MobileViT model, ideally with a commit hash. I'll tell you which two values to set on Modal and redeploy. Until then TB stays disabled.

4. **Run the two safety checks.** Do the `X-Forwarded-For` spoof test from earlier, and make sure `CORS_ORIGINS` on FastAPI Cloud lists your frontend's address.

5. **Measure model performance.** This would make your final report much stronger. I can write an evaluation script that reports AUC, sensitivity and specificity with confidence intervals, plus a Grad-CAM check that the heatmaps land on lung tissue and not on text or borders. That was the shortcut problem that made you drop your custom models. One caution: the TorchXRayVision model was trained on several public datasets, so test on images from outside them, or state the possible overlap in your report. I need to know which labeled test images you have.

6. **Frontend safety details:**
   - Call `/predict/warmup` when the upload page opens.
   - Show a "try again in N seconds" message on 429 and 503 errors.
   - Draw the heatmap over the central square of the image only.
   - Always show the disclaimer and an "experimental" badge on TB.

7. **Housekeeping:**
   - Commit and push the pending files, and tag a `v0.1` release.
   - Write a README with the architecture and a demo script for presentations.
   - Check your Modal credit usage and Neon's backup options.
   - Later, add a change-password endpoint.

I'd start with 2, then 5. Which one do you want to do first?

## User:

> 10/8/2026 12:10:34

i to 6 are already done it's remaining from 6 to 7 but there are changes i want to make to the frontend but i still do not know how to bundle everything and send it  let me see if i can zip it

## Assistant:

> 10/8/2026 12:10:59

> Refining exclude patterns to protect env files while zipping.
>
> - Refining exclude patterns to protect env files while zipping.
> - **Done**

That leaves item 7 (housekeeping) and your frontend changes. A zip works, but zipping the folder normally would pull in `node_modules` (hundreds of MB) and possibly `.env` files. Use this instead, from your project folder:

```bash
cd ~/Documents/MEDISCAN
ls frontend          # confirm the folder name; I'm assuming frontend/Mediscan
sudo apt install -y zip    # only if zip isn't installed
zip -r mediscan-frontend.zip frontend/Mediscan \
  -x "*/node_modules/*" "*/dist/*" "*/build/*" "*/.vite/*" "*/.next/*" "*/coverage/*" \
     "*/.git/*" "*/.env" "*/.env.local" "*/.env.production" "*/.env.development" \
     "*.log" "*/package-lock.json"
```

**Check it before you upload:**
```bash
ls -lh mediscan-frontend.zip
unzip -l mediscan-frontend.zip | grep -i -E "\.env|node_modules|\.pem|secret"
```
- **Size:** it should be a few MB at most. If it's much bigger, run `unzip -l mediscan-frontend.zip | sort -k1 -nr | head` to see the largest files. Usually it's images or videos in `public/`.
- **Secrets:** the second command should print nothing except `.env.example`. If you see a real `.env` file, don't upload the zip.

**With the zip, tell me:**
- The changes you want, listed per page or screen.
- Screenshots of anything that looks wrong, since I can't open your app in a browser.
- Any design notes you have (colors, wireframes).

**What I'll do with it:** read the code, make the changes, install the dependencies and run the build and lint to confirm it still compiles, then send back only the changed files with instructions for where they go.

You don't need to zip everything. I already have the backend, so for a change to one or two pages you can upload just those files, or paste their contents.

Whenever you're ready for the remaining housekeeping, I can write the README with the architecture diagram and a demo script for presenting to your lecturer.

## User:

> 10/8/2026 12:14:33

zip -r mediscan-frontend.zip frontend/Mediscan   -x "*/node_modules/*" "*/dist/*" "*/build/*" "*/.vite/*" "*/.next/*" "*/coverage/*"      "*/.git/*" "*/.env" "*/.env.local" "*/.env.production" "*/.env.development"      "*.log" "*/package-lock.json"
        zip warning: name not matched: frontend/Mediscan

zip error: Nothing to do! (mediscan-frontend.zip)

## Assistant:

> 10/8/2026 12:14:46

> Checking whether the frontend lives on a separate branch.
>
> - Checking whether the frontend lives on a separate branch.
> - **Done**

That error means the path `frontend/Mediscan` doesn't exist where you ran the command. I took that name from an old line in your `.gitignore`, so it was a guess. Two likely reasons: the folder has a different name or location, or your frontend is on a different git branch from the backend, the same thing that hid your notebooks. Run these from `MEDISCAN/`:

```bash
pwd
ls
git branch --show-current
find ~ -maxdepth 4 -name package.json -not -path "*/node_modules/*" -not -path "*/anaconda3/*" 2>/dev/null
```

The `find` output lists every JavaScript project on your machine. The frontend is the folder containing the `package.json` with your app's dependencies, such as React or Vite.

**If the frontend folder is on disk**, zip it by its real path:
```bash
cd <parent folder of the frontend>
zip -r ~/mediscan-frontend.zip <frontend folder name> \
  -x "*/node_modules/*" "*/dist/*" "*/build/*" "*/.vite/*" "*/.next/*" "*/.git/*" \
     "*/.env" "*/.env.*" "*.log" "*/package-lock.json"
```
Check it is small and has no secrets:
```bash
ls -lh ~/mediscan-frontend.zip
unzip -l ~/mediscan-frontend.zip | grep -i -E "\.env|node_modules|\.pem"
```
The second command should print nothing, apart from a harmless `.env.example`.

**If it's on a different branch** (your `find` shows nothing, or `ls` shows no frontend folder), find the branch with:
```bash
git branch -a
git ls-tree -r --name-only origin/main | grep package.json
```
Repeat the second line with other branch names from the first list. Once you know the branch, you can zip it without switching, and git only includes committed files, so `node_modules` and `.env` can't leak:
```bash
git archive --format=zip --output="$HOME/mediscan-frontend.zip" <branch> <frontend folder path>
```
Uncommitted changes won't be in that zip, so commit your integration work on that branch first.

Paste the outputs of the first block and I'll tell you the exact command.

## User:

> 10/8/2026 12:15:20

it's on a different branch

## Assistant:

> 10/8/2026 12:15:38

> Building a safe archive command and verifying its contents.
>
> - Building a safe archive command and verifying its contents.
> - **Done**

Then `git archive` is the cleanest route. It zips a branch's committed files without switching branches, and it can't include `node_modules` or untracked `.env` files. Your old `.gitignore` mentioned `frontend/Mediscan`, so the folder is probably that path, but first confirm which branch holds your latest frontend work:

```bash
cd ~/Documents/MEDISCAN
git fetch --all
for b in $(git for-each-ref --format='%(refname:short)' refs/heads refs/remotes | grep -v 'HEAD$'); do
  echo "== $b  ($(git log -1 --format='%cs %s' "$b" | cut -c1-70))"
  git ls-tree -r --name-only "$b" | grep -E '(^|/)package\.json$' | grep -v node_modules | head -3
done
```
Each block shows a branch name, its newest commit with date, and any `package.json` paths in it. Pick the branch whose newest commit matches your frontend integration work. The folder holding that `package.json` is the frontend.

Then zip that branch and folder. Replace `<branch>` and, if needed, the path:
```bash
git archive --format=zip --output="$HOME/mediscan-frontend.zip" <branch> frontend/Mediscan
ls -lh ~/mediscan-frontend.zip
unzip -l ~/mediscan-frontend.zip | grep -i -E "\.env|node_modules|\.pem|secret"
```
The size should be a few MB. The `grep` should print nothing, except possibly a harmless `.env.example`. If it shows a real `.env`, don't upload the zip. A secrets file committed to git should be treated as exposed, so change those values.

`git archive` only includes committed work. If you have uncommitted frontend edits, commit them on that branch first, or tell me what they are.

If you want to run the frontend locally while you work on it, a second checkout leaves your current branch alone:
```bash
git worktree add ../MEDISCAN-frontend <branch>
```
Then zip from `../MEDISCAN-frontend` with the earlier `zip -r` command, and run `npm install` and `npm run dev` there.

Once you upload the zip, send the changes you want, listed by page or screen, and screenshots of anything that looks wrong, since I can't open your app in a browser. I'll build it here and send back only the changed files.

## User:

> 10/8/2026 12:21:13

just hold up the frontend folder is contained in the main branch so how do i go about it

## Assistant:

> 10/8/2026 12:21:24

> Figuring out how to zip the frontend from the main branch.
>
> - Figuring out how to zip the frontend from the main branch.
> - **Done**

Since the frontend is on `main`, you can zip it straight from git without switching branches. Run these from `MEDISCAN/`.

**1. Find the exact folder path on `main`:**
```bash
git fetch origin
git ls-tree -d --name-only origin/main
git ls-tree -r --name-only origin/main | grep -E '(^|/)package\.json$' | grep -v node_modules
```
The folder containing the app's `package.json` is the frontend. The second command prints something like `frontend/Mediscan/package.json`, so the folder is `frontend/Mediscan`.

**2. Check which copy of `main` has your latest work:**
```bash
git log -1 --format='%h %cs %s' main
git log -1 --format='%h %cs %s' origin/main
```
Use `main` in the next step if its commit is newer. That means you committed frontend changes locally and haven't pushed them. Otherwise use `origin/main`.

**3. Zip it** (adjust the path to match step 1):
```bash
git archive --format=zip --output="$HOME/mediscan-frontend.zip" origin/main frontend/Mediscan
ls -lh ~/mediscan-frontend.zip
unzip -l ~/mediscan-frontend.zip | grep -i -E "\.env|node_modules|\.pem|secret"
```
The size should be a few MB, and the `grep` should print nothing. The only exception is a harmless `.env.example`. If it shows a real `.env`, don't upload the zip, and change any secrets in it.

**Check for uncommitted changes.** `git archive` includes only committed files. You said you integrated the backend into the frontend, and since your current branch has no frontend folder, you must have edited it somewhere else. Which of these applies?
- **Changes committed on `main`:** step 3 already includes them.
- **Uncommitted edits in a `main` checkout:** commit them there first. Run `git status --short` in that folder, then `git add -A` and `git commit -m "integrate backend"`. Don't switch branches here while you have uncommitted backend work.
- **Edits in a separate folder or clone:** zip that folder directly:
  ```bash
  cd <folder that contains the frontend folder>
  zip -r ~/mediscan-frontend.zip <frontend folder> \
    -x "*/node_modules/*" "*/dist/*" "*/build/*" "*/.vite/*" "*/.git/*" "*/.env" "*/.env.*" "*.log" "*/package-lock.json"
  ```

If any command errors, paste the output.

## User:

> 10/8/2026 12:23:42

git fetch origin
git ls-tree -d --name-only origin/main
git ls-tree -r --name-only origin/main | grep -E '(^|/)package\.json$' | grep -v node_modules
backend
deploy
frontend
migrations
tests
frontend/package.json

## Assistant:

> 10/8/2026 12:23:50

> Locating the correct frontend directory in the repository.
>
> - Locating the correct frontend directory in the repository.
> - **Done**

The frontend is the `frontend` folder, with `package.json` directly inside it. The `frontend/Mediscan` path I guessed from your old `.gitignore` was wrong. Your `origin/main` also lists `backend`, `deploy`, `migrations` and `tests`, so your backend work is on `main` too, which makes things simpler.

**Zip the frontend straight from `main`:**
```bash
git archive --format=zip --output="$HOME/mediscan-frontend.zip" origin/main frontend
ls -lh ~/mediscan-frontend.zip
unzip -l ~/mediscan-frontend.zip | grep -i -E "\.env|node_modules|\.pem|secret"
unzip -l ~/mediscan-frontend.zip | head -25
```
- **Size:** it should be a few MB. If it's tens of MB, large images or videos are probably committed in `frontend/public` or `frontend/src/assets`, which is fine but worth knowing about.
- **Secrets:** the first `unzip` should print nothing, except possibly a harmless `.env.example`. If it shows a real `.env`, don't upload the zip. Treat anything inside as exposed and change those values.
- **Contents:** the second `unzip` shows the first 25 entries, so you can see `package.json`, `src/` and the rest.

**Is `main` your latest work?** Run:
```bash
git log -1 --format='%h %cs %s' origin/main
```
It should show your most recent frontend commit. If you made frontend changes since then, commit and push them to `main` first, because the zip contains only committed files.

**Then send me:**
1. `mediscan-frontend.zip`.
2. The changes you want, listed per page or screen.
3. Screenshots of anything that looks wrong, since I can't open your app in a browser.

With the zip, I'll install dependencies, make the changes, and run the build and lint to confirm it still compiles. Then I'll send back only the changed files with instructions for where they go.

## User:

> 10/8/2026 12:38:51

> File: mediscan-frontend.zip

![1791459022552_image.png](data:image/webp;base64,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)

> File: frontend-integration.md

the dashboard still displays the dummy data we used when we were presenting the project demo and also the pages in the dashboard still display the hardcoded values we used for  the demo  the notifications button does not do anything , go through the remaining pages also. the scan queue does not provide a details page for each patient too i want to change it all to reflect dynamic values tailored for each profile the signup page also has features i forgot to include in the backend and if i'm testing the signup it returns a demo page and not the actual thing.   i added the frontend integration document i used when integrating the backend and frontend too do not make any changes to the styles just fix the required components .

## Assistant:

> 10/8/2026 12:44:57

> Planning notifications, signup fields, and patient detail pages.
>
> - Planning notifications, signup fields, and patient detail pages.
> - Adding to memory
> - Read the frontend design skill before touching UI code
> - **Done**

The design skill is about creating new visuals, and you've asked me not to touch styles, so I'll reuse your existing markup and classes. Let me look at what's in the zip.

> Reviewing the project's tech stack and included files.
>
> - Unzip the frontend and list its structure and package.json
> - Reviewing the project's tech stack and included files.
> - **Done**

It's a React 19, TypeScript, Tailwind and Vite app. I'll start with the routing, the API layer and the demo data, because they decide how much needs rewiring.

> Reviewing how the frontend's scope should shape the backend design.
>
> - Get file sizes and read main and App routing
> - Mapping out the structure of an organisation-based product.
> - Read the API layer, types and main layout
> - Auditing the existing lib layer against the backend.
> - Checking the login and signup pages next
> - Read the login and organisation signup pages
> - Designing a signup form for healthcare organisations.
> - Mapping the signup flow and missing organisation backend layer
> - Read the dummy data and the email verification page
> - Reviewing how the frontend's scope should shape the backend design.
> - **Done**

Now the dashboard itself, with its row, stat card and activity components, plus the top bar and sidebar.

> Aligning the heatmap overlay and expanding predictions to multiple conditions.
>
> - Read the dashboard page and its components
> - Scoping which dynamic features to build versus defer.
> - Diagnosing mismatched dashboard metrics before reviewing remaining UI pages
> - Read top bar, sidebar and the case upload flow
> - Auditing the case upload flow for missing or dropped fields.
> - Checking why only file and patient ID reach the backend
> - Read the neural analysis page, its components and the patient reports list
> - Aligning the heatmap overlay and expanding predictions to multiple conditions.
> - **Done**

The Neural Analysis page is your scan detail view, with the image, heatmap overlay and AI panel, but it's fed from a single hardcoded `scanData` object. Next the report view and report components.

> Mapping report fields against current backend data model
>
> - Read the report view page and key report components
> - Structuring a clinical imaging report format.
> - Mapping report fields against current backend data model
> - Read the settings page and the top of each settings section
> - **Done**

I'll skim the two remaining auth-flow pages for what they collect and where they call the API.

> Setting up a new database migration for schema changes.
>
> - Skim onboarding and staff-invite pages for fields and API stubs
> - Settling scan output fields and organisation quota rules.
> - Scoping the gaps before building backend and frontend fixes
> - Write the new organisation, report, notification, invitation and token models
> - Setting up a new database migration for schema changes.
> - **Done**

Now the migration. I'll generate it on a real Postgres database that already contains pre-existing rows, to prove that your current data survives the upgrade.

> Testing migration up and down for missing upgrade output.
>
> - Generate and test migration 0003 against Postgres with pre-existing data
> - Testing migration up and down for missing upgrade output.
> - **Done**

The upgrade works with your legacy rows intact, and there's no schema drift. But the final downgrade-then-upgrade round trip printed no "Running upgrade" line, so I need to look at that.

> Diagnosing a failing database migration downgrade.
>
> - Re-test the migration downgrade and upgrade round trip with full output
> - Diagnosing a failing database migration downgrade.
> - **Done**

The upgrade is fine, but the auto-generated downgrade can't drop the unnamed foreign keys it created. I'll give them explicit names so rollbacks work.

> Ran command, presented file
>
> - Find the unnamed foreign key operations in the generated migration
> - Presenting file(s)...
> - **Done**

> File: [/mnt/user-data/outputs/mediscan-backend/backend/models/email_token.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Fmodels%2Femail_token.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/models/invitation.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Fmodels%2Finvitation.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/models/notification.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Fmodels%2Fnotification.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/models/organisation.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Fmodels%2Forganisation.py)

> File: [/mnt/user-data/outputs/mediscan-backend/backend/models/report.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fbackend%2Fmodels%2Freport.py)

> File: [/mnt/user-data/outputs/mediscan-backend/migrations/versions/20261008_0003_organisations_reports_notifications.py](https://claude.ai/api/organizations/1b861a1b-84ac-4f9b-9d3f-981b645cb46c/conversations/17f7aa78-678a-4a15-8b66-065c1701ffbe/wiggle/download-file?path=%2Fmnt%2Fuser-data%2Foutputs%2Fmediscan-backend%2Fmigrations%2Fversions%2F20261008_0003_organisations_reports_notifications.py)

Powered by Claude Exporter (https://www.ai-chat-exporter.net)
