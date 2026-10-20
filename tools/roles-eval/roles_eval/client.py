"""Talks to the role server the way the plugin does: a selftest first, then one live request per crop."""

from __future__ import annotations

import base64
from typing import Callable

import httpx

from .crops import REQUEST_KEYS, Crop
from .errors import Refusal
from .labels import LABELS, UNSURE

# The plugin's own live wait, so a reply the plugin would have given up on counts as a failure here too
CLIENT_TIMEOUT_SECONDS = 13.0
SELFTEST_TIMEOUT_SECONDS = 120.0


def selftest(client: httpx.Client) -> dict:
    try:
        response = client.get("/selftest", timeout=SELFTEST_TIMEOUT_SECONDS)
        body = response.json()
    except (httpx.HTTPError, ValueError) as error:
        raise Refusal(f"The role server did not answer its self-test: {type(error).__name__}.") from None
    if response.status_code != 200 or not isinstance(body, dict) or body.get("status") != "pass":
        failures = ", ".join(map(str, body.get("failures", []))) if isinstance(body, dict) else "unreadable"
        hints = " ".join(body.get("hints", [])) if isinstance(body, dict) else ""
        raise Refusal(f"The self-test did not pass ({failures}). {hints}".strip())
    return body


def ask(client: httpx.Client, crop: Crop, repeat: int, clock: Callable[[], float]) -> tuple[str, str, str, int, float]:
    """The label, reason, model, the server's milliseconds and the client side seconds."""
    body = {key: crop.properties[key] for key in REQUEST_KEYS}
    body.update(requestId=f"{crop.request_id}-eval{repeat}", image=base64.b64encode(crop.png.read_bytes()).decode(), mode="live")
    started = clock()
    try:
        response = client.post("/v1/role", json=body, timeout=CLIENT_TIMEOUT_SECONDS)
    except httpx.TimeoutException:
        return UNSURE, "client-timeout", "", 0, clock() - started
    except httpx.HTTPError:
        return UNSURE, "unreachable", "", 0, clock() - started
    seconds = clock() - started
    try:
        reply = response.json()
        label, reason = reply["label"], str(reply["reason"])
    except (ValueError, KeyError, TypeError):
        label, reason, reply = None, "", {}
    if response.status_code != 200:
        return UNSURE, f"http-{response.status_code}", "", 0, seconds
    if label not in LABELS:
        return UNSURE, "malformed", "", 0, seconds
    return label, reason, str(reply.get("model") or ""), int(reply.get("ms") or 0), seconds
