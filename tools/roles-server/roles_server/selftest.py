"""GET /selftest and the start-up warm-up: built-in test images through the real path."""

from __future__ import annotations

import io
from typing import Any

from PIL import Image, ImageDraw, ImageFont

from . import labels
from .config import Settings
from .model_call import Answer, ModelCaller
from .requestlog import RequestLog

PROBE_INSTRUCTION = "Describe this image in a paragraph."


def _png(image: Image.Image) -> bytes:
    out = io.BytesIO()
    image.save(out, format="PNG")
    return out.getvalue()


def test_images() -> list[tuple[str, bytes, tuple[int, int]]]:
    """Three small synthetic crops: a button, a large heading and a small grey note."""
    button = Image.new("RGB", (224, 96), (37, 99, 235))
    ImageDraw.Draw(button).text((112, 48), "Sign up", fill="white", anchor="mm", font=ImageFont.load_default(size=28))
    heading = Image.new("RGB", (320, 80), "white")
    ImageDraw.Draw(heading).text((160, 40), "Welcome back", fill="black", anchor="mm", font=ImageFont.load_default(size=40))
    note = Image.new("RGB", (320, 48), "white")
    ImageDraw.Draw(note).text((160, 24), "Pickup at 4:30 pm", fill=(120, 120, 120), anchor="mm", font=ImageFont.load_default(size=16))
    return [(name, _png(img), img.size) for name, img in (("button", button), ("heading", heading), ("note", note))]


async def warm_up(settings: Settings, caller: ModelCaller, log: RequestLog) -> Answer:
    """One small request so the model is loaded, with the long allowance, logged with how long it took."""
    _, png, size = test_images()[0]
    answer = await caller.ask(png, size, labels.INSTRUCTION, "warmup")
    log.write(
        request_id="warmup", mode="warmup", model=answer.model or settings.model,
        result=answer.label, reason=answer.reason, ms=answer.ms,
        prompt_tokens=answer.prompt_tokens, completion_tokens=answer.completion_tokens,
        finish_reason=answer.finish_reason, schema_valid=answer.schema_valid,
    )
    return answer


async def run_selftest(settings: Settings, caller: ModelCaller, log: RequestLog) -> dict[str, Any]:
    results = []
    answers: list[Answer] = []
    for name, png, size in test_images():
        answer = await caller.ask(png, size, labels.INSTRUCTION, "selftest")
        answers.append(answer)
        results.append({"name": name, "label": answer.label, "reason": answer.reason, "ms": answer.ms})
        log.write(
            request_id=f"selftest-{name}", mode="selftest", model=answer.model or settings.model,
            result=answer.label, reason=answer.reason, ms=answer.ms,
            prompt_tokens=answer.prompt_tokens, completion_tokens=answer.completion_tokens,
            finish_reason=answer.finish_reason, schema_valid=answer.schema_valid,
        )
    # A free text question that must still come back as the schema, or the gateway is not enforcing it
    _, png, size = test_images()[0]
    probe = await caller.ask(png, size, PROBE_INSTRUCTION, "selftest")
    log.write(
        request_id="selftest-probe", mode="selftest", model=probe.model or settings.model,
        result=probe.label, reason=probe.reason, ms=probe.ms, prompt_tokens=probe.prompt_tokens,
        completion_tokens=probe.completion_tokens, finish_reason=probe.finish_reason,
        schema_valid=probe.schema_valid,
    )
    every = [*answers, probe]
    replied = [a for a in every if a.accepted]
    schema_enforced = bool(replied) and all(a.schema_valid for a in replied)
    image_input_ok = all(a.accepted for a in every)
    model = next((a.model for a in replied if a.model), settings.model)
    failures = sorted({a.reason for a in every if a.reason != labels.OK})
    return {
        "status": "pass" if not failures else "fail",
        "model": model,
        "image_input_ok": image_input_ok,
        "schema_enforced": schema_enforced,
        "latency_ms": sum(a.ms for a in every),
        "failures": failures,
        "results": results,
        "probe": {"reason": probe.reason, "schema_valid": probe.schema_valid},
    }
