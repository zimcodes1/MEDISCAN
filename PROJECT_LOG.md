# MediScan AI — Model Training Project Log

> Covers: repo/branch setup through Pneumonia's full bias-mitigation
> journey (crop attempts, CheXpert dataset-swap experiment, and the
> segmentation-based fix that finally resolved it) and the start of
> Cardiomegaly. Purpose: a single source of truth for what's been built,
> what broke, and how it was fixed — so any teammate can pick this up
> without reconstructing context from chat history.

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
│   ├── train_pneumonia_chexpert.ipynb
│   └── train_cardiomegaly.ipynb   — in progress
├── configs/
│   ├── pneumonia.yaml
│   ├── pneumonia_chexpert.yaml
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
- **Compute:** Google Colab, T4 GPU
- **Editor:** VS Code, connected to Colab via the official Google Colab
  VS Code extension (direct kernel connection, no manual SSH tunneling needed)
- **Storage:** Google Drive, mounted at `/content/drive/MyDrive/`, holding:
  - Raw dataset splits (`MediScan_AI/training/datasets/{condition}/split.json`)
  - Model checkpoints (`MediScan_AI/training/models/{condition}/`)
  - A full clone of the GitHub repo (`MediScan_AI/repo/`) — see §2 for why

---

## 2. Key Infrastructure Lesson: Two Separate Repo Clones

Real confusion arose from having **two independent clones of the same GitHub
repo**: a **local clone** on Vincent's laptop (edited in VS Code, committed
from a normal terminal), and a **Drive clone** at
`/content/drive/MyDrive/MediScan_AI/repo/` (cloned from inside a Colab cell
so the Colab runtime's Python code could import real, committed project
files rather than redefining everything in scratch notebook cells).

**Why both are needed:** Colab's GPU runtime (`/content/`) is a *different
machine* from your laptop and cannot see your laptop's filesystem. Colab
*can* see Google Drive once mounted.

**The rule that emerged:** commits made *from inside a Colab cell* must be
pushed *from Colab*, then pulled on the laptop. Commits made by editing
files *in VS Code locally* must be pushed from the laptop, then pulled into
the Drive clone before Colab will see them. Mixing these up caused several
issues over the course of the project — including forgetting to push the
Pneumonia notebook entirely before a teammate wanted to review it.

---

## 3. Session Volatility (Colab Free-Tier GPU)

Colab's free-tier runtime disconnects on idle, and a "fresh" reconnect can
mean a **brand new VM** with nothing preserved except what's on Drive.

**What does NOT survive a disconnect:** everything under `/content/`, all
Python variables in memory, any pip-installed packages not baked into the
base Colab image (including version pins like `transformers<5.0.0` — must
be reapplied every fresh session, see §10.1).

**What DOES survive:** everything under `/content/drive/MyDrive/`.

**Fix — a "Full Recovery" cell** consolidates: Drive mount, split.json
load, Kaggle token check, repo clone/pull, device check, model rebuild +
checkpoint load, DataLoader rebuild, Grad-CAM setup, and sample image
selection — run top-to-bottom after any disconnect.

**Known remaining gaps:**
- Recovery cell hardcodes `checkpoint_dir` to a default path — caused a
  wasted retrain cycle during the Pneumonia crop-fix (§8.2). Always
  explicitly re-set and print `checkpoint_dir`/`checkpoint_path` after
  recovery when more than one checkpoint variant exists for a condition.
- `run_epoch`, `generate_gradcam`, `visualize_gradcam`, and condition/
  variant-specific helpers (`crop_thorax`, `segment_and_crop_lungs`) still
  need manual re-pasting after each disconnect — not yet folded into a
  shared `training_utils.py` module.
- Mid-training disconnects (e.g. during Stage 2 of the segmentation
  retrain, §10) mean resuming from the last saved checkpoint with a fresh
  optimizer/scheduler rather than a perfectly continuous run — acceptable
  for validation, but worth a clean uninterrupted re-run before treating
  any such checkpoint as final/canonical.

---

## 4. Dataset Acquisition & Split (Pneumonia — Kaggle)

- **Source:** Kaggle Chest X-Ray Pneumonia (`paultimothymooney/chest-xray-pneumonia`)
- **Access method:** Kaggle API via access token (`/root/.kaggle/access_token`)
- **Extraction issue found:** zip contains `__MACOSX/` junk and a duplicated
  nested `chest_xray/chest_xray/` folder — both removed before use
- **Kaggle's built-in train/val/test split was NOT used** — its `val`
  folder is only 16 images total. Instead: pooled all images, recorded
  class distribution (NORMAL: 1583, PNEUMONIA: 4273, ratio ≈ 1:2.7), fresh
  stratified 80/10/10 split via `sklearn.train_test_split`, `random_state=42`
- **Result:** Train 4684 / Val 586 / Test 586, ratios held consistent
  across all three splits. Split saved permanently to Drive as `split.json`.
- `pos_weight` computed from train split only: `1266/3418 = 0.3704`

**Known limitation (partially addressed later):** this `split.json` stores
filepaths only, with labels derived at runtime from folder-name substring
matching (`'NORMAL' in path`). Fragile, and doesn't generalize — the
CheXpert experiment (§9) fixed this properly by storing `(filepath, label)`
pairs directly; worth applying retroactively here too.

---

## 5. Shared Preprocessing Pipeline (`preprocess.py`)

Core pipeline: `load_and_convert()` → (optional cropping step, see below)
→ `apply_train_augmentation()` (train only) → `resize()` →
`to_normalized_array()` → `to_model_input()` → `preprocess()` combining
all of the above.

**Evolution of the cropping/isolation step:**
1. `crop_thorax()` — fixed-percentage crop, added after the original
   Grad-CAM bias finding (§7), tuned through two iterations (§8)
2. `apply_crop` parameter added to `preprocess()` — allows skipping the
   crop entirely (used for the uncropped CheXpert experiment, §9)
3. `segment_and_crop_lungs()` — model-based lung segmentation crop,
   added for the segmentation experiment (§10); a more involved addition
   since it depends on a second loaded neural network (`seg_model`,
   `device`) rather than being a pure geometric function

**Bug found and fixed (early in the crop work):** an editing mistake
caused two conflicting `def preprocess(...)` definitions to exist in the
same file simultaneously — Python silently used the second (older, no-crop)
definition for every call, invalidating an entire retrain cycle before
being caught via bit-identical Grad-CAM output across supposedly different
model versions. **Lesson generalized and reused successfully since:**
always verify code changes actually took effect via `inspect.getsource()`
on the live function object, not just by checking the file was pulled.

---

## 6. Model Training — Baseline (Pre-Crop)

EfficientNet-B0 (ImageNet pretrained), single linear output neuron.
Stage 1 (frozen backbone, lr=1e-3, 5 epochs) → Stage 2 (unfreeze
`features.7`+`features.8`, lr=1e-4, `ReduceLROnPlateau`, up to 5 epochs).

| Stage | Best Val Loss | Best Val AUC-ROC |
|---|---|---|
| Stage 1 (epoch 5) | 0.1147 | 0.9775 |
| Stage 2 (epoch 5) | 0.0693 | 0.9917 |

### Test-set evaluation
| Metric | Value | Target |
|---|---|---|
| Accuracy | 0.9420 | >0.88 ✅ |
| Sensitivity | 0.9346 | >0.90 ✅ |
| Specificity | 0.9620 | — |
| AUC-ROC | 0.9918 | >0.92 ✅ |

All numeric targets cleared — but §7's Grad-CAM check revealed a bias
issue not visible in these aggregate metrics.

---

## 7. Grad-CAM Bias Discovery

Grad-CAM (`pytorch-grad-cam`, target layer `model.features[-1]`) on 9
test-set images showed activation concentrated on the **neck/mediastinum**
region for NORMAL cases, and on **neck/throat or visible medical hardware**
(rather than lung fields) for 4 of 5 sampled PNEUMONIA cases at confidence
0.822–0.948. Likely cause: NORMAL and PNEUMONIA images sourced from
different pediatric patient batches with systematic positioning/hardware
differences — a documented shortcut-learning risk for this dataset.

Action: `configs/pneumonia.yaml` → `experimental: true`; bias documented;
decided to attempt mitigation.

---

## 8. Bias Mitigation Attempt 1: Thorax Cropping

### 8.1 First attempt — 25% top-crop
Grad-CAM improved (no neck/hardware activation across 8 re-checked images),
**but** test-set specificity collapsed from 96.20% to **67.72%** (51 of 158
NORMAL images misclassified, up from 6). **Not adopted.**

### 8.2 Invalid retrain (silent staleness bug)
A retrain's Grad-CAM came back bit-identical to the original uncropped
run — statistically impossible for independently-trained models. Root
cause, two compounding issues: (1) the session's recovery cell hardcoded
the *original* `checkpoint_dir`, silently resetting it after a disconnect;
(2) `preprocess.py` had two `def preprocess` definitions, the older
no-crop one silently winning. Net effect: the "cropped" retrain was
actually trained on uncropped data.

### 8.3 Fix
Rewrote `preprocess.py` with a single, correctly-ordered `preprocess()`.
Verified via `!cat` (raw file) and `inspect.getsource()` (live function)
before trusting any further test.

### 8.4 Second attempt — 25% crop, genuinely applied
Confirmed real this time (probabilities differed from prior runs). Val
AUC 0.9858. Grad-CAM showed genuine improvement — no neck/throat/hardware
activation across all 8 re-checked images. Same 25% bound as §8.1, so the
specificity question needed re-testing on genuinely cropped data.

### 8.5 TorchXRayVision comparison (diagnostic detour)
Compared against TXRV's pretrained DenseNet121 (adult-only training data)
on 4 flagged images. TXRV's activation looked more plausible, but its
predictions disagreed with ground truth on 3 of 4 genuinely-positive
images. **Confound:** adult-trained weights on pediatric data — ambiguous
result. **Not adopted; inconclusive.**

### 8.6 Third attempt — loosened to 15% top-crop
Retrain: Stage 2 best val AUC 0.9866.

| Metric | Baseline (0%) | 25% crop | 15% crop |
|---|---|---|---|
| Accuracy | 94.20% | 90.44% | 93.52% |
| Sensitivity | 93.46% | 98.83% | 92.52% |
| Specificity | 96.20% | 67.72% | 96.20% |
| AUC-ROC | 99.18% | 98.35% | 99.07% |

Specificity fully recovered. Grad-CAM re-check: **5 of 8 images still
showed activation on shoulders, neck, borders, or hardware** — essentially
unchanged from the original finding in over half the sample. Cropping
alone was concluded to reduce but not resolve the bias, likely because
part of the shortcut may be a global image property (contrast/exposure/
scanner differences between source batches) that spatial cropping cannot
remove. **Adopted as the interim final version at the time** (kept
`experimental: true`), pending further investigation — later superseded
by §10.

### 8.7 ViT/CheXpert comparison — considered, not pursued for Pneumonia
`codewithdark/vit-chest-xray` (ViT-base, CheXpert-trained, native
Cardiomegaly + Pneumonia classes) flagged as a possible comparison tool,
same adult/pediatric caveat as TXRV. Decision: skip for Pneumonia
(diminishing returns after two inconclusive comparisons), flag for
Cardiomegaly instead where the domain-mismatch concern may not apply.

---

## 9. CheXpert Pneumonia Retrain — Findings (Hypothesis Test)

### Hypothesis
Test whether the bias was a **Kaggle-dataset-provenance problem**
specifically, by retraining from scratch on CheXpert (different
institution, population, labeling method, no crop applied).

### Dataset construction
- CheXpert-v1.0-small via Kaggle mirror (`ashery/chexpert`) — avoided the
  Stanford registration requirement
- Positive: `Pneumonia == 1.0` (6,039). Negative: `No Finding == 1.0`
  (22,381 available, sampled to 3x positive = 18,117) — deliberately not
  using `Pneumonia == 0.0` alone (only 2,799) or treating NaN as negative
  (NaN means "not mentioned," not confirmed-negative)
- Frontal views only. After filtering: 18,396 images, 15,131 unique patients
- **New consideration vs. Kaggle dataset:** CheXpert has multiple images
  per patient — used `GroupShuffleSplit` grouped by `patient_id` (not
  plain stratified split) to prevent patient leakage across train/val/test.
  Confirmed zero overlap. Train 14,740 / Val 1,840 / Test 1,816 images.
- `pos_weight` from train split: **2.8830** (inverted vs. Kaggle's 0.3704,
  since Pneumonia is the minority class here)
- **Infrastructure improvement:** this `split.json` stores `(filepath,
  label)` pairs directly, fixing the fragility flagged in §4

### Preprocessing change
Added `apply_crop` parameter to `preprocess()`, defaulting `True` (no
change to existing behavior elsewhere). This run used `apply_crop=False`
to isolate the dataset variable cleanly.

### Training and evaluation
Trained from scratch (not fine-tuned from the Kaggle checkpoint — avoids
inheriting any existing shortcut). Stage 2 best val AUC 0.8604.

| Metric | Value | Kaggle 15%-crop (reference) |
|---|---|---|
| Accuracy | 81.22% | 93.52% |
| Sensitivity | 73.05% | 92.52% |
| Specificity | 83.70% | 96.20% |
| AUC-ROC | 86.10% | 99.07% |

Below plan targets — expected given CheXpert's noisier NLP-extracted
labels and broader population, not a training failure.

### Grad-CAM finding — hypothesis NOT supported
8 images reviewed (4 negative, 4 positive), uncropped. Result: **the same
class of shortcut-learning behavior appeared, on a completely different
dataset** — different specific artifact this time:
- Top-edge touching: 3 of 8
- Overlap with tubing/wire hardware: 2 of 8
- Activation on the "L" laterality marker (a positioning label, not
  anatomy): **4 of 8** — new finding
- Genuinely plausible anatomical activation: only 2 of 8

### Conclusion
The dataset-provenance hypothesis was **not supported**. A completely
different dataset, population, and labeling pipeline still produced
artifact-based shortcuts. **Revised understanding:** this may be a more
general property of chest X-ray classification — markers, tubing, and
positioning artifacts frequently correlate with diagnosis labels across
datasets (sicker patients tend to have more visible hardware/different
protocols) — rather than a single-dataset issue. This pointed toward
**segmentation** (physically isolating lung tissue) as more promising than
further dataset swapping, motivating §10.

**Status:** kept as a documented negative-result experiment; original
Kaggle-trained 15%-crop model remained the working artifact at this point,
pending the segmentation attempt below.

---

## 10. Bias Mitigation Attempt 2: Lung Segmentation (Successful)

### Rationale
Following §9's conclusion, tested whether physically isolating lung tissue
via an actual segmentation model — rather than approximating "where the
lungs probably are" with a fixed crop rectangle — could succeed where both
crop attempts and the dataset swap could not.

### Segmentation model
- **Model:** `ianpan/chest-x-ray-basic` (Hugging Face), 22.2M params,
  trained on CheXpert + NIH combined (335,516 images, 96,385 patients),
  segments left lung, right lung, heart. Reported Dice: 0.957 (right lung),
  0.948 (left lung).
- **Domain-mismatch caveat judged not to apply the same way** as it did
  for the TXRV/ViT diagnostic comparisons — used here purely as a mask
  generator, not for diagnostic judgment; lung-boundary segmentation is a
  more transferable task across populations than disease classification.

### Infrastructure issue 1: `transformers` v5 incompatibility
Loading via `trust_remote_code=True` failed:
`AttributeError: 'CXRModel' object has no attribute 'all_tied_weights_keys'`.
Confirmed via a widely-reported, currently-open issue: `transformers` v5.x
introduced a `post_init()` requirement older custom model code doesn't call
correctly, affecting many `trust_remote_code` models beyond just this one.
**Fix: pin `transformers<5.0.0`** (confirmed working at 4.57.6) before
loading. **Does not persist across session resets — must be reapplied
(with a kernel restart) every fresh Colab VM.**

### Infrastructure issue 2: mask/image coordinate mismatch
Initial mask visualization looked badly misaligned. Diagnosed (correctly,
by Vincent, before confirming with code) as a likely coordinate/resize
mismatch rather than a genuinely bad model — confirmed: the segmentation
model outputs a fixed 320×320 mask regardless of input size, and the first
overlay attempt plotted it directly against the differently-sized original
without resizing. **Fix:** `cv2.resize(mask, original_dims,
interpolation=cv2.INTER_NEAREST)` before overlay — nearest-neighbor
specifically, since the mask holds discrete class labels.

### Systematic bottom-truncation finding and fix
After the coordinate fix, a second real pattern emerged on careful visual
review (again first spotted qualitatively, then confirmed quantitatively):
the lung mask consistently stopped short of the true lower lung boundary
(costophrenic angle) — not a left/right or scale issue, a directional
bottom shortfall. Quantitative check (`lung_bottom_fraction`) showed
82.7%–98.1% across a small sample — mixed but consistent enough with the
visual finding to treat as real. **Fix:** asymmetric padding on the crop
bounding box — 15% extra at the bottom specifically, vs. 5% on other
sides. Re-check confirmed this successfully captured the previously-cut
region.

### Performance cost
Segmentation requires a live second neural network per image (unlike the
near-free `crop_thorax()`). Measured: **~42ms/image**, ~3.3 min/epoch
overhead on the 4,684-image train split. Used live (uncached) for this
validation run; `DataLoader(num_workers=0)` required, since multi-worker
loading doesn't safely share a GPU-resident model across worker processes.
**If adopted long-term: pre-compute and cache crops once** (segmentation
is deterministic, no reason to re-run every epoch) — reduces cost from
~33 min across a full training run to a one-time ~4-minute pass. Not yet
implemented as of this log entry.

### Training
Retrained from scratch on the original Kaggle dataset/split (same
`pos_weight` 0.3704 as baseline/crop variants — directly comparable
results). A Colab disconnect occurred mid-Stage-2 (after epoch 2 of a
planned 5); recovered by reloading the last checkpoint and continuing
fine-tuning with a fresh optimizer/scheduler for up to 3 further epochs,
rather than restarting Stage 2 entirely. Not perfectly equivalent to an
uninterrupted run (optimizer momentum reset), but converged strongly
regardless.

| Stage | Best Val Loss | Best Val AUC-ROC |
|---|---|---|
| Stage 1 (epoch 4) | 0.1289 | 0.9710 |
| Stage 2 (epoch 3, resumed) | 0.0539 | 0.9933 |

### Test-set evaluation — full four-way comparison

| Metric | Baseline | 25% crop | 15% crop | **Segmentation** |
|---|---|---|---|---|
| Accuracy | 94.20% | 90.44% | 93.52% | **97.44%** |
| Sensitivity | 93.46% | 98.83% | 92.52% | **98.36%** |
| Specificity | 96.20% | 67.72% | 96.20% | **94.94%** |
| AUC-ROC | 99.18% | 98.35% | 99.07% | **99.64%** |

Strongest numeric result across every variant — no specificity collapse,
no sensitivity trade-off. Confusion matrix: TN=150, FP=8, FN=7, TP=421.

**Standing caution maintained:** the baseline also had excellent numbers
and a severe undocumented bias — strong metrics alone were treated as
insufficient. Grad-CAM below is what actually determined trust.

### Grad-CAM check — 24 images, largest sample of any variant

**First 8** (same `random.seed(42)` as the original bias-discovery sample,
directly comparable): **0 of 8** showed neck/collar/shoulder/border/
hardware activation. All landed on described lung or mediastinal anatomy
with genuine case-to-case spatial variation.

**Extended 16** (`random.seed(7)`, independent sample): 8 NORMAL — 0 of 8
showed artifacts. 8 PNEUMONIA — 5 of 8 clean anatomical activation only;
**3 of 8 showed a small, secondary, non-dominant marker/lead-consistent
activation** alongside (not instead of) genuine lung-field signal.

**Combined tally (24 images):**
- 0 of 24 showed the original neck/collar/shoulder pattern
- 0 of 24 showed the top-edge-touching pattern from either crop attempt
- ~3 of 24 (all PNEUMONIA) showed minor secondary marker activation —
  smaller than the primary anatomical signal in the same images, absent
  in all negative cases
- 21 of 24 showed clean anatomical activation with no artifact component

### Conclusion
**The strongest result across every mitigation attempt.** Not claimed as
a perfect, zero-artifact result — a small residual marker-activation
pattern remains in a minority of cases at n=24, worth continued
monitoring. But categorically different from every prior version: no
instances of the original severe shortcut, no border-touching pattern,
only minor secondary activation rather than the dominant signal it was
in every previous attempt.

### Deployment cost — the real tradeoff
Unlike crop-based approaches, this requires a **second model in the
production inference pipeline**, adding inference latency, a second
dependency/failure point, and deployment complexity — a concern a
teammate explicitly flagged before this experiment began. This is a real,
non-trivial cost against the crop approach's near-zero overhead. Framed
as a team decision on whether the bias improvement justifies the added
complexity, not a unilateral technical call.

### Status (superseded by §10.1 below — reproducibility concern found)

---

## 10.1 Reproducibility Check — Important Negative Finding

Following the initial segmentation result, the open item "run one clean,
uninterrupted retrain" was carried out: preprocessing was moved to a
pre-computed, cached pipeline (see below), and Stage 1 + Stage 2 were
retrained from scratch on the exact same dataset, split, architecture,
recipe, and `pos_weight` as the original segmentation run.

### Caching infrastructure built for the clean retrain
Since segmentation output is deterministic, crops were pre-computed once
for all 5,856 images and cached to Drive as PNGs, with a `path_mapping.json`
recording original-path → cached-path pairs. This removed the ~3.3 min/epoch
live-segmentation cost and the `num_workers=0` DataLoader restriction from
the earlier run. **A disconnect interrupted the caching process itself**
partway through (3,345 of 5,856 done at the time of interruption); resumed
by reconstructing progress from existing cached filenames (mapping file
hadn't been saved yet) rather than restarting from zero, then completed
the remaining 2,511 images with the mapping saved incrementally every 250
images going forward — a more disconnect-resilient pattern than the
original all-at-the-end save.

### Clean retrain results

| Stage | Best Val Loss | Best Val AUC-ROC |
|---|---|---|
| Stage 1 (epoch 5) | 0.1207 | 0.9705 |
| Stage 2 (epoch 5) | 0.0768 | 0.9872 |

(Stage 2 itself hit one more disconnect after epoch 4 — recovered cleanly
this time by reloading the epoch-4 checkpoint and confirming val-metric
reproduction before continuing for the final epoch, per the project's
now-standard verification discipline.)

### Test-set comparison — two independently trained segmentation models

| Metric | Run 1 (interrupted Stage 2) | Run 2 (clean retrain) |
|---|---|---|
| Accuracy | 97.44% | 95.05% |
| Sensitivity | 98.36% | 94.39% |
| Specificity | 94.94% | 96.84% |
| AUC-ROC | 99.64% | 99.18% |

Both strong, both comfortably clear every plan target. Numeric performance
alone does not distinguish these two runs meaningfully — normal run-to-run
variance.

### Grad-CAM comparison — the numbers diverge here, significantly

Re-ran Grad-CAM on Run 2 using the **identical `random.seed(42)` 8-image
sample** used for every prior Pneumonia Grad-CAM check, for direct
comparability.

**Run 1 result (already documented above):** 0 of 8 images showed
top-edge, border, neck, or shoulder activation on this exact sample.

**Run 2 result:**
- **4 of 8** images showed activation touching the top image edge
- **3 of 8** images showed activation over shoulder/clavicle regions
- **1 of 8** showed activation touching both the top AND side edge
  (corner activation)

This is a **substantial regression** relative to Run 1 on the identical
image sample, and looks qualitatively closer to the original pre-
segmentation bias pattern than to Run 1's clean result.

### Interpretation — this is a real, important finding, not a discardable outlier

Two independently trained models — same architecture, same recipe, same
cached preprocessing, same dataset and split — produced **meaningfully
different Grad-CAM behavior** while both scoring well on standard metrics.
This means:

- **The bias reduction observed in Run 1 cannot be treated as a reliable,
  deterministic property of the segmentation approach.** It may be
  sensitive to random weight initialization, training dynamics, batch
  ordering, or some other run-to-run variation not yet identified — not
  something the segmentation crop itself guarantees.
- **This directly undermines confidence in adopting segmentation as "the
  fix"** for the other three conditions, since a mitigation that works in
  one run and not in a near-identical rerun isn't dependable.
- Segmentation may still meaningfully **reduce** the bias on average
  relative to no mitigation at all (both segmentation runs still look
  better than the original unmitigated baseline), but it does not appear
  to **reliably eliminate** it the way Run 1's single check suggested.

### Status — open, unresolved as of this log entry (see §10.2 — corrected further)
- [x] ~~Decide whether to run a third independent training pass~~ — superseded
  by the larger-sample check below, which resolved the question differently
  than expected
- [x] Consider Grad-CAM checks on a larger sample size — done, see §10.2
- [ ] Revisit whether segmentation should be presented to the team as a
  probabilistic improvement rather than a resolved fix
- [ ] Neither segmentation checkpoint (Run 1 or Run 2) has been exported
  to ONNX or uploaded to HF Hub yet — held pending this reproducibility
  question being resolved
- [ ] The 15%-crop model (§8.6, §11) remains the only fully exported and
  uploaded Pneumonia artifact on HF Hub as of this entry

---

## 10.2 Larger-Sample Grad-CAM Check — Corrected Conclusion (Supersedes §10.1's Framing)

### What was done
Rather than a third training run, tested whether the Run 1 vs. Run 2
divergence in §10.1 was a genuine reproducibility problem or an artifact
of too-small a Grad-CAM sample (n=8 throughout the project up to this
point). Built a quantitative, threshold-based border-activation check
(checks whether heatmap intensity in the outer 15% of the image exceeds
0.7) and ran it across a larger, shared 30-image sample (15 NORMAL, 15
PNEUMONIA) against **both** existing segmentation checkpoints.

### Initial result and a false alarm
Automated check: **Run 1: 29/30 (96.7%) border-flagged, Run 2: 25/30
(83.3%) border-flagged.** This directly contradicted the earlier visual
finding that Run 1 showed 0/8 border activations — a large enough gap to
suspect the automated metric itself was broken (e.g. flagging normal
gradient falloff near a centered hot spot as "border activation," since
Grad-CAM heatmaps are typically normalized such that a 0.7 threshold is
easy to cross even far from the true peak).

**This suspicion was WRONG.** Direct visual inspection of three "flagged"
Run 1 images confirmed genuine, unambiguous border/collar activation —
sharp-cored, top-edge-spanning hot spots over neck/collar anatomy,
structurally distinct (separated by a cold gap) from a second, separate
hot spot over actual lung tissue. Not gradient falloff. The automated
check was correct; the earlier assumption that it must be miscalibrated
was the error.

### The real explanation: a sampling methodology flaw

Investigating why this contradicted the earlier "Run 1: 0/8" result
surfaced a genuine bug in how "same seed, directly comparable sample"
was being interpreted throughout this project:

```python
random.seed(42)
sample = random.sample(population, n)
```

**`random.sample()` with the same seed but a different `n` does NOT
return a nested/consistent subset across calls** — Python's sampling
algorithm's internal random state consumption depends on both the
population and `n` together, so `random.sample(x, 4)` and
`random.sample(x, 15)` under `seed(42)` select **different specific
images**, not overlapping ones. Every earlier claim in this log of
"same seed=42, directly comparable to the original bias-discovery
sample" was only true when `n_per_class` was held constant (4 → 4);
it broke silently whenever a check used a different `n_per_class`
(e.g. this investigation's `n_per_class=15`).

### Corrected conclusion

The original "Run 1: 0/8 border activations" finding was very likely
**small-sample luck** — a genuine 8-image draw that happened not to
catch the border-activation pattern, not evidence the pattern was
actually absent from Run 1's behavior. The larger, more statistically
meaningful 30-image check shows **both segmentation runs exhibit
substantial, comparable rates of border/collar artifact activation**
(Run 1: 96.7%, Run 2: 83.3% — both high, roughly the same order of
magnitude once measured properly).

**Revised understanding: segmentation-based cropping has NOT reliably
eliminated the bias.** The apparent success in §10 was very likely an
artifact of evaluating too small a sample, not a genuine property of
the segmentation approach. This is a significant walk-back from §10's
original framing ("strongest result across every mitigation attempt")
and from §10.1's framing of the issue as primarily a "reproducibility
concern between two runs" — the more accurate framing is that **neither
run actually resolved the bias**, and the earlier appearance that Run 1
had done so did not hold up under closer, larger-sample scrutiny.

### Process lesson (added to §14 open items)

All small-sample (n=8-9) Grad-CAM checks throughout this project —
including the original bias-discovery finding, both crop-percentage
checks, and the CheXpert experiment — should be treated with more
caution than they were at the time. They were useful for surfacing
directional signal (e.g. "something is wrong here") but are not reliable
enough sample sizes to confirm a fix actually worked. **Going forward,
any claim that a mitigation "resolved" or "significantly improved"
Grad-CAM behavior should be validated on a larger sample (20-30+ images)
before being written up as a conclusion**, not just the initial 8-image
gut-check. Additionally: **never rely on a fixed `random.seed()` alone
for sample comparability across calls with different `n`** — either
fix both the seed AND `n`, or explicitly slice/reuse the exact same
list of filepaths across comparisons.

### Status
- [ ] Segmentation should NOT currently be presented to the team as a
  validated fix — it does not appear to reliably outperform the
  documented-and-shipped 15%-crop model on the metric that actually
  matters (Grad-CAM anatomical correctness), despite better raw accuracy
  numbers
- [ ] Neither segmentation checkpoint will be exported/uploaded pending
  further investigation or a decision to abandon this direction
- [ ] Worth deciding with the team: continue investigating segmentation
  with corrected, larger-sample methodology, or accept the 15%-crop
  model's documented partial-mitigation status as the practical stopping
  point for Pneumonia and move fully to Cardiomegaly

---

## 11. ONNX Export + HF Hub Upload (Original 15%-Crop Model — Complete)

*Note: this section documents the export/upload of the 15%-crop model
(§8.6), completed before the segmentation experiment (§10) began. The
segmentation model's export/upload is still pending per §10's status list
above.*

**Export:**
- `torch.onnx.export(..., opset_version=17, dynamo=False)` — the default
  dynamo-based exporter failed with `ModuleNotFoundError: onnxscript`;
  `dynamo=False` forces the older, stable exporter path. **Apply this to
  all future condition exports too.**
- Parity check run on 6 test images — all passed, max diff ≤ 0.000001

**HF Hub upload:**
- Repo `Rhishamah/mediscan-pneumonia` created via `create_repo(...,
  exist_ok=True)` (a 404 on first upload attempt was the signal this was
  needed)
- Uploaded `mediscan_pneumonia.onnx`, `mediscan_pneumonia.pth`,
  `model_card.md`
- **Commit hash:** `f31fffeac0caa11017df1b0948cc54f73a05033e`, recorded
  in `configs/pneumonia.yaml`
- Token handling: used `getpass()`, not a hardcoded string

**This closed Phase 2 for the 15%-crop Pneumonia model** — since
superseded as the leading candidate by the segmentation model (§10),
pending the team's deployment-cost decision.

---

## 12. Security Incident: Leaked GitHub Token (Resolved)

A classic GitHub PAT was hardcoded as a plaintext string literal in a
saved notebook cell and committed. GitHub's push protection caught it
before it reached the remote (rejected both attempts) — the token never
became public, but was exposed locally and in the Drive clone.

**Response:** token revoked immediately; `git reset --soft` to uncommit
without losing file changes; placeholder substituted, cell output cleared;
recommitted clean; same check performed on the Drive-cloned copy.

**Also discovered:** fine-grained GitHub PATs **do not work** for pushing
to `zimcodes1/MEDISCAN` (a teammate's repo) — need explicit per-repo
grants not set up, and the resource-owner dropdown didn't show `zimcodes1`
as selectable. Classic PATs with `repo` scope work correctly for this
cross-account setup.

**Also confirmed via testing:** Colab's native Secrets manager
(`google.colab.userdata`) does **not** work through the VS Code Colab
extension — times out, since secrets can currently only be fetched from
the Colab web UI. `getpass()` is the correct approach for any token
needed inside a VS Code-connected Colab session (confirmed working for
both GitHub and Hugging Face tokens).

**Standing rule:** never hardcode tokens as string literals in any saved
cell. Use `getpass()` for interactive entry every session.

---

## 13. Current Status

### Pneumonia — 🔶 UNRESOLVED — segmentation does not appear to reliably fix the bias
- Kaggle dataset: acquired, cleaned, stratified split, `pos_weight` computed
- Preprocessing pipeline: built, verified, extended twice (optional crop,
  then segmentation-based cropping), plus a caching layer added for
  training efficiency
- **Five full training variants completed and compared:** baseline
  (uncropped), 25% crop, 15% crop, segmentation-based (Run 1), and a
  second independent segmentation-based retrain (Run 2)
- Grad-CAM bias investigated across variants with increasing rigor and,
  eventually, corrected methodology (9 → 8 → 8 → 24 → 8 → 30 images
  reviewed; see §10.2 for a methodology correction affecting sample
  comparability across different `n` values with the same random seed)
- **CheXpert dataset-swap experiment:** completed, hypothesis not
  supported, valuable negative result documented (§9)
- **Segmentation-based approach — corrected conclusion (§10.2):** an
  initial small-sample check (Run 1, n=8) suggested segmentation nearly
  eliminated the bias, the strongest result of any variant tried. A larger,
  properly-controlled 30-image check across both segmentation runs showed
  this did not hold up — both runs show substantial border/collar artifact
  activation (96.7% and 83.3% of images respectively) when measured
  properly. **Current assessment: segmentation-based cropping does not
  reliably resolve the Grad-CAM bias**, despite producing the strongest
  raw accuracy/AUC numbers of any variant tried. The earlier positive
  finding is attributed to an insufficient sample size, not a real property
  of the approach.
- 15%-crop model remains the only version fully exported and uploaded to
  HF Hub (`Rhishamah/mediscan-pneumonia`, commit
  `f31fffeac0caa11017df1b0948cc54f73a05033e`) — neither segmentation run
  has been exported/uploaded, and given §10.2's finding, may not be adopted
- ViT backbone swap considered and explicitly declined — evidence from
  the CheXpert experiment argued against an architecture-level cause,
  and a backbone swap would add Grad-CAM tooling cost without a clear
  signal it would help
- **Team decision needed:** continue investigating (with corrected,
  larger-sample methodology going forward) or accept the 15%-crop model's
  documented partial-mitigation, `experimental` status as the practical
  stopping point for Pneumonia and move fully to Cardiomegaly

### Cardiomegaly — 🔶 IN PROGRESS (paused to focus on finishing Pneumonia)
- `CARDIOMEGALY_GUIDE.md` written, includes a flagged note about
  `codewithdark/vit-chest-xray` as a possible future comparison resource
- `train_cardiomegaly.ipynb` created (rebuilt from scratch rather than
  copied from Pneumonia, to avoid stale outputs)
- Dataset acquisition, split, training — not yet started; resuming once
  Pneumonia is fully finalized per team decision to complete one model
  before starting the next

### Lung Nodule/Mass, Tuberculosis — ⬜ NOT STARTED

---

## 14. Open Infrastructure Items (carry forward to remaining conditions)

1. **Recovery cell hardcodes checkpoint paths** — needs to be condition-
   and variant-aware; caused a wasted retrain cycle once already (§8.2)
2. **`run_epoch`, `generate_gradcam`, `visualize_gradcam`,
   `crop_thorax`/`segment_and_crop_lungs` overrides** should move into a
   `training_utils.py` module rather than being re-pasted after every
   disconnect — increasingly worth doing given how many variants now exist
3. **`split.json` should store `(filepath, label)` pairs** — done
   correctly for CheXpert (§9); still using fragile path-string label
   derivation for the original Kaggle Pneumonia split (§4); worth a
   retroactive fix
4. **`transformers<5.0.0` pin required for `trust_remote_code` models**
   (e.g. the segmentation model) — does not persist across sessions, must
   be reapplied with a kernel restart every fresh VM. Worth adding to the
   permanent recovery cell if segmentation is adopted long-term.
5. **GitHub push protection caught a leaked classic PAT** — resolved,
   `getpass()` is the standing rule for all tokens
6. **Fine-grained GitHub PATs don't work for cross-account collaborator
   repos** — use classic PATs with `repo` scope
7. **`torch.onnx.export` needs `dynamo=False`** — apply for every future
   condition's export
8. **Always verify code changes actually took effect** via
   `inspect.getsource()` on the live function object before trusting any
   "before vs. after" comparison — file presence and active code can
   diverge (caused §8.2's wasted cycle)
9. **Before ending a session or handing off to a teammate, check `git
   status`/confirm pushes on both the laptop and Colab/Drive clone** —
   the Pneumonia notebook was left unpushed for a stretch before a
   teammate wanted to review it
10. **Segmentation-based preprocessing is not yet cached** — currently
    runs live per-image per-epoch (~42ms/image, ~3.3 min/epoch overhead).
    Should be pre-computed once and cached to disk/Drive before this
    becomes the standard approach for other conditions, given segmentation
    output is deterministic
11. **Exporting a two-model pipeline (segmentation + classifier) to ONNX**
    is unresolved — needs a decision on combined vs. sequential export
    before Phase 2.6 can be completed for the segmentation-based model
