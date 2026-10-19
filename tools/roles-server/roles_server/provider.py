"""The one small interface to a model service, and its one implementation, an OpenAI-compatible client."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

import httpx

from . import labels


class ProviderError(Exception):
    """A failure to get a usable reply, carrying the reason of the roles spec."""

    def __init__(self, reason: str, status: int | None = None, retry_after: float | None = None):
        super().__init__(reason)
        self.reason = reason
        self.status = status
        self.retry_after = retry_after


@dataclass(frozen=True)
class ProviderReply:
    content: str
    finish_reason: str | None
    model: str | None
    prompt_tokens: int
    completion_tokens: int


class Provider(Protocol):
    async def complete(self, payload: dict[str, Any], timeout: float) -> ProviderReply: ...


def _retry_after(response: httpx.Response) -> float | None:
    try:
        return float(response.headers.get("retry-after", ""))
    except ValueError:
        return None


class OpenAICompatibleProvider:
    """Posts a chat completion. The key travels only in the header and is never put in an error."""

    def __init__(self, base_url: str, api_key: str, client: httpx.AsyncClient | None = None):
        self._url = f"{base_url.rstrip('/')}/chat/completions"
        self._headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        self._client = client or httpx.AsyncClient()

    async def complete(self, payload: dict[str, Any], timeout: float) -> ProviderReply:
        try:
            response = await self._client.post(
                self._url, json=payload, headers=self._headers, timeout=timeout
            )
        except httpx.TimeoutException as error:
            raise ProviderError(labels.TIMEOUT) from error
        except httpx.HTTPError as error:
            raise ProviderError(labels.UNREACHABLE) from error
        if response.status_code in (401, 403):
            raise ProviderError(labels.AUTH, response.status_code)
        if response.status_code == 429:
            raise ProviderError(labels.RATE_LIMITED, 429, _retry_after(response))
        if response.status_code >= 500:
            raise ProviderError(labels.UNREACHABLE, response.status_code)
        if response.status_code != 200:
            raise ProviderError(labels.MALFORMED, response.status_code)
        return self._read(response)

    @staticmethod
    def _read(response: httpx.Response) -> ProviderReply:
        try:
            body = response.json()
            choice = body["choices"][0]
            message = choice["message"]
            usage = body.get("usage") or {}
            content = message.get("content") or ""
            if not isinstance(content, str):
                raise ValueError("content is not text")
            return ProviderReply(
                content=content,
                finish_reason=choice.get("finish_reason"),
                model=body.get("model") if isinstance(body.get("model"), str) else None,
                prompt_tokens=int(usage.get("prompt_tokens") or 0),
                completion_tokens=int(usage.get("completion_tokens") or 0),
            )
        except (ValueError, KeyError, IndexError, TypeError) as error:
            raise ProviderError(labels.MALFORMED) from error
