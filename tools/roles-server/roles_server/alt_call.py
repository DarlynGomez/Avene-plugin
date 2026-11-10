"""One alt text call: refuse what cannot fit, reserve the worst case, one at a time, retry once on an empty reply."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass

from . import labels
from .alt_schema import SCHEMA, instruction_for, parse_alt
from .clock import Clock
from .config import Settings
from .pacing import WINDOW_SECONDS, Pacer, estimate_tokens
from .payload import build_payload
from .provider import Provider, ProviderError

# Only an empty reply is tried again, and only once
EMPTY_RETRIES = 1


@dataclass
class AltAnswer:
    kind: str = "unsure"
    text: str = ""
    reason: str = labels.OK
    model: str | None = None
    ms: int = 0
    prompt_tokens: int = 0
    completion_tokens: int = 0
    finish_reason: str | None = None
    schema_valid: bool | None = None


class AltCaller:
    def __init__(self, settings: Settings, provider: Provider, clock: Clock, pacer: Pacer):
        self._s = settings
        self._provider = provider
        self._clock = clock
        self._pacer = pacer
        # The service is asked about one image at a time, so a long batch cannot crowd out a role question
        self._one_at_a_time = asyncio.Lock()

    def _payload(self, png: bytes, width: int, height: int, style: str) -> dict:
        payload = build_payload(
            self._s, png, instruction_for(width, height, style), schema_name="alt", schema=SCHEMA
        )
        if not self._s.is_thinking:
            payload["max_tokens"] = self._s.alt_max_tokens
        return payload

    async def describe(
        self, png: bytes, size: tuple[int, int], layer: tuple[int, int], style: str = "concise"
    ) -> AltAnswer:
        async with self._one_at_a_time:
            return await self._describe(png, size, layer, style)

    async def _describe(
        self, png: bytes, size: tuple[int, int], layer: tuple[int, int], style: str
    ) -> AltAnswer:
        started = self._clock.now()
        answer = AltAnswer(model=self._s.model)

        def done(reason: str) -> AltAnswer:
            answer.reason = reason
            answer.ms = round((self._clock.now() - started) * 1000)
            return answer

        payload = self._payload(png, *layer, style)
        estimate = estimate_tokens(*size, self._s.image_patch_px, payload["max_tokens"])
        # A call that could never fit in one window is not sent, nothing is reserved for it
        if estimate > self._pacer.limit:
            return done(labels.TOO_LARGE)
        for attempt in range(EMPTY_RETRIES + 1):
            # Each try reserves its own worst case, a retry is not free
            hold = await self._pacer.acquire(estimate, WINDOW_SECONDS)
            if hold is None:
                return done(labels.RATE_LIMITED)
            try:
                reply = await self._provider.complete(payload, self._s.alt_timeout_seconds)
            except ProviderError as error:
                return done(error.reason)
            self._pacer.settle(hold, reply.prompt_tokens + reply.completion_tokens)
            answer.prompt_tokens += reply.prompt_tokens
            answer.completion_tokens += reply.completion_tokens
            answer.finish_reason = reply.finish_reason
            answer.model = reply.model or self._s.model
            kind, text, reason = parse_alt(reply.content)
            answer.schema_valid = reason == labels.OK
            if reason == labels.EMPTY and attempt < EMPTY_RETRIES:
                continue
            if kind is not None:
                answer.kind, answer.text = kind, text
            return done(reason)
        return done(labels.EMPTY)
