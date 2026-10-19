"""The labelled test set: one row per text element, with the resolved label of two raters."""

from __future__ import annotations

import csv
from dataclasses import dataclass
from pathlib import Path

from .errors import Refusal
from .labels import LABELS


@dataclass(frozen=True)
class Truth:
    node_id: str
    rater1: str
    rater2: str
    resolved: str
    note: str


def load_truth(path: Path) -> dict[str, Truth]:
    if not path.is_file():
        raise Refusal(f"The truth file {path} does not exist.")
    with path.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        names = {(name or "").strip().lower(): name for name in (reader.fieldnames or [])}
        for needed in ("node id", "resolved"):
            if needed not in names:
                raise Refusal(f"The truth file has no '{needed}' column.")

        def field(row: dict[str, str], name: str) -> str:
            return (row.get(names[name]) or "").strip() if name in names else ""

        found: dict[str, Truth] = {}
        for line, row in enumerate(reader, start=2):
            node_id = field(row, "node id")
            if node_id == "":
                continue
            truth = Truth(node_id, field(row, "rater 1"), field(row, "rater 2"), field(row, "resolved").lower(), field(row, "note"))
            if truth.resolved == "":
                raise Refusal(f"Line {line} of the truth file ({node_id}) has no resolved label.")
            if truth.resolved not in LABELS:
                raise Refusal(f"Line {line} of the truth file ({node_id}) has '{truth.resolved}', which is not one of the seven labels.")
            if node_id in found:
                raise Refusal(f"Node id {node_id} appears twice in the truth file.")
            found[node_id] = truth
    if not found:
        raise Refusal("The truth file has no rows.")
    return found
