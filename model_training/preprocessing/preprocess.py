"""
Shared preprocessing pipeline for MediScan AI.

This module is the single source of truth for image preprocessing.
It must be mirrored EXACTLY in the backend's inference_service.py —
any drift between training-time and inference-time preprocessing is
a silent source of prediction error.
"""

import numpy as np
from PIL import Image
from torchvision import transforms

IMAGENET_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
IMAGENET_STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)
TARGET_SIZE = (224, 224)

train_augment = transforms.Compose([
    transforms.RandomHorizontalFlip(p=0.5),
    transforms.RandomRotation(degrees=10),
    transforms.ColorJitter(brightness=0.2, contrast=0.2),
])


def load_and_convert(image_path):
    """Steps 1-2: load from disk, force RGB."""
    img = Image.open(image_path)
    if img.mode != 'RGB':
        img = img.convert('RGB')
    return img


def apply_train_augmentation(img):
    """Step 6: training-only augmentation (flip, rotation, jitter)."""
    return train_augment(img)

def crop_thorax(img):
    """
    Crop out neck/shoulder region and side margins before resizing.
    Added after Grad-CAM revealed the model attending to neck/collar/
    hardware regions rather than lung fields on the uncropped pipeline.
    """
    w, h = img.size
    top = int(h * 0.25)      # cut top 25% (neck/throat/shoulders)
    bottom = int(h * 0.98)
    left = int(w * 0.05)
    right = int(w * 0.95)
    return img.crop((left, top, right, bottom))


def preprocess(image_path, train=False):
    img = load_and_convert(image_path)
    img = crop_thorax(img)          # <-- new step

    if train:
        img = apply_train_augmentation(img)

    img = resize(img)
    arr = to_normalized_array(img)
    arr = to_model_input(arr)
    return arr

def resize(img):
    """Step 3: resize to 224x224, bilinear interpolation."""
    return img.resize(TARGET_SIZE, resample=Image.BILINEAR)


def to_normalized_array(img):
    """Steps 4-5: scale to [0,1], then ImageNet normalization. Returns HWC array."""
    arr = np.asarray(img, dtype=np.float32) / 255.0
    arr = (arr - IMAGENET_MEAN) / IMAGENET_STD
    return arr


def to_model_input(arr):
    """Step 7: HWC -> CHW, add batch dimension."""
    arr = arr.transpose(2, 0, 1)
    arr = np.expand_dims(arr, axis=0)
    return arr.astype(np.float32)


def preprocess(image_path, train=False):
    """Full pipeline. Returns array of shape (1, 3, 224, 224).

    Set train=True to apply augmentation (training only — never
    at inference time).
    """
    img = load_and_convert(image_path)

    if train:
        img = apply_train_augmentation(img)

    img = resize(img)
    arr = to_normalized_array(img)
    arr = to_model_input(arr)
    return arr