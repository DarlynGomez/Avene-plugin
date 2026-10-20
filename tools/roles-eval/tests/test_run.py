import csv
import json

import httpx
import pytest

from roles_eval.cli import main
from tests.helpers import IMAGE_B64, commit_passmark, fake_server, ticking, write_crops, write_truth
from datetime import datetime, timezone

TRUTH = {"1:1": "heading", "1:2": "caption", "1:3": "body", "1:4": "label"}
ANSWERS = {
    "1:1": ("heading", "ok"),
    "1:2": ("caption", "ok"),
    "1:3": ("label", "ok"),
    "1:4": ("unsure", "timeout"),
}


@pytest.fixture
def setup(tmp_path):
    write_crops(tmp_path / "crops", TRUTH)
    write_truth(tmp_path / "truth.csv", TRUTH)
    passmark = commit_passmark(tmp_path / "repo")
    return tmp_path, passmark


def args(tmp_path, passmark, *extra):
    return ["--crops", str(tmp_path / "crops"), "--truth", str(tmp_path / "truth.csv"), "--passmark", str(passmark),
            "--out", str(tmp_path / "out"), "--label", "qwen node", *extra]


NOW = lambda: datetime(2026, 10, 21, tzinfo=timezone.utc)


def run(tmp_path, passmark, transport, *extra):
    return main(args(tmp_path, passmark, *extra), transport=transport, now=NOW, clock=ticking(0.5))


def summary_of(tmp_path):
    (path,) = (tmp_path / "out").glob("summary-*.json")
    return json.loads(path.read_text())


def test_a_run_writes_results_and_a_summary_with_every_measure(setup):
    tmp_path, passmark = setup
    seen = []
    code = run(tmp_path, passmark, fake_server(ANSWERS, seen=seen))
    summary = summary_of(tmp_path)
    assert summary["measures"]["agreement"] == 0.5
    assert summary["measures"]["confidentWrong"] == pytest.approx(1 / 3)
    assert summary["measures"]["failOrUnsure"] == 0.25
    assert summary["measures"]["latencySeconds"] == {"median": 0.5, "p95": 0.5, "max": 0.5}
    assert summary["elements"] == 4 and summary["answers"] == 4 and summary["model"] == "frozen:tag"
    assert summary["passMark"]["initials"] == ["DG", "GT"] and summary["passMark"]["maxLiveSeconds"] == 5.0
    assert summary["verdict"] == {"agreement": True, "confidentWrong": True, "failOrUnsure": True, "latency": True, "overall": True}
    assert code == 0
    (results,) = (tmp_path / "out").glob("results-qwen_node-*.csv")
    rows = list(csv.DictReader(results.open()))
    assert [r["node id"] for r in rows] == ["1:1", "1:2", "1:3", "1:4"]
    assert [r["agrees"] for r in rows] == ["yes", "yes", "no", "no"]
    assert {b["mode"] for b in seen} == {"live"} and seen[0]["image"] == IMAGE_B64 and seen[0]["fontSizePx"] == 16


def test_repeats_ask_again_and_pool_the_answers(setup):
    tmp_path, passmark = setup
    assert run(tmp_path, passmark, fake_server(ANSWERS), "--repeats", "3") == 0
    assert summary_of(tmp_path)["answers"] == 12
    (results,) = (tmp_path / "out").glob("results-*.csv")
    assert len(list(csv.DictReader(results.open()))) == 12


def test_a_failed_measure_gives_exit_code_one_and_still_reports(setup):
    tmp_path, passmark = setup
    slow = main(args(tmp_path, passmark), transport=fake_server(ANSWERS), now=NOW, clock=ticking(6.0))
    assert slow == 1
    verdict = summary_of(tmp_path)["verdict"]
    assert verdict["latency"] is False and verdict["overall"] is False


def test_a_server_error_or_unreadable_reply_counts_as_a_failure(setup):
    tmp_path, passmark = setup

    def handler(request):
        if request.url.path == "/selftest":
            return httpx.Response(200, json={"status": "pass", "model": "m", "failures": []})
        node = json.loads(request.content)["requestId"].split("-")[0]
        return {"1:1": httpx.Response(500), "1:2": httpx.Response(200, text="nope"), "1:3": httpx.Response(200, json={"label": "title", "reason": "ok"})}.get(
            node, httpx.Response(200, json={"label": "label", "reason": "ok", "model": "m", "ms": 1}))

    run(tmp_path, passmark, httpx.MockTransport(handler))
    (results,) = (tmp_path / "out").glob("results-*.csv")
    reasons = [r["reason"] for r in csv.DictReader(results.open())]
    assert reasons == ["http-500", "malformed", "malformed", "ok"]


def test_a_timeout_is_recorded_as_a_client_timeout(setup):
    tmp_path, passmark = setup

    def handler(request):
        if request.url.path == "/selftest":
            return httpx.Response(200, json={"status": "pass", "model": "m", "failures": []})
        raise httpx.ReadTimeout("slow")

    run(tmp_path, passmark, httpx.MockTransport(handler))
    (results,) = (tmp_path / "out").glob("results-*.csv")
    assert {r["reason"] for r in csv.DictReader(results.open())} == {"client-timeout"}


def test_no_key_and_no_image_in_any_output_file(setup, monkeypatch):
    tmp_path, passmark = setup
    monkeypatch.setenv("GENAI_API_KEY", "sk-SECRET-should-never-appear")
    run(tmp_path, passmark, fake_server(ANSWERS))
    for path in (tmp_path / "out").iterdir():
        text = path.read_text()
        assert "sk-SECRET" not in text and IMAGE_B64 not in text and "iVBOR" not in text and "base64" not in text


def test_the_selftest_comes_first_and_a_failure_refuses_the_run(setup, capsys):
    tmp_path, passmark = setup
    bad = {"status": "fail", "failures": ["auth"], "hints": ["Check the key."]}
    seen = []
    assert run(tmp_path, passmark, fake_server(ANSWERS, selftest=bad, seen=seen)) == 2
    assert "self-test did not pass (auth). Check the key." in capsys.readouterr().err
    assert seen == [] and not (tmp_path / "out").exists()


def test_an_unreachable_server_refuses_the_run(setup):
    tmp_path, passmark = setup

    def down(_request):
        raise httpx.ConnectError("refused")

    assert run(tmp_path, passmark, httpx.MockTransport(down)) == 2
    assert not (tmp_path / "out").exists()
