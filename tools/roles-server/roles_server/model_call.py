"""One question to the model: pace, send, retry where allowed, and read the reply strictly."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from . import labels
from .clock import Clock
from .config import Settings
from .pacing import Pacer, estimate_tokens
from .parse import parse_label
from .payload import build_payload
from .provider import Provider, ProviderError

PRECOMPUTE_RETRIES = 3
RETRY_CAP_SECONDS = 60.0


@dataclass
class Answer:
    label: str | None
    reason: str
    model: str | None
    ms: int
    prompt_tokens: int = 0
    completion_tokens: int = 0
    finish_reason: str | None = None
    # True when a reply came and passed the strict check, False when it came and did not, None when none came
    schema_valid: bool | None = None
    accepted: bool = False


class ModelCaller:
    def __init__(self, settings: Settings, provider: Provider, clock: Clock):
        self._s = settings
        self._provider = provider
        self._clock = clock
        self._pacer = Pacer(settings.tokens_per_minute, clock)

    def _timeout(self, mode: str) -> float:
        if mode == "warmup":
            return self._s.warmup_timeout_seconds
        if mode == "precompute":
            return self._s.precompute_timeout_seconds
        return self._s.timeout_seconds

    async def ask(
        self,
        png: bytes,
        size: tuple[int, int],
        instruction: str,
        mode: str,
        inputs: dict[str, Any] | None = None,
    ) -> Answer:
        started = self._clock.now()

        def ms() -> int:
            return round((self._clock.now() - started) * 1000)

        payload = build_payload(self._s, png, instruction, inputs)
        estimate = estimate_tokens(*size, self._s.image_patch_px, payload["max_tokens"])
        # A live request cannot wait for the window, a precompute run can
        wait_limit = None if mode == "precompute" else self._timeout(mode)
        hold = await self._pacer.acquire(estimate, wait_limit)
        if hold is None:
            return Answer(None, labels.RATE_LIMITED, None, ms())
        retries = PRECOMPUTE_RETRIES if mode == "precompute" else 0
        for attempt in range(retries + 1):
            try:
                reply = await self._provider.complete(payload, self._timeout(mode))
            except ProviderError as error:
                if error.reason == labels.RATE_LIMITED and attempt < retries:
                    await self._clock.sleep(self._wait(error, attempt))
                    continue
                return Answer(None, error.reason, None, ms())
            self._pacer.settle(hold, reply.prompt_tokens + reply.completion_tokens)
            label, reason = parse_label(reply.content)
            return Answer(
                label,
                reason,
                reply.model or self._s.model,
                ms(),
                reply.prompt_tokens,
                reply.completion_tokens,
                reply.finish_reason,
                schema_valid=reason == labels.OK,
                accepted=True,
            )
        return Answer(None, labels.RATE_LIMITED, None, ms())

    @staticmethod
    def _wait(error: ProviderError, attempt: int) -> float:
        if error.retry_after is not None:
            return min(RETRY_CAP_SECONDS, max(0.0, error.retry_after))
        return min(RETRY_CAP_SECONDS, 2.0 * (2**attempt))
