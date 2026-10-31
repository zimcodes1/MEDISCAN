"""Avatars and organisation logos.

Same rules as scan uploads: never trust the client. Check size and magic bytes,
refuse decompression bombs, and re-encode as PNG, which drops EXIF/GPS and any
other embedded metadata. The picture is also scaled down, so nobody stores or
serves a 20 MB profile photo."""
import hashlib
import io
from dataclasses import dataclass

from PIL import Image, ImageOps, UnidentifiedImageError

from backend.core.errors import AppError

_PNG = b"\x89PNG\r\n\x1a\n"
_JPEG = b"\xff\xd8\xff"
_GIF = (b"GIF87a", b"GIF89a")
MAX_PIXELS = 25_000_000  # checked from the header, before the image is decoded


@dataclass(frozen=True)
class ProcessedImage:
    png_bytes: bytes
    digest: str  # first 12 hex chars of sha256(png_bytes): the cache-busting version


def process_profile_image(data: bytes, *, max_side: int, allow_gif: bool = False) -> ProcessedImage:
    """CPU-bound: call via run_in_threadpool."""
    gif_ok = allow_gif and data.startswith(_GIF)
    if not (data.startswith(_PNG) or data.startswith(_JPEG) or gif_ok):
        kinds = "PNG, JPEG or GIF" if allow_gif else "PNG or JPEG"
        raise AppError(415, f"Unsupported file type. Upload a {kinds} image.")
    try:
        im = Image.open(io.BytesIO(data))
        allowed = {"PNG", "JPEG"} | ({"GIF"} if allow_gif else set())
        if im.format not in allowed:
            raise AppError(415, "Unsupported file type.")
        width, height = im.size  # header only
        if width * height > MAX_PIXELS:
            raise AppError(413, "Image dimensions are too large")
        im.load()  # a GIF decodes to its first frame
        im = ImageOps.exif_transpose(im)
        has_alpha = im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info)
        im = im.convert("RGBA" if has_alpha else "RGB")
        im.info.clear()
        im.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
        buf = io.BytesIO()
        im.save(buf, format="PNG", icc_profile=None)
    except AppError:
        raise
    except (UnidentifiedImageError, OSError, SyntaxError, ValueError,
            Image.DecompressionBombError) as exc:
        raise AppError(422, "Could not read the image. The file may be corrupt.") from exc
    png = buf.getvalue()
    return ProcessedImage(png_bytes=png, digest=hashlib.sha256(png).hexdigest()[:12])
