"""Every failure row of the roles spec, section 9, with a mocked GenAI Manager."""

import httpx
import pytest

from tests.helpers import Manager, chat_ok, client_for, log_lines, role_body


def raising(error: Exception):
    def respond(_request):
        raise error

    return respond


FAILURES = [
    ("unreachable", raising(httpx.ConnectError("refused"))),
    ("unreachable", lambda _r: httpx.Response(503, text="down")),
    ("auth", lambda _r: httpx.Response(401, json={"error": "bad key"})),
    ("auth", lambda _r: httpx.Response(403, json={"error": "no"})),
    ("rate-limited", lambda _r: httpx.Response(429, headers={"retry-after": "30"}, text="slow down")),
    ("timeout", raising(httpx.ReadTimeout("slow"))),
    ("malformed", lambda _r: httpx.Response(200, text="not json at all")),
    ("malformed", lambda _r: httpx.Response(200, json={"choices": []})),
    ("malformed", lambda _r: httpx.Response(200, json=chat_ok("The label is caption."))),
    ("malformed", lambda _r: httpx.Response(200, json=chat_ok('{"label": "caption", "extra": 1}'))),
    ("malformed", lambda _r: httpx.Response(200, json=chat_ok('{"label": 7}'))),
    ("malformed", lambda _r: httpx.Response(200, json=chat_ok("[]"))),
    ("malformed", lambda _r: httpx.Response(400, text="reasoning_effort not supported")),
    ("empty", lambda _r: httpx.Response(200, json=chat_ok("", finish="length"))),
    ("empty", lambda _r: httpx.Response(200, json={"choices": [{"message": {"content": None}, "finish_reason": "stop"}]})),
    ("label-outside-list", lambda _r: httpx.Response(200, json=chat_ok({"label": "banner"}))),
    ("label-outside-list", lambda _r: httpx.Response(200, json=chat_ok({"label": "Heading"}))),
]


@pytest.mark.parametrize(("reason", "respond"), FAILURES)
def test_a_failure_is_unsure_with_its_reason_and_never_an_error(tmp_path, reason, respond):
    manager = Manager(respond)
    with client_for(tmp_path, manager) as client:
        response = client.post("/v1/role", json=role_body())
    assert response.status_code == 200
    body = response.json()
    assert body["label"] == "unsure"
    assert body["reason"] == reason
    assert len(manager.requests) == 1, "a live request never retries"
    line = log_lines(tmp_path)[-1]
    assert line["reason"] == reason and line["result"] == "unsure" and line["mode"] == "live"


def test_a_valid_label_passes_through_with_the_model_name_and_latency(tmp_path):
    manager = Manager(lambda _r: httpx.Response(200, json=chat_ok({"label": "button text"}, model="reported:tag")))
    with client_for(tmp_path, manager) as client:
        body = client.post("/v1/role", json=role_body()).json()
    assert body["label"] == "button text" and body["reason"] == "ok"
    assert body["model"] == "reported:tag"
    assert isinstance(body["ms"], int)


@pytest.mark.parametrize("label", ["heading", "body", "caption", "label", "button text", "decorative", "unsure"])
def test_every_label_of_the_list_is_accepted(tmp_path, label):
    manager = Manager(lambda _r: httpx.Response(200, json=chat_ok({"label": label})))
    with client_for(tmp_path, manager) as client:
        body = client.post("/v1/role", json=role_body()).json()
    assert body["label"] == label and body["reason"] == "ok"


def test_text_too_small_to_send_makes_no_request(tmp_path):
    manager = Manager()
    with client_for(tmp_path, manager) as client:
        body = client.post("/v1/role", json=role_body(fontSizePx=10, exportScale=1.0)).json()
    assert body["label"] == "unsure" and body["reason"] == "too-small-to-send"
    assert manager.requests == []


def test_a_mixed_font_size_makes_no_request(tmp_path):
    manager = Manager()
    with client_for(tmp_path, manager) as client:
        body = client.post("/v1/role", json=role_body(fontSizePx=None)).json()
    assert body["reason"] == "mixed-size" and manager.requests == []


def test_a_request_that_cannot_be_read_is_still_answered(tmp_path):
    manager = Manager()
    with client_for(tmp_path, manager) as client:
        for bad in ({"nothing": 1}, {"image": 5, "exportScale": "wide"}):
            response = client.post("/v1/role", json=bad)
            assert response.status_code == 200
            assert response.json()["reason"] == "malformed"
        notjson = client.post("/v1/role", content=b"{oops", headers={"content-type": "application/json"})
        assert notjson.status_code == 200 and notjson.json()["label"] == "unsure"
    assert manager.requests == []


def test_an_undecodable_image_is_refused_without_a_request(tmp_path):
    manager = Manager()
    with client_for(tmp_path, manager) as client:
        body = client.post("/v1/role", json=role_body(image="aGVsbG8=")).json()
    assert body["reason"] == "malformed" and manager.requests == []
