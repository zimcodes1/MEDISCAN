# MediScan AI — MVP Implementation Plan (v3)

> **Stack:** React (TypeScript + Tailwind) on Vercel · FastAPI on Hugging Face Spaces · Neon PostgreSQL · Hugging Face Datasets (file storage) · Hugging Face Hub (model storage) · Google Colab (training only)
>
> **Group:** Medivance-NSUK

---

## How to Read This Plan

This plan is structured as a **spiral build**: every phase ends with something you can test and demonstrate. Two branches run simultaneously where the work allows — the **AI Training branch** (Colab, runs independently) and the **Application branch** (backend + frontend wiring). They converge at Phase 5 when trained models are loaded into the live backend.

You can switch between the AI Training branch and the Application branch at any time without either blocking the other. The dependency rule is simple: if a phase is listed under "Prerequisites," that phase must be complete before you begin. Everything else can proceed in parallel.

### Spiral Milestones at a Glance

| Spiral | What You Can Demo |
|---|---|
| After Phase 1 | Every service provisioned, all accounts exist |
| After Phase 3 | Login → dashboard → create patient → all working in browser against real backend |
| After Phase 4 | Upload an X-ray → image appears at a real public URL |
| After Phase 5 (first model) | Upload X-ray → real AI prediction appears in browser |
| After Phase 5 (all models) | Full Comprehensive Panel returning per-condition findings |
| After Phase 6 | Heatmap overlays appear on each finding card |
| After Phase 7 | Complete competition-ready demo |

---

## Dependency Map

```
Phase 0 (Frontend Audit)
        │
Phase 1 (Infrastructure Setup)
        │
        ├─────────────────────────────────┐
        │                                 │
Phase 2 (AI Training — Colab branch)    Phase 3 (Backend Foundation)
        │                                 │
        │                           Phase 4 (File Storage)
        │                                 │
        └────────────────────────── Phase 5 (ML Inference Integration)
                                          │
                                   Phase 6 (Grad-CAM — stretch)
                                          │
                                   Phase 7 (Frontend–Backend Wiring)
                                          │
                                   Phase 8 (Testing & Demo Preparation)
```

---

## Phase 0 — Frontend Audit

**Goal:** Know exactly what the existing React prototype covers, what is absent, and what needs API wiring — without changing any code yet.

**Prerequisites:** Access to the existing codebase.

---

### 0.1 Inventory pages and routes

Walk the codebase and record the status of every route — either **complete**, **renders but not wired to an API**, or **missing**:

- `/login` — Login form
- `/dashboard` — Summary stats view
- `/patients` — Patient list
- `/patients/:id` — Patient detail with scan history
- `/scans/upload` — Upload page with condition selector
- `/scans/:id/result` — Per-condition finding cards with disclaimer

---

### 0.2 Audit the auth layer

Locate how the prototype currently handles authentication. Mark each item as present, absent, or placeholder:

- Login form that POSTs credentials and receives tokens in response
- React Context (or equivalent) that holds the access token in memory — not in `localStorage`
- An Axios instance (or fetch wrapper) that attaches `Authorization: Bearer {token}` to every outgoing request via a request interceptor
- A `401` interceptor on the same Axios instance that silently calls the refresh endpoint, updates the token, and retries the original request
- A `ProtectedRoute` component (or equivalent guard) that redirects unauthenticated users to `/login`
- Role-based conditional rendering — for example, the clinician notes field should only be editable by a user with the `radiologist` role

---

### 0.3 Audit the upload page

Verify the following on the upload page:

- File input accepts `image/jpeg` and `image/png` only
- Condition selector checkboxes exist for: Pneumonia, Tuberculosis, Cardiomegaly, Lung Nodule/Mass
- A "Run Comprehensive Panel" toggle exists and selects all four conditions at once
- Submission builds a `multipart/form-data` request containing the image file and the selected conditions
- A loading/spinner state is shown while the request is in flight

---

### 0.4 Audit the results page

Verify:

- Results are structured as a grid of per-condition finding cards (one card per condition requested)
- Each card has a slot for: condition name, prediction label (Positive / Negative), confidence percentage or bar, and a heatmap image placeholder
- The disclaimer banner is present, always visible, and cannot be dismissed
- Clinician notes input exists and is shown only for the correct role
- The page has a loading state for when results are still being computed

---

### 0.5 Check environment variable discipline

Confirm that every backend URL in the frontend reads from a Vite environment variable (`import.meta.env.VITE_*`) rather than being hardcoded. Flag any hardcoded localhost addresses for replacement.

---

### 0.6 Produce the audit output

Write a short document (a few bullet points is enough) listing:

- What is complete and needs no changes
- What renders correctly but is not wired to a real API
- What is entirely missing and needs to be built

This list drives every decision in Phase 7.

---

**Phase 0 complete when:** You have a written audit output. No code has been changed.

---

## Phase 1 — Infrastructure Setup

**Goal:** Every service in the stack is provisioned and you have the credentials and configuration needed for all subsequent phases. No application code is written yet.

**Prerequisites:** Phase 0 complete.

---

### 1.1 Set up Neon

1. Create a free account at [neon.tech](https://neon.tech). No credit card required.
2. Create a new project named `mediscan-ai`.
3. Record two connection strings from the project dashboard: the **direct connection string** (for running migrations) and the **pooled connection string** (for the FastAPI app at runtime — Neon's built-in PgBouncer pooler handles connection management in the serverless environment).
4. In the Neon console, create two database branches: `main` (production) and `dev` (for schema changes and testing without touching production data).

---

### 1.2 Set up Hugging Face

1. Create a free account at [huggingface.co](https://huggingface.co) if you do not already have one.
2. Create a **Space** for the backend:
   - SDK type: **Docker** (not Gradio or Streamlit — you're running FastAPI)
   - Visibility: **Public** (required to use free CPU hardware)
   - Name: `mediscan-ai-backend`
   - Hardware: CPU Basic (2 vCPU, 16 GB RAM — this is free and more than sufficient)
3. Create a **Dataset** repo for X-ray image storage:
   - Visibility: Public (acceptable for POC — no real patient data is used)
   - Name: `mediscan-xray-storage`
4. Create four empty **Model** repos (one per condition). Exact naming matters because the backend will reference these by name:
   - `mediscan-pneumonia`
   - `mediscan-tuberculosis`
   - `mediscan-cardiomegaly`
   - `mediscan-nodule-mass`
5. Generate a **User Access Token** from your HF account Settings → Access Tokens. Grant it **write** permission. This token is used by Colab to upload trained models and by the backend to upload images to the dataset repo. Store it securely — it will be added as a secret in step 1.4.

---

### 1.3 Set up Vercel

1. Import your GitHub repository into Vercel.
2. Set the root directory to wherever your React app lives (e.g., `frontend/`).
3. Add the environment variable `VITE_API_BASE_URL` with the value `https://{your-hf-username}-mediscan-ai-backend.hf.space`. You can set this now even though the backend is not yet deployed — the URL is deterministic based on your HF username and Space name.
4. Trigger a deployment to confirm the frontend builds cleanly.

---

### 1.4 Prepare secrets and environment variables

All sensitive values must be stored in two places: your local `.env` file (for local development) and HF Spaces Secrets (for the deployed backend).

The secrets you need:

| Variable | What it is |
|---|---|
| `NEON_DATABASE_URL` | Pooled connection string from Neon |
| `HF_TOKEN` | Your Hugging Face access token |
| `HF_DATASET_REPO` | `{hf-username}/mediscan-xray-storage` |
| `JWT_SECRET` | A long, random string you generate (32+ characters). Used to sign JWTs. |
| `JWT_ALGORITHM` | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `480` (8 hours) |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` |

In your GitHub repo:
- Create a `.env` file at `/backend/.env` with the above variables and their values
- Add `.env` to `.gitignore` before making any commits

In HF Spaces:
- Go to your Space → Settings → Repository Secrets
- Add each variable above as a secret. HF Spaces injects these as environment variables at runtime.

---

### 1.5 Prepare the Google Colab training environment

1. In Google Drive, create the folder structure: `MediScan_AI/training/datasets/` and `MediScan_AI/training/models/`.
2. In the GitHub repo, create a `model_training/` folder and commit a `README.md` explaining that training notebooks live in Google Drive and are not tracked in Git. Commit only evaluation result summaries and model cards to Git.
3. Confirm that Colab can mount your Drive and that the Drive folder is accessible.

---

**Phase 1 complete when:**
- Neon project exists with `main` and `dev` branches
- HF Space repo (Docker type) created, listed as "Building" or "Running" with a placeholder README
- HF Dataset repo and 4 Model repos exist (empty)
- HF access token generated
- Vercel project connected, frontend deploying from GitHub
- Local `.env` file created and excluded from Git
- HF Space Secrets configured

---

## Phase 2 — AI Model Training (Colab Branch)

**Goal:** Produce trained, evaluated, and ONNX-exported model files for all four conditions, uploaded to their respective HF Hub Model repos and ready for the backend to load.

**Prerequisites:** Phase 1.2, Phase 1.5.

> Start this phase as soon as Phase 1 is complete. Training runs take time. Switch to Phase 3 while a run is in progress and return here to evaluate and start the next run.

---

### 2.1 Dataset acquisition

Download the following datasets into Drive at `MediScan_AI/training/datasets/`. Each condition requires a different source:

| Condition | Dataset | Notes |
|---|---|---|
| Pneumonia | Kaggle Chest X-Ray Pneumonia | ~5,863 images. Binary: Normal vs Pneumonia. |
| Cardiomegaly | NIH ChestX-ray14 | 112,120 images, 14 labels. Filter to Cardiomegaly label. |
| Lung Nodule/Mass | NIH ChestX-ray14 | Same dataset, filter to Nodule + Mass labels (treat as single positive class). |
| Tuberculosis | Shenzhen Hospital + Montgomery County TB sets | ~800 combined. Small dataset — acknowledge this limitation. |

For each dataset before training:
- Inspect the class distribution. Record the positive-to-negative ratio. For highly imbalanced sets (e.g., Cardiomegaly in NIH ChestX-ray14 is heavily skewed negative), you will need to account for this in training.
- Confirm all images are JPEG or PNG.
- Perform a fixed 80/10/10 train/validation/test split. Save the split as a list of filenames to Drive. Every training run for a given condition must use the exact same split so that evaluation numbers are comparable across experiments.

---

### 2.2 Define the shared preprocessing pipeline

Write a single reusable preprocessing module that all four training notebooks share. Document the exact operations so the backend can replicate them identically during inference. Any mismatch between training preprocessing and inference preprocessing is a source of prediction error.

The pipeline in order:
1. Load image from disk
2. Convert to RGB (handles grayscale X-rays that may have 1 or 4 channels)
3. Resize to 224 × 224 pixels using bilinear interpolation
4. Convert pixel values to float, scale to [0, 1]
5. Normalize using ImageNet mean `[0.485, 0.456, 0.406]` and std `[0.229, 0.224, 0.225]`
6. Training mode only: apply random horizontal flip, random rotation (±10°), and minor colour jitter (brightness and contrast ±0.2)
7. Add batch dimension for model input

---

### 2.3 Train each model

Use a separate Colab notebook per condition but the same training recipe. The structure of each notebook:

**Model architecture:**
- Load EfficientNet-B0 from torchvision with ImageNet pretrained weights
- Replace the final classifier layer with a single linear output neuron (binary classification)
- The loss function is `BCEWithLogitsLoss` (binary cross-entropy with logits, numerically stable)
- For imbalanced datasets, pass a `pos_weight` argument to `BCEWithLogitsLoss` equal to `(number of negatives) / (number of positives)` in the training set

**Two-stage training strategy:**

Stage 1 — Freeze all layers except the classifier head. Train with Adam, learning rate 1×10⁻³, for 5 epochs. This warms up the new head without destroying pretrained features.

Stage 2 — Unfreeze the last two blocks of `model.features` (the final two stages of EfficientNet-B0). Reduce learning rate to 1×10⁻⁴ and train for 5 more epochs. Use `ReduceLROnPlateau` scheduler monitoring validation loss.

**After each epoch:** Record training loss, validation loss, and validation AUC-ROC. If validation loss does not improve for 3 consecutive epochs, stop early and restore the best checkpoint.

**Checkpointing:** Save the best model checkpoint (lowest validation loss) to Drive after each epoch. Never overwrite a better checkpoint with a worse one.

---

### 2.4 Evaluate each model

Run evaluation on the held-out test set (the 10% of data withheld from both training and validation). Record and save all of the following to Drive alongside the model:

- Accuracy
- Sensitivity (recall for the positive class — most important metric for a screening tool)
- Specificity
- AUC-ROC
- Full confusion matrix

Target thresholds to aim for:

| Condition | Accuracy | Sensitivity | AUC-ROC |
|---|---|---|---|
| Pneumonia | > 88% | > 90% | > 0.92 |
| Cardiomegaly | > 85% | > 85% | > 0.90 |
| Lung Nodule/Mass | > 80% | > 82% | > 0.88 |
| Tuberculosis | > 78% | > 80% | > 0.85 |

These are goals, not hard gates. If a model falls short, document the gap honestly in the model card. Do not discard a model that falls slightly below — label it "experimental" in the backend registry and flag it in the UI instead.

---

### 2.5 Qualitative Grad-CAM check (before export)

For 5–10 test images per model, generate a Grad-CAM heatmap using `pytorch-grad-cam`. The target layer is the final block of EfficientNet-B0's feature extractor: `model.features[-1]`.

For each image, visually confirm:
- Positive cases: the heatmap activates over anatomically relevant regions (lung fields for Pneumonia and Nodule/Mass, cardiac silhouette for Cardiomegaly, upper lung zones for TB)
- Negative cases: activation is diffuse, not concentrated
- Neither positive nor negative cases show primary activation on image borders, corner text annotations, or the image frame

If a model's heatmaps consistently activate on borders or non-anatomical regions, the model has learned from image artifacts rather than anatomy. This is a data bias issue — document it in the model card and consider the model experimental.

---

### 2.6 Export to ONNX

For each trained model checkpoint that passes the qualitative check:

1. Set the model to evaluation mode and disable gradient computation
2. Create a dummy input tensor of shape `(1, 3, 224, 224)` — matching the preprocessing output
3. Export using `torch.onnx.export` with:
   - Dynamic batch axis on dimension 0 (allows future batching)
   - `opset_version=17` (current stable ONNX opset)
4. Run a **parity check**: pass the same preprocessed test image through the PyTorch model and through the ONNX model using `onnxruntime.InferenceSession`. The output values must agree within ±0.001. If they do not, the export has a problem — do not upload until this passes.
5. Save both the `.pth` (PyTorch state dict, needed for Grad-CAM) and the `.onnx` file

Naming convention, which the backend registry will reference:
- `mediscan_pneumonia.onnx` / `mediscan_pneumonia.pth`
- `mediscan_tuberculosis.onnx` / `mediscan_tuberculosis.pth`
- `mediscan_cardiomegaly.onnx` / `mediscan_cardiomegaly.pth`
- `mediscan_nodule_mass.onnx` / `mediscan_nodule_mass.pth`

---

### 2.7 Write model cards

For each condition, write a `model_card.md` before uploading. The model card must document:

- **Architecture:** EfficientNet-B0, pretrained ImageNet, binary classifier
- **Dataset:** name, source, size, class distribution, train/val/test split counts
- **Training procedure:** both stages, optimizer, learning rate, epochs, loss function, class weighting if applied
- **Evaluation results:** all metrics from step 2.4 in a table
- **Known limitations:** explicitly call out the small TB dataset size; call out that the Nodule/Mass model detects radiographic abnormalities, NOT cancer (CT follow-up is required for any positive finding); note that training data is predominantly Western-population imaging, which may affect performance on Nigerian patient demographics
- **Bias statement:** document the Grad-CAM qualitative findings from step 2.5

---

### 2.8 Upload to Hugging Face Hub

For each condition model, push the following files to the corresponding HF Model repo using `huggingface_hub.upload_file()` or the HF CLI:

- `mediscan_{condition}.onnx`
- `mediscan_{condition}.pth`
- `model_card.md`

Each upload creates a Git commit on the HF repo with a commit hash. Record the commit hash for each model — this becomes the `model_version` field written into every finding record in Phase 5, creating a permanent audit trail.

---

**Phase 2 complete when:**
- All four HF Model repos contain `.onnx`, `.pth`, and `model_card.md`
- ONNX parity check passes for all four exports (difference < 0.001)
- Evaluation results documented and saved to Drive
- Commit hashes recorded

---

## Phase 3 — Backend Foundation (Application Branch)

**Goal:** A running FastAPI application deployed to Hugging Face Spaces with working authentication, database connectivity, and patient + scan endpoints. ML inference is stubbed — endpoints exist and return the correct response shape, but predictions are hardcoded placeholders.

**Prerequisites:** Phase 1 complete. (Phase 2 runs in parallel — you do not need trained models yet.)

---

### 3.1 Define the database schema

Before writing any application code, define and run the schema against the Neon `dev` branch. Use the Neon SQL Editor to run migrations manually at this stage. Once the schema is stable and Phase 3 is complete, run the same migration against `main`.

The schema has five tables. All primary keys are UUIDs generated by the database (use `gen_random_uuid()` in PostgreSQL).

**`users`**
Stores clinician accounts. Fields: `id`, `email` (unique), `password_hash`, `full_name`, `role` (constrained to values `admin`, `radiologist`, `clinician`), `created_at`.

**`refresh_tokens`**
Tracks issued refresh tokens for logout/invalidation. Fields: `id`, `user_id` (foreign key → users, on delete cascade), `token_hash` (store only the hash, never the raw token), `expires_at`, `revoked` (boolean, default false), `created_at`.

**`patients`**
Anonymised patient records — no real names are stored at any point. Fields: `id`, `patient_code` (unique, assigned by clinical staff — e.g., `PT-00142`), `age` (nullable integer), `sex` (constrained to `M`, `F`, `O`), `created_by` (foreign key → users), `created_at`.

**`scans`**
One record per X-ray upload. Fields: `id`, `patient_id` (foreign key → patients), `uploaded_by` (foreign key → users), `image_url` (text, populated after file storage completes in Phase 4), `status` (constrained to `processing`, `complete`, `failed`), `requested_conditions` (text array — stores the list of condition keys the clinician selected), `clinician_notes` (text, nullable), `created_at`.

**`findings`**
One record per condition per scan. Fields: `id`, `scan_id` (foreign key → scans, on delete cascade), `condition` (text — must match a key in the backend model registry), `prediction` (text — `Positive` or `Negative`), `confidence` (float, 0.0–1.0), `heatmap_url` (text, nullable — populated in Phase 6), `model_version` (text — HF Hub commit hash from Phase 2), `completed_at`.

Add an index on `findings.scan_id` since this column is queried on every result page load.

---

### 3.2 Structure the backend project

Organise the backend into folders that reflect clear separation of concerns. Every route file should contain only request handling — no business logic. Business logic lives in service files. Database queries live in the db service, not scattered across route files.

Suggested structure:
```
/backend
  main.py              — app creation, CORS middleware, router registration, startup/shutdown hooks
  requirements.txt
  Dockerfile
  .env                 — not committed
  /routers
    auth.py            — authentication endpoints
    patients.py        — patient CRUD
    scans.py           — scan upload and retrieval
    findings.py        — finding retrieval
    inference.py       — inference trigger (called internally, or exposed for testing)
  /services
    auth_service.py    — password hashing, JWT generation and verification
    db_service.py      — database connection pool, query helpers
    storage_service.py — Hugging Face Dataset upload logic (stubbed in Phase 3, real in Phase 4)
    inference_service.py — model registry, model loading, prediction (stubbed in Phase 3, real in Phase 5)
  /schemas
    user.py            — Pydantic request/response models for user
    patient.py         — Pydantic models for patient
    scan.py            — Pydantic models for scan
    finding.py         — Pydantic models for finding
  /core
    config.py          — reads environment variables into a typed settings object
    security.py        — constants and utilities related to JWT and hashing
```

The stub in `inference_service.py` returns a hardcoded response in the exact same shape that the real inference will return. This means the router, the frontend, and the database write logic can all be tested before any model is loaded. Replacing the stub with real logic in Phase 5 requires changes only inside `inference_service.py` — nothing else changes.

---

### 3.3 Implement the auth system

Build authentication before any other feature. Without working auth, no other endpoint can be properly tested.

**3.3.1 Password handling**

Passwords are hashed with bcrypt on registration. The plain-text password is never stored, logged, or returned. On login, the submitted password is run through bcrypt's verify function against the stored hash.

**3.3.2 JWT strategy**

Two tokens are issued on every successful login:

- **Access token** — short-lived (8 hours), signed with `JWT_SECRET`. Payload contains: `sub` (user UUID), `role`, `email`, `exp` (expiry timestamp). This token is sent in the `Authorization` header on every API request.
- **Refresh token** — longer-lived (7 days), an opaque random string. The raw token is returned to the client. A bcrypt hash of the token is stored in the `refresh_tokens` table. The raw token is never stored server-side.

On token refresh:
1. Receive the raw refresh token from the client
2. Hash it with bcrypt
3. Look up the hash in `refresh_tokens` — verify it exists, is not revoked, and has not expired
4. Issue a new access token
5. Rotate the refresh token: generate a new one, revoke the old one (set `revoked = true`), insert the new hash

On logout: set `revoked = true` on the refresh token record matching the submitted token hash.

**3.3.3 Auth endpoints to implement**

| Method | Path | Auth required | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Create user account. Accepts email, password, full_name, role. Returns user object (no hash). |
| POST | `/api/auth/login` | No | Verify credentials. Returns access token + refresh token. |
| POST | `/api/auth/refresh` | No (refresh token in body) | Returns new access token. Rotates refresh token. |
| POST | `/api/auth/logout` | No (refresh token in body) | Revokes refresh token. |
| GET | `/api/auth/me` | Yes | Returns current user object from token. |

**3.3.4 Auth middleware**

Write a FastAPI dependency function `get_current_user` that:
1. Reads the `Authorization` header
2. Verifies the bearer token is a valid, non-expired JWT signed with `JWT_SECRET`
3. Extracts the `sub` (user UUID) from the payload
4. Queries the user record from Neon
5. Returns the user object — or raises HTTP 401 if any step fails

Write a second dependency `require_role(allowed_roles)` that wraps `get_current_user` and raises HTTP 403 if the user's role is not in the allowed list. Inject this into any endpoint that is role-restricted.

---

### 3.4 Implement patient endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/patients/` | Any authenticated role | Create patient record. Validate `patient_code` is unique. |
| GET | `/api/patients/` | Any authenticated role | Return paginated list. Accept optional `search` query param on `patient_code`. |
| GET | `/api/patients/{id}` | Any authenticated role | Return patient with their scan history (scan IDs, dates, status). |

---

### 3.5 Implement scan endpoints (stub inference)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/scans/upload/` | Clinician, Radiologist | Accept image + patient_id + requested_conditions. Create scan record with `status = processing`. Trigger background task (stub). Return scan_id immediately. |
| GET | `/api/scans/{id}` | Any authenticated | Return scan record including status and requested_conditions. |
| GET | `/api/scans/{id}/findings` | Any authenticated | Return array of finding records for the scan. Empty array until Phase 5. |
| GET | `/api/scans/` | Any authenticated | List scans. Accept `patient_id` as optional filter. |
| PATCH | `/api/scans/{id}/notes` | Radiologist only | Add or update clinician notes on a scan. |

The stub background task triggered by the upload endpoint:
1. Waits 2 seconds (simulates processing time)
2. Creates a hardcoded finding record in the DB for each requested condition (prediction: `"Positive"`, confidence: `0.87`, model_version: `"stub-v0"`)
3. Updates scan status to `"complete"`

The stub returns the exact same response shape as real inference will return. This allows the frontend to be fully wired in Phase 7 without waiting for Phase 5.

---

### 3.6 Write the Dockerfile

The Dockerfile must satisfy one hard requirement from Hugging Face Spaces: **the application must listen on port 7860**.

Key steps the Dockerfile performs (describe to your assistant or implement yourself):
1. Start from `python:3.11-slim`
2. Install system-level dependencies required for image processing libraries (libGL, libglib)
3. Copy `requirements.txt` and install Python dependencies
4. Copy application source code
5. Expose port 7860
6. Start command: `uvicorn main:app --host 0.0.0.0 --port 7860`

Model files are **not included in the Docker image**. They are downloaded at runtime from HF Hub and cached to the `/data` persistent directory on the Space. This keeps the image small and means model updates require only a Hub push, not a Docker rebuild.

---

### 3.7 Configure CORS

The FastAPI app must allow requests from your Vercel frontend origin. Configure `CORSMiddleware` to allow the Vercel domain and `localhost:5173` (for local development). Credentials (the Authorization header) must be explicitly allowed.

---

### 3.8 Deploy the skeleton

Push the backend code to the HF Space's Git repository. Hugging Face rebuilds the Docker container on every push and streams build logs in the Space UI.

After the first successful deploy, verify:
- `GET /health` (add a simple health check endpoint) returns `{ "status": "ok" }`
- `POST /api/auth/register` creates a user and returns the user object
- `POST /api/auth/login` returns access and refresh tokens
- `GET /api/auth/me` with a valid token returns the user object
- `GET /api/auth/me` without a token returns HTTP 401
- `POST /api/patients/` creates a patient visible in the Neon console
- `POST /api/scans/upload/` (with a test image) returns a `scan_id` and the stub finding appears in `GET /api/scans/{id}/findings` after a few seconds

---

**Phase 3 complete when:**
- All listed endpoints return correct responses on the live HF Space URL
- Test data appears in Neon `dev` branch
- Stub findings are being written to the `findings` table

---

## Phase 4 — File Storage Integration

**Goal:** The scan upload endpoint accepts a real image file, pushes it to the Hugging Face Dataset repo, and stores the resulting public URL in the scan record.

**Prerequisites:** Phase 3 complete. Phase 1.2 (HF Dataset repo created, HF token in Secrets).

---

### 4.1 Understand the storage flow

When a clinician uploads an X-ray, the file handling sequence is:

1. FastAPI receives the image as an in-memory byte stream (`UploadFile`)
2. `storage_service.py` pushes the bytes to the HF Dataset repo using `huggingface_hub.upload_file()`
3. The file is stored at the path `scans/{scan_id}/{original_filename}` within the dataset repo
4. The public URL follows the pattern: `https://huggingface.co/datasets/{hf-username}/mediscan-xray-storage/resolve/main/scans/{scan_id}/{filename}`
5. This URL is written to `scans.image_url` in Neon
6. The URL is returned as part of the scan response so the frontend can display the original X-ray on the results page

The upload to HF Hub is not instantaneous (typically 2–5 seconds for a chest X-ray). It must run as a FastAPI background task so the HTTP response is returned immediately and the client is not left waiting.

---

### 4.2 Implement `storage_service.py`

This service exposes a single function: `upload_xray(file_bytes, filename, scan_id)` → returns the public URL string.

Internally:
- Constructs the destination path within the dataset repo
- Calls `huggingface_hub.upload_file()` with the byte content, destination path, repo ID, and token from environment variables
- Constructs and returns the public resolve URL

Error handling:
- If the upload raises an exception, the function should catch it and raise a custom `StorageError`
- The background task calling this function must catch `StorageError` and update the scan's status to `"failed"` in the DB, rather than leaving it permanently at `"processing"`

---

### 4.3 Update the scan upload endpoint

Replace the stub storage call in `POST /api/scans/upload/` with the real `storage_service.py`. The full sequence in the background task becomes:

1. Call `storage_service.upload_xray()` → get URL (or handle `StorageError` → set status to `"failed"` and return)
2. Update `scans.image_url` with the returned URL
3. Call `inference_service.run_panel()` → still the stub at this stage
4. Write findings to DB and set status to `"complete"`

The HTTP response (the `scan_id` and initial status) is still returned immediately, before any of the above background steps complete.

---

### 4.4 Validate uploaded files

Before passing the file to storage, validate:
- MIME type is `image/jpeg` or `image/png` (check the file header, not just the extension)
- File size is under a reasonable limit (e.g., 10 MB) to prevent abuse

Reject invalid files with HTTP 400 and a clear error message before any background task is triggered.

---

### 4.5 Test the storage flow

Using a real chest X-ray (sourced from a public domain dataset — NIH ChestX-ray14 is CC0 licensed):

1. POST the image to the upload endpoint
2. Confirm the API returns a `scan_id` immediately
3. Open the Neon console for the `dev` branch and watch the `scans` table — the `image_url` field should be populated within 5–10 seconds
4. Open the populated URL in a browser — the X-ray image should load
5. GET the scan record and confirm `image_url` is present in the JSON response

---

**Phase 4 complete when:**
- Real images uploaded via the API are accessible at public HF Dataset URLs
- Scan records in Neon have populated `image_url` values
- The upload endpoint returns immediately, not after the storage operation

---

## Phase 5 — ML Inference Integration

**Goal:** Replace the stub inference with real ONNX model predictions. Each selected condition runs its dedicated model. Findings are written to the DB as they complete, not as a single batch at the end.

**Prerequisites:** Phase 4 complete. Phase 2 complete for at least one condition model (start with Pneumonia).

> You do not need all four models ready to begin this phase. Start with Pneumonia, verify the full end-to-end loop, then add each subsequent model as training completes. The registry pattern means adding a model is always just a new entry — no structural changes.

---

### 5.1 Implement the model registry

In `inference_service.py`, define a configuration dictionary where each key is a condition identifier and each value describes that condition's model. Each entry must contain:

- `hf_repo`: the HF Hub model repo name (e.g., `"{hf-username}/mediscan-pneumonia"`)
- `onnx_filename`: name of the ONNX file within the repo (e.g., `"mediscan_pneumonia.onnx"`)
- `pth_filename`: name of the PyTorch checkpoint file (e.g., `"mediscan_pneumonia.pth"`)
- `label`: human-readable label shown in the frontend (e.g., `"Pneumonia"`)
- `disclaimer`: any condition-specific warning (e.g., for Nodule/Mass: `"Possible nodule or mass detected. CT follow-up is required. This is not a cancer diagnosis."`)
- `experimental`: boolean — `true` for TB and Nodule/Mass initially, `false` for Pneumonia and Cardiomegaly

Adding a new condition in the future is a single new entry in this dictionary. No other file changes.

---

### 5.2 Implement model loading at startup

Models must be loaded once at application startup and held in memory for the lifetime of the process. Loading models on each request would add several seconds of latency per prediction and is the single most impactful performance mistake to avoid.

The loading sequence, triggered by FastAPI's startup event:

1. Iterate over every entry in the model registry
2. For each model, construct the expected local cache path: `/data/models/{condition}/{filename}` (the `/data` directory is persistent on HF Spaces)
3. Check whether the file already exists at that path
4. If it exists, load it directly from disk (fast — avoids re-download on every restart)
5. If it does not exist, call `huggingface_hub.hf_hub_download()` to download from HF Hub into the cache path
6. Load the ONNX file into an `onnxruntime.InferenceSession` with CPU execution provider
7. Store the session in a module-level dictionary keyed by condition name

This pattern means: cold start (first ever deploy, or after Space hardware reset) downloads all models once. Every subsequent restart (sleep/wake cycle) loads from the persistent `/data` directory in seconds.

---

### 5.3 Implement the preprocessing function

The preprocessing at inference time must **exactly match** the preprocessing used during training (Phase 2.2). Implement the following steps in a function that takes a URL as input and returns a numpy array ready for ONNX Runtime:

1. Download the image from the HF Dataset URL (the URL stored in `scans.image_url`)
2. Decode the image bytes using Pillow
3. Convert to RGB (handles grayscale inputs)
4. Resize to 224 × 224 pixels
5. Convert to a float32 numpy array, scale values to [0, 1]
6. Apply ImageNet normalization: subtract mean `[0.485, 0.456, 0.406]`, divide by std `[0.229, 0.224, 0.225]`, channel by channel
7. Transpose from HWC to CHW format (height × width × channels → channels × height × width)
8. Add a batch dimension so the final shape is `(1, 3, 224, 224)`

If any step fails (e.g., the URL is unreachable, the file is not a valid image), raise a descriptive exception — the orchestrator handles it gracefully.

---

### 5.4 Implement single-condition inference

Write a function `run_single(condition_key, image_array)` that:

1. Retrieves the `InferenceSession` for the given condition from the loaded sessions dictionary
2. Runs a forward pass: call `session.run(None, {input_name: image_array})`
3. The output is a raw logit (a single float). Apply a sigmoid function to convert it to a probability in [0, 1]
4. Derive the prediction label: `"Positive"` if probability > 0.5, else `"Negative"`
5. Return a dictionary: `{ "prediction": ..., "confidence": float(probability), "model_version": ... }`

The `model_version` value should be the HF Hub commit hash that was recorded when the model was downloaded (available from `hf_hub_download()` metadata). Store it in the sessions dictionary alongside the session at startup. This creates a permanent audit trail: every finding record in the DB is linked to the exact model version that produced it.

---

### 5.5 Implement the inference orchestrator

Replace the stub in `inference_service.py` with a real function `run_panel(scan_id, image_url, requested_conditions)`:

1. Resolve `"all"` to every key in the model registry if `requested_conditions` is `["all"]`
2. Call the preprocessing function once and hold the result in memory — do not preprocess once per model
3. Run all requested models **concurrently**: use `asyncio.gather()` with each model running inside `asyncio.get_event_loop().run_in_executor(None, run_single, condition_key, image_array)`. The executor offloads CPU-bound ONNX inference to a thread pool, preventing it from blocking the async event loop.

   The concurrent approach means a 4-condition panel takes approximately as long as the slowest single model (~1–3 seconds on CPU), not the sum of all four.

4. As each model result comes back, immediately write a finding record to Neon. Do not wait for all models to finish before writing anything.
5. If a single model raises an exception, catch it, write a finding with `prediction = "Error"` and `confidence = 0`, and continue with remaining models. Do not let one failure abort the entire panel.
6. Once all requested models have written their findings (whether successful or error), update `scans.status` to `"complete"`.

---

### 5.6 Wire the orchestrator into the upload background task

In the scan upload background task (which already handles storage in Phase 4), replace the inference stub call with `run_panel()`. The task sequence is now:

1. Upload image to HF Dataset → get URL
2. Update `scans.image_url` with URL
3. Call `run_panel(scan_id, image_url, requested_conditions)`
4. Findings are written inside `run_panel` as they complete
5. `run_panel` updates `scans.status` to `"complete"` when done

---

### 5.7 Test the inference loop

Using a real chest X-ray from a public domain source:

1. Upload the image via `POST /api/scans/upload/` with `requested_conditions: ["pneumonia"]`
2. Poll `GET /api/scans/{id}/findings` every 3 seconds
3. A finding record should appear with a real `confidence` value (not 0.87 from the stub)
4. Confirm the `model_version` field contains a hex commit hash
5. Test with `requested_conditions: ["all"]` — all four findings (or as many as have trained models) should appear progressively

---

**Phase 5 complete when:**
- At least one condition model (Pneumonia) returns real predictions through the live HF Spaces API
- `model_version` field is populated with a real HF Hub commit hash
- Concurrent panel execution confirmed (four models complete in less time than four sequential runs would take)
- All four conditions integrated as Phase 2 training completes

---

## Phase 6 — Grad-CAM Integration (Stretch Goal)

**Goal:** Generate a per-finding visual heatmap stored in HF Dataset and returned as a URL in the finding record.

**Prerequisites:** Phase 5 complete. Phase 2 complete with `.pth` files uploaded.

> This phase is optional for the submission deadline. The system is fully demonstrable without it. Prioritise only if Phases 1–7 are complete with time to spare.

---

### 6.1 Load PyTorch models at startup

Extend the startup loading sequence from Phase 5.2. For each condition, in addition to the ONNX session, also download and load the `.pth` PyTorch checkpoint. Reconstruct the EfficientNet-B0 architecture, load the state dict, and set to evaluation mode.

HF Spaces free CPU tier has 16 GB RAM. Four EfficientNet-B0 models in memory simultaneously (~100 MB each loaded) plus four ONNX sessions is approximately 1–2 GB total — well within the hardware limit.

Store the PyTorch models in the same sessions dictionary alongside the ONNX sessions, under a `"torch_model"` key.

---

### 6.2 Implement Grad-CAM generation

After `run_single()` completes for a given condition, run a Grad-CAM pass using the loaded PyTorch model:

Algorithm:
1. Take the same preprocessed image array from Phase 5.3, convert to a PyTorch tensor
2. Instantiate `GradCAM` from `pytorch-grad-cam` with `model` set to the PyTorch model and `target_layers` set to `[model.features[-1]]`
3. Define the target as `BinaryClassifierOutputTarget(0)` (the single output neuron)
4. Call `cam(input_tensor=tensor, targets=targets)` — returns a 2D float array the same size as the input image (224 × 224)
5. The heatmap values range from 0 to 1 — higher values indicate regions that most influenced the prediction
6. Apply a colour map to the heatmap (e.g., `cv2.COLORMAP_JET`) to produce an RGB overlay
7. Blend the colour overlay with the original resized X-ray at approximately 40% opacity
8. Encode the blended result as a JPEG byte stream

---

### 6.3 Store the heatmap and update the finding

1. Upload the JPEG byte stream to the HF Dataset repo at the path `scans/{scan_id}/heatmaps/{condition}.jpg`
2. The resulting public URL follows the same pattern as X-ray image URLs
3. Update the finding record in Neon: set `findings.heatmap_url` to the returned URL

This update can happen after the initial finding record is already written — the frontend polls for findings and will pick up the `heatmap_url` when it appears.

---

### 6.4 Qualitative verification

For each condition model, confirm on at least 5 test images that:
- Heatmaps load successfully from their HF Dataset URL
- Activation highlights anatomically relevant regions
- The overlay is visually distinguishable (heatmap is not uniformly red or uniformly blue)

---

**Phase 6 complete when:**
- All finding records have populated `heatmap_url` values
- Heatmaps load at their public URLs
- Overlays highlight plausible anatomical regions

---

## Phase 7 — Frontend–Backend Wiring

**Goal:** Connect the existing React frontend to the live FastAPI backend so the complete user journey works end-to-end in a browser.

**Prerequisites:** Phase 3 complete (auth + patient endpoints). Phase 5 complete for at least one model. Phase 0 audit output.

---

### 7.1 Configure the HTTP client

Confirm the Axios instance (or fetch wrapper) is configured to:

- Read `baseURL` from `import.meta.env.VITE_API_BASE_URL`
- Attach `Authorization: Bearer {accessToken}` via a request interceptor on every outgoing request
- On receiving HTTP 401, automatically call `POST /api/auth/refresh` with the stored refresh token, store the new access token, and retry the failed request exactly once
- If the refresh also fails, clear all token state and redirect to `/login`

---

### 7.2 Wire the login page

Expected behaviour:
1. User submits credentials → POST to `/api/auth/login`
2. On success: store access token in React state (Context or Zustand), store refresh token in a module-level variable outside React's render cycle. Never store either token in `localStorage`.
3. Call `GET /api/auth/me` to populate the user object (role, name, email) into global state
4. Redirect to `/dashboard`
5. On failure: display the error message from the response body

---

### 7.3 Wire the upload page

Expected behaviour:
1. User selects an image and condition(s) and submits
2. Build a `FormData` object containing:
   - `file`: the selected image file
   - `patient_id`: the UUID of the selected patient
   - `requested_conditions`: JSON array of condition keys, or `["all"]` for the Comprehensive Panel
3. POST to `/api/scans/upload/` with content type `multipart/form-data`
4. On receiving the `scan_id` in the response, navigate immediately to `/scans/{scan_id}/result`

---

### 7.4 Wire the results page

This page must handle progressive result loading — findings arrive asynchronously as models complete.

Polling algorithm:
1. On mount, extract `scan_id` from the URL
2. Start polling `GET /api/scans/{id}/findings` every 3 seconds
3. Maintain a `findings` array in component state
4. On each poll response, merge new findings into the state array — do not replace, merge, so that already-rendered cards are not destroyed and re-rendered
5. Poll `GET /api/scans/{id}` (or check a `status` field included in the findings response) to detect when `status == "complete"`
6. When status is `"complete"`, stop polling
7. If status is `"failed"`, stop polling and show an error state

Rendering rules:
- For each condition in `requested_conditions`, render a card immediately — show a loading skeleton while the finding for that condition has not yet arrived
- When a finding arrives, replace the skeleton with the real values (prediction, confidence bar, heatmap if present)
- The disclaimer banner renders on page mount and remains visible throughout, regardless of loading state — it is never hidden behind a loading state

---

### 7.5 Wire the patient pages**

- `GET /api/patients/` → patient list with search
- `POST /api/patients/` → create patient form
- `GET /api/patients/{id}` → patient detail with scan history table

---

### 7.6 Wire the dashboard

If a `GET /api/stats/` summary endpoint does not yet exist in the backend, add it. It should return:
- Total scans created today
- Total scans this week
- Count of positive findings per condition this week
- (Optional) Recent scans table with scan ID, patient code, timestamp, status

Wire the dashboard component to consume this endpoint on mount.

---

### 7.7 Confirm environment variables for all environments

| Environment | `VITE_API_BASE_URL` value |
|---|---|
| Local development | `http://localhost:7860` |
| Vercel preview | HF Space URL |
| Vercel production | HF Space URL |

Set the Vercel production and preview values in the Vercel project settings, not in the codebase.

---

**Phase 7 complete when:**
- Login → create patient → upload X-ray → see real AI findings in browser, working against the live HF Space backend
- Findings appear progressively (loading skeletons transition to real values as models complete)
- Disclaimer banner visible at all times on the results page
- Dashboard shows real aggregated data

---

## Phase 8 — Testing and Demo Preparation

**Goal:** Verify the complete system under realistic conditions and produce a stable, demo-ready state.

**Prerequisites:** Phase 7 complete.

---

### 8.1 Functional test checklist

Walk through every journey in a real browser:

- [ ] Register a new clinician account
- [ ] Login and see the dashboard
- [ ] Create a patient record
- [ ] Upload an X-ray with a single condition selected
- [ ] Upload an X-ray with Comprehensive Panel selected
- [ ] Confirm findings appear progressively on the results page (not all at once)
- [ ] Confirm the disclaimer banner is always visible on the results page
- [ ] View patient detail page showing scan history
- [ ] Login as a radiologist and add clinician notes to a scan
- [ ] Login as a clinician and confirm the notes field is read-only or absent
- [ ] Logout and confirm protected routes redirect to `/login`
- [ ] (Phase 6) Confirm heatmap overlays load on finding cards

---

### 8.2 Prepare the warm-up routine

HF Spaces free tier sleeps after 15 minutes of inactivity. Before any demo or video recording:

1. Open the HF Space URL — if the Space is asleep, click to wake it and wait for the build indicator to show "Running"
2. Make one test API call (e.g., `GET /health`) and confirm a response
3. Upload one test X-ray through the actual UI and confirm findings appear — this triggers model loading from cache and warms the system
4. The first upload after a cold start takes 30–90 seconds (depends on cache state). Every subsequent upload is fast
5. Keep the browser tab with the running demo open during any live presentation to prevent the Space from sleeping

---

### 8.3 Prepare demo X-rays

Source 4 test images from the NIH ChestX-ray14 dataset (CC0 licence — free to use). Select:
- 1 image with clear pneumonia findings (positive case)
- 1 clearly normal image (to demonstrate the system correctly classifies negatives)
- 1 image with cardiomegaly if available from the dataset's metadata
- 1 ambiguous or borderline image (to demonstrate the referral use case)

Store these in a local folder ready for the demo. Do not use any real patient images at any stage.

---

### 8.4 Final documentation checks

Before final submission:

- Confirm all four HF Model repos have published `model_card.md` files
- Update this implementation plan document to reflect any deviations from the plan during build
- Add a `DISCLAIMER.md` to the backend repo: state that no real patient data was used, that all training images are from public-domain datasets, and that the tool is a decision-support system, not a diagnostic device
- Confirm the concept note and voiceover script (competition submission documents) are consistent with the final built stack

---

### 8.5 Production readiness checks

| Check | How to verify |
|---|---|
| Vercel frontend deployed from `main` branch | Check Vercel dashboard — deployment status green |
| HF Space running | Green dot on the Space page |
| Neon `main` branch accessible | Run a test query in the Neon SQL Editor |
| At least one demo scan record exists | Visible in Neon and retrievable from `GET /api/scans/` |
| HF Dataset contains at least one test X-ray | URL loads in browser |
| All four model repos on HF Hub have `.onnx` and `.pth` files | Browse each repo |

---

**Phase 8 complete when:** You can record a clean, uninterrupted demo video of the full user journey (login → upload → findings displayed) without the system failing or stalling.

---

## Libraries Reference

| Library | Purpose | Phase introduced |
|---|---|---|
| `fastapi` | Web framework | Phase 3 |
| `uvicorn` | ASGI server | Phase 3 |
| `psycopg2-binary` | Neon PostgreSQL adapter | Phase 3 |
| `PyJWT` | JWT generation and verification | Phase 3 |
| `bcrypt` | Password and refresh token hashing | Phase 3 |
| `python-multipart` | Multipart form parsing (file upload) | Phase 3 |
| `Pillow` | Image loading and preprocessing | Phase 4 / 5 |
| `huggingface_hub` | HF Dataset upload + model download | Phase 4 / 5 |
| `onnxruntime` | ONNX model inference | Phase 5 |
| `opencv-python-headless` | Heatmap colour mapping and overlay | Phase 6 |
| `torch` + `torchvision` | Grad-CAM gradient computation | Phase 6 (serving) / Phase 2 (training) |
| `grad-cam` (pytorch-grad-cam) | Grad-CAM computation | Phase 6 |
| `scikit-learn` | Evaluation metrics (training only, Colab) | Phase 2 |

---

## Milestone Summary

| Phase | Deliverable | Parallel with |
|---|---|---|
| 0 | Frontend audit document | — |
| 1 | All services provisioned and configured | — |
| 2 | Trained, evaluated, ONNX-exported models on HF Hub | Phase 3, 4 |
| 3 | Auth + patient + stub endpoints live on HF Spaces | Phase 2 |
| 4 | Real image upload → HF Dataset URL stored in Neon | — |
| 5 | Real ONNX predictions in live API | Requires Phase 2 (≥1 model) + Phase 4 |
| 6 | Grad-CAM heatmaps on all findings (stretch) | — |
| 7 | Full frontend wired, end-to-end flow in browser | — |
| 8 | Demo-ready, tested, submitted | — |

---

> **Ethical reminder (applies to every phase):** Every result shown to a clinician must display the non-dismissable disclaimer: *"Possible findings — review required by a qualified clinician. This tool does not constitute a medical diagnosis."* No real patient data is used at any stage of development. The Lung Nodule/Mass finding must never be worded as a cancer diagnosis — always recommend CT follow-up. The TB model's small training dataset must be disclosed on the model card and flagged as experimental in the UI. These are not optional additions — they are part of what makes this a responsible medical AI system.
