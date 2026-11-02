"""Never trust the client: check size, magic bytes, dimensions and that the
image actually decodes. Stored images are re-encoded as PNG, which strips
EXIF/GPS and other embedded metadata."""
import hashlib
import io
from dataclasses import dataclass

from fastapi import UploadFile
from PIL import Image, ImageOps, UnidentifiedImageError

from backend.core.errors import AppError

_PNG_MAGIC = b"\x89PNG\r\n\x1a\n"
_JPEG_MAGIC = b"\xff\xd8\xff"
_PNG_SAFE_MODES = {"L", "I;16", "RGB"}


@dataclass(frozen=True)
class ValidatedImage:
    image: Image.Image  # decoded, orientation-corrected, metadata-free
    png_bytes: bytes  # what gets stored
    sha256: str  # of png_bytes
    width: int
    height: int


async def read_upload(file: UploadFile, max_bytes: int) -> bytes:
    """Reads in chunks and aborts as soon as the limit is exceeded."""
    chunks: list[bytes] = []
    total = 0
    while chunk := await file.read(64 * 1024):
        total += len(chunk)
        if total > max_bytes:
            raise AppError(413, f"File too large (maximum {max_bytes // (1024 * 1024)} MB)")
        chunks.append(chunk)
    if total == 0:
        raise AppError(400, "Empty file")
    return b"".join(chunks)


def validate_image(data: bytes, max_pixels: int, min_side: int) -> ValidatedImage:
    """CPU-bound: call via run_in_threadpool."""
    if not (data.startswith(_PNG_MAGIC) or data.startswith(_JPEG_MAGIC)):
        raise AppError(415, "Unsupported file type. Upload a PNG or JPEG image.")
    try:
        im = Image.open(io.BytesIO(data))
        if im.format not in ("PNG", "JPEG"):
            raise AppError(415, "Unsupported file type. Upload a PNG or JPEG image.")
        width, height = im.size  # header only: cheap, checked before decoding
        if width * height > max_pixels:
            raise AppError(413, "Image dimensions are too large")
        if min(width, height) < min_side:
            raise AppError(422, f"Image too small (minimum {min_side}px per side)")
        im.load()
        im = ImageOps.exif_transpose(im)  # apply rotation before metadata is dropped
        if im.mode not in _PNG_SAFE_MODES:
            im = im.convert("RGB")
        im.info.clear()
        buf = io.BytesIO()
        im.save(buf, format="PNG", icc_profile=None)
    except AppError:
        raise
    except (UnidentifiedImageError, OSError, SyntaxError, ValueError,
            Image.DecompressionBombError) as exc:
        raise AppError(422, "Could not read the image. The file may be corrupt.") from exc

    png = buf.getvalue()
    return ValidatedImage(
        image=im, png_bytes=png, sha256=hashlib.sha256(png).hexdigest(),
        width=im.width, height=im.height,
    )
