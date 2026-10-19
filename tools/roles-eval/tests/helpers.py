"""A fake role server, crops on disk and a pass mark in a throwaway git repository."""

from __future__ import annotations

import base64
import csv
import json
import os
import subprocess
from pathlib import Path
from typing import Callable

import httpx

PNG = b"\x89PNG\r\n\x1a\nfake-image-bytes"
IMAGE_B64 = base64.b64encode(PNG).decode()
PASSING = {"agreedOn": "2026-10-20", "initials": ["DG", "GT"], "minAgreement": 0.5, "maxConfidentWrong": 0.5, "maxFailOrUnsure": 0.5, "maxLiveSeconds": 5.0}
HEADER = ["node id", "rater 1", "rater 2", "resolved", "note"]


def write_crops(directory: Path, labels_by_node: dict[str, str]) -> None:
    directory.mkdir(parents=True, exist_ok=True)
    for node_id in labels_by_node:
        request_id = f"{node_id}-1700000000000-1"
        safe = request_id.replace(":", "_")
        (directory / f"{safe}.png").write_bytes(PNG)
        (directory / f"{safe}.json").write_text(json.dumps({
            "requestId": request_id, "crop": "node", "exportScale": 1, "fontSizePx": 16,
            "inputs": {"sizeRatio": 1.0}, "backgroundHex": "#FFFFFF", "label": "caption", "reason": "ok", "model": "m", "ms": 5,
        }))


def write_truth(path: Path, labels_by_node: dict[str, str]) -> None:
    with path.open("w", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(HEADER)
        for node_id, label in labels_by_node.items():
            writer.writerow([node_id, label, label, label, ""])


def commit_passmark(repo: Path, data: dict | None = None, when: str = "2026-10-20T10:00:00+00:00", commit: bool = True) -> Path:
    repo.mkdir(parents=True, exist_ok=True)
    path = repo / "passmark.json"
    path.write_text(json.dumps(PASSING if data is None else data))
    env = {**os.environ, "GIT_COMMITTER_DATE": when, "GIT_AUTHOR_DATE": when}
    git = lambda *a: subprocess.run(["git", "-C", str(repo), "-c", "user.name=t", "-c", "user.email=t@t", *a], check=True, capture_output=True, env=env)
    git("init", "-q")
    if commit:
        git("add", "passmark.json")
        git("commit", "-q", "-m", "pass mark")
    return path


def fake_server(answers: dict[str, tuple[str, str]], selftest: dict | None = None, seen: list | None = None) -> httpx.MockTransport:
    """answers maps a node id to (label, reason). The request body is kept in seen."""
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/selftest":
            return httpx.Response(200, json=selftest or {"status": "pass", "model": "frozen:tag", "failures": [], "hints": []})
        body = json.loads(request.content)
        if seen is not None:
            seen.append(body)
        node = body["requestId"].split("-")[0]
        label, reason = answers[node]
        return httpx.Response(200, json={"label": label, "reason": reason, "model": "frozen:tag", "ms": 120})
    return httpx.MockTransport(handler)


def ticking(step: float) -> Callable[[], float]:
    """A clock that advances by step at every reading, so each request takes 2 * step."""
    state = {"t": 0.0}
    def clock() -> float:
        state["t"] += step
        return state["t"]
    return clock
