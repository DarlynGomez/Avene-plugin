"""POST /v1/alt: one cropped image in, a suggestion out. Every failure is a typed reason and the designer writes the note."""

from __future__ import annotations

import uuid
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from . import labels
from .alt_call import AltCaller
from .config import Settings
from .imaging import ImageRefused, prepare_picture
from .requestlog import RequestLog


class AltRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    requestId: str = Field(default_factory=lambda: uuid.uuid4().hex)
    image: str
    # The layer's size in the design, in pixels, which tells an icon from a banner
    width: int = Field(gt=0, le=100_000)
    height: int = Field(gt=0, le=100_000)
    # How the description is worded, one of three settings
    style: Literal["concise", "descriptive", "functional"] = "concise"


def failed(reason: str, model: str | None, ms: int = 0) -> dict[str, Any]:
    return {"kind": "unsure", "text": "", "reason": reason, "model": model, "ms": ms}


async def describe(
    request: AltRequest, settings: Settings, caller: AltCaller, log: RequestLog
) -> dict[str, Any]:
    def refuse(reason: str) -> dict[str, Any]:
        log.write(
            request_id=request.requestId, mode="alt", model=settings.model,
            result="unsure", reason=reason, ms=0,
        )
        return failed(reason, settings.model)

    try:
        prepared = prepare_picture(request.image, settings.max_image_side)
    except ImageRefused as refused:
        return refuse(refused.reason)
    answer = await caller.describe(
        prepared.png, (prepared.width, prepared.height), (request.width, request.height), request.style
    )
    ok = answer.reason == labels.OK
    # The log gets how long the answer was and what happened, never the image or a word of it
    log.write(
        request_id=request.requestId, mode="alt", model=answer.model or settings.model,
        result=answer.kind if ok else "unsure", reason=answer.reason, ms=answer.ms,
        prompt_tokens=answer.prompt_tokens, completion_tokens=answer.completion_tokens,
        finish_reason=answer.finish_reason, schema_valid=answer.schema_valid,
        text_length=len(answer.text),
    )
    if not ok:
        return failed(answer.reason, answer.model or settings.model, answer.ms)
    return {
        "kind": answer.kind,
        "text": answer.text,
        "reason": answer.reason,
        "model": answer.model or settings.model,
        "ms": answer.ms,
    }
