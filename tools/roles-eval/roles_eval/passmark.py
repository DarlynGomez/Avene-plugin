"""The pass mark, which must be in git, complete and older than the run, so it was fixed before any result existed."""

from __future__ import annotations

import json
import re
import subprocess
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path

from .errors import Refusal

RATES = ("minAgreement", "maxConfidentWrong", "maxFailOrUnsure")


@dataclass(frozen=True)
class PassMark:
    agreed_on: str
    initials: list[str]
    min_agreement: float
    max_confident_wrong: float
    max_fail_or_unsure: float
    max_live_seconds: float
    committed_at: str

    def as_dict(self) -> dict[str, object]:
        return {
            "agreedOn": self.agreed_on, "initials": self.initials, "minAgreement": self.min_agreement,
            "maxConfidentWrong": self.max_confident_wrong, "maxFailOrUnsure": self.max_fail_or_unsure,
            "maxLiveSeconds": self.max_live_seconds, "committedAt": self.committed_at,
        }


def _git(path: Path, *args: str) -> tuple[int, str]:
    try:
        done = subprocess.run(["git", "-C", str(path.parent), *args], capture_output=True, text=True, check=False)
    except OSError:
        raise Refusal("git is not available, so the pass mark cannot be checked.") from None
    return done.returncode, done.stdout.strip()


def _number(data: dict, name: str, upper: float | None) -> float:
    value = data.get(name)
    if isinstance(value, bool) or not isinstance(value, (int, float)) or value < 0 or (upper is not None and value > upper):
        raise Refusal(f"The pass mark needs a number for {name}" + (f" between 0 and {upper:g}." if upper else " above 0."))
    return float(value)


def load_passmark(path: Path, started: datetime) -> PassMark:
    if not path.is_file():
        raise Refusal(f"The pass mark file {path} does not exist.")
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            raise ValueError
        date.fromisoformat(str(data.get("agreedOn")))
    except ValueError:
        raise Refusal("The pass mark must be a JSON object with agreedOn as YYYY-MM-DD.") from None
    initials = data.get("initials")
    if not isinstance(initials, list) or len(initials) < 2 or not all(isinstance(i, str) and re.fullmatch(r"[A-Za-z]{2,4}", i.strip()) for i in initials):
        raise Refusal("The pass mark needs the initials of both people who agreed it.")
    marks = {name: _number(data, name, 1.0) for name in RATES}
    seconds = _number(data, "maxLiveSeconds", None)
    if seconds <= 0:
        raise Refusal("The pass mark needs a number for maxLiveSeconds above 0.")
    if _git(path, "rev-parse", "--is-inside-work-tree")[0] != 0:
        raise Refusal("The pass mark is not in a git repository.")
    code, committed = _git(path, "log", "-1", "--format=%cI", "--", path.name)
    if code != 0 or committed == "":
        raise Refusal("The pass mark is not committed in git.")
    if _git(path, "status", "--porcelain", "--", path.name)[1] != "":
        raise Refusal("The pass mark has changes that are not committed.")
    if datetime.fromisoformat(committed) >= started:
        raise Refusal(f"The pass mark was committed at {committed}, which is not before this run started.")
    return PassMark(str(data["agreedOn"]), [i.strip() for i in initials], marks["minAgreement"], marks["maxConfidentWrong"], marks["maxFailOrUnsure"], seconds, committed)
