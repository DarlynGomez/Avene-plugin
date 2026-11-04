"""One draft call: refuse what cannot fit, reserve the worst case, send, and retry once on an empty reply."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from . import labels
from .clock import Clock
from .config import Settings
from .draft_schema import SCHEMA, parse_draft, system_prompt
from .pacing import WINDOW_SECONDS, Pacer, estimate_text_tokens
from .provider import Provider, ProviderError

# Only an empty reply is tried again, and only once
EMPTY_RETRIES = 1


@dataclass
class DraftAnswer:
    sentences: list[str] = field(default_factory=list)
    reason: str = labels.OK
    model: str | None = None
    ms: int = 0
    prompt_tokens: int = 0
    completion_tokens: int = 0
    finish_reason: str | None = None
    schema_valid: bool | None = None


def build_text_payload(settings: Settings, audience: str, lines: list[str]) -> dict[str, Any]:
    return {
        "model": settings.text_model,
        "messages": [
            {"role": "system", "content": system_prompt(audience)},
            {"role": "user", "content": "Lines:\n" + "\n".join(lines)},
        ],
        "temperature": 0,
        "seed": settings.seed,
        "max_tokens": settings.text_max_tokens,
        "reasoning_effort": "low",
        "response_format": {
            "type": "json_schema",
            "json_schema": {"name": "draft", "strict": True, "schema": SCHEMA},
        },
    }


class TextCaller:
    def __init__(self, settings: Settings, provider: Provider, clock: Clock, pacer: Pacer):
        self._s = settings
        self._provider = provider
        self._clock = clock
        self._pacer = pacer

    async def draft(self, audience: str, lines: list[str]) -> DraftAnswer:
        started = self._clock.now()
        answer = DraftAnswer(model=self._s.text_model)

        def done(reason: str) -> DraftAnswer:
            answer.reason = reason
            answer.ms = round((self._clock.now() - started) * 1000)
            return answer

        if not self._s.text_model:
            return done(labels.NOT_CONFIGURED)
        payload = build_text_payload(self._s, audience, lines)
        chars = sum(len(m["content"]) for m in payload["messages"])
        estimate = estimate_text_tokens(chars, payload["max_tokens"])
        # A call that could never fit in one window is not sent, nothing is reserved for it
        if estimate > self._pacer.limit:
            return done(labels.TOO_LARGE)
        for attempt in range(EMPTY_RETRIES + 1):
            # Each try reserves its own worst case, a retry is not free
            hold = await self._pacer.acquire(estimate, WINDOW_SECONDS)
            if hold is None:
                return done(labels.RATE_LIMITED)
            try:
                reply = await self._provider.complete(payload, self._s.text_timeout_seconds)
            except ProviderError as error:
                return done(error.reason)
            self._pacer.settle(hold, reply.prompt_tokens + reply.completion_tokens)
            answer.prompt_tokens += reply.prompt_tokens
            answer.completion_tokens += reply.completion_tokens
            answer.finish_reason = reply.finish_reason
            answer.model = reply.model or self._s.text_model
            sentences, reason = parse_draft(reply.content)
            answer.schema_valid = reason == labels.OK
            if reason == labels.EMPTY and attempt < EMPTY_RETRIES:
                continue
            answer.sentences = sentences or []
            return done(reason)
        return done(labels.EMPTY)
