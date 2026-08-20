# MediScan AI — Model Training Project Log

> Covers: repo/branch setup through Pneumonia completion (trained, evaluated,
> exported, uploaded to HF Hub) and the start of Cardiomegaly.
> Purpose: a single source of truth for what's been built, what broke, and
> how it was fixed — so any teammate can pick this up without reconstructing
> context from chat history.

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
├── PROJECT_LOG.md             — this file
├── CARDIOMEGALY_GUIDE.md      — detailed Cardiomegaly training guide, reusing this pipeline
├── preprocessing/
│   └── preprocess.py          — shared preprocessing pipeline (single source of truth)
├── notebooks/
│   ├── train_pneumonia.ipynb
│   └── train_cardiomegaly.ipynb   — in progress
├── configs/
│   ├── pneumonia.yaml
│   ├── cardiomegaly.yaml
│   ├── nodule_mass.yaml
│   └── tuberculosis.yaml
└── results/
    ├── pneumonia/
    │   ├── eval_metrics.json
    │   └── model_card.md
    └── cardiomegaly/          — not yet populated
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

Real confusion arose from having **two independent clones of the same GitHub
repo**:

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

**Recurring gotcha (happened again during Pneumonia wrap-up):** it's easy
to finish work in Colab and forget the corresponding push, leaving the
laptop repo behind. Before ending a session, or before a teammate needs to
review work, explicitly check `git status` on both the laptop and (if
relevant) the Drive clone.

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

**Fix — a single "Full Recovery" cell** consolidates: Drive mount, split.json
load, Kaggle token check, repo clone/pull, device check, model rebuild +
checkpoint load, DataLoader rebuild, Grad-CAM setup, and sample image
selection — run top-to-bottom after any disconnect.

**Known remaining gap:** the recovery cell hardcodes `checkpoint_dir` to a
default path. When working with multiple checkpoint variants in the same
session (e.g. baseline vs. cropped vs. re-cropped), re-running recovery
after a disconnect silently resets `checkpoint_dir` back to the default —
this caused a wasted retrain cycle during the Pneumonia crop-fix (§8.2).
**Always explicitly re-set and print `checkpoint_dir`/`checkpoint_path`
after recovery, don't trust cell defaults, when more than one checkpoint
variant exists for a condition.**

**Also unresolved:** `run_epoch`, `generate_gradcam`, `visualize_gradcam`,
and any condition-specific helper (e.g. `crop_thorax` overrides) still need
to be manually re-pasted after a disconnect — not yet folded into a shared
`training_utils.py` module. Worth doing before Cardiomegaly gets deep into
its own Grad-CAM cycle.

---

## 4. Dataset Acquisition & Split (Pneumonia)

- **Source:** Kaggle Chest X-Ray Pneumonia (`paultimothymooney/chest-xray-pneumonia`)
- **Access method:** Kaggle API via access token (`/root/.kaggle/access_token`)
- **Extraction issue found:** the zip contains junk (`__MACOSX/`) and a
  fully duplicated nested `chest_xray/chest_xray/` folder — both removed
  before use
- **Kaggle's built-in train/val/test split was NOT used** — its `val` folder
  is only 16 images total. Instead:
  1. All images pooled regardless of Kaggle's folder split
  2. Full class distribution recorded: **NORMAL: 1583, PNEUMONIA: 4273**
     (ratio ≈ 1:2.7, imbalanced toward positive)
  3. Fresh stratified 80/10/10 split via `sklearn.train_test_split`,
     `random_state=42`
  4. Result: **Train 4684 / Val 586 / Test 586**, ratios held consistent
     across all three splits
  5. Split saved permanently to Drive as `split.json` — authoritative record
  6. `pos_weight` computed from **train split only**: `1266/3418 = 0.3704`

**Known limitation of this approach (flagged for Cardiomegaly):** `split.json`
stored filepaths only, with labels derived at runtime from folder-name
substring matching (`'NORMAL' in path`). This is fragile and doesn't
generalize to NIH14, where filenames don't encode class. Cardiomegaly's
`split.json` should store `(filepath, label)` pairs directly instead.

---

## 5. Shared Preprocessing Pipeline (`preprocess.py`)

Built function-by-function, tested in notebook cells before being
consolidated into the actual repo file:

1. `load_and_convert()` — load from disk, force RGB
2. `crop_thorax()` — crop out neck/shoulder region (added post-bias-finding,
   see §7–8; final version crops top 15%, sides 5%, bottom 2%)
3. `resize()` — 224×224, bilinear
4. `to_normalized_array()` — scale [0,1], ImageNet mean/std normalize
5. `to_model_input()` — HWC→CHW, add batch dim → `(1, 3, 224, 224)`
6. `apply_train_augmentation()` — random horizontal flip, ±10° rotation,
   brightness/contrast jitter (train-only)
7. `preprocess()` — combines all of the above, in order

**Bug found and fixed:** an editing mistake caused two conflicting
`def preprocess(...)` definitions to exist in the same file simultaneously
when the crop step was first added — Python silently used the second (older,
no-crop) definition for every call. This invalidated an entire retrain cycle
before being caught by noticing bit-identical Grad-CAM output across
supposedly different model versions. See §8.2–8.3 for the full story.
**Lesson generalized:** always verify code changes actually took effect via
`inspect.getsource()` on the live function object, not just by checking the
file was pulled — file presence and active code can diverge.

---

## 6. Model Training — Baseline (Pre-Crop)

**Architecture:** EfficientNet-B0 (ImageNet pretrained), classifier head
replaced with a single linear output neuron (binary classification).

**Stage 1** (frozen backbone): Adam, lr=1e-3, 5 epochs
**Stage 2** (unfreeze `features.7`+`features.8`+classifier): Adam, lr=1e-4,
`ReduceLROnPlateau`, up to 5 epochs, early stopping patience 3

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

Confusion matrix: TN=152, FP=6, FN=28, TP=400. All numeric targets cleared —
but see §7, the qualitative Grad-CAM check revealed a bias issue not visible
in these aggregate metrics.

---

## 7. Grad-CAM Bias Discovery

Ran Grad-CAM (`pytorch-grad-cam`, target layer `model.features[-1]`) on
9 test-set images.

**Findings:**
- **NORMAL cases (4/4):** activation concentrated (not diffuse) over the
  heart/mediastinum and **neck region**
- **PNEUMONIA cases:** only 1 of 5 samples showed plausible lung-field
  activation; the other 4 (confidence 0.822–0.948) showed activation on
  **neck/throat** or directly on **visible medical hardware**

**Likely cause:** NORMAL and PNEUMONIA images sourced from different
pediatric patient batches with systematic positioning/hardware differences
— a documented shortcut-learning risk for this dataset.

**Action:** `configs/pneumonia.yaml` → `experimental: true`; bias documented
in model card; decided to attempt mitigation rather than ship as-is.

---

## 8. Bias Mitigation Attempt: Thorax Cropping

### 8.1 First attempt — 25% top-crop
Grad-CAM showed clear improvement (no neck/hardware activation across 8
re-checked images), **but** test-set specificity collapsed from 96.20% to
**67.72%** (51 of 158 NORMAL images misclassified, up from 6). The crop
removed information needed to correctly identify NORMAL cases. **Not adopted.**

### 8.2 Invalid retrain (silent staleness bug)
A retrain was run and Grad-CAM re-checked, but probabilities came back
**identical to 3 decimal places** vs. the original uncropped run — a
statistical impossibility for two independently-trained models. Root cause,
two compounding issues:
1. The session's recovery cell hardcoded the *original* `checkpoint_dir`,
   silently resetting it after a mid-session disconnect
2. `preprocess.py` had **two `def preprocess` definitions** — the crop step
   was added as a new function, but an old pre-crop version still existed
   later in the file and silently overrode it

Net effect: the "cropped" retrain was actually trained on uncropped data.

### 8.3 Fix
Rewrote `preprocess.py` with a single, correctly-ordered `preprocess()`.
Verified via `!cat` (raw file) and `inspect.getsource()` (live function)
before trusting any further test. Manually re-verified `checkpoint_dir`
each session rather than trusting recovery-cell defaults.

### 8.4 Second attempt — 25% crop, genuinely applied
Confirmed real (probabilities now differed from prior runs). Val AUC 0.9858.
Grad-CAM showed genuine improvement: no neck/throat activation, no hardware
activation, across all 8 re-checked images. However, this was the *same*
25% crop bound as §8.1's invalid run — the specificity question needed
re-testing on genuinely cropped data.

### 8.5 TorchXRayVision comparison (diagnostic detour)
Compared against TorchXRayVision's pretrained DenseNet121 (NIH14+CheXpert+
MIMIC-CXR+PadChest, all **adult** datasets) on 4 flagged PNEUMONIA images.
TXRV's activation looked more anatomically plausible, but its predictions
disagreed with ground truth on 3 of 4 genuinely-positive images (0.144,
0.014, 0.020, 0.581). **Confound:** our dataset is pediatric; TXRV's weights
are adult-only — divergence is ambiguous (could reflect correctly avoiding
our shortcut, or just being out-of-distribution on pediatric anatomy).
**Not adopted; inconclusive.**

### 8.6 Third attempt — loosened to 15% top-crop (final, adopted)
Rationale: 25% crop's specificity collapse suggested the crop was too
aggressive, removing information needed for NORMAL classification.

**Retrain results:**
| Stage | Best Val Loss | Best Val AUC-ROC |
|---|---|---|
| Stage 1 (epoch 5) | 0.1278 | 0.9715 |
| Stage 2 (epoch 5) | 0.0899 | 0.9866 |

**Test-set evaluation — full three-way comparison:**

| Metric | Baseline (0%) | 25% crop | **15% crop (final)** |
|---|---|---|---|
| Accuracy | 94.20% | 90.44% | **93.52%** |
| Sensitivity | 93.46% | 98.83% | **92.52%** |
| Specificity | 96.20% | 67.72% | **96.20%** |
| AUC-ROC | 99.18% | 98.35% | **99.07%** |

Specificity fully recovered to baseline level. Sensitivity dropped slightly
(still well above the >90% target).

**Grad-CAM re-check on the 15% crop — genuinely mixed result, documented
honestly rather than declared a full success:**
- 3 of 8 images (2 NORMAL, 1 PNEUMONIA) showed activation no longer touching
  top/border regions, landing on plausible anatomy (mediastinum, cardiac
  silhouette)
- **5 of 8 images continued to show activation on shoulders, neck, image
  borders, or — in one case — directly on visible medical hardware/tubing**,
  essentially unchanged from the original finding

**Conclusion:** cropping reduced but did not fully resolve the bias.
Persistence of hardware/border activation even after two crop rounds
suggests the shortcut may be partly a **global image property** (contrast,
exposure, scanner characteristics differing systematically between source
batches) rather than purely spatial — cropping cannot remove a global
property. A complete fix would likely need lung segmentation or a cleaner/
re-balanced dataset. Out of scope for current timeline.

**Decision: adopted the 15% crop as final.** Kept `experimental: true`.
Documented the full honest history in the model card rather than presenting
the strong numeric metrics as if the bias were resolved.

### 8.7 ViT/CheXpert comparison — considered, not pursued for Pneumonia
`codewithdark/vit-chest-xray` (ViT-base fine-tuned on CheXpert, 5-class
including Pneumonia and Cardiomegaly, 98.46% val accuracy) was identified
as another possible comparison model. Same adult/pediatric domain-mismatch
caveat as TXRV applies. **Decision: skip for Pneumonia (diminishing returns
after two inconclusive/partial comparisons already), flag as a resource to
try for Cardiomegaly instead**, where it's a native output class and the
domain-mismatch concern may not apply depending on Cardiomegaly's actual
data source (see CARDIOMEGALY_GUIDE.md §8).

### 8.8 CheXpert as a root-cause dataset fix — flagged, not yet investigated
Raised the hypothesis that the bias may be fundamentally a **dataset
provenance problem** (two sub-collections functioning as a shortcut) rather
than something crop-tuning alone can solve. CheXpert (224,316 images,
65,240 patients, Stanford, adult population, 2002–2017) was identified as
a possible alternative/supplementary training source — more patients and
sites, less likely for "which sub-collection" to correlate with diagnosis.
Not guaranteed clean either (NLP-extracted labels from reports, not fully
hand-reviewed; has its own `Support Devices` label that could reintroduce
a hardware-correlation risk in a different form).

**Status: deferred.** Requires Stanford ML Group registration (not instant
like Kaggle), an uncertain-label handling strategy, and filtering a ~439GB
dataset down to a usable subset. If pursued, this would be a **new
investigation / potential replacement** for the currently-uploaded Pneumonia
model, not a modification of the existing artifact. Deprioritized in favor
of completing Cardiomegaly first.

---

## 9. CheXpert Pneumonia Retrain — Findings (Hypothesis Test)

---

### Hypothesis Being Tested

The original Pneumonia model (trained on Kaggle's Chest X-Ray Pneumonia
dataset) showed Grad-CAM activation on neck/throat/hardware regions rather
than lung fields, for both NORMAL and PNEUMONIA cases, even after two
rounds of crop-based mitigation (see §8). One hypothesis raised: this could
be a **dataset provenance problem** specific to the Kaggle dataset — NORMAL
and PNEUMONIA images sourced from different patient batches, creating a
class-correlated shortcut unrelated to genuine pathology.

**Test:** retrain the same architecture and recipe from scratch on
**CheXpert** (different institution, different population, different
labeling method, no crop applied) and check whether the same bias pattern
appears.

---

### Dataset Construction

- **Source:** CheXpert-v1.0-small, via Kaggle mirror (`ashery/chexpert`) —
  224,316 images total, avoids the Stanford registration requirement of
  the original CheXpert release
- **Population:** adult, Stanford Hospital, 2002–2017, inpatient + outpatient
  — a meaningfully different population from the Kaggle dataset's pediatric
  source
- **Labeling method:** NLP-extracted from radiology report text (positive/
  negative/uncertain/unmentioned), not a clean per-image binary label
- **Positive class:** `Pneumonia == 1.0` (6,039 images)
- **Negative class:** `No Finding == 1.0` (22,381 available, sampled down
  to 3x positive count = 18,117) — deliberately NOT using `Pneumonia == 0.0`
  alone (only 2,799 available) or treating all NaN as negative (NaN means
  "not mentioned," not confirmed-negative)
- **View filter:** frontal only (excluded lateral views)
- **Result after filtering:** 18,396 images, 15,131 unique patients,
  ratio ≈ 2.9:1 negative:positive

### Patient-level split (new consideration vs. Kaggle dataset)

CheXpert has multiple images per patient across different studies —
unlike the Kaggle dataset. A plain random or stratified image-level split
risks the same patient appearing in both train and test, inflating
apparent performance. Used `GroupShuffleSplit` grouped by `patient_id`
instead:

| Split | Images | Patients | Negative | Positive |
|---|---|---|---|---|
| Train | 14,740 | 12,104 | 10,944 | 3,796 |
| Val | 1,840 | 1,513 | 1,384 | 456 |
| Test | 1,816 | 1,514 | 1,393 | 423 |

**Confirmed zero patient overlap** across all three splits. Per-split
label ratios (2.88:1, 3.04:1, 3.29:1) stayed close to the overall 2.9:1
ratio without needing explicit stratification.

`pos_weight` computed from train split: **2.8830** (note: inverted
direction vs. the Kaggle model's 0.3704, since Pneumonia is the minority
class here rather than the majority).

**Infrastructure improvement made here:** `split.json` stores `(filepath,
label)` pairs directly, rather than filepaths-only with labels derived
from folder-name string matching (the fragile approach used for the
original Pneumonia split — flagged as a known gap in `PROJECT_LOG.md` §12).

---

### Preprocessing Change: Optional Crop Parameter

Added `apply_crop` parameter to `preprocess()` in `preprocess.py`,
defaulting to `True` (no change to existing Pneumonia/Cardiomegaly
behavior). This run used `apply_crop=False` deliberately — testing the
dataset-provenance hypothesis cleanly meant isolating the dataset variable
from the crop variable, rather than applying a crop tuned for a different
dataset's specific artifact locations.

---

### Training

Identical architecture and recipe to the original Pneumonia model:
EfficientNet-B0, ImageNet-pretrained, two-stage training (frozen head →
unfreeze last 2 blocks). **Trained from scratch, not fine-tuned from the
existing Kaggle-trained checkpoint** — a deliberate choice, since
fine-tuning from weights that already learned a shortcut risked not fully
un-learning it, muddying the test.

| Stage | Best Val Loss | Best Val AUC-ROC |
|---|---|---|
| Stage 1 (epoch 4) | 0.7619 | 0.8215 |
| Stage 2 (epoch 5) | 0.6874 | 0.8604 |

**Note on loss magnitude:** losses here (0.68–0.86) are not directly
comparable to the Kaggle model's losses (0.07–0.11) — `pos_weight=2.883`
here vs. `pos_weight=0.370` there scales the loss differently. Compare
AUC-ROC, not raw loss values, across the two models.

### Test-set evaluation

| Metric | Value | Kaggle model (15%-crop) for reference |
|---|---|---|
| Accuracy | 81.22% | 93.52% |
| Sensitivity | 73.05% | 92.52% |
| Specificity | 83.70% | 96.20% |
| AUC-ROC | 86.10% | 99.07% |

Confusion matrix: TN=1166, FP=227, FN=114, TP=309 (n=1816)

**This model, on these numbers alone, would not meet the implementation
plan's stated targets** (accuracy >88%, sensitivity >90%, AUC-ROC >0.92).
This is expected given CheXpert's noisier NLP-extracted labels and broader,
more heterogeneous patient population — a harder task than the Kaggle
dataset's clean pediatric binary split, not a training failure. Numeric
performance was secondary to the actual goal of this experiment (testing
the bias hypothesis), but it does mean this model is not currently a
viable drop-in replacement on performance grounds alone, independent of
the Grad-CAM finding below.

---

### Grad-CAM Finding — Hypothesis NOT Supported

Ran Grad-CAM on 8 test-set images (4 negative, 4 positive), uncropped
input, same target layer (`model.features[-1]`).

**Result: the model shows the same class of shortcut-learning behavior as
the original Kaggle-trained model, on a completely different dataset —
just with different specific artifacts.**

| Failure pattern | Count (of 8) |
|---|---|
| Activation touching image top edge | 3 |
| Direct overlap with visible tubing/wire hardware | 2 |
| Activation on the "L" laterality marker (a radiology positioning label, not anatomy) | 4 |
| Activation on shoulder/arm/axilla (non-lung anatomy) | 1 |
| Genuinely plausible anatomical activation (lower chest / central mediastinum) | 2 (Images 3, 4) |

The laterality-marker finding is new and notable — 4 of 8 images showed
activation specifically on the "L" marker radiology technicians place on
the film, a clear non-anatomical shortcut that has nothing to do with the
Kaggle dataset's specific batch-provenance issue.

**Conclusion: the original hypothesis — that the bias was a Kaggle-dataset-
provenance problem specific to that dataset — is NOT supported by this
result.** Retraining from scratch, on a different institution's data,
different population, different labeling pipeline, with no crop applied,
still produced shortcut-learning behavior. The specific artifact changed
(neck/collar → laterality marker/hardware), but the underlying tendency
toward non-anatomical shortcuts persisted.

### Revised understanding

This suggests the issue may be less "this one dataset has bad provenance"
and more a **general property of chest X-ray classification** with this
architecture/training recipe: markers, tubing, and positioning artifacts
frequently correlate with diagnosis labels across datasets (sicker
patients tend to have more visible hardware, different positioning
protocols, etc.), giving models an easy non-anatomical shortcut to exploit
regardless of source. A genuine fix likely requires something more
structural than dataset selection — e.g., lung segmentation (physically
isolating lung tissue from markers/hardware before the model ever sees
them) or explicit shortcut-learning countermeasures during training —
rather than continuing to search for a "cleaner" dataset.

---

### Status and Open Decision

This CheXpert-trained model is **not currently a validated replacement**
for the original Kaggle-trained Pneumonia model:
- Numeric performance is below the original model's and below plan targets
- The Grad-CAM bias this experiment set out to resolve is present here too,
  in a different form

**Decision needed from the team:** given this negative result,
- (a) keep the original 15%-crop Kaggle-trained model as the working
  Pneumonia artifact (already uploaded to HF Hub, `experimental`), and
  treat this CheXpert experiment as a documented negative finding that
  informs future bias-mitigation strategy (pointing toward segmentation
  rather than dataset swapping), or
- (b) invest further in the CheXpert model (more epochs, hyperparameter
  tuning, addressing the sensitivity gap) despite the unresolved bias, or
- (c) pursue lung segmentation as the next mitigation attempt, potentially
  applied to either dataset

This experiment's artifacts (checkpoint, config, split) are preserved at
`configs/pneumonia_chexpert.yaml` and
`MediScan_AI/training/models/pneumonia_chexpert/` on Drive regardless of
which direction is chosen, since the negative result itself is valuable
documentation.

---

## 10. ONNX Export + HF Hub Upload (Pneumonia — Complete)

**Export:**
- `torch.onnx.export(..., opset_version=17, dynamo=False)` — the default
  dynamo-based exporter failed with `ModuleNotFoundError: onnxscript`;
  `dynamo=False` forces the older, stable exporter path. **Apply this to
  all future condition exports too.**
- Parity check run on 6 test images (not just 1) — all passed, max diff
  ≤ 0.000001, well under the ±0.001 threshold

**HF Hub upload:**
- Repo `Rhishamah/mediscan-pneumonia` did not exist yet — created via
  `create_repo(..., exist_ok=True)` before uploading (a 404 on first
  upload attempt was the signal this was needed)
- Uploaded `mediscan_pneumonia.onnx`, `mediscan_pneumonia.pth`,
  `model_card.md`
- **Final commit hash:** `f31fffeac0caa11017df1b0948cc54f73a05033e`,
  recorded in `configs/pneumonia.yaml`
- Token handling: used `getpass()` for the HF token, not a hardcoded
  string — same lesson as the GitHub token leak (§10 below)

**This closes Phase 2 for Pneumonia entirely:** dataset split, preprocessing,
training, evaluation, Grad-CAM bias investigation (with honest documentation
of partial mitigation), ONNX export + parity, model card, HF Hub upload
with commit hash — all done.

---

## 11. Security Incident: Leaked GitHub Token (Resolved)

A classic GitHub PAT was hardcoded as a plaintext string literal in a saved
notebook cell (`token = "ghp_..."`) and committed. GitHub's push protection
caught it before it reached the remote (push was rejected both times it was
attempted) — **the token never actually became public**, but was exposed
locally and in the Drive clone.

**Response:**
1. Token revoked immediately via GitHub settings
2. `git reset --soft` to uncommit the token-containing commits (kept file
   changes, discarded the bad history)
3. Token replaced with a placeholder in the notebook, cell output cleared
4. Recommitted clean, verified with `push protection` no longer blocking
5. Same check performed on the Drive-cloned copy of the notebook

**Also discovered along the way:** a fine-grained GitHub PAT **does not
work** for pushing to `zimcodes1/MEDISCAN` (a teammate's repo) — fine-grained
tokens need explicit per-repo access grants that weren't set up, and the
resource-owner dropdown didn't even show `zimcodes1` as selectable. Classic
PATs with `repo` scope work correctly for this cross-account collaborator
setup and are the reliable choice going forward.

**Also confirmed via testing (not just assumption):** Colab's native Secrets
manager (`google.colab.userdata`) does **not** work through the VS Code
Colab extension — calls to `userdata.get()` time out, since secrets can
currently only be fetched from the Colab web UI. `getpass()` is the correct
approach for any token needed inside a VS Code-connected Colab session.

**Going forward rule:** never hardcode tokens as string literals in any
cell that gets saved. Use `getpass()` for interactive entry every session.

---

## 12. Current Status

### Pneumonia — ✅ COMPLETE
- Dataset acquired, cleaned, stratified split, `pos_weight` computed
- Preprocessing pipeline built and verified (post duplicate-function fix)
- Trained (baseline + two crop iterations), evaluated on test set
- Grad-CAM bias found, two mitigation rounds attempted, honestly documented
  as partially-but-not-fully resolved
- TorchXRayVision and ViT/CheXpert comparisons explored as diagnostic aids;
  neither adopted, both documented
- CheXpert flagged as a potential root-cause fix, then actually investigated
  (see §9) — retrained from scratch on CheXpert, uncropped, to test the
  dataset-provenance hypothesis directly
- ONNX exported, parity-checked (6 images, max diff 0.000001)
- Uploaded to HF Hub (`Rhishamah/mediscan-pneumonia`), commit hash recorded
- Model card finalized with full honest bias-mitigation history
- Marked `experimental: true`
- **Original Kaggle-trained 15%-crop model remains the working artifact**
  (see §9 — CheXpert retrain did not support the dataset-provenance
  hypothesis and is not currently a validated replacement)

### CheXpert Pneumonia Retrain — ✅ EXPERIMENT COMPLETE, NEGATIVE RESULT
- Full pipeline built independently: NIH-style CSV filtering (Pneumonia
  positive vs. No Finding negative), patient-level `GroupShuffleSplit`,
  new `apply_crop` parameter added to `preprocess()`, trained from scratch
  uncropped
- Test metrics below plan targets (81.22% accuracy, 73.05% sensitivity,
  86.10% AUC-ROC) — harder/noisier dataset than Kaggle's, as expected
- **Grad-CAM showed the same class of shortcut-learning behavior as the
  original model, on a completely different dataset** — different specific
  artifact (laterality marker + hardware, vs. neck/collar), but the
  underlying tendency persisted
- **Conclusion: the "Kaggle-dataset-provenance" hypothesis is not
  supported.** Revised understanding: this may be a more general property
  of chest X-ray classification (artifacts correlating with diagnosis
  across datasets) rather than a single-dataset issue — pointing toward
  segmentation-based fixes as more promising than further dataset swapping
- **Decision pending with team:** keep original model as-is (documented
  negative finding informs future strategy), invest further in the
  CheXpert model despite the unresolved bias, or pursue lung segmentation
  next — see §9 for the full option breakdown

### Cardiomegaly — 🔶 IN PROGRESS (just started)
- `CARDIOMEGALY_GUIDE.md` written — detailed reuse plan based on everything
  learned from Pneumonia
- `train_cardiomegaly.ipynb` created (started as a copy of the Pneumonia
  notebook, then rebuilt from scratch cell-by-cell instead, to avoid
  carrying over stale Pneumonia-specific outputs/cells)
- Session recovery cell adapted for Cardiomegaly's split path — not yet
  run/confirmed in a live session as of this log entry
- Dataset acquisition (NIH14 labels CSV, Cardiomegaly filtering, negative
  sampling) — not yet started
- Everything downstream (split, preprocessing reuse, training, eval,
  Grad-CAM, export, upload) — not yet started

### Lung Nodule/Mass, Tuberculosis — ⬜ NOT STARTED

---

## 13. Open Infrastructure Items (carry forward to remaining conditions)

1. **Recovery cell hardcodes checkpoint paths** — needs to be condition-
   and variant-aware; caused a wasted retrain cycle once already (§8.2)
2. **`run_epoch`, `generate_gradcam`, `visualize_gradcam`, `crop_thorax`
   overrides** should move into a proper `training_utils.py` module in the
   repo rather than being re-pasted from chat after every disconnect —
   still not done, worth doing before Cardiomegaly's Grad-CAM cycle
3. **`split.json` should store `(filepath, label)` pairs**, not filepaths
   only with labels derived from folder-name string matching — required
   for Cardiomegaly anyway since NIH14 filenames don't encode class, and
   would be a good retroactive fix for Pneumonia too
4. **GitHub push protection caught a leaked classic PAT** — resolved,
   `getpass()` is now the standing rule for all tokens (GitHub and HF)
5. **Fine-grained GitHub PATs don't work for cross-account collaborator
   repos** — use classic PATs with `repo` scope for this project's setup
6. **`torch.onnx.export` needs `dynamo=False`** — the default dynamo
   exporter fails with a missing `onnxscript` dependency; apply this flag
   for every future condition's export
7. **Always verify code changes actually took effect** via
   `inspect.getsource()` on the live function object before trusting any
   "before vs. after" comparison — file presence on disk and active code
   in memory can diverge (this is what caused §8.2's wasted cycle)
8. **Before ending a session or handing off to a teammate, check `git
   status`/confirm pushes on both the laptop and Colab/Drive clone** —
   the Pneumonia notebook itself was left unpushed for a stretch before
   being caught when a teammate wanted to review it
