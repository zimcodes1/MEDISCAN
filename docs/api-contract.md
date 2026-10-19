# MediScan API additions: frontend contract (v2)

Everything here is **new or changed** relative to `backend-api.md`. The frontend is built to this file; the backend should implement it as written.

## Conventions

- Enum-like values are lowercase strings validated with Pydantic `Literal` (not database enum types, so Alembic works on both SQLite and Postgres).
- Timestamps are ISO-8601 UTC. `exam_date` is `YYYY-MM-DD`.
- New columns are nullable or have a server default; the organisation backfill (section 0) is the one data migration.
- Errors use FastAPI's default shape (`{"detail": ...}`).
- Free-text clinical fields (notes, reports) are patient data: never log their contents.

## 0. Organisations (multi-tenancy)

Patients, scans and everything derived from them are scoped per organisation.

- **Tables:** `organisations` (`id`, `name`, `type`, `state`, `phone_number`, `status: pending | active | suspended`, `created_at`). Add `organisation_id` (FK) to `users`, `patients` and `scans`; reports and findings inherit it through the scan.
- **Roles:** `admin` (organisation admin), `clinician`, `radiologist`. Separately, `users.is_platform_admin` (boolean) marks the platform operator who approves new organisations.
- **Scoping rule:** every query filters by the caller's `organisation_id`. A resource in another organisation returns **404** (never 403, so existence isn't leaked). Includes patients, scans, images, heatmaps, reports, staff, stats, activity, invites and `/admin/users`.
- **Registering an organisation:** `POST /auth/register-organisation` with `{organisation_name, organisation_type, state, phone_number, full_name, email, password}` returns 202. It creates the organisation (`pending`) and its first admin (`is_approved = false`).
- **Platform approval (platform admin only):** `GET /platform/organisations?status=pending`, `POST /platform/organisations/{id}/approve`, `POST /platform/organisations/{id}/suspend`. Approving activates the organisation and its admin.
- **Adding staff (org admin only):** invitations replace self-registration into an existing organisation.
  - `POST /org/invites` with `{email, role}` returns `{id, email, role, token, invite_url, expires_at}`. No email is sent at first; the admin shares the link.
  - `GET /org/invites`, `DELETE /org/invites/{id}`.
  - `POST /auth/accept-invite` with `{token, full_name, password}` creates an already-approved user in that organisation.
- **`/admin/users`** and its approve / deactivate / activate actions apply to the caller's organisation only. Deactivation must revoke refresh tokens and be enforced on every request. The last active admin cannot be deactivated.
- **Existing data:** the migration creates one default organisation and assigns all existing users, patients and scans to it, then makes `organisation_id` NOT NULL.
- **`GET /org`** returns `{id, name, type, state, phone_number}`; **`PUT /org`** (admin only) updates them. `type` is `hospital | diagnostic_centre | clinic | telemedicine`; the server validates the state list and the phone format (`^(\+234|0)\d{10}$`).

## 1. Scans: new fields on `ScanOut`

| Field | Type | Notes |
|---|---|---|
| `priority` | `"routine" \| "urgent"` | default `routine` |
| `projection` | `"pa" \| "ap" \| "lateral" \| null` | |
| `exam_date` | `date \| null` | date the X-ray was taken |
| `clinical_notes` | `string \| null` | max 2000 chars |
| `uploaded_by` | `{id, full_name}` | |
| `assigned_to` | `{id, full_name} \| null` | must be in the same organisation |
| `review_status` | `"pending" \| "reviewed"` | default `pending`; separate from `status` (inference state) |
| `reviewed_at` | `datetime \| null` | |
| `reviewed_by` | `{id, full_name} \| null` | |
| `is_flagged` | `boolean` | computed, not stored; see below |

**Flagging.** A scan is flagged when any **non-experimental** finding has `score >= threshold(condition)`.
`FLAG_THRESHOLDS` is a config map of condition to score, with `FLAG_DEFAULT_THRESHOLD` for conditions not listed. Scores are raw model outputs (not calibrated probabilities), so thresholds are operating points: choose each one from that model's validation results at the sensitivity you want, not from a general rule. Treat any placeholder value as unreviewed until a clinician signs it off.

## 2. `POST /predict`: extra optional form fields

`priority`, `projection`, `exam_date`, `clinical_notes`, `assigned_to_id` (an approved, active user in the caller's organisation). Invalid values return 422. Ignored when no `patient_id` is given (nothing is saved). The patient must belong to the caller's organisation.

## 3. `PATCH /scans/{scan_id}`

Body: any of `{ priority, assigned_to_id (nullable), review_status }`. Returns the updated `ScanOut`.
Setting `review_status` to `reviewed` also sets `reviewed_at` and `reviewed_by` to the caller. **Any user in the organisation may mark a scan reviewed**; who did it is always recorded and appears in the activity feed.

## 4. `GET /staff`

Any authenticated user. Approved, active users in the caller's organisation only; returns just what a dropdown needs. Optional `?role=radiologist`.

```json
[{ "id": "uuid", "full_name": "Jane Doe", "role": "radiologist" }]
```

## 5. `GET /dashboard/stats`

```json
{ "total_scans": 120, "pending_review": 14, "urgent": 3, "flagged": 6, "reviewed_today": 9 }
```

Scoped to the caller's organisation. `urgent` and `flagged` count scans still pending review. "Today" is Africa/Lagos.

## 6. `GET /activity?limit=20`

```json
[{
  "id": "uuid",
  "type": "scan_uploaded | scan_assigned | scan_reviewed | report_finalised | user_joined",
  "message": "string",
  "actor": { "id": "uuid", "full_name": "string" },
  "scan_id": "uuid | null",
  "created_at": "datetime"
}]
```

## 7. Reports

```json
{
  "id": "uuid", "scan_id": "uuid",
  "author": { "id": "uuid", "full_name": "string" },
  "status": "draft | final",
  "findings": "string", "impression": "string", "recommendations": "string",
  "created_at": "datetime", "updated_at": "datetime", "finalised_at": "datetime | null"
}
```

- `GET /scans/{id}/report` returns the report, or 404 if none.
- `PUT /scans/{id}/report` with `{findings, impression, recommendations}` creates or updates the draft. Returns 409 if already final.
- `POST /scans/{id}/report/finalise` sets status `final` and marks the scan `reviewed`.
- `GET /reports?status=&limit=&offset=` returns a list; each item also carries `patient_code`.

## 8. Users and profile

Add to the user model and `GET /auth/me`: `job_title`, `phone_number`, `avatar_url`, `organisation: {id, name}`, `is_platform_admin`.

- `PATCH /auth/me` with `{full_name, job_title, phone_number}`.
- `POST /auth/me/password` with `{current_password, new_password}` (same 10-72 byte rule; revoke refresh tokens).
- `POST /auth/me/avatar` (multipart image, PNG/JPEG, size-limited) returns `{avatar_url}`.
- `GET /users/{id}/avatar` returns the image (auth required, same organisation).

## 9. Patients

- `GET /patients?q=` does a case-insensitive match on `patient_code`.
- `PatientOut` gains `scan_count` and `last_scan_at`.

## 10. Organisation settings

`GET /org/settings` for any authenticated user; `PUT /org/settings` is admin only.

```json
{ "default_priority": "routine", "auto_assign_to_id": "uuid | null", "report_disclaimer": "string" }
```

`auto_assign_to_id: null` means manual assignment.

## Decisions made

1. Flagging is per condition (`FLAG_THRESHOLDS`), non-experimental findings only.
2. Any user in the organisation may mark a scan reviewed.
3. `radiologist` is a separate role.
4. Patients and scans are scoped per organisation.
