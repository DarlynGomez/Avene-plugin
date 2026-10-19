"""Settings, read from the environment only. Nothing here holds a key or a model name."""

from __future__ import annotations

import os
from dataclasses import dataclass, field

LOOPBACK_HOSTS = {"127.0.0.1", "localhost", "::1"}


class ConfigError(Exception):
    pass


def _number(env: dict[str, str], name: str, default: float) -> float:
    raw = env.get(name, "").strip()
    if raw == "":
        return default
    try:
        value = float(raw)
    except ValueError as error:
        raise ConfigError(f"{name} is not a number") from error
    if value <= 0:
        raise ConfigError(f"{name} must be above zero")
    return value


@dataclass(frozen=True)
class Settings:
    base_url: str
    api_key: str = field(repr=False)
    model: str
    timeout_seconds: float = 4.0
    precompute_timeout_seconds: float = 30.0
    warmup_timeout_seconds: float = 60.0
    thinking_models: frozenset[str] = frozenset()
    max_tokens: int = 64
    thinking_max_tokens: int = 1500
    seed: int = 7
    host: str = "127.0.0.1"
    port: int = 8750
    max_image_side: int = 1024
    min_text_px: float = 14.0
    tokens_per_minute: int = 10000
    image_patch_px: int = 14
    log_path: str = "roles-server.log.jsonl"
    crop_dir: str | None = None

    @property
    def is_thinking(self) -> bool:
        return self.model in self.thinking_models

    @staticmethod
    def from_env(env: dict[str, str] | None = None) -> "Settings":
        env = dict(os.environ if env is None else env)
        missing = [n for n in ("GENAI_BASE_URL", "GENAI_API_KEY", "GENAI_MODEL") if not env.get(n)]
        if missing:
            raise ConfigError(f"Set these in the environment or in .env: {', '.join(missing)}")
        host = env.get("ROLES_HOST", "127.0.0.1").strip()
        if host not in LOOPBACK_HOSTS:
            raise ConfigError("ROLES_HOST must be a loopback address, this server never listens elsewhere")
        thinking = frozenset(m.strip() for m in env.get("GENAI_THINKING_MODELS", "").split(",") if m.strip())
        return Settings(
            base_url=env["GENAI_BASE_URL"].rstrip("/"),
            api_key=env["GENAI_API_KEY"],
            model=env["GENAI_MODEL"],
            timeout_seconds=_number(env, "GENAI_TIMEOUT_SECONDS", 4.0),
            precompute_timeout_seconds=_number(env, "GENAI_PRECOMPUTE_TIMEOUT_SECONDS", 30.0),
            warmup_timeout_seconds=_number(env, "GENAI_WARMUP_TIMEOUT_SECONDS", 60.0),
            thinking_models=thinking,
            max_tokens=int(_number(env, "GENAI_MAX_TOKENS", 64)),
            thinking_max_tokens=max(1000, int(_number(env, "GENAI_THINKING_MAX_TOKENS", 1500))),
            seed=int(_number(env, "GENAI_SEED", 7)),
            host=host,
            port=int(_number(env, "ROLES_PORT", 8750)),
            max_image_side=int(_number(env, "ROLES_MAX_IMAGE_SIDE", 1024)),
            min_text_px=_number(env, "ROLES_MIN_TEXT_PX", 14),
            tokens_per_minute=int(_number(env, "GENAI_TOKENS_PER_MINUTE", 10000)),
            image_patch_px=int(_number(env, "GENAI_IMAGE_PATCH_PX", 14)),
            log_path=env.get("ROLES_LOG_PATH", "roles-server.log.jsonl"),
            crop_dir=env.get("ROLES_CROP_DIR") or None,
        )
