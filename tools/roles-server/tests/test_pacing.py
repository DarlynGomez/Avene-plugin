"""The 10,000 tokens per 60 seconds limit, and the retries that only precompute runs get."""

import httpx

from roles_server.pacing import Pacer, estimate_tokens
from tests.helpers import FakeClock, Manager, chat_ok, client_for, log_lines, role_body


async def test_requests_under_the_limit_go_at_once():
    clock = FakeClock()
    pacer = Pacer(10000, clock)
    assert await pacer.acquire(4000, 5) is not None
    assert await pacer.acquire(4000, 5) is not None
    assert clock.slept == []


async def test_a_request_over_the_limit_waits_for_the_window_in_a_precompute_run():
    clock = FakeClock()
    pacer = Pacer(10000, clock)
    await pacer.acquire(6000, None)
    await pacer.acquire(6000, None)
    assert round(sum(clock.slept)) == 60


async def test_a_live_request_never_waits_longer_than_it_has():
    clock = FakeClock()
    pacer = Pacer(10000, clock)
    await pacer.acquire(9000, None)
    assert await pacer.acquire(3000, 4) is None
    assert clock.slept == []


async def test_the_reported_count_replaces_the_estimate():
    clock = FakeClock()
    pacer = Pacer(10000, clock)
    hold = await pacer.acquire(9000, None)
    assert hold is not None
    pacer.settle(hold, 1000)
    assert await pacer.acquire(8000, 1) is not None


async def test_a_request_bigger_than_the_whole_limit_goes_alone():
    pacer = Pacer(10000, FakeClock())
    assert await pacer.acquire(50000, 1) is not None


def test_an_image_is_estimated_by_its_patches():
    # 448 by 448 at 14 pixels a patch is 1024 patches, which matches the 1089 prompt tokens measured
    assert estimate_tokens(448, 448, 14, 64) == 1024 + 150 + 64


def test_a_live_request_over_the_limit_is_unsure_and_not_sent(tmp_path):
    # The first reply reports 1105 tokens used, so little of the 1200 is left for the second
    manager = Manager(lambda _r: httpx.Response(200, json=chat_ok({"label": "caption"}, prompt=1100)))
    with client_for(tmp_path, manager, GENAI_TOKENS_PER_MINUTE="1200") as client:
        first = client.post("/v1/role", json=role_body(requestId="a")).json()
        second = client.post("/v1/role", json=role_body(requestId="b")).json()
    assert first["reason"] == "ok"
    assert second["label"] == "unsure" and second["reason"] == "rate-limited"
    assert len(manager.requests) == 1
    assert log_lines(tmp_path)[-1]["reason"] == "rate-limited"


def test_a_429_in_precompute_is_retried_with_growing_waits_then_succeeds(tmp_path):
    answers = iter([429, 429, 200])

    def respond(_request):
        status = next(answers)
        return httpx.Response(429) if status == 429 else httpx.Response(200, json=chat_ok({"label": "heading"}))

    clock = FakeClock()
    manager = Manager(respond)
    with client_for(tmp_path, manager, clock) as client:
        body = client.post("/v1/role", json=role_body(mode="precompute")).json()
    assert body["label"] == "heading"
    assert clock.slept == [2.0, 4.0]
    assert len(manager.requests) == 3


def test_a_precompute_429_gives_up_after_three_retries(tmp_path):
    clock = FakeClock()
    manager = Manager(lambda _r: httpx.Response(429))
    with client_for(tmp_path, manager, clock) as client:
        body = client.post("/v1/role", json=role_body(mode="precompute")).json()
    assert body["label"] == "unsure" and body["reason"] == "rate-limited"
    assert clock.slept == [2.0, 4.0, 8.0] and len(manager.requests) == 4
    assert log_lines(tmp_path)[-1]["mode"] == "precompute"


def test_a_retry_after_header_sets_the_wait(tmp_path):
    answers = iter([httpx.Response(429, headers={"retry-after": "7"}), httpx.Response(200, json=chat_ok({"label": "body"}))])
    clock = FakeClock()
    with client_for(tmp_path, Manager(lambda _r: next(answers)), clock) as client:
        client.post("/v1/role", json=role_body(mode="precompute"))
    assert clock.slept == [7.0]


def test_a_live_429_never_retries_and_does_not_wait(tmp_path):
    clock = FakeClock()
    manager = Manager(lambda _r: httpx.Response(429))
    with client_for(tmp_path, manager, clock) as client:
        client.post("/v1/role", json=role_body())
    assert clock.slept == [] and len(manager.requests) == 1


def test_only_a_429_is_retried_even_in_precompute(tmp_path):
    clock = FakeClock()
    manager = Manager(lambda _r: httpx.Response(401))
    with client_for(tmp_path, manager, clock) as client:
        body = client.post("/v1/role", json=role_body(mode="precompute")).json()
    assert body["reason"] == "auth" and len(manager.requests) == 1 and clock.slept == []
