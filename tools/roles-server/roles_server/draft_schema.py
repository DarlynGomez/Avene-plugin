"""What a draft request asks of the model, and the strict reading of what comes back."""

from __future__ import annotations

import json

from . import labels

SCHEMA = {
    "type": "object",
    "properties": {"sentences": {"type": "array", "items": {"type": "string"}}},
    "required": ["sentences"],
    "additionalProperties": False,
}

READERS = {
    "developer": "The reader is a developer who will build or fix this.",
    "pm": "The reader is a product manager who plans the work and signs decisions off.",
    "higherUp": "The reader is a leader who needs to know what is waiting on a decision.",
    "client": "The reader is a client receiving the designer's report. Use plain words and no jargon.",
}

INSTRUCTION = (
    "You reword short lines of an accessibility handoff document for one reader. Each line starts "
    "with a label (Detected, Decision or Needs check) and may hold identifiers in curly braces such "
    "as {L1}. Keep the label at the start of its line. Keep every identifier exactly as written, "
    "the same number of times. Do not write any digits, number words, color codes, names, or "
    "standard and criterion numbers. Do not say anything is compliant, passes, or meets a standard. "
    "Change only the connecting words so each line reads naturally for the reader. Reply with one "
    "sentence for each line given, in the same order, in the format given."
)


def system_prompt(audience: str) -> str:
    return f"{INSTRUCTION} {READERS[audience]}"


def parse_draft(content: str) -> tuple[list[str] | None, str]:
    """The sentences and ok, or None and why not. A reply with nothing in it is empty, anything else wrong is malformed."""
    if content.strip() == "":
        return None, labels.EMPTY
    try:
        body = json.loads(content)
    except ValueError:
        return None, labels.MALFORMED
    if not isinstance(body, dict) or set(body) != {"sentences"}:
        return None, labels.MALFORMED
    sentences = body["sentences"]
    if not isinstance(sentences, list) or any(not isinstance(s, str) for s in sentences):
        return None, labels.MALFORMED
    if len(sentences) == 0:
        return None, labels.EMPTY
    if any(s.strip() == "" for s in sentences):
        return None, labels.MALFORMED
    return sentences, labels.OK
