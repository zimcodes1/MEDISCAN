# MEDISCAN AI — Unified Technical Documentation & Integration Guide

## Executive Summary
The **MEDISCAN AI** project has undergone an architectural pivot to resolve model performance bottlenecks and dataset bias ahead of project deadlines. The team transitioned from training custom deep learning models from scratch to deploying a dual-model Transfer Learning pipeline using pre-trained, multi-institutional weights (TorchXRayVision DenseNet121 and Hugging Face MobileViT). The offline inference backend, built on **FastAPI**, along with an in-memory explainability engine (**Grad-CAM**), has been fully integrated and documented in accordance with `MediScan_AI_Implementation_Plan_v3.md`.

---

## Problem Identification & Technical Pivot

### Dataset Bias & Shortcut Learning
Custom models trained on the Kaggle `chest-xray-pneumonia` dataset failed to generalize. Grad-CAM diagnostic visualizations revealed that models were learning shortcut annotations—such as embedded text ("L/R"), corner markers, and patient positioning features—rather than true lung pathology.

### Failed Remediation Attempts
Remediation strategies including 15% boundary cropping proved ineffective. Implementing full semantic lung segmentation via ISNet required excessive training epochs (48+) that exceeded available timeline constraints. After 7 iterations, custom model training from scratch was halted.

### The Transfer Learning Solution
The architecture was transitioned to pre-trained weights trained on multi-center hospital datasets (NIH ChestX-ray14, CheXpert, MIMIC-CXR), effectively bypassing local training bias and eliminating long training run requirements.

---

## Model Architecture & Pipeline

### TorchXRayVision (DenseNet121)
* **Model ID**: `densenet121-res224-all`
* **Target Pathologies**: Pneumonia, Cardiomegaly, Lung Nodule/Mass
* **Role**: Extracts multi-label pathology probabilities and serves as the source layer for Grad-CAM heatmaps.

### Hugging Face MobileViT
* **Model ID**: `Jesteban247/mobilevit_small-chest_xray`
* **Target Pathology**: Tuberculosis
* **Role**: Vision Transformer execution for TB classification. Replacing an earlier TensorFlow-based InceptionV3 model resolved framework dependency conflicts, keeping the backend purely PyTorch-native.

---

## Architecture Diagram

```text
                  ┌─────────────────────────────────────────┐
                  │          Uploaded X-Ray Image           │
                  └────────────────────┬────────────────────┘
                                       │
                     ┌─────────────────┴─────────────────┐
                     │                                   │
                     ▼                                   ▼
      ┌─────────────────────────────┐     ┌─────────────────────────────┐
      │   TorchXRayVision DenseNet  │     │   Hugging Face MobileViT    │
      │   (densenet121_xrv.pt)      │     │   (tb_classifier/)          │
      └──────────────┬──────────────┘     └──────────────┬──────────────┘
                     │                                   │
                     ├─────────────────┐                 │
                     ▼                 ▼                 ▼
             ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
             │ Predictions   │ │   Grad-CAM    │ │ Predictions   │
             │ (Pneumonia,   │ │   Heatmaps    │ │ (Tuberculosis)│
             │ Cardiomegaly, │ │  (Base64 JPEGs│ │               │
             │ Nodules)      │ │  for XRV path)│ │               │
             └───────┬───────┘ └───────┬───────┘ └───────┬───────┘
                     │                 │                 │
                     └─────────────────┼─────────────────┘
                                       │
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │           Unified JSON Payload          │
                  └─────────────────────────────────────────┘