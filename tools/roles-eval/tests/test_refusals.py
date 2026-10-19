import json
from datetime import datetime, timezone

import pytest

from roles_eval.cli import main
from tests.helpers import commit_passmark, fake_server, write_crops, write_truth, PASSING

TRUTH = {"1:1": "heading", "1:2": "caption"}
ANSWERS = {"1:1": ("heading", "ok"), "1:2": ("caption", "ok")}
NOW = lambda: datetime(2026, 10, 21, tzinfo=timezone.utc)


def attempt(tmp_path, passmark, truth=None):
    seen = []
    code = main(
        ["--crops", str(tmp_path / "crops"), "--truth", str(truth or tmp_path / "truth.csv"), "--passmark", str(passmark), "--out", str(tmp_path / "out")],
        transport=fake_server(ANSWERS, seen=seen), now=NOW,
    )
    assert not (tmp_path / "out").exists() and seen == []
    return code


@pytest.fixture
def base(tmp_path):
    write_crops(tmp_path / "crops", TRUTH)
    write_truth(tmp_path / "truth.csv", TRUTH)
    return tmp_path


def refused(capsys, text):
    assert text in capsys.readouterr().err


def test_a_missing_pass_mark_refuses(base, capsys):
    assert attempt(base, base / "nope.json") == 2
    refused(capsys, "does not exist")


def test_an_uncommitted_pass_mark_refuses(base, capsys):
    assert attempt(base, commit_passmark(base / "repo", commit=False)) == 2
    refused(capsys, "not committed")


def test_a_pass_mark_edited_after_its_commit_refuses(base, capsys):
    path = commit_passmark(base / "repo")
    path.write_text(json.dumps({**PASSING, "minAgreement": 0.1}))
    assert attempt(base, path) == 2
    refused(capsys, "changes that are not committed")


def test_a_pass_mark_committed_after_the_run_started_refuses(base, capsys):
    path = commit_passmark(base / "repo", when="2026-10-22T10:00:00+00:00")
    assert attempt(base, path) == 2
    refused(capsys, "not before this run started")


def test_a_pass_mark_outside_git_refuses(base, capsys):
    path = base / "loose" / "passmark.json"
    path.parent.mkdir()
    path.write_text(json.dumps(PASSING))
    assert attempt(base, path) == 2
    refused(capsys, "git")


@pytest.mark.parametrize(
    "patch,text",
    [
        ({"initials": ["DG"]}, "initials"),
        ({"initials": ["DG", ""]}, "initials"),
        ({"agreedOn": "20 Oct"}, "YYYY-MM-DD"),
        ({"minAgreement": 1.5}, "minAgreement"),
        ({"maxLiveSeconds": 0}, "maxLiveSeconds"),
        ({"maxConfidentWrong": "low"}, "maxConfidentWrong"),
    ],
)
def test_an_incomplete_pass_mark_refuses(base, capsys, patch, text):
    path = commit_passmark(base / "repo", {**PASSING, **patch})
    assert attempt(base, path) == 2
    refused(capsys, text)


def test_a_truth_row_without_a_resolved_label_refuses(base, capsys):
    (base / "truth.csv").write_text("node id,rater 1,rater 2,resolved,note\n1:1,heading,heading,heading,\n1:2,caption,body,,disagree\n")
    assert attempt(base, commit_passmark(base / "repo")) == 2
    refused(capsys, "no resolved label")


def test_a_label_outside_the_seven_refuses(base, capsys):
    (base / "truth.csv").write_text("node id,rater 1,rater 2,resolved,note\n1:1,x,x,title,\n")
    assert attempt(base, commit_passmark(base / "repo")) == 2
    refused(capsys, "not one of the seven")


def test_a_truth_element_without_a_crop_refuses(base, capsys):
    write_truth(base / "truth.csv", {**TRUTH, "9:9": "body"})
    assert attempt(base, commit_passmark(base / "repo")) == 2
    refused(capsys, "No crop for 1 elements")


def test_two_crops_for_one_node_refuse(base, capsys):
    (base / "crops" / "1_1-1700000000000-2.png").write_bytes(b"x")
    (base / "crops" / "1_1-1700000000000-2.json").write_text(json.dumps({
        "requestId": "1:1-1700000000000-2", "crop": "node", "exportScale": 1, "fontSizePx": 16, "inputs": {}, "backgroundHex": None}))
    assert attempt(base, commit_passmark(base / "repo")) == 2
    refused(capsys, "More than one crop for node 1:1")
