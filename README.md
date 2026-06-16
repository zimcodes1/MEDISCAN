# MediScan NG — MVP Implementation Plan (v2)

> **Stack:** Firebase (Auth · Firestore · Storage · Hosting) · Cloud Run (FastAPI inference service) · Cloud Functions (orchestration glue) · React (TypeScript + Tailwind) · PyTorch (training) + ONNX Runtime (serving) · EfficientNet-B0 per-condition models · Grad-CAM

## What Changed from v1

1. **Backend swap.** Django + DRF + PostgreSQL + SimpleJWT is replaced by a Firebase hybrid: Firebase Auth/Firestore/Storage handle everything CRUD-shaped (users, roles, patient records, scan metadata, image storage), while a dedicated **Cloud Run FastAPI service** handles only the AI inference — the one piece of the system where latency actually matters and where a serverless function's cold start would hurt. This keeps MVP build speed high without sacrificing response time on the part clinicians are actually waiting on.
2. **Single-disease → multi-condition panel.** Instead of one binary pneumonia classifier, the system now runs a **registry of independent per-condition models**, each trained, evaluated, and served separately. A clinician can run one specific model or trigger a "Comprehensive Panel" (formerly "all-round diagnosis") that runs every registered model concurrently against the same X-ray.

## A Note on Scope — Which Conditions Actually Belong Here

Before locking in the condition list, it's worth being honest about what a chest X-ray can and can't tell you, since this is a clinical-facing tool and overclaiming here is the kind of thing that should be caught at design time, not after a judge or a clinician asks about it.

| Condition | Visible on plain chest X-ray? | Verdict |
|---|---|---|
| Pneumonia | Yes — well established | **Core model** |
| Tuberculosis | Yes — established radiographic patterns | **Core model** (note: public labeled datasets are small, ~800 images — flag this in the model card) |
| Heart problems (cardiomegaly) | Yes — enlarged cardiac silhouette is a standard X-ray finding | **Core model**, framed specifically as "cardiomegaly" rather than generic "heart problems" |
| Lung cancer | Partially — X-ray can sometimes show a nodule or mass, but CT is the actual diagnostic standard | **Included, but reframed.** Model detects "possible nodule/mass" and the result explicitly recommends CT follow-up — it must never say "lung cancer detected" |
| Broken ribs | Technically yes, but subtle fractures are notoriously hard to see on plain film even for trained radiologists, and public plain-film fracture datasets are scarce (most fracture research datasets are CT-based) | **Stretch/experimental tier** — build it, but don't promise it for demo day, and label it "Experimental" in the UI |
| Bronchitis | No reliable radiographic signature — it's a clinical diagnosis (cough, sputum, auscultation); X-rays in suspected bronchitis are usually ordered to *rule out* pneumonia, not to diagnose bronchitis itself | **Dropped.** There's nothing real for a model to learn here |
| Common cold | No chest X-ray finding at all | **Dropped.** Training a classifier against a condition with zero radiographic signal means it would only ever learn dataset artifacts, which isn't defensible in a medical AI context |

Final condition panel for the MVP: **Pneumonia, Tuberculosis, Cardiomegaly, Lung Nodule/Mass**, with **Rib Fracture** as an explicitly experimental fifth model. This is still a genuinely "wide variety of chest-related conditions" — it's just the set that the imaging modality can actually speak to.

---

## Phase 0 — Project & Cloud Setup (Day 1–2)

**Goal:** Skeleton running locally, Firebase project provisioned, no feature code yet.

1. Repo layout: `/inference-service` (FastAPI), `/functions` (Cloud Functions), `/frontend` (React). No `/backend` Django folder this time.
2. Create a Firebase project in the console. Enable **Authentication** (Email/Password), **Firestore** (production mode), **Storage**, and **Hosting**.
3. Note the Firebase project's underlying GCP project ID — you'll deploy Cloud Run and Cloud Functions into the same project so everything shares one IAM/billing surface.
4. Install tooling: `npm install -g firebase-tools`, then `firebase init` selecting Firestore, Storage, Hosting, Functions, and Emulators.
5. Scaffold the inference service in `/inference-service`:
   ```
   pip install fastapi uvicorn onnxruntime torch torchvision pillow opencv-python-headless firebase-admin python-multipart grad-cam
   ```
6. Scaffold the frontend exactly as before, plus the Firebase JS SDK:
   ```
   npm create vite@latest frontend -- --template react-ts
   cd frontend && npm install axios react-router-dom firebase
   ```
7. Confirm: `firebase emulators:start` runs clean, `uvicorn main:app --reload` serves locally, frontend dev server starts.

---

## Phase 1 — Authentication & Role System (Day 3–4)

**Goal:** Firebase Auth login working with three roles: `admin`, `radiologist`, `clinician`.

1. Roles are implemented as **Firebase custom claims**, not a database column. An admin-only Cloud Function (`setUserRole`) uses the Firebase Admin SDK to attach a `role` claim to a user's account.
2. Frontend: Firebase Auth handles login/signup directly. `onAuthStateChanged` populates a React Context with the user object and their decoded role claim. The Firebase SDK auto-attaches ID tokens to Firestore/Storage calls — no manual interceptor needed for those.
3. For calls to the **Cloud Run inference service** (which sits outside the Firebase SDK's auto-auth), manually attach `Authorization: Bearer <idToken>` from `getIdToken()`.
4. In FastAPI, write a dependency that calls `firebase_admin.auth.verify_id_token()` on every request and checks the decoded `role` claim — this replaces DRF's `IsRadiologist` / `IsClinician` permission classes.
5. Write Firestore Security Rules restricting reads/writes on `patients`, `scans`, and `scans/{id}/findings` by role — e.g., only `radiologist` and `clinician` can create scans; only `radiologist` can write `clinician_notes`.

---

## Phase 2 — Multi-Condition Model Training (Day 3–10, parallel)

**Goal:** Independently trained model files for each condition in the panel, registered behind a common interface.

> Still done in **Google Colab** (free T4 GPU), committed under `model_training/`.

1. **Dataset shift.** The single Kaggle pneumonia set isn't enough on its own anymore. Use the **NIH ChestX-ray14** dataset (112,120 images, 14 labels including Pneumonia, Cardiomegaly, Nodule, Mass) as the backbone for Pneumonia, Cardiomegaly, and Lung Nodule/Mass. Tuberculosis needs a separate source — the public **Shenzhen + Montgomery TB X-ray sets**. If you pursue the Rib Fracture stretch model, expect to spend real time just locating a usable plain-film dataset; don't let this block the core four.
2. Shared preprocessing pipeline (same as v1): resize to 224×224, ImageNet mean/std normalization, `RandomHorizontalFlip` / `RandomRotation(10)` / `ColorJitter` on train only, 80/10/10 split.
3. **Reuse one training recipe across conditions** — write it once, parameterized by `condition` and label column, rather than four bespoke scripts:
   ```python
   model = efficientnet_b0(pretrained=True)
   for param in model.parameters():
       param.requires_grad = False
   model.classifier[1] = nn.Linear(model.classifier[1].in_features, 1)
   # train head only (5 epochs, lr=1e-3), then unfreeze last 2 blocks (5 epochs, lr=1e-4)
   ```
4. Evaluate each model independently: accuracy, sensitivity, specificity, AUC-ROC, confusion matrix. Expect Pneumonia and Cardiomegaly (larger, well-studied datasets) to outperform Tuberculosis (much smaller dataset) — document this gap honestly in the model card rather than smoothing it over.
5. Generate Grad-CAM per model the same way as before (`pytorch-grad-cam` against the final EfficientNet feature layer), and visually confirm heatmaps land on lung/heart anatomy, not image borders, for each condition separately.
6. **Export each trained model to ONNX** for serving:
   ```python
   torch.onnx.export(model, dummy_input, f"mediscan_{condition}.onnx")
   ```
   Verify numerical parity between the PyTorch and ONNX outputs on a handful of validation images before trusting the exported version.
7. **Keep both formats.** ONNX Runtime is what actually serves predictions (smaller footprint, faster CPU inference). But Grad-CAM needs gradients, which ONNX Runtime doesn't expose — so the inference service keeps the original PyTorch checkpoint loaded alongside the ONNX file *specifically* for heatmap generation. Predict with ONNX, explain with PyTorch.
8. Commit all artifacts to `/inference-service/models/`: `mediscan_pneumonia.onnx` + `.pth`, `mediscan_tuberculosis.onnx` + `.pth`, `mediscan_cardiomegaly.onnx` + `.pth`, `mediscan_nodule_mass.onnx` + `.pth` (+ rib fracture pair if pursued).

---

## Phase 3 — Inference Orchestration & Data Layer (Day 8–13)

**Goal:** Cloud Run service that can run any subset of registered models concurrently, with Firestore reflecting results as each one finishes — not as a single all-or-nothing blob.

### 3.1 Model Registry (`inference-service/registry.py`)

A config-driven registry, loaded once at startup as module-level singletons (same "load once, not per-request" principle as v1's `_model = load_model()`):

```python
MODEL_REGISTRY = {
    "pneumonia":    {"onnx": "models/mediscan_pneumonia.onnx",    "pth": "models/mediscan_pneumonia.pth",    "label": "Pneumonia"},
    "tuberculosis": {"onnx": "models/mediscan_tuberculosis.onnx", "pth": "models/mediscan_tuberculosis.pth", "label": "Tuberculosis"},
    "cardiomegaly": {"onnx": "models/mediscan_cardiomegaly.onnx", "pth": "models/mediscan_cardiomegaly.pth", "label": "Cardiomegaly"},
    "nodule_mass":  {"onnx": "models/mediscan_nodule_mass.onnx", "pth": "models/mediscan_nodule_mass.pth", "label": "Possible Nodule/Mass"},
    # "rib_fracture": {...}  # add when ready — no architecture change needed
}
```

Adding a fifth or sixth condition later is just one new entry plus weight files — nothing else in the system needs to change. This is the part that directly answers "selected by the clinician, or all-round" from a code-structure standpoint.

### 3.2 Firestore Data Model

```
patients/{patientId}            — patient_id (anonymised), age, sex, createdBy
scans/{scanId}                  — patientId, uploadedBy, originalImageUrl,
                                   requestedConditions: string[], status: "processing"|"complete", createdAt
scans/{scanId}/findings/{conditionId}
                                 — condition, prediction, confidence, heatmapUrl, modelVersion, completedAt
```

Each finding is its own subcollection document, written independently as soon as that specific model finishes — this is what makes progressive, per-condition results possible on the frontend.

### 3.3 Upload & Inference Flow

1. Frontend uploads the raw X-ray to Firebase Storage (`scans/originals/{scanId}.jpg`).
2. Frontend creates the `scans/{scanId}` document with `status: "processing"` and the clinician's selected `requestedConditions` (or `["all"]`).
3. Frontend calls the Cloud Run endpoint: `POST /infer` with `{ scanId, imageUrl, conditions }` and a Firebase ID token.
4. The `/infer` handler:
   - Verifies the token and role.
   - Downloads the image, resolves `"all"` to every key in `MODEL_REGISTRY` if requested.
   - Runs each requested model **concurrently** (e.g. `asyncio.gather` over a thread pool — CPU inference is blocking, so don't run the panel sequentially) rather than one after another. This is the key latency lever for the Comprehensive Panel mode — four models run in roughly the time of the slowest one, not the sum of all four.
   - As each model finishes: generates its Grad-CAM heatmap, uploads it to Storage, writes the corresponding `findings` doc immediately — it does not wait for the others.
   - Once every requested model has written its finding, updates `scans/{scanId}.status = "complete"`.
5. Frontend listens to `scans/{scanId}/findings` with Firestore's `onSnapshot` — results populate the Results page live, one card at a time, instead of one long spinner. This is the same progressive-disclosure trick discussed earlier, just generalized from "prediction now, heatmap later" to "each condition reports in as it finishes."
6. Cloud Run config: `min-instances: 1` to eliminate cold starts (the whole reason this didn't stay a Cloud Function), 2–4GB memory to hold four ONNX + four PyTorch checkpoints simultaneously.

---

## Phase 4 — Frontend UI (Day 10–15)

### Pages & Routes

```
/login                  → LoginPage
/dashboard              → DashboardPage (per-condition breakdown)
/patients               → PatientListPage
/patients/:id           → PatientDetailPage (scan history)
/scans/upload           → UploadPage
/scans/:id/result       → ResultPage
```

### Key Components

**`UploadPage`**
- Drag-and-drop image input, patient selector — same as v1.
- New: a condition selector — checkboxes for Pneumonia, Tuberculosis, Cardiomegaly, Lung Nodule/Mass, plus a prominent **"Run Comprehensive Panel"** toggle that selects all of them. Rib Fracture, if included, shows an "Experimental" badge next to its checkbox.
- Submit triggers the upload + `/infer` flow described in Phase 3.

**`ResultPage`**
- Redesigned around a **grid of per-condition finding cards** rather than one single result — each card shows that condition's X-ray + heatmap pair, a colour-coded confidence bar, and a prediction badge, and populates live as Firestore findings stream in.
- Disclaimer banner: same wording as v1, always visible, non-dismissable.
- The Lung Nodule/Mass card specifically carries an extra line: *"Possible nodule/mass — not a cancer diagnosis. CT follow-up recommended."* This isn't optional styling; it's the line that keeps the tool from overclaiming on the one condition where X-ray genuinely isn't the diagnostic standard.
- Clinician notes field, same role gating as v1.

**`DashboardPage`**
- Stats now broken down per condition (e.g. a stacked bar of flagged cases by condition this week) instead of a single pneumonia/normal split.

### State Management

React Context for auth state, now populated from Firebase Auth's `onAuthStateChanged` instead of a custom JWT context. Same `useApi`-style hook pattern for calls to the Cloud Run service; Firestore/Storage calls go through the Firebase SDK directly.

---

## Phase 5 — Integration & Testing (Day 14–17)

1. Use the **Firebase Local Emulator Suite** (Auth, Firestore, Storage, Functions) for end-to-end testing without touching production data. Point the Cloud Run service's Admin SDK initialization at the emulator endpoints during local testing.
2. Test matrix:
   - Role gating via custom claims (clinician cannot write radiologist-only fields).
   - `/infer` called with a single condition, a partial subset, and `"all"` — confirm findings write progressively, not as one blocking batch.
   - Heatmaps land in Storage under the right path per condition.
   - Confidence/prediction values match what the standalone model produced in Phase 2 evaluation (sanity check that nothing got lost in the ONNX export or the API layer).
3. Full user journey: Login → Upload → select conditions or Comprehensive Panel → watch finding cards populate live → add notes.

---

## Phase 6 — Deployment (Day 17–19)

1. **Frontend:** `firebase deploy --only hosting`. (Vercel still works fine if preferred — Firebase Hosting just means one less external service to wire up since you're already in the Firebase console for everything else.)
2. **Cloud Functions:** `firebase deploy --only functions` for `setUserRole` and any other lightweight triggers.
3. **Cloud Run:** containerize `/inference-service` with Docker, deploy with `gcloud run deploy --min-instances=1 --memory=4Gi`, and set the Firebase Admin SDK credentials as environment variables (never committed).
4. **Security rules:** `firebase deploy --only firestore:rules,storage:rules` — more important than ever now that there are more roles, more collections, and per-condition data to gate correctly.
5. Set the Cloud Run URL as `VITE_INFERENCE_API_URL` in the frontend build.
6. Smoke-test the full flow against the live Firebase project and the deployed Cloud Run service.

---

## Libraries Summary

| Purpose | Library |
|---|---|
| Deep learning (training) | `torch`, `torchvision` |
| Serving runtime | `onnxruntime` |
| Inference API | `fastapi`, `uvicorn` |
| Grad-CAM | `grad-cam` (pytorch-grad-cam) |
| Image processing | `Pillow`, `opencv-python-headless` |
| ML evaluation | `scikit-learn`, `matplotlib`, `seaborn` |
| Firebase backend services | `firebase-admin` (Python), `firebase` (JS SDK) |
| Cloud deploy | `gcloud` CLI, `firebase-tools` CLI |

---

## Milestone Checklist

- [ ] Phase 0: Firebase project provisioned, both services running locally
- [ ] Phase 1: Firebase Auth login + custom-claim roles working
- [ ] Phase 2: Pneumonia, TB, Cardiomegaly, Nodule/Mass models trained, ONNX-exported, eval reports written for each
- [ ] Phase 3: `/infer` returns progressive per-condition findings into Firestore for single, partial, and "all" requests
- [ ] Phase 4: Upload → multi-finding Result grid working in browser
- [ ] Phase 5: Full journey tested against emulators, no broken paths
- [ ] Phase 6: Live deployment, all conditions working in production

---

> **Ethical reminder (expanded for v2):** Every finding card displays the disclaimer banner. No real patient data, at any stage. Each model's bias and limitations are documented in the model card individually — call out the small Tuberculosis dataset size, the fact that NIH ChestX-ray14 and CheXpert are both predominantly Western-population datasets, and the experimental status of any Rib Fracture model explicitly. The Lung Nodule/Mass finding must never be worded as a cancer diagnosis. Bronchitis and the common cold were deliberately excluded from the imaging panel — not because they're unimportant clinically, but because chest X-ray has no reliable signal for either, and training a model against a non-existent radiographic pattern would be scientifically and ethically indefensible.
