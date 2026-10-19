"""Never trust the gateway to enforce the schema, the reply is parsed here, strictly."""

from __future__ import annotations

import json

from . import labels


def parse_label(content: str) -> tuple[str | None, str]:
    """The label and the reason: ok, empty, malformed or label-outside-list."""
    if content.strip() == "":
        return None, labels.EMPTY
    try:
        data = json.loads(content)
    except ValueError:
        return None, labels.MALFORMED
    if not isinstance(data, dict) or set(data) != {"label"}:
        return None, labels.MALFORMED
    value = data["label"]
    if not isinstance(value, str):
        return None, labels.MALFORMED
    if value not in labels.LABELS:
        return None, labels.LABEL_OUTSIDE_LIST
    return value, labels.OK
