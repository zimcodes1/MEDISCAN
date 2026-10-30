# MediScan backend: progress summary

Status as of 29 Oct 2026. Source of truth for the work is API contract v3 (`docs/api-contract.md`).

Legend: ✅ done · 🔶 done but needs your confirmation · ⬜ not started

---

## 1. Where the code lives

| Thing | Location |
|---|---|
| Live backend | Repo root on the `backend` branch (`backend/`, `migrations/`, `tests/`, `alembic.ini`) |
| Backend work branch | `backend-orgs`, checked out in the worktree `~/Documents/MEDISCAN-backend` |
| UI work | Separate branch in `~/Documents/MEDISCAN` |
| `build/space/` | A local dev copy from the UI work, git-ignored. **Not** the live backend. Ignore it. |
| Hosting | FastAPI Cloud, deployed with `fastapi deploy` from the worktree |
| Database | Neon Postgres. Dev branch (schema-only copy, fake rows) and production |

---

## 2. Done so far

### 2.1 Review of the backend against contract v3 ✅

Findings that shaped the plan:

- Scoping has to live in `get_accessible_patient` / `get_accessible_scan` **and** in every list query and `/admin/*` route.
- Clinicians used to see only patients they created. The contract needs organisation-wide visibility.
- `POST /auth/register` creates users with no organisation, so it had to be handled.
- Activity feed needs its own table (the existing `audit_logs` has no organisation and no readable messages).
- Flag counts in `/dashboard/stats` must be computable in SQL, not only in Python.
- Correction to an early note: the "`GET /scans` leaks every scan" problem existed only in the `build/space` dev copy. The `backend` branch required a `patient_id`, so it had no leak.

### 2.2 Phase 1: organisations foundation ✅

Committed on `backend-orgs` as *"Organisations foundation: tenancy scoping, migration 0003, isolation tests"* (22 files).

**Behaviour changes**

- New `organisations` table. `organisation_id` added to `users`, `patients` and `scans`. `users.is_platform_admin` added.
- New role `radiologist`.
- Patients, scans, images, heatmaps and `/admin/*` are scoped to the caller's organisation. Another organisation's data returns **404**, identical to a missing record.
- Visibility inside an organisation is **org-wide**: any clinician or radiologist sees all of its patients and scans (`created_by_id` is kept only for attribution).
- A scan's `organisation_id` is always copied from its patient, never from request input.
- `GET /scans` now works without `patient_id` and returns the caller's whole organisation. It also tolerates `patient_id=` and `patient_id=null`, and returns 422 for a malformed value.
- Suspended or pending organisations lock out their members on every request, at login and at token refresh.
- **Temporary:** `POST /auth/register` still works. New sign-ups join "Default Organisation" as pending users for its admin to approve. This is removed in phase 4.
- `create_admin` script gained `--platform-admin` and assigns the default organisation.

**Files changed**

- Code: `backend/core/config.py`, `core/deps.py`, `models/__init__.py`, `models/organisation.py` (new), `models/patient.py`, `models/scan.py`, `models/user.py`, `routers/admin.py`, `routers/scans.py`, `scripts/create_admin.py`, `services/auth_service.py`, `services/patient_service.py`, `services/scan_service.py`
- Migration: `migrations/versions/20261019_0003_organisations.py`
- Tests: `tests/__init__.py`, `conftest.py`, `helpers.py`, `test_images.py`, `test_isolation.py` (new), `test_migration.py` (new), `test_models.py`, `test_predict.py`

**Tests**

- 20 new isolation tests plus 1 migration test. Four existing tests encoded the old "clinicians only see their own patients" rule and were updated to the org-wide rule. Seven tests in `test_models.py` were adapted to create organisations.
- Full suite in your venv: **208 passed**.
- Mutation check: with the scoping removed from three queries, 10 tests fail, so they do detect a regression.
- `alembic check` reports no difference between models and migrations.

### 2.3 Database migration 0003 ✅ / 🔶

- ✅ Tested on SQLite (up, down, up, with seeded rows).
- ✅ Tested on a Neon **dev branch**: upgrade, downgrade to 0002, upgrade again. Result: one "Default Organisation" (active) holding the seed rows.
  - Lesson: a schema-only Neon branch has an empty `alembic_version`, so it needed `alembic stamp 0002` first.
- 🔶 **Production:** read-only checks showed `alembic_version = 0002`, no organisation column, and 2 users / 6 patients / 5 scans (test data only; no backup branch was made, by your choice). I have not seen the output of the production `alembic upgrade head` or the follow-up count query. **Please confirm** that query returned one "Default Organisation" row with 2, 6 and 5.

### 2.4 Deployment ✅ / 🔶

- ✅ Phase 1 deployed to FastAPI Cloud after the first attempt failed with "Could not find a default file to run". Cause: the deploy depended on `pyproject.toml`, `.python-version` and the `.fastapicloud` link, which existed only (untracked) in your main folder.
- 🔶 **Commit those deploy files** on the `backend` branch (`pyproject.toml`, `.python-version`; never `.fastapicloud`), so a clean checkout can deploy.
- 🔶 **Confirm `backend-orgs` is merged into `backend`:** `git merge --ff-only backend-orgs` from inside the worktree.
- Swagger UI (`/docs`) is disabled in production by design (`ENVIRONMENT=production`). Test locally against the Neon dev branch instead.

### 2.5 Frontend pointed at the deployed backend ✅

- `frontend/.env.local` now sets `VITE_API_BASE_URL=https://mediscan.fastapicloud.dev` (local URL commented out). Restart `npm run dev` after any change.

### 2.6 Frontend: upload feedback patch (`step6b-upload-feedback.patch`) 🔶

Frontend-only change to `src/lib/api.ts`, `src/lib/inference.ts` and `src/pages/CaseUploadPage.tsx`. No backend change needed.

- Errors now say what happened: the server's message, `Request failed (HTTP <status>)` when a proxy replies with HTML or nothing, a timeout message, or "Cannot reach the server" for network and CORS failures.
- `/predict` upload has a 120 s timeout and a progress callback; the button shows `Uploading… N%`, then `Analysing…`, and is disabled while busy (no double submits).
- A red inline error appears under the button, and an amber hint says what is missing ("Select a patient and an image to upload") when the button is disabled.
- 🔶 Confirm it is applied, then retry the upload against the deployed backend: the new message identifies the cause of the dead button.

---

## 3. Open issues to resolve now

1. **Upload button does nothing on the deployed frontend.** Local login against Postgres works. Still to learn: the Network tab result for `/predict`, and the Swagger test results (`/predict` without `patient_id`, then with one). Possible causes: a stale token from the old local backend (clear Local Storage and log in again), a frontend state problem, or a deployed-server setting. Not caused by the backend scoping code as far as I can tell. The upload-feedback patch (section 2.6) should make the real cause visible in the UI.
2. **Deployed frontend origin:** when the frontend is hosted (for example on Vercel), its URL must be added to `CORS_ORIGINS` on FastAPI Cloud. The default only allows `http://localhost:5173` and `http://localhost:3000`.
3. **Platform admin:** nobody has `is_platform_admin` yet. Nothing uses it until phase 4. Run on production when needed:
   ```sql
   UPDATE users SET is_platform_admin = true WHERE email = 'you@example.com' AND role = 'admin';
   ```
4. **Cosmetic:** `backend/main.py` defines an `origins` list that nothing uses (CORS reads `settings.cors_origins`). Add `asyncio_default_fixture_loop_scope = function` to `pytest.ini` to silence a warning.

---

## 4. Left to implement

Each phase follows the same release routine: new Alembic migration → test on the Neon dev branch (up, down, up) → run on production → deploy → turn on the matching frontend flag.

### Phase 2: scan workflow (contract sections 1–6, 9) ✅ deployed

Delivered as `backend-phase2-scan-workflow.patch` (29 files, applies on top of phase 1, no `-p` flag). 248 tests pass (43 new), `alembic check` is clean, and mutation checks on the new logic all fail as they should. Not yet run on Postgres.

- **Migration 0004:** `scans` gains `priority` (default `routine`), `projection`, `exam_date`, `clinical_notes` (max 2000), `assigned_to_id`, `review_status` (default `pending`), `reviewed_at`, `reviewed_by_id`; new `activities` table. Existing scans become routine / pending.
- **`ScanOut`:** adds the new fields, `uploaded_by`, `assigned_to`, `reviewed_by` (`{id, full_name}`), `is_flagged`, and `flagged` on each finding.
- **Flagging:** `FLAG_THRESHOLDS` and `FLAG_DEFAULT_THRESHOLD` in config. Rule: non-experimental and `score >= threshold`. The Python rule and the SQL rule (used by stats and filters) are tested against each other on a grid of scores. **All thresholds are 0.5 placeholders until a clinician signs off real values.**
- **`POST /predict`:** optional `priority`, `projection`, `exam_date`, `clinical_notes`, `assigned_to_id`. Blank values count as missing; invalid values return 422 even when nothing is saved; an assignee must be an approved, active user in the same organisation.
- **`PATCH /scans/{id}`:** `priority`, `assigned_to_id` (null un-assigns), `review_status`. First review wins: who and when stay recorded. Empty body or null priority/status returns 422.
- **`GET /scans` filters:** `review_status`, `priority`, `assigned_to_id` (a user id, or `me`), `flagged`, plus the existing `patient_id`, `limit`, `offset`.
- **`GET /staff`** (`?role=`; id, full name and role only), **`GET /dashboard/stats`** (Africa/Lagos day; `urgent` and `flagged` count pending scans only; `tzdata` added to requirements), **`GET /activity?limit=`** (newest first, scoped).
- **Patients:** `GET /patients?q=` (case-insensitive contains; `%`, `_` and `\` are literal) and `scan_count` / `last_scan_at`.
- **Activity messages** carry no actor name (the feed shows the actor on its own line), e.g. "Scan uploaded for PT-XXXX". Entries written before phase 3 keep their old wording. Messages contain patient codes and staff names only, never clinical text.
- **Release:** migration 0004 run and deployed. Frontend: set `VITE_SCAN_WORKFLOW=1` (locally in `.env.local`, on Vercel as an environment variable, then redeploy).

### Phase 3: reports (contract section 7) 🔶 built, not yet applied

Delivered as `backend-phase3-reports.patch` (12 files, applies on top of phase 2). 286 tests pass (38 new), `alembic check` is clean, and 11 deliberate breakages of the new rules were all caught. Not yet run on Postgres.

- **Migration 0005:** `reports` table, one per scan (unique `scan_id`, deleted with its scan or patient), JSON column for `lung_fields`, free-text columns as `Text`.
- **`GET /scans/{id}/report`** (404 if none) and **`PUT`**, which creates or updates the draft. Only the fields sent change, so partial saves never wipe the rest; `null` clears a nullable field. Unknown fields such as `status`, `author` or `organisation_id` are ignored. Text is capped at 5000 characters. A final report returns 409. Two simultaneous first saves produce one report.
- **`POST /scans/{id}/report/finalise`:** 422 with `Missing: primary_impression, recommended_action, ai_agreement` style text (a reason is required unless the AI agreement is `agree`), 409 if already final, 404 if no report. Finalising locks the report for good, marks the scan reviewed (an earlier reviewer is kept) and writes one `report_finalised` feed entry.
- **`GET /reports?status=&limit=&offset=`:** summaries with the patient code, most recently updated first (the dev stand-in orders the same way).
- **A scan cannot go back to pending once its report is final** (409 on `PATCH`).
- **Privacy:** report text is never logged, audited or put in the feed. The database engine now hides bound values in SQL logs and error text (`hide_parameters`), which also protects clinical notes from phase 2 when `DEBUG` is on.
- **Author:** whoever starts the report stays its author, even if a colleague edits the draft or finalises it. The finaliser is recorded as the scan's reviewer.
- **Left open:** an amendment or addendum workflow for final reports (separate table, later).
- **Release:** apply the patch, test migration 0005 on the Neon dev branch (up, down, up), run it on production, deploy, then set `VITE_REPORTS=1` and turn the dev stand-in off (`VITE_API_SHIM` unset).

### Phase 4: organisation management, invites, profile (contract sections 0, 8, 10) ⬜

- `POST /auth/register-organisation` (202, atomic, no account-existence leak). Organisation starts `pending` with its first admin unapproved.
- Platform admin: `require_platform_admin` dependency, `GET /platform/organisations`, approve and suspend routes. Platform admin gets no access to other organisations' patient data.
- Invites: `POST` / `GET` / `DELETE /org/invites`, `POST /auth/accept-invite`. Store only a token hash; the raw token and `invite_url` appear once. Needs a `FRONTEND_URL` setting and rate limiting.
- **Remove `POST /auth/register`** and the "Default Organisation" coupling.
- Admin rules: last active admin cannot be deactivated (race-safe).
- `GET` / `PUT /org` (type list, state list, phone regex `^(\+234|0)\d{10}$`) and `GET` / `PUT /org/settings` (`default_priority`, `auto_assign_to_id`, `report_disclaimer`; apply only when the form field is omitted).
- Profile: `job_title`, `phone_number`, `avatar_url`, `organisation`, `is_platform_admin` on `/auth/me`; `PATCH /auth/me`; `POST /auth/me/password` (verify current password, revoke refresh tokens); avatar upload and `GET /users/{id}/avatar` (same organisation only; reuse image validation and resize).
- **Frontend:** Slice C (signup, invitations, profile, avatar, organisation settings) built against the real backend.

---

## 5. Decisions

| Decision | Status |
|---|---|
| Clinicians see all patients in their organisation | **Decided** |
| `radiologist` is a separate role; any org user may mark a scan reviewed | **Decided** (contract) |
| Flagging is per condition, non-experimental findings only | **Decided** (contract) |
| Password change: return 204 and sign the user out (revokes the caller's own session) vs return a fresh token pair | Default 204; tell me if you prefer fresh tokens |
| Can a scan go from `reviewed` back to `pending`? | Allowed, but refused (409) once a final report exists |
| Report `author` when someone else edits a draft | **Decided:** author stays the creator |
| Finalising a report: one activity event, or both `report_finalised` and `scan_reviewed` | **Decided:** one event (`report_finalised`) |
| Flag threshold values | Need clinician sign-off before real use |
