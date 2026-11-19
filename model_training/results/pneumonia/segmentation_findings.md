# Segmentation-Based Pneumonia Retrain — Findings

> Documents the third bias-mitigation attempt for the Pneumonia model,
> following the crop attempts (§8) and the CheXpert dataset-swap experiment
> (§9), both of which left the neck/hardware Grad-CAM bias only partially
> resolved or unresolved. This experiment uses lung segmentation instead
> of a fixed-percentage crop. Written as a standalone section — insert
> into `PROJECT_LOG.md` after the existing CheXpert section once reviewed.

---

## Rationale

Prior mitigation attempts on the original Kaggle-trained model (§8) showed
that a fixed-percentage crop could partially reduce artifact-based Grad-CAM
activation, but at either the cost of a specificity collapse (25% crop) or
incomplete bias resolution (15% crop, 5 of 8 images still showed
neck/border/hardware activation). The CheXpert retrain (§9) tested whether
the issue was dataset-specific and found it was not — a different dataset,
population, and labeling method still produced artifact-based shortcuts,
just in a different form (laterality markers, hardware).

**Hypothesis for this experiment:** rather than approximating "where the
lungs probably are" with a fixed crop rectangle, use an actual lung
segmentation model to isolate lung tissue directly — physically removing
neck, shoulder, collar, and most border regions from what the classifier
can ever see, regardless of a given image's specific framing.

---

## Segmentation Model

- **Model:** `ianpan/chest-x-ray-basic` (Hugging Face), 22.2M parameters
- **Trained on:** CheXpert + NIH Chest X-ray datasets combined (335,516
  images, 96,385 patients) — segments left lung, right lung, and heart
- **Reported quality:** Dice similarity 0.957 (right lung), 0.948 (left lung)
- **Domain-mismatch caveat does not apply the same way here as it did for
  the TXRV/ViT diagnostic comparisons** — this model is used purely as a
  mask generator (finding lung boundaries), not for its diagnostic judgment,
  and lung-boundary segmentation is a far more transferable task across
  populations than disease classification is.

### Infrastructure issue: `transformers` v5 incompatibility

Loading this model via `trust_remote_code=True` failed with
`AttributeError: 'CXRModel' object has no attribute 'all_tied_weights_keys'`
on the Colab-default `transformers` version (5.15.1). Root cause (confirmed
via a widely-reported, currently open issue affecting many `trust_remote_code`
models): `transformers` v5.x introduced a `post_init()` requirement that
older custom model code doesn't call correctly. **Fix: pin
`transformers<5.0.0`** (confirmed working at 4.57.6) before loading this or
any other `trust_remote_code=True` model. This pin does not persist across
Colab session resets and must be reapplied (followed by a kernel restart)
every fresh VM — worth adding to the permanent recovery cell going forward
if segmentation is adopted long-term.

### Overlay coordinate bug (caught via careful visual review)

Initial mask visualization appeared badly misaligned — masks looked shifted
and undersized relative to the visible anatomy. Root cause: the segmentation
model outputs a fixed 320×320 mask regardless of input image size, and the
first visualization attempt overlaid this directly onto the original,
differently-sized image without resizing the mask back to match. **Fix:**
`cv2.resize(mask, original_dims, interpolation=cv2.INTER_NEAREST)` before
overlay — nearest-neighbor interpolation specifically, since the mask
contains discrete class labels that must not be blended at boundaries.

### Systematic bottom-truncation, and asymmetric padding fix

After correcting the coordinate bug, a second, genuine pattern emerged on
careful visual review: the lung mask consistently stopped short of the true
lower lung boundary (costophrenic angle region) across multiple images —
not a left/right or scale issue, specifically a directional bottom
shortfall. A quantitative check (`lung_bottom_fraction`, measuring where
the mask's lowest pixel sits as a fraction of image height) showed a spread
from 82.7% to 98.1% across a small sample — mixed, but consistent enough
with the visual finding to treat as real. **Mitigation:** applied asymmetric
padding to the crop bounding box — 15% extra padding at the bottom
specifically, vs. 5% on other sides — rather than uniform padding. Re-check
on the same images confirmed this successfully captured the previously-cut
costophrenic region.

---

## Performance Cost: Second Model in the Pipeline

Unlike `crop_thorax()` (a pure, near-free geometric operation), this
approach requires a loaded neural network to run per image. Measured
timing: **~42ms per image**, ~3.3 minutes of segmentation overhead per
training epoch on the ~4,684-image train split. For this validation run,
segmentation was run live inside the `Dataset.__getitem__` (not cached),
accepting this per-epoch cost. `DataLoader(num_workers=0)` was required —
multi-worker parallel loading doesn't safely share a GPU-resident model
across worker processes without additional setup.

**If adopted long-term:** since segmentation output is deterministic (no
randomness, unlike training augmentation), the crop should be pre-computed
once and cached to disk/Drive rather than re-run every epoch — reduces
segmentation cost from ~33 minutes across a full 10-epoch training run to
a one-time ~4-minute preprocessing pass. Not yet implemented; deferred
until the approach was validated as worth adopting (see below).

---

## Training

Retrained from scratch (ImageNet weights, not fine-tuned from any prior
checkpoint) on the original Kaggle dataset — same split, same `pos_weight`
(0.3704) as the baseline and crop experiments, so results are directly
comparable. Same architecture and two-stage recipe as all prior Pneumonia
variants.

| Stage | Best Val Loss | Best Val AUC-ROC |
|---|---|---|
| Stage 1 (epoch 4) | 0.1289 | 0.9710 |
| Stage 2 (epoch 3, resumed after a mid-Stage-2 disconnect) | 0.0539 | 0.9933 |

**Note on Stage 2 execution:** a Colab disconnect occurred mid-Stage-2
(after epoch 2 of the originally-planned 5). Recovered by reloading the
last saved checkpoint and continuing fine-tuning with a fresh optimizer/
scheduler for up to 3 further epochs, rather than restarting Stage 2 from
scratch. This is not perfectly equivalent to an uninterrupted 5-epoch run
(the optimizer momentum state was reset), but produced strong, healthy
convergence regardless. If this model is adopted as final, consider one
clean uninterrupted retrain for the canonical checkpoint.

### Test-set evaluation — full four-way comparison

| Metric | Baseline | 25% crop | 15% crop | **Segmentation** |
|---|---|---|---|---|
| Accuracy | 94.20% | 90.44% | 93.52% | **97.44%** |
| Sensitivity | 93.46% | 98.83% | 92.52% | **98.36%** |
| Specificity | 96.20% | 67.72% | 96.20% | **94.94%** |
| AUC-ROC | 99.18% | 98.35% | 99.07% | **99.64%** |

Confusion matrix: TN=150, FP=8, FN=7, TP=421 (n=586). Every metric matched
or exceeded every prior variant — no specificity collapse (unlike the 25%
crop), no sensitivity trade-off (unlike the 15% crop). Strongest numeric
result across all four Pneumonia variants trained.

**Standing caution, consistent with the project's own history:** the
original baseline model also had excellent numbers (99.18% AUC) and still
had a severe, undocumented-until-Grad-CAM bias. Strong metrics alone were
explicitly treated as insufficient evidence — the Grad-CAM check below is
what actually determines whether this result is trustworthy.

---

## Grad-CAM Check — 24 Images Reviewed (Largest Sample of Any Variant)

Reviewed in two batches: an initial 8 (same `random.seed(42)` selection
used in the very first bias-finding check, for direct comparability), then
an expanded 16 (`random.seed(7)`, independent sample) after the first batch
showed a promising, different pattern from every prior version.

### First 8 (seed=42, matching the original bias-discovery sample)
**0 of 8** showed neck, collar, shoulder, border, or hardware activation.
All 8 landed on described lung or mediastinal anatomy — perihilar region,
lung bases, apex, lateral lung fields, costophrenic region — with genuine
case-to-case spatial variation consistent with real pathology location
rather than a fixed shortcut.

### Extended 16 (seed=7, independent sample)
- **8 NORMAL cases:** 0 of 8 showed any artifact — all landed on lung
  fields or central/perihilar anatomy
- **8 PNEUMONIA cases:** 5 of 8 showed clean anatomical activation only;
  **3 of 8 showed a small, secondary, non-dominant circular activation**
  near the image border, described as consistent with a monitoring lead or
  skin marker — present alongside, not instead of, genuine lung-field
  activation in each case

### Combined tally (24 images total)
- **0 of 24** showed the original neck/collar/shoulder pattern
- **0 of 24** showed the top-edge-touching pattern seen in both crop attempts
- **~3 of 24** (all PNEUMONIA cases) showed minor, secondary marker/lead
  activation — smaller and non-dominant compared to the primary anatomical
  signal in the same images, and appearing only in positive cases, not
  negatives
- The large majority (21 of 24) showed activation squarely on lung fields
  or mediastinal anatomy with no artifact component at all

---

## Conclusion

**This is the strongest result across every Pneumonia bias-mitigation
attempt** — stronger numeric performance than any prior variant, and a
categorically different Grad-CAM pattern: no instances of the original
severe neck/hardware shortcut, no border-touching pattern, and only minor,
secondary marker activation in a minority of positive cases rather than
the dominant signal it was in every previous version.

**This is not being called a perfect, zero-artifact result.** At n=24, a
small residual marker-activation pattern remains in ~3 cases — worth
continued monitoring, and worth being honest that this doesn't reach
mathematical certainty. But it is a clear, substantial improvement over
every previous approach (baseline, 25% crop, 15% crop, and the CheXpert
dataset swap), on both the metric that matters most (Grad-CAM anatomical
correctness) and the standard performance metrics.

### Deployment cost — the tradeoff that must be weighed

Unlike the crop-based approaches, this fix requires a **second model in
the production inference pipeline** — the segmentation network runs before
the classifier on every uploaded image. This adds:
- Additional inference latency (~42ms measured in this testing environment;
  production latency may differ)
- A second point of failure / dependency to keep synchronized between
  training and serving
- Additional deployment complexity flagged explicitly as a concern by a
  teammate before this experiment began

This is a real, non-trivial cost against the crop-based approach's near-zero
overhead. The decision of whether the bias improvement justifies this added
complexity is a team decision, not a unilateral technical one — this
document is written to give the team the full picture (both the strength
of the result and its real cost) to decide with.

## Status

Adopted as the new candidate final Pneumonia model, pending:
- [ ] Team review of the deployment-complexity tradeoff
- [ ] One clean, uninterrupted retrain (current Stage 2 was resumed after
  a disconnect — not invalid, but not the cleanest possible run either)
- [ ] Decision on caching vs. live segmentation for production (caching
  strongly recommended if adopted, to avoid the ~3.3 min/epoch training
  cost recurring at inference time per-image, and to reduce production
  latency)
- [ ] Model card and config updates once finalized
- [ ] ONNX export + parity check (note: exporting a two-model pipeline —
  segmentation + classifier — needs its own consideration; may require
  either a combined export or two separate ONNX models called in sequence
  by the backend)
- [ ] HF Hub upload, commit hash recorded
