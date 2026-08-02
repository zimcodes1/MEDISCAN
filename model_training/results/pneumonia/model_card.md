## Bias statement (Grad-CAM qualitative findings)

Grad-CAM analysis on 9 test-set images (4 NORMAL, 5 PNEUMONIA) revealed a
concerning activation pattern that does not match expected anatomical
reasoning:

- **NORMAL cases (4/4):** Activation was consistently concentrated
  (not diffuse, as expected for true negatives) over the heart/mediastinum
  and neck region, rather than spread broadly across lung fields with no
  strong focal point.
- **PNEUMONIA cases:** Only 1 of 5 sampled positive cases (prob=1.000)
  showed activation plausibly related to lung tissue (bilateral, though
  located more laterally/high than classic lower-lobe consolidation).
  The remaining 4 cases (confidence 0.822–0.948) showed activation
  concentrated on the neck/throat region or directly on visible medical
  hardware (e.g. ECG leads/tubing) rather than lung pathology.

**Likely cause:** This is a known risk with this specific Kaggle dataset —
the NORMAL and PNEUMONIA classes were sourced from different pediatric
patient batches with systematic differences in positioning, framing, and
equipment presence. The model may be partly exploiting these correlated
but clinically meaningless differences (a form of shortcut learning)
rather than learning genuine lung pathology features.

**Status:** Despite strong numeric performance (94.2% accuracy, 99.18%
AUC-ROC on the held-out test set), this model is marked `experimental`
pending mitigation. A fix attempt (image cropping to exclude neck/shoulder
regions before resize) is planned — see training notebook for updates.
