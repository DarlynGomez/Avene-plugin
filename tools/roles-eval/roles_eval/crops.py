"""The crops the server kept in precompute mode, each a PNG with a JSON of its request properties beside it."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .errors import Refusal

REQUEST_KEYS = ("crop", "exportScale", "fontSizePx", "inputs", "backgroundHex")


@dataclass(frozen=True)
class Crop:
    node_id: str
    request_id: str
    png: Path
    properties: dict[str, Any]


def node_id_of(request_id: str) -> str:
    """The request id is <nodeId>-<time>-<counter>."""
    return request_id.rsplit("-", 2)[0]


def load_crops(directory: Path) -> dict[str, Crop]:
    if not directory.is_dir():
        raise Refusal(f"The crops folder {directory} does not exist.")
    found: dict[str, Crop] = {}
    for meta in sorted(directory.glob("*.json")):
        png = meta.with_suffix(".png")
        if not png.is_file():
            continue
        try:
            properties = json.loads(meta.read_text(encoding="utf-8"))
            request_id = str(properties["requestId"])
            missing = [key for key in REQUEST_KEYS if key not in properties]
        except (ValueError, KeyError, TypeError):
            raise Refusal(f"{meta.name} is not a crop properties file.") from None
        if missing:
            raise Refusal(f"{meta.name} lacks {', '.join(missing)}.")
        node_id = node_id_of(request_id)
        if node_id in found:
            raise Refusal(f"More than one crop for node {node_id}: {found[node_id].png.name} and {png.name}. Keep one.")
        found[node_id] = Crop(node_id, request_id, png, properties)
    return found
