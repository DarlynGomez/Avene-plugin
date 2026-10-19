"""Decodes the crop, flattens it, and keeps the text legible and the image small enough."""

from __future__ import annotations

import base64
import binascii
import io
import re
from dataclasses import dataclass

from PIL import Image, UnidentifiedImageError

HARD_MAX_SIDE = 8192
MAX_BASE64_CHARS = 16_000_000
GREY = (128, 128, 128)
_HEX = re.compile(r"^#?([0-9a-fA-F]{6})$")


class ImageRefused(Exception):
    """The image is not usable, or the text in it would be too small to read as sent."""

    def __init__(self, reason: str):
        super().__init__(reason)
        self.reason = reason


@dataclass(frozen=True)
class PreparedImage:
    png: bytes
    width: int
    height: int
    text_px: float


def background_color(hex_value: str | None) -> tuple[int, int, int]:
    match = _HEX.match(hex_value or "")
    if not match:
        return GREY
    digits = match.group(1)
    return int(digits[0:2], 16), int(digits[2:4], 16), int(digits[4:6], 16)


def _decode(data: str) -> Image.Image:
    if data.startswith("data:"):
        data = data.split(",", 1)[-1]
    if len(data) > MAX_BASE64_CHARS:
        raise ImageRefused("malformed")
    try:
        image = Image.open(io.BytesIO(base64.b64decode(data, validate=True)))
        if max(image.size) > HARD_MAX_SIDE:
            raise ImageRefused("malformed")
        image.load()
    except (binascii.Error, ValueError, UnidentifiedImageError, OSError) as error:
        raise ImageRefused("malformed") from error
    return image


def prepare_image(
    data: str,
    background_hex: str | None,
    font_size_px: float,
    export_scale: float,
    max_side: int,
    min_text_px: float,
) -> PreparedImage:
    """Flatten onto the background, then shrink to the cap if that leaves the text 14 pixels tall."""
    image = _decode(data).convert("RGBA")
    flat = Image.new("RGBA", image.size, (*background_color(background_hex), 255))
    flat.alpha_composite(image)
    picture = flat.convert("RGB")
    # Tall here is the font size times the export scale, not a line height and not a node height
    text_px = font_size_px * export_scale
    longest = max(picture.size)
    if longest > max_side:
        shrink = max_side / longest
        text_px *= shrink
        picture = picture.resize(
            (max(1, round(picture.width * shrink)), max(1, round(picture.height * shrink))),
            Image.Resampling.LANCZOS,
        )
    if text_px + 1e-9 < min_text_px:
        raise ImageRefused("too-small-to-send")
    out = io.BytesIO()
    picture.save(out, format="PNG")
    return PreparedImage(out.getvalue(), picture.width, picture.height, text_px)
