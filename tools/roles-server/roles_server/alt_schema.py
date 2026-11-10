"""What an alt text request asks of the model, and the strict reading of what comes back."""

from __future__ import annotations

import json
from pathlib import Path

from . import labels

KINDS = ["describe", "decorative", "unsure"]

# The three settings a designer can choose, each one line of wording in a data file next to this one
STYLES: dict[str, str] = json.loads(Path(__file__).with_name("alt_styles.json").read_text(encoding="utf-8"))
DEFAULT_STYLE = "concise"

SCHEMA = {
    "type": "object",
    "properties": {"kind": {"type": "string", "enum": KINDS}, "text": {"type": "string"}},
    "required": ["kind", "text"],
    "additionalProperties": False,
}

# The wording is a data file next to this one, so it can be read and changed without touching the code
INSTRUCTION = (Path(__file__).with_name("alt_instructions.txt")).read_text(encoding="utf-8").strip()


def instruction_for(width: int, height: int, style: str = DEFAULT_STYLE) -> str:
    """Two plain numbers and one of three fixed lines are added, so nothing the file holds can write into the prompt."""
    return f"{INSTRUCTION}\n\n{STYLES[style]}\n\nLayer size: {width} by {height} pixels."


def parse_alt(content: str) -> tuple[str | None, str, str]:
    """The kind, the text and ok, or None and why not. Nothing in the reply is empty, anything else wrong is malformed."""
    if content.strip() == "":
        return None, "", labels.EMPTY
    try:
        body = json.loads(content)
    except ValueError:
        return None, "", labels.MALFORMED
    if not isinstance(body, dict) or set(body) != {"kind", "text"}:
        return None, "", labels.MALFORMED
    kind, text = body["kind"], body["text"]
    if kind not in KINDS or not isinstance(text, str):
        return None, "", labels.MALFORMED
    if kind != "describe":
        return kind, "", labels.OK
    # A description with nothing in it is an empty reply, the one thing that is tried again
    return (kind, text.strip(), labels.OK) if text.strip() else (None, "", labels.EMPTY)
