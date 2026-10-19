import pytest

from roles_eval.measures import Row, compute, judge, percentile
from roles_eval.passmark import PassMark


def row(truth, label, reason="ok", seconds=1.0):
    return Row("n", 1, "r", truth, label, reason, "m", 0, seconds)


def mark(**patch):
    base = dict(agreed_on="2026-10-20", initials=["DG", "GT"], min_agreement=0.5, max_confident_wrong=0.5, max_fail_or_unsure=0.5, max_live_seconds=5.0, committed_at="x")
    return PassMark(**{**base, **patch})


# six answers: 2 right, 1 confident wrong, 2 unsure, 1 failed
ROWS = [
    row("heading", "heading", seconds=1.0),
    row("caption", "caption", seconds=2.0),
    row("body", "label", seconds=3.0),
    row("body", "unsure", seconds=4.0),
    row("body", "unsure", reason="timeout", seconds=5.0),
    row("body", "unsure", reason="unreachable", seconds=6.0),
]


def test_agreement_counts_unsure_as_not_agreeing():
    assert compute(ROWS)["agreement"] == pytest.approx(2 / 6)


def test_confident_wrong_is_among_answers_that_are_not_unsure():
    measures = compute(ROWS)
    assert measures["confidentAnswers"] == 3
    assert measures["confidentWrong"] == pytest.approx(1 / 3)


def test_fail_or_unsure_counts_any_reason_but_ok_and_any_unsure_label():
    assert compute(ROWS)["failOrUnsure"] == pytest.approx(3 / 6)
    assert compute([row("body", "unsure", reason="ok")])["failOrUnsure"] == 1.0


def test_an_unsure_truth_is_never_agreed_with():
    assert compute([row("unsure", "unsure")])["agreement"] == 0.0


def test_latency_median_p95_and_max():
    latency = compute(ROWS)["latencySeconds"]
    assert latency == {"median": 3.5, "p95": 6.0, "max": 6.0}
    twenty = [row("body", "body", seconds=float(s)) for s in range(1, 21)]
    assert compute(twenty)["latencySeconds"] == {"median": 10.5, "p95": 19.0, "max": 20.0}
    assert percentile([1.0], 0.95) == 1.0


def test_no_confident_answer_means_no_confident_wrong():
    assert compute([row("body", "unsure")])["confidentWrong"] == 0.0


def test_the_verdict_is_per_measure_and_overall():
    measures = compute(ROWS)
    verdict = judge(measures, mark(min_agreement=0.3, max_confident_wrong=0.4, max_fail_or_unsure=0.5, max_live_seconds=6.0))
    assert verdict == {"agreement": True, "confidentWrong": True, "failOrUnsure": True, "latency": True, "overall": True}
    verdict = judge(measures, mark(min_agreement=0.4, max_confident_wrong=0.3, max_fail_or_unsure=0.4, max_live_seconds=5.9))
    assert verdict == {"agreement": False, "confidentWrong": False, "failOrUnsure": False, "latency": False, "overall": False}
