"""POST /v1/role: check the request, prepare the crop, ask the model, and always answer."""

from __future__ import annotations

import hashlib
import re
import uuid
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from . import labels
from .config import Settings
from .imaging import ImageRefused, prepare_image
from .model_call import ModelCaller
from .requestlog import RequestLog


class RoleRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    requestId: str = Field(default_factory=lambda: uuid.uuid4().hex)
    image: str
    crop: Literal["node", "parent"] = "node"
    exportScale: float
    fontSizePx: float | None = None
    inputs: dict[str, Any] = Field(default_factory=dict)
    backgroundHex: str | None = None
    mode: Literal["live", "precompute"] = "live"


def unsure(reason: str, model: str | None, ms: int = 0) -> dict[str, Any]:
    return {"label": "unsure", "reason": reason, "model": model, "ms": ms}


def _save_crop(directory: str, request_id: str, png: bytes) -> None:
    safe = re.sub(r"[^A-Za-z0-9_-]", "_", request_id)[:80] or "crop"
    path = Path(directory)
    path.mkdir(parents=True, exist_ok=True)
    (path / f"{safe}.png").write_bytes(png)


async def classify(
    request: RoleRequest, settings: Settings, caller: ModelCaller, log: RequestLog
) -> dict[str, Any]:
    digest = hashlib.sha256(request.image.encode()).hexdigest()[:16]

    def refuse(reason: str) -> dict[str, Any]:
        log.write(
            request_id=request.requestId, mode=request.mode, model=settings.model,
            result="unsure", reason=reason, ms=0, image_sha256=digest,
        )
        return unsure(reason, settings.model)

    if request.fontSizePx is None:
        return refuse(labels.MIXED_SIZE)
    if request.exportScale <= 0 or request.fontSizePx <= 0:
        return refuse(labels.MALFORMED)
    try:
        prepared = prepare_image(
            request.image, request.backgroundHex, request.fontSizePx, request.exportScale,
            settings.max_image_side, settings.min_text_px,
        )
    except ImageRefused as refused:
        return refuse(refused.reason)
    if request.mode == "precompute" and settings.crop_dir:
        _save_crop(settings.crop_dir, request.requestId, prepared.png)
    answer = await caller.ask(
        prepared.png, (prepared.width, prepared.height), labels.INSTRUCTION, request.mode, request.inputs
    )
    label = answer.label if answer.reason == labels.OK and answer.label else "unsure"
    log.write(
        request_id=request.requestId, mode=request.mode, model=answer.model or settings.model,
        result=label, reason=answer.reason, ms=answer.ms, image_sha256=digest,
        prompt_tokens=answer.prompt_tokens, completion_tokens=answer.completion_tokens,
        finish_reason=answer.finish_reason, schema_valid=answer.schema_valid,
    )
    return {"label": label, "reason": answer.reason, "model": answer.model or settings.model, "ms": answer.ms}
