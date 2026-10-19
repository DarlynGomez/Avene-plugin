"""Stays under the service's tokens per minute, by reserving an estimate and settling with the real count."""

from __future__ import annotations

import math
from collections import deque
from dataclasses import dataclass

from .clock import Clock

WINDOW_SECONDS = 60.0


@dataclass
class Hold:
    at: float
    tokens: int


def estimate_tokens(width: int, height: int, patch_px: int, max_tokens: int) -> int:
    """An image costs about one token per patch, plus the instruction and the answer."""
    return math.ceil(width / patch_px) * math.ceil(height / patch_px) + 150 + max_tokens


class Pacer:
    def __init__(self, tokens_per_minute: int, clock: Clock):
        self._limit = tokens_per_minute
        self._clock = clock
        self._used: deque[Hold] = deque()

    def _spent(self, now: float) -> int:
        while self._used and now - self._used[0].at >= WINDOW_SECONDS:
            self._used.popleft()
        return sum(hold.tokens for hold in self._used)

    async def acquire(self, estimate: int, max_wait: float | None) -> Hold | None:
        """A hold, or None when the wait would be longer than max_wait. A request bigger than the limit goes alone."""
        need = min(estimate, self._limit)
        waited = 0.0
        while True:
            now = self._clock.now()
            if self._spent(now) + need <= self._limit:
                hold = Hold(now, need)
                self._used.append(hold)
                return hold
            wait = max(0.05, WINDOW_SECONDS - (now - self._used[0].at))
            if max_wait is not None and waited + wait > max_wait:
                return None
            await self._clock.sleep(wait)
            waited += wait

    def settle(self, hold: Hold, actual: int) -> None:
        """The real count replaces the estimate, when the service reports one."""
        if actual > 0:
            hold.tokens = min(actual, self._limit)
