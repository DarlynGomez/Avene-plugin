"""POST /v1/draft: reword template lines for a reader. Every failure is a typed reason and the plugin keeps the template."""

from __future__ import annotations

import uuid
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from . import labels
from .config import Settings
from .requestlog import RequestLog
from .text_call import TextCaller


class DraftRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    requestId: str = Field(default_factory=lambda: uuid.uuid4().hex)
    audience: Literal["developer", "pm", "higherUp", "client"]
    blockId: str = ""
    lines: list[str] = Field(min_length=1)


def failed(reason: str, model: str | None, block_id: str = "", ms: int = 0) -> dict[str, Any]:
    return {"sentences": [], "reason": reason, "model": model, "ms": ms, "blockId": block_id}


async def draft(
    request: DraftRequest, settings: Settings, caller: TextCaller, log: RequestLog
) -> dict[str, Any]:
    answer = await caller.draft(request.audience, request.lines)
    # The log gets how long the request was and what happened, never a line of it
    log.write(
        request_id=request.requestId, mode="draft", model=answer.model or settings.text_model,
        result="ok" if answer.reason == labels.OK else "fallback", reason=answer.reason,
        ms=answer.ms, prompt_tokens=answer.prompt_tokens, completion_tokens=answer.completion_tokens,
        finish_reason=answer.finish_reason, schema_valid=answer.schema_valid,
        text_length=sum(len(line) for line in request.lines),
    )
    return {
        "sentences": answer.sentences,
        "reason": answer.reason,
        "model": answer.model or settings.text_model,
        "ms": answer.ms,
        "blockId": request.blockId,
    }
