"""Plain advice for the two ways a model is most often set up wrongly, shown by the self-test and at start."""

from __future__ import annotations

from collections.abc import Iterable

from . import labels
from .config import Settings
from .model_call import Answer

THINKING_HINT = (
    "The replies were cut off. If GENAI_MODEL is a thinking model, add it to GENAI_THINKING_MODELS "
    "so it gets room to think and answer."
)
IMAGE_HINT = "The service reported very few prompt tokens for an image, so the image may not have reached the model."


def cut_off(settings: Settings, answer: Answer) -> bool:
    """An empty reply that stopped on the length limit, for a model not flagged as a thinking model."""
    return answer.reason == labels.EMPTY and answer.finish_reason == "length" and not settings.is_thinking


def hints_for(settings: Settings, answers: Iterable[Answer]) -> list[str]:
    replied = [a for a in answers if a.accepted]
    found = []
    if any(cut_off(settings, a) for a in replied):
        found.append(THINKING_HINT)
    if any(a.prompt_tokens < settings.min_image_prompt_tokens for a in replied):
        found.append(IMAGE_HINT)
    return found
