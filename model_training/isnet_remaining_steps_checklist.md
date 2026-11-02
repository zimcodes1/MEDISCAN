# ISNet Pneumonia Build — Remaining Steps Checklist

> Picks up from: Lightning 1.6.3 compatibility confirmed, ISNet DenseNet121
> code imports cleanly, all 18,396 CheXpert lung masks generated and cached
> to Drive, `preprocess_isnet()` pipeline built and producing correct
> shapes/ranges. This doc covers everything remaining to get to a trained,
> evaluated, honestly Grad-CAM-checked model.

---

## 0. Verify augmentation/mask alignment (do this first, before anything else)

Re-run `preprocess_isnet()` 4-5 times on the same test image and visualize
each result — image + mask overlay, side by side. **The mask must visibly
track the lung position through every rotation/translation/flip.** If the
mask ever looks offset from where the lungs actually are after
augmentation, stop and fix the transform call before proceeding — this
would silently corrupt the entire training signal without throwing an
error, similar in risk profile to the duplicate-`preprocess()`-function
bug encountered earlier in this project.

```python
for _ in range(4):
    img_out, mask_out = preprocess_isnet(test_path, test_mask, train=True)
    fig, axes = plt.subplots(1, 2, figsize=(8, 4))
    axes[0].imshow(img_out[0], cmap='gray')
    axes[0].axis('off')
    axes[1].imshow(img_out[0], cmap='gray')
    axes[1].imshow(mask_out, alpha=0.5, cmap='jet')
    axes[1].axis('off')
    plt.show()
```

---

## 1. Build the Dataset class

Needs to return: image tensor (3, 224, 224), mask tensor (224, 224), and
label. Reference your existing `XrayDatasetCached`/`XrayDatasetChexpert`
classes for the general pattern, but this one must also load and return
the mask alongside the image, and route both through `preprocess_isnet()`
together so augmentation stays aligned (per step 0).

Key considerations:
- Load mask via `np.load(mask_mapping[path])` (the `.npy` cache built earlier)
- Pass `train=True` only for the training split; val/test get the
  square-padding treatment instead (per the paper's recipe — this is a
  real behavioral difference from train, not an oversight)
- `DataLoader(num_workers=...)` — decide based on whether anything in the
  pipeline needs GPU access per-item (it shouldn't, since masks are
  pre-cached and `preprocess_isnet` is pure CPU/Albumentations — so
  `num_workers=2` or higher should be safe here, unlike the earlier live
  segmentation approach)

---

## 2. Wire up the ISNet model itself

Reference the usage pattern from the ISNet repo's README:

```python
DenseNet = LRPDenseNetZe.densenet121(pretrained=False)
# wrap with ISNetFlexLightning or ISNetLightningZe — confirm which class
# name is actually used in this repo version by inspecting the file directly
```

Before writing training code, actually open and read
`ISNetLightningZe.py` (or `ISNetFlexLightning.py`, whichever the repo
README points to for the DenseNet121 LRP Block path) to find:
- The exact class name and constructor arguments (likely needs: base
  model, number of classes, the loss hyperparameters P/d/w1/w2/E,
  optimizer settings)
- Whether it expects `pretrained=True` or `False` for the DenseNet
  backbone — the paper's applications may have used ImageNet-pretrained
  weights as a starting point even while using the custom LRP-modified
  DenseNet implementation
- The exact forward/training_step signature — specifically how it expects
  masks to be passed in (as part of the batch tuple, or as a separate
  argument)

**Don't guess at the constructor arguments — read the actual source file
first.** This is the highest-risk step for a subtle, silent
misconfiguration (e.g., using the wrong argument order, or passing P
where d is expected).

---

## 3. Set the loss hyperparameters

From the paper's closest analogous application (COVID-19, chest X-ray,
DenseNet121):
- `w1 = 1`, `w2 = 3` (confirmed consistent across all their applications —
  not worth tuning further)
- `P` and `d`: no exact values confirmed for the COVID application
  specifically; their other applications cluster around **P ≈ 0.8–0.95,
  d ≈ 0.9–0.999**. Start at the middle of this range (e.g. P=0.9, d=0.99)
  and treat as a starting point, not a final answer.
- LRP-ε = 0.01 through most layers, LRP-zB for the first layer (likely
  handled automatically by the ISNet class — confirm in source rather
  than assuming)

**If time allows:** a coarse search over 2-3 values of P (holding d fixed)
is more valuable than guessing a single value blind, given the paper
itself notes P/d benefit from tuning via out-of-distribution validation
when possible.

---

## 4. Optimizer and training config

Per the paper's COVID application (closest analog):
- **SGD with momentum = 0.99** (not Adam — a real behavioral difference
  from every other model trained in this project so far)
- Learning rate: 0.001
- Batch size: 16
- No weight decay
- Gradient clipping, norm 1
- 48 epochs, hold-out validation for checkpoint selection (Lightning's
  built-in checkpoint callback, monitoring val loss, is the natural fit)

---

## 5. Set up the Lightning Trainer

```python
trainer = pl.Trainer(
    accelerator='gpu',
    devices=1,
    max_epochs=48,
    gradient_clip_val=1.0,
    # + a ModelCheckpoint callback monitoring val_loss, save_top_k=1
)
```

Given how often this session has hit Colab disconnects, **strongly
consider Lightning's built-in checkpointing to Drive** (not `/content/`)
so a mid-training disconnect doesn't lose progress — Lightning has native
support for this via `ModelCheckpoint(dirpath=...)`, which is more robust
than the manual `torch.save()` pattern used in earlier parts of this
project, since Lightning can also save/restore optimizer and scheduler
state automatically (`trainer.fit(ckpt_path=...)` to resume).

---

## 6. Train

Run `trainer.fit(model, train_loader, val_loader)`. Given 48 epochs on
~14,740 images is a substantially longer run than anything else in this
project, budget real time for this — likely multiple sessions given
Colab's disconnect patterns, which is exactly why step 5's checkpoint
robustness matters.

---

## 7. Evaluate

Standard metrics on the test set (accuracy, sensitivity, specificity,
AUC-ROC, confusion matrix) — same functions already built and reused
throughout this project, adapted for whatever output format the ISNet
model's forward pass returns (confirm whether it returns raw logits, a
tuple of (logits, LRP heatmap), or something else — check the source).

---

## 8. Grad-CAM check — apply the corrected methodology from this project's own history

This is the step where this project has been burned twice by
under-sampling (§10, §10.1, §10.2 in `PROJECT_LOG.md`). Do NOT repeat
that mistake here:

- **Use a large sample from the start — 24-30+ images minimum**, not 8.
  The 8-image checks throughout this project were useful for early
  directional signal but were repeatedly shown to be unreliable for
  confirming whether a fix actually worked.
- **Fix both the random seed AND the sample size (`n`) if you want a
  result comparable to any earlier check.** `random.sample()` with the
  same seed but a different `n` does NOT return a consistent/nested
  subset — this exact bug caused a false "fix confirmed" conclusion
  earlier in this project. If comparing against a specific prior sample,
  reuse the exact same list of filepaths, not just the same seed value.
- Consider using the automated border/edge-activation threshold check
  built earlier (`check_border_activation()`) as a quantitative
  cross-check alongside visual review, now that its validity has been
  confirmed (it was initially suspected of being miscalibrated, but
  direct visual inspection confirmed it was correctly flagging genuine
  border activation) — but still visually spot-check a handful of
  flagged and non-flagged images rather than trusting the automated
  number alone.

---

## 9. Compare against the other Pneumonia variants

Full comparison table (extend the one already in `PROJECT_LOG.md` §10)
across: baseline, 25% crop, 15% crop, segmentation Run 1, segmentation
Run 2, and this ISNet result — both on standard metrics and on the
corrected large-sample Grad-CAM check.

**Remember the actual promise of ISNet from the paper:** unlike every
prior approach tried, ISNet needs no segmentation model at inference
time — the trained DenseNet121 classifier runs standalone. If the Grad-CAM
result genuinely holds up under proper large-sample scrutiny, this is the
first approach in this project that could resolve both the bias concern
*and* the deployment-complexity concern your teammate raised, simultaneously.

---

## 10. Document and decide

Regardless of outcome — success, partial success, or another negative
result — document it in `PROJECT_LOG.md` with the same honesty applied
throughout this project (including this checklist's own methodology
safeguards, so future readers can trust the conclusion). Given the real
engineering investment this represents, a clear result either way (working
or genuinely ruled out) is valuable to the team regardless of which
direction it points.
