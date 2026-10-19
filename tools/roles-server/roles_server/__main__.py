"""python -m roles_server, reads .env beside it, refuses to listen anywhere but this computer."""

from __future__ import annotations

import os
import sys
from pathlib import Path

import uvicorn

from .app import create_app
from .config import ConfigError, Settings


def load_env_file(path: Path) -> None:
    """Fills in what the environment does not already hold. Values are never printed."""
    if not path.is_file():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line == "" or line.startswith("#") or "=" not in line:
            continue
        name, value = line.split("=", 1)
        os.environ.setdefault(name.strip(), value.strip().strip('"').strip("'"))


def main() -> int:
    load_env_file(Path(__file__).resolve().parent.parent / ".env")
    try:
        settings = Settings.from_env()
    except ConfigError as error:
        print(f"Cannot start: {error}", file=sys.stderr)
        return 1
    uvicorn.run(create_app(settings), host=settings.host, port=settings.port, access_log=False)
    return 0


if __name__ == "__main__":
    sys.exit(main())
