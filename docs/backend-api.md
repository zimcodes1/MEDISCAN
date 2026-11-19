# MediScan Backend API Documentation

This document describes the backend API as implemented in the FastAPI app in `backend/main.py` and the route modules under `backend/routers/`.

## 1. Base configuration

- Application title: `MediScan`
- API version: `0.1.0`
- Local development URL: `http://localhost:7860`
- Swagger UI: `http://localhost:7860/docs` when running in non-production mode
- OpenAPI schema: `http://localhost:7860/openapi.json`

The app exposes CORS and uses JWT-based auth for protected routes.

For frontend integration guidance, see [frontend-integration.md](frontend-integration.md). It includes env setup, auth handling, and sample Axios calls for login, patient creation, scans, and image upload.

---

## 2. Authentication

### Bearer tokens

Protected endpoints expect an `Authorization` header:

```http
Authorization: Bearer <access_token>
```

### Auth flow

1. Register a user: `POST /auth/register`
2. Log in: `POST /auth/login`
3. Refresh token: `POST /auth/refresh`
4. Fetch current identity: `GET /auth/me`
5. Log out: `POST /auth/logout`

### Token response

```json
{
  "access_token": "string",
  "refresh_token": "string",
  "token_type": "bearer",
  "expires_in": 3600
}
```

### User model

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "full_name": "Jane Doe",
  "role": "admin | clinician",
  "is_approved": true,
  "is_active": true,
  "created_at": "2026-10-06T12:34:56Z"
}
```

> The exact role values depend on the application’s user model, but the API enforces role checks for admin-only routes.

---

## 3. Health endpoints

| Method | Path            | Auth | Description                         |
| ------ | --------------- | ---: | ----------------------------------- |
| GET    | `/health`       |   No | Liveness check                      |
| GET    | `/health/ready` |   No | Readiness check for DB availability |

### Example

```bash
curl http://localhost:7860/health
```

```json
{ "status": "ok" }
```

---

## 4. Authentication endpoints

### `POST /auth/register`

Creates a user registration request. Accounts must be approved by an administrator before login.

Request body:

```json
{
  "email": "user@example.com",
  "full_name": "Jane Doe",
  "password": "StrongPassword123"
}
```

Validation rules:

- `email` must be a valid email
- `full_name` length: 1–200
- `password` length: 10–72 bytes

Success response:

```json
{
  "detail": "Registration received. An administrator must approve your account before you can sign in."
}
```

Status: `202 Accepted`

### `POST /auth/login`

Authenticates a user and returns JWT credentials.

Request body:

```json
{
  "email": "user@example.com",
  "password": "StrongPassword123"
}
```

Success response:

```json
{
  "access_token": "string",
  "refresh_token": "string",
  "token_type": "bearer",
  "expires_in": 3600
}
```

### `POST /auth/refresh`

Refreshes the access token.

Request body:

```json
{
  "refresh_token": "string"
}
```

### `POST /auth/logout`

Invalidates a refresh token.

Request body:

```json
{
  "refresh_token": "string"
}
```

Status: `204 No Content`

### `GET /auth/me`

Returns the authenticated user record.

Authorization: required

Response:

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "full_name": "Jane Doe",
  "role": "clinician",
  "is_approved": true,
  "is_active": true,
  "created_at": "2026-10-06T12:34:56Z"
}
```

---

## 5. Admin endpoints

All admin routes require administrator privileges.

### `GET /admin/users`

List users.

Query parameters:

- `status`: `pending` or `all` (default: `pending`)

Example:

```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:7860/admin/users?status=pending"
```

Response:

```json
[
  {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "Jane Doe",
    "role": "clinician",
    "is_approved": false,
    "is_active": true,
    "created_at": "2026-10-06T12:34:56Z"
  }
]
```

### `POST /admin/users/{user_id}/approve`

Approves a pending user account.

### `POST /admin/users/{user_id}/deactivate`

Disables a user account.

### `POST /admin/users/{user_id}/activate`

Re-enables a user account.

---

## 6. Patient endpoints

These routes are protected and require a valid authenticated user.

### `POST /patients`

Creates a patient record.

Request body:

```json
{
  "sex": "female",
  "year_of_birth": 1990
}
```

Allowed values for `sex`:

- `female`
- `male`
- `other`
- `unknown`
- `null`

Response:

```json
{
  "id": "uuid",
  "patient_code": "P-12345",
  "sex": "female",
  "year_of_birth": 1990,
  "created_at": "2026-10-06T12:34:56Z"
}
```

Status: `201 Created`

### `GET /patients`

Lists patients for the current user.

Query parameters:

- `limit`: integer, 1–200 (default `50`)
- `offset`: integer, >= 0 (default `0`)

Example:

```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:7860/patients?limit=20&offset=0"
```

### `GET /patients/{patient_id}`

Fetches a single patient by ID.

---

## 7. Scan endpoints

These routes return scan metadata and stored image artifacts.

### `GET /scans?patient_id={patient_id}`

Lists scans for the given patient.

Query parameters:

- `patient_id`: required UUID
- `limit`: 1–200, default `50`
- `offset`: >= 0, default `0`

Example response:

```json
[
  {
    "id": "uuid",
    "patient_id": "uuid",
    "status": "completed",
    "content_type": "image/png",
    "size_bytes": 124521,
    "created_at": "2026-10-06T12:34:56Z",
    "findings": [
      {
        "id": "uuid",
        "condition": "Pneumonia",
        "score": 0.94,
        "confidence_pct": 94.0,
        "has_heatmap": true,
        "model_name": "model",
        "model_version": "v1",
        "experimental": false
      }
    ],
    "disclaimer": "string"
  }
]
```

### `GET /scans/{scan_id}`

Returns the metadata for one scan.

### `GET /scans/{scan_id}/image`

Returns the original scan image bytes.

Headers are set to discourage caching:

- `Cache-Control: private, no-store`
- `X-Content-Type-Options: nosniff`
- `Content-Disposition: inline; filename="..."`

### `GET /scans/{scan_id}/findings/{finding_id}/heatmap`

Returns the heatmap for a specific finding.

---

## 8. Predict / inference endpoints

### `POST /predict`

Runs a chest X-ray inference against the configured model backend.

Content type: `multipart/form-data`

Form fields:

- `file`: required image upload (`PNG` or `JPEG`)
- `patient_id`: optional UUID; if present, the result is saved to the patient record

Example:

```bash
curl -X POST "http://localhost:7860/predict" \
  -H "Authorization: Bearer <token>" \
  -F "patient_id=<uuid>" \
  -F "file=@/path/to/xray.png"
```

Response:

```json
{
  "scan_id": "uuid",
  "saved": true,
  "inference_backend": "mock",
  "findings": [
    {
      "condition": "Pneumonia",
      "score": 0.94,
      "confidence_pct": 94.0,
      "heatmap_base64": "base64-encoded-png",
      "model_name": "pneumonia-model",
      "model_version": "v1",
      "experimental": false
    }
  ],
  "disclaimer": "string"
}
```

Notes:

- `scan_id` is only set when a patient was supplied and the scan was saved
- `saved` indicates whether the scan was persisted
- `score` is the raw model output (0–1), not a calibrated probability
- `confidence_pct` is `score * 100` rounded to one decimal place
- `heatmap_base64` may be null if the model does not produce a heatmap

### `POST /predict/warmup`

A lightweight endpoint used to warm up inference backends when the UI is opened.

Response:

```json
{ "status": "ready" }
```

or

```json
{ "status": "warming" }
```

---

## 9. Data models

### `RegisterRequest`

```json
{
  "email": "user@example.com",
  "full_name": "Jane Doe",
  "password": "StrongPassword123"
}
```

### `LoginRequest`

```json
{
  "email": "user@example.com",
  "password": "StrongPassword123"
}
```

### `PatientCreate`

```json
{
  "sex": "female",
  "year_of_birth": 1990
}
```

### `PatientOut`

```json
{
  "id": "uuid",
  "patient_code": "string",
  "sex": "female",
  "year_of_birth": 1990,
  "created_at": "2026-10-06T12:34:56Z"
}
```

### `PredictResponse`

```json
{
  "scan_id": "uuid | null",
  "saved": true,
  "inference_backend": "string",
  "findings": [
    {
      "condition": "string",
      "score": 0.0,
      "confidence_pct": 0.0,
      "heatmap_base64": "string | null",
      "model_name": "string",
      "model_version": "string",
      "experimental": false
    }
  ],
  "disclaimer": "string"
}
```

---

## 10. Security and operational notes

- Protected endpoints require a valid bearer token.
- Administrative actions are gated by `require_admin`.
- Request limits and per-user/per-IP rate limiting are enforced for login, refresh, registration, and image prediction routes.
- Image uploads are validated for size and content before inference.
- Stored images and heatmaps are fetched from storage and integrity-checked before delivery.

---

## 11. Useful curl examples

### Register

```bash
curl -X POST http://localhost:7860/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@example.com",
    "full_name": "Demo User",
    "password": "StrongPassword123"
  }'
```

### Login

```bash
curl -X POST http://localhost:7860/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@example.com",
    "password": "StrongPassword123"
  }'
```

### Get current user

```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:7860/auth/me
```

### Predict with a file

```bash
curl -X POST http://localhost:7860/predict \
  -H "Authorization: Bearer <token>" \
  -F "patient_id=<uuid>" \
  -F "file=@/path/to/cxr.png"
```

---

## 12. Source references

This documentation was derived from the actual route definitions and schema models in:

- `backend/main.py`
- `backend/routers/auth.py`
- `backend/routers/admin.py`
- `backend/routers/patients.py`
- `backend/routers/scans.py`
- `backend/routers/inference.py`
- `backend/schemas/auth.py`
- `backend/schemas/patient.py`
- `backend/schemas/scan.py`
- `backend/schemas/inference.py`
