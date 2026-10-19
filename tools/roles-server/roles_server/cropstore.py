"""Precompute crops kept on disk, each with the request properties and the answer, so a later run can replay them."""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

REQUEST_KEYS = ("requestId", "crop", "exportScale", "fontSizePx", "inputs", "backgroundHex")


def save_crop(directory: str, request: Any, png: bytes, result: dict[str, Any]) -> None:
    """The PNG and a JSON beside it. The JSON never holds the image or any characters of the text."""
    safe = re.sub(r"[^A-Za-z0-9_-]", "_", request.requestId)[:80] or "crop"
    path = Path(directory)
    path.mkdir(parents=True, exist_ok=True)
    properties = {key: getattr(request, key) for key in REQUEST_KEYS}
    properties.update({key: result[key] for key in ("label", "reason", "model", "ms")})
    (path / f"{safe}.png").write_bytes(png)
    (path / f"{safe}.json").write_text(json.dumps(properties, indent=2), encoding="utf-8")
