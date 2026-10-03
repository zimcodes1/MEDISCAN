import io

import numpy as np
from PIL import Image

from backend.services.imaging import cam_to_overlay_png, to_gray_uint8


def test_gray_passthrough_and_rgb_luminance():
    gray = Image.fromarray(np.full((4, 4), 77, dtype=np.uint8), mode="L")
    assert to_gray_uint8(gray).dtype == np.float32
    assert np.allclose(to_gray_uint8(gray), 77)
    rgb = Image.new("RGB", (4, 4), (255, 255, 255))
    assert np.allclose(to_gray_uint8(rgb), 255)


def test_16bit_is_stretched_not_clipped():
    data = np.linspace(0, 4000, 64, dtype=np.uint16).reshape(8, 8)  # far below 65535
    arr = to_gray_uint8(Image.fromarray(data))
    assert arr.min() == 0 and abs(arr.max() - 255) < 1e-3
    assert arr[0, 1] < arr[7, 7]  # order preserved


def test_flat_16bit_image_does_not_divide_by_zero():
    flat = Image.fromarray(np.full((8, 8), 1234, dtype=np.uint16))
    assert not np.isnan(to_gray_uint8(flat)).any() and to_gray_uint8(flat).max() == 0


def _decode(png: bytes) -> np.ndarray:
    img = Image.open(io.BytesIO(png))
    assert img.format == "PNG" and img.mode == "RGBA"
    return np.asarray(img)


def test_overlay_is_transparent_where_activation_is_low():
    cam = np.zeros((224, 224), dtype=np.float32)
    cam[100:140, 100:140] = 1.0
    rgba = _decode(cam_to_overlay_png(cam))
    assert rgba.shape == (224, 224, 4)
    assert rgba[0, 0, 3] == 0  # background fully transparent
    assert rgba[120, 120, 3] > 100  # hot spot clearly visible
    assert rgba[120, 120, 0] > rgba[120, 120, 2]  # hot = red, not blue


def test_overlay_handles_nan_inf_and_flat_maps():
    bad = np.full((224, 224), np.nan, dtype=np.float32)
    bad[0, 0] = np.inf
    assert _decode(cam_to_overlay_png(bad)).shape == (224, 224, 4)
    assert _decode(cam_to_overlay_png(np.zeros((224, 224))))[..., 3].max() == 0


def test_overlay_resizes_other_shapes_to_224():
    assert _decode(cam_to_overlay_png(np.random.default_rng(1).random((7, 7)))).shape == (224, 224, 4)
