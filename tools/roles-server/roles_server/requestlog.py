"""One JSON line per request in a file on this computer. Only the fields below are ever written."""

from __future__ import annotations

import json
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


class RequestLog:
    """No key, no image and no characters can reach the file, because nothing else is accepted."""

    def __init__(self, path: str):
        self._path = Path(path)
        self._lock = threading.Lock()

    def write(
        self,
        *,
        request_id: str,
        mode: str,
        model: str | None,
        result: str | None,
        reason: str,
        ms: int,
        image_sha256: str | None = None,
        prompt_tokens: int = 0,
        completion_tokens: int = 0,
        finish_reason: str | None = None,
        schema_valid: bool | None = None,
    ) -> None:
        line: dict[str, Any] = {
            "time": datetime.now(timezone.utc).isoformat(timespec="milliseconds"),
            "requestId": request_id,
            "mode": mode,
            "model": model,
            "result": result,
            "reason": reason,
            "ms": ms,
            "imageSha256": image_sha256,
            "promptTokens": prompt_tokens,
            "completionTokens": completion_tokens,
            "finishReason": finish_reason,
            "schemaViolation": None if schema_valid is None else not schema_valid,
        }
        with self._lock:
            self._path.parent.mkdir(parents=True, exist_ok=True)
            with self._path.open("a", encoding="utf-8") as handle:
                handle.write(json.dumps(line) + "\n")
