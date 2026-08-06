# MediScan AI — Model Training Project Log

> Covers: repo/branch setup through the Pneumonia crop-fix retrain.
> Purpose: a single source of truth for what's been built, what broke,
> and how it was fixed — so any teammate (or future me
) can pick this
> up.

---

## 1. Project Setup

### 1.1 Branch strategy
- Single long-lived branch for all four conditions: `training/model-development`
- Rationale: only lightweight artifacts (code, configs, results, model cards)
  are tracked in Git — raw datasets and model weights live in Google Drive
  and Hugging Face Hub, so branch sprawl per condition wasn't necessary.

### 1.2 Repo folder structure

```
model_training/
├── README.md                  — explains Git vs Drive split, branch strategy, training order
├── preprocessing/
│   └── preprocess.py          — shared preprocessing pipeline (single source of truth)
├── notebooks/
│   └── train_pneumonia.ipynb
├── configs/
│   ├── pneumonia.yaml
│   ├── cardiomegaly.yaml
│   ├── nodule_mass.yaml
│   └── tuberculosis.yaml
└── results/
    └── pneumonia/
        ├── eval_metrics.json
        └── model_card.md
```

### 1.3 Environment
- **Compute:** Google Colab, T4 GPU (chosen over TPU — PyTorch/ONNX/Grad-CAM
  workflow doesn't benefit from TPU, and dataset sizes are small enough that
  T4 throughput is not a bottleneck)
- **Editor:** VS Code, connected to Colab via the official Google Colab
  VS Code extension (direct kernel connection, no manual SSH tunneling needed)
- **Storage:** Google Drive, mounted at `/content/drive/MyDrive/`, holding:
  - Raw dataset splits (`MediScan_AI/training/datasets/{condition}/split.json`)
  - Model checkpoints (`MediScan_AI/training/models/{condition}/`)
  - A full clone of the GitHub repo (`MediScan_AI/repo/`) — see §2 for why

---

## 2. Key Infrastructure Lesson: Two Separate Repo Clones

Early in the project, real confusion arose from having **two independent
clones of the same GitHub repo**:

1. **Local clone** — on Vincent's laptop, edited in VS Code, committed from
   a normal terminal.
2. **Drive clone** — at `/content/drive/MyDrive/MediScan_AI/repo/`, cloned
   from inside a Colab cell so the Colab runtime's Python code (`import
   model_training.preprocessing.preprocess`) could access real, committed
   project files rather than redefining everything in scratch notebook cells.

**Why both are needed:** Colab's GPU runtime (`/content/`) is a *different
machine* from your laptop and cannot see your laptop's filesystem. Colab
*can* see Google Drive once mounted. So the Drive clone is Colab's only way
to import real repo code.

**The rule that emerged:** commits made *from inside a Colab cell* (e.g.
writing `eval_metrics.json` via Python) must be pushed *from Colab*, then
pulled on the laptop. Commits made by editing files *in VS Code locally*
must be pushed from the laptop, then pulled into the Drive clone before
Colab will see them. Mixing these up caused several of the issues below.

---

## 3. Session Volatility (Colab Free-Tier GPU)

Colab's free-tier runtime disconnects on idle, and a "fresh" reconnect
can mean a **brand new VM** with nothing preserved except what's on Drive.

**What does NOT survive a disconnect:**
- Everything under `/content/` (raw downloaded datasets, unzipped files)
- All Python variables in memory (`model`, `train_files`, `train_loader`,
  custom function definitions, etc.)
- Any pip-installed packages not already baked into the base Colab image

**What DOES survive:**
- Everything under `/content/drive/MyDrive/` (split.json files, checkpoints,
  the Drive repo clone)
- Nothing else — Kaggle auth tokens, Git identity config, and Grad-CAM/model
  setup all need to be redone per fresh session

**Fix — a single "Full Recovery" cell** was built to consolidate: Drive
mount, split.json load, Kaggle token check, repo clone/pull, device check,
model rebuild + checkpoint load, DataLoader rebuild, Grad-CAM setup, and
sample image selection — all in one cell, run top-to-bottom after any
disconnect. This was iterated on multiple times as new "NameError: X is
not defined" cases surfaced (`run_epoch`, `generate_gradcam`, `crop_thorax`,
`numpy`/`matplotlib` imports were all missed on the first few versions).

**Open item:** the recovery cell still needs `run_epoch`, `generate_gradcam`,
and `visualize_gradcam` folded in — currently these are re-pasted manually
after a disconnect. Worth moving these into an actual `training_utils.py`
module in the repo (like `preprocess.py`) rather than living only in chat
history or notebook cells that get lost on VM reset.

---

## 4. Dataset Acquisition & Split (Pneumonia)

- **Source:** Kaggle Chest X-Ray Pneumonia (`paultimothymooney/chest-xray-pneumonia`)
- **Access method:** Kaggle API via access token (`/root/.kaggle/access_token`),
  not the older `kaggle.json` file method
- **Extraction issue found:** the zip contains junk (`__MACOSX/`) and a
  fully duplicated nested `chest_xray/chest_xray/` folder — both removed
  before use
- **Kaggle's built-in train/val/test split was NOT used** — its `val` folder
  is only 16 images total, too small to be meaningful. Instead:
  1. All images pooled regardless of Kaggle's folder split
  2. Full class distribution recorded: **NORMAL: 1583, PNEUMONIA: 4273**
     (ratio ≈ 1:2.7, imbalanced toward positive)
  3. Fresh stratified 80/10/10 split via `sklearn.train_test_split`,
     `random_state=42`
  4. Result: **Train 4684 / Val 586 / Test 586**, ratios held consistent
     with pooled data across all three splits
  5. Split saved permanently to Drive as `split.json` — the authoritative
     record; never regenerated after this point
  6. `pos_weight` computed from **train split only**: `1266/3418 = 0.3704`,
     recorded in `configs/pneumonia.yaml`

---

## 5. Shared Preprocessing Pipeline (`preprocess.py`)

Built function-by-function, tested in notebook cells before being
consolidated into the actual repo file:

1. `load_and_convert()` — load from disk, force RGB
2. `resize()` — 224×224, bilinear
3. `to_normalized_array()` — scale [0,1], ImageNet mean/std normalize
4. `to_model_input()` — HWC→CHW, add batch dim → `(1, 3, 224, 224)`
5. `apply_train_augmentation()` — random horizontal flip, ±10° rotation,
   brightness/contrast jitter (train-only, via `torchvision.transforms`)
6. `preprocess()` — combines all of the above

**Issue found and fixed (§8 below):** a crop step (`crop_thorax`) was
later added to address a Grad-CAM bias finding, and an editing mistake
caused two conflicting `def preprocess(...)` definitions to exist in the
same file simultaneously — Python silently used the second (older, no-crop)
definition for every call, invalidating an entire retrain cycle before
being caught. See §8.3.

---

## 6. Model Training — Baseline (Pre-Crop)

**Architecture:** EfficientNet-B0 (ImageNet pretrained), classifier head
replaced with a single linear output neuron (binary classification).

**Stage 1** (frozen backbone, head only): Adam, lr=1e-3, 5 epochs
**Stage 2** (unfreeze `features.7` + `features.8` + classifier): Adam,
lr=1e-4, `ReduceLROnPlateau`, up to 5 epochs, early stopping patience 3

### Baseline results (uncropped pipeline):
| Stage | Best Val Loss | Best Val AUC-ROC |
|---|---|---|
| Stage 1 (epoch 5) | 0.1147 | 0.9775 |
| Stage 2 (epoch 5) | 0.0693 | 0.9917 |

### Test-set evaluation (uncropped model):
| Metric | Value | Target |
|---|---|---|
| Accuracy | 0.9420 | >0.88 ✅ |
| Sensitivity | 0.9346 | >0.90 ✅ |
| Specificity | 0.9620 | — |
| AUC-ROC | 0.9918 | >0.92 ✅ |

Confusion matrix: TN=152, FP=6, FN=28, TP=400

All numeric targets cleared comfortably. **However**, see §7 — the
qualitative Grad-CAM check revealed a bias issue not visible in these
aggregate metrics.

---

## 7. Grad-CAM Bias Discovery

Ran Grad-CAM (`pytorch-grad-cam`, target layer `model.features[-1]`) on
9 test-set images (4–5 NORMAL, 4–5 PNEUMONIA).

**Findings:**
- **NORMAL cases (4/4):** activation was concentrated (not diffuse, as
  expected for negatives) over the heart/mediastinum and **neck region**
- **PNEUMONIA cases:** only 1 of 5 samples showed plausible lung-field
  activation. The remaining 4 (confidence 0.822–0.948) showed activation
  concentrated on the **neck/throat**, or directly on **visible medical
  hardware** (ECG leads/tubing) rather than lung pathology

**Likely cause:** documented, well-known risk with this specific Kaggle
dataset — NORMAL and PNEUMONIA images were sourced from different pediatric
patient batches with systematic positioning/hardware differences. The
model likely learned a shortcut correlated with class label but clinically
meaningless.

**Action taken (per the implementation plan's explicit guidance for this
situation):**
- `configs/pneumonia.yaml`: `experimental: false` → `true`
- `results/pneumonia/model_card.md`: bias statement documented in full
  (dataset issue, specific activation pattern, confidence levels observed)
- Decision made to attempt a mitigation (image cropping) rather than
  ship as-is or discard the model

---

## 8. Bias Mitigation Attempt: Thorax Cropping

### 8.1 Approach chosen
Added a `crop_thorax()` preprocessing step: crop out the top 25% of each
image (neck/throat/shoulders), trim 2% off the bottom, and 5% off each
side, before resizing to 224×224. Chosen over full lung segmentation
(more robust but adds a whole new model dependency) as a faster first
attempt, with segmentation as a fallback if cropping proved insufficient.

Crop bounds were visually validated on 8 sample images before being wired
into the real pipeline — confirmed the crop removed most neck/collar
framing without clipping visible lung tissue at the top edge.

### 8.2 First retrain attempt — INVALID (silent staleness bug)

A retrain was run and Grad-CAM re-checked — but probabilities came back
**identical to 3 decimal places** versus the original uncropped run
(1.000, 0.948, 0.822, 0.880 in both). This is a statistical impossibility
for two independently-initialized training runs, and was the tell that
something was wrong, not a real result.

**Root cause identified:** two separate issues compounded:
1. The Colab session's "Full Recovery" cell hardcoded the *original*
   `checkpoint_dir` path, silently resetting the variable back to the
   pre-crop model's location after a mid-session disconnect
2. `preprocess()` in the repo file had **two definitions** — the crop
   step was added as a new function, but an old, pre-crop `def preprocess`
   still existed later in the same file and silently overrode it (Python
   uses the last definition when a function is defined twice)

Net effect: the "cropped" retrain was actually trained on **uncropped**
data the whole time, making the comparison meaningless.

### 8.3 Fix

- Rewrote `preprocess.py` with a single, correctly-ordered `preprocess()`
  definition, crop step properly included
- Explicitly verified via `!cat` (raw file, not cached Python import) and
  `inspect.getsource()` before trusting any further test
- Manually re-pointed `checkpoint_dir` to `pneumonia_cropped/` each session
  rather than trusting the stale recovery-cell default (recovery cell
  still needs a permanent fix here — flagged as an open item)

### 8.4 Second retrain — valid, genuinely cropped

| Stage | Best Val Loss | Best Val AUC-ROC |
|---|---|---|
| Stage 1 (epoch 5) | 0.1210 | 0.9741 |
| Stage 2 (epoch 3) | 0.0861 | 0.9858 |

Small AUC decrease vs. the uncropped baseline (0.9917 → 0.9858) — expected
and acceptable, since 25% of the image's visual information was deliberately
removed.

**Re-ran Grad-CAM on this checkpoint — probabilities now genuinely differ**
from the original run (confirmed real test this time). Results:

- **No activation on neck/throat** in any of the 8 re-checked images —
  the primary failure mode from §7 appears resolved
- **No activation on visible medical hardware**
- NORMAL cases: activation now lands on heart/mediastinum region — still
  somewhat concentrated rather than fully diffuse, but anatomically
  plausible rather than being on the neck
- PNEUMONIA cases: activation lands in upper and lower lung regions,
  including at least one clear lower-lung-field hot spot consistent with
  plausible consolidation-relevant anatomy
- **Residual concern:** a couple of hot spots sit near the very top edge
  of the new crop boundary — could be legitimate upper-lobe/apex signal,
  or could be the model keying off the new crop edge itself. Not fully
  resolved; worth watching in the test-set evaluation and potentially a
  further-tightened crop if it persists.

---

## 9. Current Status (as of this document)

- ✅ Dataset acquired, cleaned, stratified split, `pos_weight` computed
- ✅ Preprocessing pipeline built, tested, and (after the duplicate-function
  fix) verified working correctly with cropping active
- ✅ Baseline model trained, evaluated on test set, strong numeric results
- ✅ Grad-CAM bias issue found and honestly documented
- ✅ Crop-based mitigation implemented, validated as genuinely active,
  and retrained
- ✅ Second Grad-CAM check shows meaningful improvement — neck/hardware
  bias pattern no longer appears
- ⬜ **Not yet done:** test-set evaluation (accuracy/sensitivity/specificity/
  confusion matrix) on the cropped-pipeline checkpoint — next immediate step
- ⬜ Decision pending: proceed to ONNX export as `experimental` with this
  crop fix, or iterate further on the crop boundary given the residual
  top-edge concern
- ⬜ ONNX export + parity check (Phase 2.6)
- ⬜ Final model card update reflecting the crop fix and second Grad-CAM round
- ⬜ Upload to Hugging Face Hub, commit hash recorded (Phase 2.8)
- ⬜ Cardiomegaly, Lung Nodule/Mass, Tuberculosis — not yet started

---

## 10. Open Infrastructure Items (carry forward to remaining conditions)

1. **Recovery cell still hardcodes checkpoint paths** — needs to be made
   condition-aware / not silently reset to stale defaults after a disconnect
2. **`run_epoch`, `generate_gradcam`, `visualize_gradcam`, `crop_thorax`
   overrides** should be consolidated into a proper `training_utils.py`
   module in the repo, not re-pasted from chat after every disconnect
3. **GitHub push protection caught a leaked classic PAT** mid-project —
   token was revoked, notebook cleaned, and the lesson going forward:
   never hardcode tokens as string literals in cells that get saved.
   Use `getpass()` for interactive entry (Colab's native Secrets/`userdata`
   manager does **not** work through the VS Code extension — confirmed via
   testing, not just assumption)
4. **Fine-grained GitHub PATs don't work for cross-account collaborator
   repos** unless the resource owner grants explicit access — classic PATs
   with `repo` scope are the reliable fallback for this project's setup
   (personal account pushing to a teammate's repo)
5. Before trusting *any* "before vs after" comparison in future conditions
   (Cardiomegaly, Nodule/Mass, TB), explicitly verify: (a) the correct
   checkpoint path is loaded, (b) the correct code version is actually
   active via `inspect.getsource()`, and (c) output values have actually
   changed from the previous run — don't assume a clean run means a valid
   test, given what happened in §8.2
