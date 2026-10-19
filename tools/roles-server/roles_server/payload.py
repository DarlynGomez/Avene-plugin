"""The chat request, built in one place so the rules about it are easy to check."""

from __future__ import annotations

import base64
from typing import Any

from . import labels
from .config import Settings

_PROPERTIES = (
    ("sizeRatio", "Size compared with the main text on the screen"),
    ("fontWeight", "Font weight"),
    ("wordCount", "Number of words"),
    ("centerYFraction", "Vertical position on the screen, 0 is the top and 1 the bottom"),
)


def property_lines(inputs: dict[str, Any]) -> str:
    """Only plain numbers are passed on, so nothing the file holds can write into the prompt."""
    lines = []
    for key, text in _PROPERTIES:
        value = inputs.get(key)
        if isinstance(value, (int, float)) and not isinstance(value, bool):
            lines.append(f"{text}: {round(float(value), 2)}")
    return "\n".join(lines)


def build_payload(
    settings: Settings, png: bytes, instruction: str, inputs: dict[str, Any] | None = None
) -> dict[str, Any]:
    extra = property_lines(inputs or {})
    text = instruction if extra == "" else f"{instruction}\n\nProperties:\n{extra}"
    url = "data:image/png;base64," + base64.b64encode(png).decode()
    payload: dict[str, Any] = {
        "model": settings.model,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": text},
                    {"type": "image_url", "image_url": {"url": url}},
                ],
            }
        ],
        "temperature": 0,
        "seed": settings.seed,
        "response_format": {
            "type": "json_schema",
            "json_schema": {"name": "role", "strict": True, "schema": labels.SCHEMA},
        },
    }
    if settings.is_thinking:
        # Thinking can use the whole allowance and leave the reply empty, so it gets room for both
        payload["max_tokens"] = settings.thinking_max_tokens
        payload["reasoning_effort"] = "low"
    else:
        # A model that does not think rejects reasoning_effort with a 400, so it is never sent
        payload["max_tokens"] = settings.max_tokens
    return payload
