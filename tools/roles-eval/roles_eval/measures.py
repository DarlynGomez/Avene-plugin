"""The gate measures over the answers, and the verdict against the pass mark."""

from __future__ import annotations

import math
import statistics
from dataclasses import dataclass
from typing import Any

from .labels import OK, UNSURE
from .passmark import PassMark


@dataclass(frozen=True)
class Row:
    node_id: str
    repeat: int
    request_id: str
    truth: str
    label: str
    reason: str
    model: str
    server_ms: int
    seconds: float


def _share(part: int, whole: int) -> float:
    return part / whole if whole else 0.0


def percentile(sorted_values: list[float], fraction: float) -> float:
    """Nearest rank."""
    return sorted_values[max(0, math.ceil(fraction * len(sorted_values)) - 1)]


def compute(rows: list[Row]) -> dict[str, Any]:
    confident = [r for r in rows if r.label != UNSURE]
    seconds = sorted(r.seconds for r in rows)
    return {
        "agreement": _share(sum(r.label == r.truth and r.label != UNSURE for r in rows), len(rows)),
        "confidentWrong": _share(sum(r.label != r.truth for r in confident), len(confident)),
        "confidentAnswers": len(confident),
        "failOrUnsure": _share(sum(r.reason != OK or r.label == UNSURE for r in rows), len(rows)),
        "latencySeconds": {
            "median": statistics.median(seconds), "p95": percentile(seconds, 0.95), "max": seconds[-1],
        },
    }


def judge(measures: dict[str, Any], mark: PassMark) -> dict[str, bool]:
    """The slowest acceptable reply is compared with the slowest reply seen."""
    verdict = {
        "agreement": measures["agreement"] >= mark.min_agreement,
        "confidentWrong": measures["confidentWrong"] <= mark.max_confident_wrong,
        "failOrUnsure": measures["failOrUnsure"] <= mark.max_fail_or_unsure,
        "latency": measures["latencySeconds"]["max"] <= mark.max_live_seconds,
    }
    verdict["overall"] = all(verdict.values())
    return verdict
