# MediScan NG — MVP Implementation Plan

> **Stack:** Django + DRF · PostgreSQL · JWT Auth · React (TypeScript + Tailwind) · PyTorch + EfficientNet-B0 · Grad-CAM

---

## Phase 0 — Project Setup (Day 1–2)

**Goal:** Get the skeleton running locally before writing any feature code.

1. Create a GitHub repo with two top-level folders: `/backend` and `/frontend`. Add a `.gitignore` for Python and Node immediately.
2. Set up a Python virtual environment (`python -m venv venv`) inside `/backend`. Install base packages:
   ```
   django djangorestframework djangorestframework-simplejwt
   psycopg2-binary python-dotenv Pillow django-cors-headers
   ```
3. Run `django-admin startproject mediscan_ng .` inside `/backend`. Create three apps:
   - `accounts` — user auth and roles
   - `scans` — image upload, results, and patient records
   - `ml` — model loading, inference, and Grad-CAM logic
4. Create a PostgreSQL database locally (`mediscan_db`). Configure `settings.py` to use it via `python-dotenv` and a `.env` file. Never commit `.env`.
5. Configure `django-cors-headers` to allow requests from `http://localhost:5173` (Vite dev server).
6. Scaffold the React frontend:
   ```
   npm create vite@latest frontend -- --template react-ts
   cd frontend && npm install axios react-router-dom @types/react-router-dom
   ```
7. Confirm both servers start without errors before proceeding.

---

## Phase 1 — Authentication & Role System (Day 3–5)

**Goal:** JWT login working with three roles: `admin`, `radiologist`, `clinician`.

1. In the `accounts` app, extend Django's `AbstractUser` with a `role` field:
   ```python
   class CustomUser(AbstractUser):
       ROLES = [('admin', 'Admin'), ('radiologist', 'Radiologist'), ('clinician', 'Clinician')]
       role = models.CharField(max_length=20, choices=ROLES, default='clinician')
   ```
   Set `AUTH_USER_MODEL = 'accounts.CustomUser'` in settings **before the first migration**.

2. Configure SimpleJWT in `settings.py`:
   ```python
   SIMPLE_JWT = {
       'ACCESS_TOKEN_LIFETIME': timedelta(hours=8),
       'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
   }
   ```

3. Create serializers and views for:
   - `POST /api/auth/login/` — returns `access` + `refresh` tokens
   - `POST /api/auth/refresh/` — refreshes access token
   - `GET /api/auth/me/` — returns current user info including role

4. Write a custom `IsRadiologist` and `IsClinician` permission class using DRF's `BasePermission`. These will gate scan endpoints later.

5. Run migrations: `python manage.py makemigrations accounts && python manage.py migrate`.

6. **Frontend:** Build the Login page (`/login`) in React. Store the JWT `access` token in memory (React state / context) and the `refresh` token in an `httpOnly`-equivalent pattern. Create an Axios instance with an interceptor that attaches the `Authorization: Bearer <token>` header to every request and auto-refreshes on 401.

7. Create a `ProtectedRoute` wrapper component that redirects unauthenticated users to `/login`.

---

## Phase 2 — ML Model Training (Day 3–8, runs in parallel)

**Goal:** A trained `.pth` model file ready to be loaded by the backend.

> Do this in **Google Colab** (free T4 GPU). Work in a separate `model_training/` notebook folder committed to the repo.

1. Download the **Kaggle Chest X-Ray Pneumonia** dataset. Mount Google Drive to persist files across sessions.

2. Install ML libraries in Colab:
   ```
   torch torchvision grad-cam scikit-learn matplotlib seaborn
   ```

3. Build a data pipeline using `torchvision.datasets.ImageFolder` and `DataLoader`:
   - Resize all images to `224×224`
   - Normalize with ImageNet mean/std: `mean=[0.485, 0.456, 0.406]`, `std=[0.229, 0.224, 0.225]`
   - Augmentations on train set only: `RandomHorizontalFlip`, `RandomRotation(10)`, `ColorJitter`
   - Split: 80% train / 10% val / 10% test

4. Load EfficientNet-B0 with pretrained ImageNet weights and freeze all layers. Replace the classifier head:
   ```python
   model = efficientnet_b0(pretrained=True)
   for param in model.parameters():
       param.requires_grad = False
   model.classifier[1] = nn.Linear(model.classifier[1].in_features, 1)
   ```

5. Train with:
   - Loss: `BCEWithLogitsLoss`
   - Optimizer: `Adam(lr=1e-3)` on classifier head only for 5 epochs
   - Then unfreeze last 2 EfficientNet blocks and fine-tune at `lr=1e-4` for 5 more epochs
   - Use `ReduceLROnPlateau` scheduler on validation loss

6. Evaluate on the held-out test set. Report: accuracy, sensitivity (recall), specificity, AUC-ROC, confusion matrix. Target: Accuracy >88%, Sensitivity >90%, AUC-ROC >0.92.

7. Implement Grad-CAM using `pytorch-grad-cam`:
   ```python
   from pytorch_grad_cam import GradCAM
   from pytorch_grad_cam.utils.model_targets import BinaryClassifierOutputTarget
   cam = GradCAM(model=model, target_layers=[model.features[-1]])
   ```
   Verify visually that heatmaps highlight lung regions, not image borders.

8. Save the final model: `torch.save(model.state_dict(), 'mediscan_efficientnet_b0.pth')`. Download and commit to `/backend/ml/model/`.

---

## Phase 3 — Core Backend API (Day 6–10)

**Goal:** Three working endpoints: upload scan, get result, list patient scans.

### 3.1 Database Models (`scans` app)

```python
class Patient(models.Model):
    patient_id = models.CharField(max_length=20, unique=True)  # anonymised ID
    age = models.PositiveIntegerField(null=True)
    sex = models.CharField(max_length=10, choices=[('M','Male'),('F','Female'),('O','Other')])
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)

class Scan(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='scans')
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    original_image = models.ImageField(upload_to='scans/originals/')
    heatmap_image = models.ImageField(upload_to='scans/heatmaps/', null=True, blank=True)
    prediction = models.CharField(max_length=20)        # 'Normal' or 'Pneumonia'
    confidence = models.FloatField()                    # 0.0 – 1.0
    clinician_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed = models.BooleanField(default=False)
```

Run migrations after defining models.

### 3.2 ML Inference Service (`ml` app)

Create `ml/inference.py` — loads the model once at startup (module-level singleton) to avoid reloading on every request:

```python
import torch
from torchvision import transforms
from torchvision.models import efficientnet_b0

MODEL_PATH = BASE_DIR / 'ml/model/mediscan_efficientnet_b0.pth'

def load_model():
    model = efficientnet_b0()
    model.classifier[1] = torch.nn.Linear(model.classifier[1].in_features, 1)
    model.load_state_dict(torch.load(MODEL_PATH, map_location='cpu'))
    model.eval()
    return model

_model = load_model()  # singleton

def predict(image_path: str) -> dict:
    # preprocess → inference → grad-cam → return dict
    ...
```

The `predict()` function must return:
```json
{ "prediction": "Pneumonia", "confidence": 0.94, "heatmap_path": "scans/heatmaps/xyz.jpg" }
```

### 3.3 API Endpoints

| Method | URL | Auth | Description |
|--------|-----|------|-------------|
| `POST` | `/api/scans/upload/` | Clinician / Radiologist | Upload X-ray, triggers inference |
| `GET` | `/api/scans/{id}/` | Any authenticated | Get single scan result |
| `GET` | `/api/scans/` | Any authenticated | List scans (filter by patient) |
| `PATCH` | `/api/scans/{id}/notes/` | Radiologist | Add/edit clinician notes |
| `POST` | `/api/patients/` | Clinician / Radiologist | Create patient record |
| `GET` | `/api/patients/` | Any authenticated | List patients |

The upload view must:
1. Accept `multipart/form-data` (image + `patient_id`)
2. Save the original image
3. Call `ml.inference.predict(image_path)`
4. Save the heatmap returned by Grad-CAM
5. Create and return a `Scan` instance with all fields populated

Use `serializers.py` with DRF `ModelSerializer` for all models. Use `IsAuthenticated` globally and override per-view with role permission classes.

---

## Phase 4 — Frontend UI (Day 8–13)

**Goal:** A functional React UI covering upload, results, and patient history.

### Pages & Routes

```
/login                  → LoginPage
/dashboard              → DashboardPage (scan summary stats)
/patients               → PatientListPage
/patients/:id           → PatientDetailPage (scan history)
/scans/upload           → UploadPage
/scans/:id/result       → ResultPage
```

### Key Components

**`UploadPage`**
- Drag-and-drop image input (accept `image/jpeg`, `image/png`)
- Patient ID selector or quick-create form
- Submit button → POST to `/api/scans/upload/` with `multipart/form-data`
- Shows a loading spinner while the model runs

**`ResultPage`**
- Displays original X-ray and Grad-CAM heatmap side-by-side
- Confidence score as a progress bar (colour-coded: green <40%, amber 40–70%, red >70%)
- Prediction badge: **Normal** or **⚠ Possible Pneumonia**
- **Disclaimer banner (always visible, non-dismissable):**
  > *"Possible Findings — Review Required by a Qualified Clinician. This tool does not constitute a medical diagnosis."*
- Clinician notes text area (Radiologist role only can save)

**`DashboardPage`**
- Total scans today / this week
- Pneumonia flagged vs Normal breakdown
- Recent scans table with links to results

### State Management

Use React Context for auth state (user object + token). For API calls, use a custom `useApi` hook wrapping your Axios instance. No Redux needed for MVP.

---

## Phase 5 — Integration & Testing (Day 13–16)

**Goal:** Backend and frontend talking correctly end-to-end.

1. Test every API endpoint with Postman or Thunder Client before wiring the frontend. Confirm:
   - JWT auth gates all protected routes (expect 401 without token)
   - Upload endpoint returns `prediction`, `confidence`, `heatmap_url`, `scan_id`
   - Images are saved correctly to `MEDIA_ROOT`

2. Configure Django to serve media files in development:
   ```python
   # urls.py
   from django.conf import settings
   from django.conf.urls.static import static
   urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
   ```

3. Test the full user journey in the browser:
   - Login → Upload X-ray → See result with heatmap → Add notes

4. Write at least basic Django tests for:
   - Auth endpoints (login returns tokens, invalid credentials rejected)
   - Upload endpoint (valid image accepted, missing image returns 400)
   - Permission checks (clinician cannot add radiologist notes)

---

## Phase 6 — Deployment (Day 16–18)

**Goal:** Live public URL for the demo.

1. **Backend on Render.com (free tier):**
   - Add `gunicorn` and `whitenoise` to requirements
   - Set all secrets as Render environment variables (never in code)
   - Set `DEBUG=False`, configure `ALLOWED_HOSTS`
   - Use Render's managed PostgreSQL (free 90-day instance)
   - For media files: use **Cloudinary free tier** (add `django-cloudinary-storage`)

2. **Frontend on Vercel (free tier):**
   - Set `VITE_API_BASE_URL` env variable pointing to your Render backend URL
   - `npm run build` — Vercel auto-deploys from GitHub

3. After deployment:
   - Create a superuser via `python manage.py createsuperuser` on Render shell
   - Test the full upload flow on the live URL
   - Confirm heatmap images load correctly from Cloudinary

---

## Libraries Summary

| Purpose | Library |
|---------|---------|
| Deep learning | `torch`, `torchvision` |
| Grad-CAM | `grad-cam` (pytorch-grad-cam) |
| Image processing | `Pillow`, `opencv-python-headless` |
| ML evaluation | `scikit-learn`, `matplotlib`, `seaborn` |
| Django API | `djangorestframework`, `django-cors-headers` |
| JWT | `djangorestframework-simplejwt` |
| DB adapter | `psycopg2-binary` |
| Cloud media | `cloudinary`, `django-cloudinary-storage` |
| Production server | `gunicorn`, `whitenoise` |
| Env management | `python-dotenv` |

---

## Milestone Checklist

- [ ] Phase 0: Both servers running locally
- [ ] Phase 1: JWT login + role-based auth working
- [ ] Phase 2: Model trained, `.pth` file committed, eval report written
- [ ] Phase 3: Upload endpoint returns prediction + heatmap URL
- [ ] Phase 4: Upload → Result flow working in browser
- [ ] Phase 5: Full journey tested, no broken endpoints
- [ ] Phase 6: Live public URL, all features working in production

---

> **Ethical reminder:** Every result screen must display the disclaimer banner. No real patient data. Include the model card (dataset, architecture, known limitations, bias note) in the repo before final submission.
