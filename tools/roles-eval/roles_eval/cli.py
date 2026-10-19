"""python -m roles_eval --crops DIR --truth FILE --passmark FILE. Exit 0 pass, 1 fail, 2 refused."""

from __future__ import annotations

import argparse
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable

import httpx

from . import client as server
from .crops import load_crops
from .errors import Refusal
from .measures import Row, compute, judge
from .passmark import load_passmark
from .report import write_outputs
from .truth import load_truth


def _parse(argv: list[str]) -> argparse.Namespace:
    p = argparse.ArgumentParser(prog="roles_eval", description="Replay labelled crops through the role server and report the gate measures.")
    p.add_argument("--crops", type=Path, required=True, help="folder of <id>.png and <id>.json pairs kept by the server")
    p.add_argument("--truth", type=Path, required=True, help="CSV of node id, rater 1, rater 2, resolved, note")
    p.add_argument("--passmark", type=Path, required=True, help="committed JSON pass mark")
    p.add_argument("--server", default="http://localhost:8750")
    p.add_argument("--repeats", type=int, default=1)
    p.add_argument("--label", default="run", help="for example the model and the crop context, used in the file names")
    p.add_argument("--out", type=Path, default=Path("results"))
    return p.parse_args(argv)


def run(args: argparse.Namespace, transport: httpx.BaseTransport | None, now: Callable[[], datetime], clock: Callable[[], float]) -> int:
    started = now()
    if args.repeats < 1:
        raise Refusal("--repeats must be at least 1.")
    mark = load_passmark(args.passmark, started)
    truth, crops = load_truth(args.truth), load_crops(args.crops)
    missing = sorted(set(truth) - set(crops))
    if missing:
        raise Refusal(f"No crop for {len(missing)} elements of the truth file, for example {missing[0]}.")
    with httpx.Client(base_url=args.server, transport=transport) as http:
        selftest = server.selftest(http)
        rows = []
        for node_id in sorted(truth):
            for repeat in range(1, args.repeats + 1):
                label, reason, model, ms, seconds = server.ask(http, crops[node_id], repeat, clock)
                rows.append(Row(node_id, repeat, f"{crops[node_id].request_id}-eval{repeat}", truth[node_id].resolved, label, reason, model, ms, seconds))
    measures = compute(rows)
    verdict = judge(measures, mark)
    summary = {
        "label": args.label, "startedAt": started.isoformat(), "elements": len(truth), "repeats": args.repeats,
        "answers": len(rows), "cropsWithoutTruth": len(set(crops) - set(truth)),
        "model": selftest.get("model"), "modelsSeen": sorted({r.model for r in rows if r.model}),
        "measures": measures, "passMark": mark.as_dict(), "verdict": verdict,
    }
    results, path = write_outputs(args.out, args.label, started, rows, summary)
    print(f"Wrote {results} and {path}")
    print(f"Overall: {'PASS' if verdict['overall'] else 'FAIL'} " + ", ".join(f"{k}={'pass' if v else 'fail'}" for k, v in verdict.items() if k != "overall"))
    return 0 if verdict["overall"] else 1


def main(argv: list[str], transport: httpx.BaseTransport | None = None, now: Callable[[], datetime] | None = None, clock: Callable[[], float] | None = None) -> int:
    try:
        return run(_parse(argv), transport, now or (lambda: datetime.now(timezone.utc)), clock or time.perf_counter)
    except Refusal as refusal:
        print(f"Refused: {refusal}", file=sys.stderr)
        return 2
