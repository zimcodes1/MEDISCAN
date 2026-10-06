"""Image helpers with no PyTorch dependency, so they are unit-testable anywhere."""
import io

import numpy as np
from PIL import Image


def to_gray_uint8(image: Image.Image) -> np.ndarray:
    """Any decoded image -> float32 array (H, W) with values in [0, 255].

    16-bit grayscale (common for X-rays) is stretched from its own min/max;
    a plain convert('L') would clip it to white. Colour images use luminance.
    """
    if image.mode in ("I;16", "I", "F"):
        arr = np.asarray(image, dtype=np.float32)
        lo, hi = float(arr.min()), float(arr.max())
        if hi <= lo:
            return np.zeros(arr.shape, dtype=np.float32)
        return (arr - lo) * (255.0 / (hi - lo))
    return np.asarray(image.convert("L"), dtype=np.float32)


def cam_to_overlay_png(cam: np.ndarray, size: int = 224) -> bytes:
    """Grad-CAM map (values ~0..1) -> transparent RGBA PNG heatmap overlay.

    Low activations stay transparent so the X-ray shows through; high ones
    fade from blue through green and yellow to red.
    """
    cam = np.nan_to_num(np.asarray(cam, dtype=np.float32), nan=0.0, posinf=1.0, neginf=0.0)
    cam = np.clip(cam, 0.0, 1.0)
    if cam.shape != (size, size):
        resized = Image.fromarray((cam * 255).astype(np.uint8)).resize((size, size), Image.BILINEAR)
        cam = np.asarray(resized, dtype=np.float32) / 255.0
    r = np.clip(1.5 - np.abs(4 * cam - 3), 0, 1)
    g = np.clip(1.5 - np.abs(4 * cam - 2), 0, 1)
    b = np.clip(1.5 - np.abs(4 * cam - 1), 0, 1)
    a = np.clip((cam - 0.2) / 0.8, 0, 1) * 0.7
    rgba = (np.stack([r, g, b, a], axis=-1) * 255).round().astype(np.uint8)
    buf = io.BytesIO()
    Image.fromarray(rgba, mode="RGBA").save(buf, format="PNG")
    return buf.getvalue()
