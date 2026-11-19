# Cardiomegaly Training — Detailed Guide

> Reuses the Pneumonia pipeline end-to-end. This doc only calls out what's
> genuinely different; everything else is "do exactly what you did for
> Pneumonia." Cross-references `PROJECT_LOG.md` for the specific bugs/lessons
> so you don't re-hit them.

---

## 0. Session Setup (same as always)

Run your Full Recovery cell first (Drive mount, Kaggle/repo check, split load,
model setup, Grad-CAM setup). For Cardiomegaly specifically, you won't have
a `split.json` yet until you complete §2 below, so that part of the recovery
cell will just print "no split.json found" until then — expected.

**Reminder from PROJECT_LOG.md §3:** a fresh Colab VM wipes everything under
`/content/` and all Python variables. Only `/content/drive/` survives. Re-run
recovery top-to-bottom after any disconnect rather than chasing individual
`NameError`s.

---

## 1. Get the NIH14 Labels File

NIH ChestX-ray14 is 112,120 images total — you do NOT want to download all
of it. Start with just the labels CSV to figure out which specific images
you actually need.

```python
import pandas as pd

# NIH14's Data_Entry_2017.csv is available from the official NIH source
# or mirrored on Kaggle as part of the "nih-chest-xrays" dataset
!kaggle datasets download -d nih-chest-xrays/data -f Data_Entry_2017.csv -p /content/
!unzip -q /content/Data_Entry_2017.csv.zip -d /content/ 2>/dev/null || echo "already csv, no unzip needed"

labels_df = pd.read_csv('/content/Data_Entry_2017.csv')
print(labels_df.shape)
print(labels_df.columns.tolist())
print(labels_df['Finding Labels'].value_counts().head(20))
```

Confirm you can see a `Finding Labels` column (NIH14 uses pipe-separated
multi-labels, e.g. `"Cardiomegaly|Effusion"`) and an `Image Index` column
(the filename).

---

## 2. Filter to Cardiomegaly + Build a Negative Pool

```python
# Positive: any row where Cardiomegaly appears in the label string
cardiomegaly_positive = labels_df[
    labels_df['Finding Labels'].str.contains('Cardiomegaly', na=False)
]
print(f"Cardiomegaly positive count: {len(cardiomegaly_positive)}")

# Negative: rows labeled exactly "No Finding" (cleanest negative definition —
# avoids ambiguity from other pathologies that aren't Cardiomegaly but also
# aren't "normal")
no_finding = labels_df[labels_df['Finding Labels'] == 'No Finding']
print(f"No Finding count available: {len(no_finding)}")
```

**Decision point — negative sampling ratio.** NIH14's `No Finding` pool is
huge (~60k+). Don't use all of it — that recreates the original imbalance
problem in a different form and bloats your download. A reasonable starting
point: sample negatives to roughly **2-3x the positive count**, giving you
a real but manageable imbalance to handle via `pos_weight` (matches roughly
what Pneumonia's natural ratio looked like, so your existing intuition
about `pos_weight` behavior carries over).

```python
import random
random.seed(42)

n_positive = len(cardiomegaly_positive)
n_negative_target = n_positive * 3  # adjust if you want a different ratio

negative_sample = no_finding.sample(n=min(n_negative_target, len(no_finding)), random_state=42)

print(f"Positive: {n_positive}, Negative (sampled): {len(negative_sample)}")
print(f"Ratio (neg:pos): {len(negative_sample)/n_positive:.3f}")
```

Record this ratio — it goes into `configs/cardiomegaly.yaml` under
`class_distribution`, same as Pneumonia's 0.370 was recorded.

---

## 3. Download Only the Filtered Images

NIH14 images are typically distributed in ~12 numbered zip batches
(`images_001.zip` through `images_012.zip`) on Kaggle, each containing a
subset of the 112k images by filename range — there isn't a clean way to
download individual files without pulling the containing batch. Two
practical approaches:

**Option A (simpler, more disk use):** download all 12 image batches once,
extract, then just reference the filenames you need from your filtered
`cardiomegaly_positive` + `negative_sample` lists — the unused images just
sit on disk unused. Given Colab's `/content/` disk is reasonably large and
ephemeral anyway, this is often the path of least resistance despite being
"wasteful."

**Option B (leaner, more setup):** check if the specific Kaggle dataset
listing lets you download individual files via `kaggle datasets download -f`
the way you did for the CSV — NIH14's Kaggle mirror may or may not support
this cleanly for image files specifically; worth checking before committing
to Option A.

```python
# Option A pattern — repeat for however many batches you need
!kaggle datasets download -d nih-chest-xrays/data -f images_001.zip -p /content/
!unzip -q /content/images_001.zip -d /content/nih14_images/
# ... repeat for other batches, or download the full images dataset if
# individual-file download isn't supported
```

Once downloaded, build your actual filepath list by matching filenames
from `cardiomegaly_positive`/`negative_sample` against what's on disk:

```python
import os

image_dir = '/content/nih14_images/images'  # adjust to actual extracted path

def build_filepath_list(df, image_dir):
    paths = []
    for fname in df['Image Index']:
        full_path = os.path.join(image_dir, fname)
        if os.path.exists(full_path):
            paths.append(full_path)
    return paths

positive_paths = build_filepath_list(cardiomegaly_positive, image_dir)
negative_paths = build_filepath_list(negative_sample, image_dir)

print(f"Positive images found on disk: {len(positive_paths)}")
print(f"Negative images found on disk: {len(negative_paths)}")
```

If the "found on disk" counts are much lower than expected, your downloaded
batches don't cover all the filenames you filtered — you may need additional
batches.

---

## 4. Pool, Split, Save (identical method to Pneumonia)

```python
from sklearn.model_selection import train_test_split
import json

all_files = [(p, 1) for p in positive_paths] + [(p, 0) for p in negative_paths]
filepaths = [f for f, l in all_files]
labels = [l for f, l in all_files]

print(f"Total pooled: {len(filepaths)}")
print(f"Positive: {labels.count(1)}, Negative: {labels.count(0)}")

train_files, temp_files, train_labels, temp_labels = train_test_split(
    filepaths, labels, test_size=0.20, stratify=labels, random_state=42
)
val_files, test_files, val_labels, test_labels = train_test_split(
    temp_files, temp_labels, test_size=0.50, stratify=temp_labels, random_state=42
)

print(f"Train: {len(train_files)}, Val: {len(val_files)}, Test: {len(test_files)}")

def class_counts(labels):
    return {'NEGATIVE': labels.count(0), 'CARDIOMEGALY': labels.count(1)}

print("Train:", class_counts(train_labels))
print("Val:  ", class_counts(val_labels))
print("Test: ", class_counts(test_labels))
```

Save to Drive — **use a Cardiomegaly-specific path**, don't overwrite Pneumonia's:

```python
os.makedirs('/content/drive/MyDrive/MediScan_AI/training/datasets/cardiomegaly', exist_ok=True)

split_data = {'train': train_files, 'val': val_files, 'test': test_files}

with open('/content/drive/MyDrive/MediScan_AI/training/datasets/cardiomegaly/split.json', 'w') as f:
    json.dump(split_data, f, indent=2)

print("Saved Cardiomegaly split to Drive.")
```

Compute `pos_weight` from train split only:

```python
pos_weight = train_labels.count(0) / train_labels.count(1)
print(f"pos_weight: {pos_weight:.4f}")
```

Update `configs/cardiomegaly.yaml` with: `num_images_approx`, `class_distribution`
(positive/negative counts + ratio), and `pos_weight`. Commit.

**Label note:** since NIH14 filenames don't encode the class the way Kaggle's
Pneumonia folders did (`NORMAL`/`PNEUMONIA` in the path), you can't derive
labels from filepath strings alone after a session reset the way you did
before. Store labels alongside filenames properly this time — worth updating
`split.json`'s structure to save `[(filepath, label), ...]` pairs directly
rather than filepaths-only, so you're not re-deriving labels from a lookup
table every session. This was flagged as an open item in `PROJECT_LOG.md`
§10 — good opportunity to fix it now for Cardiomegaly and retroactively for
Pneumonia if you want.

---

## 5. Preprocessing — Reuse As-Is (For Now)

Don't add the Cardiomegaly-specific crop preemptively. Use `preprocess.py`
exactly as committed (currently includes the 15%-top-crop from the Pneumonia
fix). Run Grad-CAM first (§8) and only modify cropping if you actually see
a comparable bias — Cardiomegaly's target anatomy (cardiac silhouette,
centrally located) may behave completely differently than Pneumonia's did,
and applying an unnecessary crop could hurt this model the way the 25% crop
hurt Pneumonia's specificity for no reason.

```python
from model_training.preprocessing.preprocess import preprocess, load_and_convert, resize, crop_thorax
```

---

## 6. Model Setup, Training — Identical to Pneumonia

Same `XrayDataset` class, same `DataLoader` setup, same EfficientNet-B0 +
swapped classifier head, same two-stage training (Stage 1 frozen/lr=1e-3/5
epochs, Stage 2 unfreeze `features.7`+`features.8`/lr=1e-4/scheduler/up to
5 epochs), same `run_epoch` function. Use a **new checkpoint directory**:

```python
checkpoint_dir = '/content/drive/MyDrive/MediScan_AI/training/models/cardiomegaly'
os.makedirs(checkpoint_dir, exist_ok=True)
```

Use the `pos_weight` value you computed in §4 in the `BCEWithLogitsLoss`.

**Reminder from PROJECT_LOG.md §8.2:** always double-check `checkpoint_dir`
points where you think it does before trusting any comparison — this exact
mistake (stale checkpoint_dir pointing at the wrong model) cost a full wasted
retrain cycle on Pneumonia.

---

## 7. Evaluation — Identical Method to Pneumonia

Accuracy, sensitivity, specificity, AUC-ROC, confusion matrix on the held-out
test set. Target thresholds for Cardiomegaly per the implementation plan:

| Metric | Target |
|---|---|
| Accuracy | > 85% |
| Sensitivity | > 85% |
| AUC-ROC | > 0.90 |

Save to `model_training/results/cardiomegaly/eval_metrics.json`.

---

## 8. Grad-CAM Check — Different Anatomy, Different Failure Mode to Watch

Target layer stays `model.features[-1]`. What you're checking for is
different from Pneumonia:

- **Positive cases (Cardiomegaly):** activation should concentrate on the
  **cardiac silhouette** — the heart shadow, roughly centered, often
  described clinically as an enlarged heart relative to thoracic width
- **Negative cases:** diffuse, not concentrated anywhere specific
- **Red flags to watch for:** activation on rib borders, spine, diaphragm
  edges, or image corners/artifacts — same category of problem as Pneumonia's
  neck/hardware bias, just different specific locations given different
  target anatomy

**Important:** don't assume the same crop fix that helped (partially)
with Pneumonia will help here, or is even needed. Cardiomegaly's defining
feature is centrally located, so a top-crop is unlikely to be the relevant
lever if bias does show up — the failure mode and fix would likely need to
be diagnosed fresh rather than copy-pasted from the Pneumonia experience.
Reuse the diagnostic process (compare multiple images, check border/edge
touching, document honestly), not necessarily the specific crop-percentage
solution.

**Before trusting any Grad-CAM re-check after a code/checkpoint change,**
verify per PROJECT_LOG.md §8.2 and §11's closing lesson: confirm the correct
checkpoint is loaded, confirm the actual active code via `inspect.getsource()`,
and confirm output values have genuinely changed from the previous run.

---

## 9. ONNX Export + Parity Check — Identical to Pneumonia

```python
onnx_export_path = '/content/drive/MyDrive/MediScan_AI/training/models/cardiomegaly/mediscan_cardiomegaly.onnx'
pth_export_path = '/content/drive/MyDrive/MediScan_AI/training/models/cardiomegaly/mediscan_cardiomegaly.pth'
```

Use `dynamo=False` in `torch.onnx.export()` — this was needed for Pneumonia
due to a missing `onnxscript` dependency; same fix applies here unless that's
been separately resolved. Run parity check on at least 5 test images, not
just one — confirmed necessary in Pneumonia's case to catch a genuine issue.

---

## 10. Model Card, HF Hub Upload — Identical Process

`configs/cardiomegaly.yaml` already has `hf_hub.repo` set to
`"{hf-username}/mediscan-cardiomegaly"` — update with your real HF username,
create the repo (`create_repo(..., exist_ok=True)` if it doesn't exist yet),
upload `.onnx`, `.pth`, `model_card.md`, record the commit hash back into
the config, commit.

Fill in the model card's Known Limitations and Bias Statement sections
honestly based on what your actual Grad-CAM check shows — don't assume
Cardiomegaly will have the same bias story as Pneumonia; document what's
actually true for this model.

---

## Quick Checklist

- [ ] NIH14 labels CSV downloaded, filtered to Cardiomegaly-positive
- [ ] Negative pool sampled (No Finding, ~3x positive count as a starting ratio)
- [ ] Class distribution + ratio recorded
- [ ] Relevant image batches downloaded, filenames matched to filtered lists
- [ ] Pooled, stratified 80/10/10 split, saved to Drive as `split.json`
  (consider storing labels alongside filenames this time, not deriving from path)
- [ ] `pos_weight` computed from train split, recorded in `configs/cardiomegaly.yaml`
- [ ] Preprocessing reused as-is (no premature crop changes)
- [ ] Stage 1 + Stage 2 training, new checkpoint dir (`models/cardiomegaly/`)
- [ ] Test-set evaluation — accuracy/sensitivity/specificity/AUC-ROC/confusion matrix
- [ ] Grad-CAM check on 5-10 images — cardiac silhouette vs. border/artifact activation
- [ ] If bias found: diagnose fresh, don't assume Pneumonia's crop fix applies
- [ ] Model card written honestly based on actual findings
- [ ] ONNX export, `dynamo=False`, parity check on 5+ images
- [ ] `.pth` saved alongside `.onnx`
- [ ] HF Hub repo created, all three files uploaded, commit hash recorded
- [ ] `configs/cardiomegaly.yaml` and `results/cardiomegaly/` all committed and pushed
