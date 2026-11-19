# Frontend integration guide for MediScan

This guide explains how the React frontend should integrate with the FastAPI backend that powers authentication, patient records, scans, and X-ray analysis.

## 1. Runtime overview

- Backend API base URL (local development): `http://localhost:7860`
- Frontend dev server (Vite default): `http://localhost:5173`
- Swagger/OpenAPI docs: `http://localhost:7860/docs`
- Auth mechanism: JWT access token + refresh token
- Protected routes: all routes except `/health`, `/health/ready`, `/auth/register`, `/auth/login`, and `/auth/refresh`

The backend already enables CORS for `http://localhost:5173` and `http://localhost:3000`, so the frontend can call the API directly in development.

---

## 2. Environment setup for the frontend

Use environment variables instead of hard-coded URLs. Add a Vite environment file in the frontend project:

```bash
# frontend/.env.local
VITE_API_BASE_URL=http://localhost:7860
```

Example access in code:

```ts
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:7860";
```

This keeps the code portable across local development, staging, and production deployments.

---

## 3. Recommended API client pattern

The project already includes `axios`, so the easiest integration is a single API helper with a shared axios instance and automatic bearer-token injection.

```ts
// src/lib/api.ts
import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:7860";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");

  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.detail ?? "Request failed";

    if (error.response?.status === 401) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      window.location.href = "/login";
    }

    return Promise.reject(new Error(message));
  },
);
```

### Why this is the right approach

- Keeps all backend URLs in one place.
- Centralizes auth token handling.
- Lets the frontend react consistently to 401/403 responses.
- Avoids hard-coded endpoints in each component.

---

## 4. Authentication flow

### 4.1 Register

```ts
await api.post("/auth/register", {
  email: "clinician@example.com",
  full_name: "Jane Doe",
  password: "StrongPassword123",
});
```

Expected response:

```json
{
  "detail": "Registration received. An administrator must approve your account before you can sign in."
}
```

### 4.2 Login

```ts
const response = await api.post("/auth/login", {
  email: "clinician@example.com",
  password: "StrongPassword123",
});

localStorage.setItem("access_token", response.data.access_token);
localStorage.setItem("refresh_token", response.data.refresh_token);
```

Expected response:

```json
{
  "access_token": "string",
  "refresh_token": "string",
  "token_type": "bearer",
  "expires_in": 3600
}
```

### 4.3 Fetch current user

```ts
const user = await api.get("/auth/me");
```

### 4.4 Refresh token

```ts
const refreshToken = localStorage.getItem("refresh_token");

const response = await api.post("/auth/refresh", {
  refresh_token: refreshToken,
});

localStorage.setItem("access_token", response.data.access_token);
localStorage.setItem("refresh_token", response.data.refresh_token);
```

### 4.5 Logout

```ts
await api.post("/auth/logout", {
  refresh_token: localStorage.getItem("refresh_token"),
});

localStorage.removeItem("access_token");
localStorage.removeItem("refresh_token");
```

---

## 5. Patient and scan endpoints

### 5.1 Create a patient

```ts
const patient = await api.post("/patients", {
  sex: "female",
  year_of_birth: 1990,
});
```

Response shape:

```json
{
  "id": "uuid",
  "patient_code": "P-2026-0001",
  "sex": "female",
  "year_of_birth": 1990,
  "created_at": "2026-10-06T12:34:56Z"
}
```

### 5.2 List patients

```ts
const patients = await api.get("/patients", {
  params: { limit: 50, offset: 0 },
});
```

### 5.3 Fetch a patient

```ts
const patient = await api.get(`/patients/${patientId}`);
```

### 5.4 List scans for a patient

```ts
const scans = await api.get("/scans", {
  params: {
    patient_id: patientId,
    limit: 20,
    offset: 0,
  },
});
```

### 5.5 Fetch a single scan

```ts
const scan = await api.get(`/scans/${scanId}`);
```

### 5.6 Fetch scan image

```ts
const { data } = await api.get(`/scans/${scanId}/image`, {
  responseType: "blob",
});

const imageUrl = URL.createObjectURL(data);
```

### 5.7 Fetch a heatmap

```ts
const { data } = await api.get(
  `/scans/${scanId}/findings/${findingId}/heatmap`,
  {
    responseType: "blob",
  },
);

const heatmapUrl = URL.createObjectURL(data);
```

---

## 6. Inference upload flow

The main prediction endpoint accepts a multipart form upload with an image file and an optional patient ID.

### Endpoint

```http
POST /predict
Content-Type: multipart/form-data
Authorization: Bearer <access_token>
```

### Example frontend form upload

```ts
const formData = new FormData();
formData.append("file", file);
formData.append("patient_id", patientId);

const response = await api.post("/predict", formData, {
  headers: {
    "Content-Type": "multipart/form-data",
  },
});
```

### Response shape

```json
{
  "scan_id": "uuid-or-null",
  "saved": true,
  "inference_backend": "mock",
  "findings": [
    {
      "condition": "Pneumonia",
      "score": 0.91,
      "confidence_pct": 91.0,
      "heatmap_base64": "base64-string-or-null",
      "model_name": "mediscan",
      "model_version": "2026.10",
      "experimental": false
    }
  ],
  "disclaimer": "For research and clinical decision support only; this is not a diagnosis. Scores are uncalibrated model outputs, not probabilities of disease, and confidence_pct is simply score x 100. Every result must be reviewed by a qualified clinician. Tuberculosis results are experimental."
}
```

### Notes for the frontend

- `file` is required and must be a PNG or JPEG/X-ray image.
- `patient_id` is optional. If omitted, inference still runs but the scan is not persisted.
- `confidence_pct` is not a calibrated probability; it is just `score * 100`.
- `heatmap_base64` may be `null` for conditions that do not emit a heatmap.

---

## 7. Recommended frontend state handling

### Example auth state model

```ts
interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: {
    id: string;
    email: string;
    full_name: string;
    role: "admin" | "clinician";
    is_approved: boolean;
    is_active: boolean;
  } | null;
}
```

### Suggested pattern

- Put auth state in a React context or Zustand store.
- Store tokens in `localStorage` temporarily for simple persistence.
- Guard protected routes by checking `/auth/me` or a stored session state.
- Avoid keeping the JWT in component state only if the page refreshes often.

---

## 8. Error handling rules

The API returns errors as JSON with a `detail` field.

```json
{
  "detail": "Authentication failed"
}
```

Common cases:

- `401`: invalid or expired token
- `403`: user does not have permission to access the resource
- `404`: patient or scan not found
- `413`: uploaded file too large
- `500`: unexpected server error

Handle these centrally in the shared axios interceptor and then show user-friendly messages in the UI.

---

## 9. Suggested frontend structure

A clean structure for this project would be:

```text
frontend/src/
  lib/
    api.ts
    auth.ts
  types/
    api.ts
  pages/
    LoginPage.tsx
    DashboardPage.tsx
    CaseUploadPage.tsx
    PatientReportPage.tsx
  hooks/
    useAuth.ts
    usePatients.ts
    useScans.ts
```

This isolates API logic from page components and keeps future backend changes easy to update.

---

## 10. Key integration checklist

- [ ] Frontend reads API URL from `VITE_API_BASE_URL`
- [ ] Login stores `access_token` and `refresh_token`
- [ ] Every authenticated request sends `Authorization: Bearer <token>`
- [ ] Protected pages redirect on `401`
- [ ] Form uploads use `multipart/form-data` for `/predict`
- [ ] Patient IDs and scan IDs are used consistently from backend responses
- [ ] Image and heatmap URLs are handled as blobs, not raw strings
- [ ] The disclaimer text is displayed for every prediction result

---

## 11. Related docs

- Backend API reference: `docs/backend-api.md`
- App start instructions: project root `README.md`

This frontend contract is enough to wire the current React app to the backend without guessing about request shapes or auth headers.
