"""Shared pieces: a fake clock, test images, and a mocked GenAI Manager."""

from __future__ import annotations

import base64
import io
import json
from typing import Any, Callable

import httpx
from fastapi.testclient import TestClient
from PIL import Image

from roles_server.app import create_app
from roles_server.config import Settings
from roles_server.provider import OpenAICompatibleProvider

KEY = "sk-test-SECRET-key-0123456789"
MODEL = "vision-model:test-frozen"


class FakeClock:
    def __init__(self) -> None:
        self.time = 1000.0
        self.slept: list[float] = []

    def now(self) -> float:
        return self.time

    async def sleep(self, seconds: float) -> None:
        self.slept.append(seconds)
        self.time += seconds


def settings(tmp_path, **env: str) -> Settings:
    base = {
        "GENAI_BASE_URL": "http://genai.test/v1",
        "GENAI_API_KEY": KEY,
        "GENAI_MODEL": MODEL,
        "ROLES_LOG_PATH": str(tmp_path / "roles.log.jsonl"),
    }
    return Settings.from_env({**base, **env})


def png_b64(width: int = 120, height: int = 40, color=(255, 255, 255, 255), mode: str = "RGBA") -> str:
    image = Image.new(mode, (width, height), color)
    out = io.BytesIO()
    image.save(out, format="PNG")
    return base64.b64encode(out.getvalue()).decode()


def chat_ok(content: Any, finish: str = "stop", model: str = MODEL, prompt: int = 300, completion: int = 5) -> dict:
    text = content if isinstance(content, str) else json.dumps(content)
    return {
        "model": model,
        "choices": [{"message": {"role": "assistant", "content": text}, "finish_reason": finish}],
        "usage": {"prompt_tokens": prompt, "completion_tokens": completion},
    }


class Manager:
    """A mocked GenAI Manager, it records what it was sent and answers as told."""

    def __init__(self, respond: Callable[[httpx.Request], httpx.Response] | None = None) -> None:
        self.requests: list[httpx.Request] = []
        self.respond = respond or (lambda _r: httpx.Response(200, json=chat_ok({"label": "caption"})))

    def handler(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)
        return self.respond(request)

    def payloads(self) -> list[dict[str, Any]]:
        return [json.loads(r.content) for r in self.requests]

    def provider(self) -> OpenAICompatibleProvider:
        client = httpx.AsyncClient(transport=httpx.MockTransport(self.handler))
        return OpenAICompatibleProvider("http://genai.test/v1", KEY, client)


def client_for(tmp_path, manager: Manager, clock: FakeClock | None = None, warm: bool = False, **env: str) -> TestClient:
    app = create_app(settings(tmp_path, **env), manager.provider(), clock or FakeClock(), warm=warm)
    return TestClient(app, base_url="http://127.0.0.1:8750")


def role_body(**overrides: Any) -> dict[str, Any]:
    body = {
        "requestId": "r-1",
        "image": png_b64(),
        "crop": "node",
        "exportScale": 1.0,
        "fontSizePx": 14,
        "inputs": {"sizeRatio": 0.85, "fontWeight": 400, "wordCount": 4, "centerYFraction": 0.5},
        "backgroundHex": "#FFFFFF",
        "mode": "live",
    }
    body.update(overrides)
    return body


def log_lines(tmp_path) -> list[dict[str, Any]]:
    path = tmp_path / "roles.log.jsonl"
    return [json.loads(line) for line in path.read_text().splitlines()] if path.exists() else []
