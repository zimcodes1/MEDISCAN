# Phase 2 — AI Model Training: Implementation Roadmap

> Goal: produce trained, evaluated, ONNX-exported models for all four conditions
> (Pneumonia, Cardiomegaly, Lung Nodule/Mass, Tuberculosis), uploaded to their
> HF Hub Model repos and ready for the backend to load.
>
> Environment: Google Colab (T4 GPU) via the VS Code Colab extension.
> Branch: `training/model-development`. Folder: `model_training/`.

---

## 2.0 Session Setup (run at the start of every Colab session)

Colab's free-tier runtime disconnects on idle and can reset entirely between
sessions. Everything under `/content/` is wiped on reset; only `/content/drive/`
persists. Run this init check first, every time you reconnect:

- [ ] Select Kernel → Colab → connect to (or create) a T4 GPU server
- [ ] Confirm GPU is live:
  ```python
  import torch
  print(torch.cuda.is_available(), torch.cuda.get_device_name(0))
  ```
- [ ] Run the session-init cell (Drive mount check, Kaggle token check, raw data presence flag)
- [ ] If raw dataset images are missing on `/content/`, re-download via Kaggle API before continuing — the split file on Drive is unaffected and does NOT need to be regenerated

**Known failure modes encountered so far (for reference):**
- `notebook controller is DISPOSED` → runtime dropped, reconnect and re-run every cell from the top, nothing on `/content/` survives
- `FileNotFoundError` on `/root/.kaggle/access_token` → same cause; re-run the token-write cell before chmod
- `FileNotFoundError` on a Drive path → check for typos in the folder path, and confirm Drive is actually mounted (`os.path.exists('/content/drive/MyDrive')`)
- Stale Python variables (e.g. `filepaths` pointing to the wrong thing) → when in doubt, rebuild the variable fresh in the cell immediately before you use it

---

## 2.1 Dataset Acquisition & Split (per condition)

Repeat this sub-phase once per condition.

- [ ] Identify dataset source (see table below)
- [ ] Download via Kaggle API (Pneumonia) or filtered NIH14 pull (Cardiomegaly, Nodule/Mass) or direct download (TB — Shenzhen + Montgomery sets)
- [ ] Extract, then clean: remove `__MACOSX/` junk folders, remove any duplicate nested extraction folders, confirm no non-image hidden files remain per class
- [ ] Pool all images into one `(filepath, label)` list regardless of any dataset-provided train/val/test split — those provided splits are often too small or not representative (Kaggle Pneumonia's `val` folder is only 16 images, for example) and are not used
- [ ] Compute and record class distribution (counts + ratio) on the full pooled set
- [ ] Stratified 80/10/10 split using `sklearn.model_selection.train_test_split` with `stratify=labels`, `random_state=42` (fixed seed — same for all four conditions, never changes once set for a given condition)
- [ ] Verify per-split class ratios roughly match the pooled ratio (confirms stratification held)
- [ ] Save the three filename lists (`train`, `val`, `test`) as `split.json` to Drive at `MediScan_AI/training/datasets/{condition}/split.json` — this is the permanent, authoritative split; every future training run for this condition must reuse it rather than re-splitting
- [ ] Compute `pos_weight = negatives_in_train / positives_in_train` — from the **train split only**, not the pooled set
- [ ] Record `num_images_approx`, `class_distribution`, and `pos_weight` into `model_training/configs/{condition}.yaml`
- [ ] Commit the updated config to `training/model-development`

**Dataset sources reference:**

| Condition | Source | Approx. size | Notes |
|---|---|---|---|
| Pneumonia | Kaggle Chest X-Ray Pneumonia | ~5,856 pooled | Class ratio ≈ 1:2.7 (Normal:Pneumonia) |
| Cardiomegaly | NIH ChestX-ray14, filtered to Cardiomegaly label | subset of 112,120 | Heavily skewed negative — check ratio before training |
| Lung Nodule/Mass | NIH ChestX-ray14, filtered to Nodule + Mass (merged as one positive class) | subset of 112,120 | Same source as Cardiomegaly — reuse filtering logic |
| Tuberculosis | Shenzhen Hospital + Montgomery County TB sets | ~800 combined | Small dataset — document as a limitation regardless of results |

**Status: Pneumonia complete.** Train 4684 / Val 586 / Test 586. `pos_weight = 0.3704`.

---

## 2.2 Shared Preprocessing Pipeline

Build once, reuse across all four conditions and (later) mirror exactly in the
backend's `inference_service.py`. Any drift between training-time and
inference-time preprocessing silently degrades predictions — this file is the
single source of truth.

- [ ] `load_and_convert(image_path)` — load from disk, force RGB (handles 1- or 4-channel grayscale X-rays)
- [ ] `resize(img)` — 224×224, bilinear interpolation (direct resize, not aspect-preserving — matches ImageNet-pretrained backbone expectations)
- [ ] `to_normalized_array(img)` — scale to [0,1], then ImageNet normalize (mean `[0.485, 0.456, 0.406]`, std `[0.229, 0.224, 0.225]`)
- [ ] `to_model_input(arr)` — HWC → CHW transpose, add batch dimension → final shape `(1, 3, 224, 224)`
- [ ] `apply_train_augmentation(img)` — training-only: random horizontal flip (p=0.5), random rotation (±10°), color jitter (brightness/contrast ±0.2) via `torchvision.transforms`
- [ ] Combine into single `preprocess(image_path, train=False)` function
- [ ] Test both `train=False` (deterministic) and `train=True` (stochastic) modes on a real image; confirm shapes are correct and augmented output differs from non-augmented
- [ ] Save as `model_training/preprocessing/preprocess.py`, commit
- [ ] Clone the repo into Drive (`MediScan_AI/repo`) so Colab sessions can `import` the real committed module instead of copy-pasted notebook cells — keeps training code and the eventual backend copy from drifting apart
- [ ] In each condition's training notebook, `sys.path.append()` the Drive repo clone and import `preprocess` from the real file, not a local redefinition

**Status: Complete and validated end-to-end.**

---

## 2.3 Train Each Model

Repeat per condition, once 2.1 and 2.2 are done for that condition.

**Architecture:**
- [ ] Load EfficientNet-B0 from `torchvision`, ImageNet pretrained weights
- [ ] Replace final classifier layer with a single linear output neuron (binary classification)
- [ ] Loss: `BCEWithLogitsLoss`, with `pos_weight` from step 2.1 passed in for imbalanced conditions

**Stage 1 — head warmup:**
- [ ] Freeze all layers except the classifier head
- [ ] Adam optimizer, learning rate `1e-3`
- [ ] Train 5 epochs

**Stage 2 — fine-tune:**
- [ ] Unfreeze the last two blocks of `model.features`
- [ ] Adam optimizer, learning rate `1e-4`
- [ ] `ReduceLROnPlateau` scheduler monitoring validation loss
- [ ] Train up to 5 more epochs

**Every epoch (both stages):**
- [ ] Log training loss, validation loss, validation AUC-ROC
- [ ] Early stop if val loss hasn't improved for 3 consecutive epochs; restore best checkpoint
- [ ] Save best checkpoint (lowest val loss) to Drive after each epoch — never overwrite a better checkpoint with a worse one

**Suggested training order (risk-managed):**
1. Pneumonia — cleanest data, validates the whole pipeline end-to-end
2. Cardiomegaly — introduces real class-imbalance handling via `pos_weight`
3. Lung Nodule/Mass — reuses NIH14 loading logic from Cardiomegaly; watch Grad-CAM closely (small/localized findings are easy for a model to shortcut)
4. Tuberculosis — smallest dataset, most likely to need extra iteration; doing it last means it doesn't block the other three

---

## 2.4 Evaluate Each Model

On the held-out test set only (never touched during training or validation):

- [ ] Accuracy
- [ ] Sensitivity (recall on positive class — most important metric for a screening tool)
- [ ] Specificity
- [ ] AUC-ROC
- [ ] Full confusion matrix
- [ ] Save all metrics to `model_training/results/{condition}/eval_metrics.json` (use the template already in the repo)

**Target thresholds (goals, not hard gates):**

| Condition | Accuracy | Sensitivity | AUC-ROC |
|---|---|---|---|
| Pneumonia | > 88% | > 90% | > 0.92 |
| Cardiomegaly | > 85% | > 85% | > 0.90 |
| Lung Nodule/Mass | > 80% | > 82% | > 0.88 |
| Tuberculosis | > 78% | > 80% | > 0.85 |

- [ ] If a model falls short, document the gap honestly in the model card — do not discard it, mark it `experimental` in the registry and flag it in the UI instead (already the default for Nodule/Mass and TB in the configs)

---

## 2.5 Qualitative Grad-CAM Check (before export)

For 5–10 test images per model:

- [ ] Generate Grad-CAM heatmaps using `pytorch-grad-cam`, target layer `model.features[-1]`
- [ ] Positive cases: confirm activation is over anatomically relevant regions (lung fields for Pneumonia/Nodule/Mass, cardiac silhouette for Cardiomegaly, upper lung zones for TB)
- [ ] Negative cases: confirm activation is diffuse, not concentrated
- [ ] Red flag check: activation should NOT concentrate on image borders, corner text annotations, or the image frame on either positive or negative cases
- [ ] If borders/artifacts show consistent activation → the model learned from artifacts, not anatomy. Document as a bias issue in the model card and mark the model experimental.

---

## 2.6 Export to ONNX

Per trained checkpoint that passes 2.5:

- [ ] Set model to eval mode, disable gradient computation
- [ ] Create dummy input tensor, shape `(1, 3, 224, 224)`
- [ ] `torch.onnx.export` with dynamic batch axis on dim 0, `opset_version=17`
- [ ] **Parity check**: run the same preprocessed test image through PyTorch and through `onnxruntime.InferenceSession`; outputs must agree within ±0.001. Do not proceed if this fails.
- [ ] Save both `.pth` (needed for Grad-CAM later) and `.onnx`

**Fixed naming convention** (backend registry references these exactly):

| Condition | ONNX filename | PyTorch filename |
|---|---|---|
| Pneumonia | `mediscan_pneumonia.onnx` | `mediscan_pneumonia.pth` |
| Tuberculosis | `mediscan_tuberculosis.onnx` | `mediscan_tuberculosis.pth` |
| Cardiomegaly | `mediscan_cardiomegaly.onnx` | `mediscan_cardiomegaly.pth` |
| Nodule/Mass | `mediscan_nodule_mass.onnx` | `mediscan_nodule_mass.pth` |

---

## 2.7 Write Model Cards

Before uploading, per condition, fill in `model_training/results/{condition}/model_card.md` (template already in repo) with:

- [ ] Architecture (EfficientNet-B0, ImageNet pretrained, binary classifier)
- [ ] Dataset: source, size, class distribution, train/val/test split counts
- [ ] Training procedure: both stages, optimizer, learning rate, epochs, loss function, `pos_weight` if applied
- [ ] Evaluation results table (from 2.4)
- [ ] Known limitations — explicitly required:
  - Small TB dataset size
  - Nodule/Mass model detects radiographic abnormalities, NOT cancer — CT follow-up required for any positive finding
  - Training data is predominantly Western-population imaging, may affect performance on Nigerian patient demographics
- [ ] Bias statement — Grad-CAM qualitative findings from 2.5

---

## 2.8 Upload to Hugging Face Hub

Per condition:

- [ ] Push `.onnx`, `.pth`, and `model_card.md` to the corresponding HF Model repo (`huggingface_hub.upload_file()` or HF CLI)
- [ ] Record the commit hash HF Hub generates for the upload
- [ ] Write the commit hash into `model_training/configs/{condition}.yaml` under `hf_hub.commit_hash` — this becomes the `model_version` field on every finding record in Phase 5, forming a permanent audit trail
- [ ] Commit the updated config

---

## Phase 2 Complete When:

- [ ] All four HF Model repos contain `.onnx`, `.pth`, and `model_card.md`
- [ ] ONNX parity check passed for all four exports (difference < 0.001)
- [ ] Evaluation results documented in `model_training/results/{condition}/eval_metrics.json` for all four
- [ ] Commit hashes recorded in all four config files
- [ ] All four `split.json` files exist on Drive and are the permanent record of each condition's train/val/test split

---

## Progress Tracker

| Condition | 2.1 Split | 2.2 Preprocess | 2.3 Train | 2.4 Eval | 2.5 Grad-CAM | 2.6 Export | 2.7 Model Card | 2.8 Upload |
|---|---|---|---|---|---|---|---|---|
| Pneumonia | ✅ Done | ✅ Done (shared) | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Cardiomegaly | ⬜ | (shared) | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Lung Nodule/Mass | ⬜ | (shared) | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Tuberculosis | ⬜ | (shared) | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
