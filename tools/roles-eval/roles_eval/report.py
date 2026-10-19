"""The two files of a run. Labels, reasons and numbers only: no image, no text and no key."""

from __future__ import annotations

import csv
import json
import re
from datetime import datetime
from pathlib import Path
from typing import Any

from .measures import Row

COLUMNS = ["node id", "repeat", "request id", "truth", "label", "reason", "model", "server ms", "client seconds", "agrees"]


def write_outputs(out: Path, label: str, stamp: datetime, rows: list[Row], summary: dict[str, Any]) -> tuple[Path, Path]:
    safe = re.sub(r"[^A-Za-z0-9._-]", "_", label) or "run"
    suffix = f"{safe}-{stamp.strftime('%Y%m%dT%H%M%SZ')}"
    out.mkdir(parents=True, exist_ok=True)
    results = out / f"results-{suffix}.csv"
    with results.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(COLUMNS)
        for r in rows:
            writer.writerow([r.node_id, r.repeat, r.request_id, r.truth, r.label, r.reason, r.model, r.server_ms, f"{r.seconds:.3f}", "yes" if r.label == r.truth and r.label != "unsure" else "no"])
    path = out / f"summary-{suffix}.json"
    path.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    return results, path

