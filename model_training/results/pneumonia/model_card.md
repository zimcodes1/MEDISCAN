# Model Card: Pneumonia

## Architecture
EfficientNet-B0, ImageNet-pretrained, binary classifier (single output neuron).
Preprocessing includes a thorax crop step (top 15%, sides 5% each, bottom 2%)
added specifically to mitigate a Grad-CAM bias finding — see Bias Statement below.

## Dataset
- **Source:** Kaggle Chest X-Ray Pneumonia (`paultimothymooney/chest-xray-pneumonia`),
  originally from Guangzhou Women and Children's Medical Center — **pediatric**
  chest X-rays
- **Size:** 5,856 images pooled (Kaggle's provided train/val/test split was
  discarded — its `val` folder was only 16 images, too small to be meaningful;
  a fresh stratified split was generated instead)
- **Class distribution:** NORMAL: 1,583 / PNEUMONIA: 4,273 (ratio ≈ 1:2.7,
  imbalanced toward positive)
- **Train/val/test split counts:** 4,684 / 586 / 586 (80/10/10, stratified,
  `random_state=42`), ratios held consistent with pooled distribution across
  all three splits

## Training procedure
- **Stage 1:** frozen backbone, classifier head only, Adam, lr=1e-3, 5 epochs
- **Stage 2:** last 2 blocks (`features.7`, `features.8`) unfrozen + classifier,
  Adam, lr=1e-4, 5 epochs, `ReduceLROnPlateau` (factor=0.1, patience=1),
  early stopping patience=3
- **Loss function:** `BCEWithLogitsLoss`
- **Class weighting:** `pos_weight = 0.3704`, computed from the train split only
  (negatives/positives = 1266/3418)

## Evaluation results (final model: 15%-crop preprocessing)

| Metric | Value |
|---|---|
| Accuracy | 93.52% |
| Sensitivity | 92.52% |
| Specificity | 96.20% |
| AUC-ROC | 99.07% |

Confusion matrix: TN=152, FP=6, FN=32, TP=396 (n=586 test images)

All metrics comfortably clear the plan's stated targets (accuracy >88%,
sensitivity >90%, AUC-ROC >0.92).

## Known limitations

- **Small effective diversity:** all data comes from a single pediatric
  hospital source (Guangzhou Women and Children's Medical Center) — no
  guarantee of generalization to other pediatric populations, imaging
  equipment, or adult patients.
- **Training data is predominantly non-Nigerian population imaging** —
  performance on Nigerian patient demographics is unverified.
- **Unresolved Grad-CAM bias (see Bias Statement)** — the model shows
  residual reliance on non-anatomical image regions even after mitigation
  attempts. This model should be treated as **experimental** and not
  relied upon as a sole diagnostic signal.

## Bias statement (Grad-CAM qualitative findings)

### Original finding (uncropped model)
Grad-CAM analysis on 9 test-set images revealed activation consistently
concentrated on the neck/mediastinum region for NORMAL cases, and on
neck/throat or visible medical hardware (rather than lung fields) for
4 of 5 sampled PNEUMONIA cases at confidence 0.822–0.948. Likely cause:
a documented risk with this dataset — NORMAL and PNEUMONIA images come
from different patient batches with systematic positioning/hardware
differences, creating a shortcut-learning opportunity distinct from
genuine lung pathology.

### Mitigation attempt 1 — 25% top-crop
Removing the top 25% of each image (neck/shoulder region) before training.
**Result:** Grad-CAM showed clear improvement (no neck/hardware activation
across 8 re-checked images), but test-set specificity collapsed from 96.20%
to 67.72% (51 of 158 NORMAL images misclassified as PNEUMONIA, up from 6).
The crop removed information the model needed to correctly identify NORMAL
cases. **Not adopted.**

### Diagnostic comparison — TorchXRayVision DenseNet121
Ran TorchXRayVision's pretrained DenseNet121 (trained on NIH ChestX-ray14,
CheXpert, MIMIC-CXR, PadChest — all **adult** datasets) as an independent
Grad-CAM comparison on 4 flagged PNEUMONIA images. TXRV's activation
landed in more anatomically plausible regions, but its actual predictions
disagreed with ground truth on 3 of 4 genuinely-positive images (probabilities
0.144, 0.014, 0.020, 0.581). Given our dataset is pediatric and TXRV's
weights are adult-only, this divergence is ambiguous — it may reflect
TXRV correctly avoiding our model's shortcut, or simply TXRV being
out-of-distribution on pediatric anatomy. **Not conclusive; backbone
swap not adopted.**

### Mitigation attempt 2 — 15% top-crop (final, adopted)
Loosened the crop to 15% top / 5% sides / 2% bottom. **Result:** all
numeric metrics recovered to within a fraction of a point of the original
uncropped baseline (specificity back to 96.20%, accuracy 93.52% vs 94.20%
baseline). Qualitative re-check on the same 8 sample images showed a
**partial but incomplete improvement**:
- 3 of 8 images (2 NORMAL, 1 PNEUMONIA) showed activation that no longer
  touches the image's top/border regions and lands on more plausible
  anatomical structures (mediastinum, cardiac silhouette).
- **5 of 8 images continued to show activation on shoulders, neck,
  image borders, or — in one case — directly on visible medical tubing/
  hardware**, essentially unchanged from the original finding.

**Conclusion:** cropping reduced but did not resolve the underlying bias.
The persistence of hardware- and border-adjacent activation even after
two rounds of spatial cropping suggests the shortcut may be at least
partly a **global image property** (e.g. contrast, exposure, or scanner
characteristics that differ systematically between the NORMAL and
PNEUMONIA source batches) rather than purely a spatial/positional one —
cropping cannot remove a global property. A more complete fix would
likely require either lung segmentation (isolating lung tissue directly
rather than a rectangular crop) or a cleaner/re-balanced dataset with
matched acquisition conditions across classes; both are out of scope
for the current timeline.

**Status: this model is marked `experimental`.** It should not be
presented to end users as a fully-resolved diagnostic tool. The strong
numeric performance is real, but the qualitative reasoning behind
individual predictions cannot be fully trusted, and any deployment
should include the standard disclaimer plus a note that model
interpretability findings are still under review.

## Version
- HF Hub commit hash: _(to be filled in after Phase 2.8 upload)_
- Export date: _(to be filled in after Phase 2.6 ONNX export)_
- Preprocessing version: `crop_thorax` v2 (15% top-crop), see `preprocess.py`
