"""POST /v1/draft: the path, the text model setting, the shared window, the one retry, and a log with no text."""

import json

import httpx
import pytest

from roles_server.app import PATHS
from roles_server.config import Settings
from tests.helpers import KEY, MODEL, FakeClock, Manager, chat_ok, client_for, log_lines, role_body

TEXT_MODEL = "text-model:test-frozen"
SENTINEL = "SECRET-SENTENCE-MARKER"
LINES = ['Detected: "{L1}" on {S1}: measured {r1}:1, needs {q1}:1 ({sc}).', "Decision: {w1}"]
REPLY = ["Detected: The text {L1} on {S1} measures {r1}:1 and needs {q1}:1 ({sc}).", "Decision: {w1}"]


def body(**overrides):
    return {"requestId": "d-1", "audience": "pm", "blockId": "left", "lines": LINES, **overrides}


def ok(sentences=REPLY, **usage):
    return httpx.Response(200, json=chat_ok({"sentences": sentences}, **usage))


def sequence(*responses):
    queue = list(responses)
    return Manager(lambda _request: queue.pop(0) if len(queue) > 1 else queue[0])


def draft_client(tmp_path, manager, clock=None, **env):
    return client_for(tmp_path, manager, clock, GENAI_TEXT_MODEL=TEXT_MODEL, **env)


def test_the_path_is_one_the_plugin_may_reach():
    assert "/v1/draft" in PATHS


def test_the_null_origin_passes_preflight_and_a_real_request_carries_the_header(tmp_path):
    with draft_client(tmp_path, Manager(lambda _r: ok())) as client:
        headers = {
            "origin": "null",
            "access-control-request-method": "POST",
            "access-control-request-headers": "content-type",
        }
        preflight = client.options("/v1/draft", headers=headers)
        assert preflight.status_code == 204
        assert preflight.headers["access-control-allow-origin"] == "null"
        real = client.post("/v1/draft", json=body(), headers={"origin": "null"})
        assert real.status_code == 200 and real.headers["access-control-allow-origin"] == "null"
        other = client.post("/v1/draft", json=body(), headers={"origin": "https://evil.example"})
        assert other.status_code == 403


def test_a_good_reply_comes_back_as_sentences_with_the_block_it_was_for(tmp_path):
    manager = Manager(lambda _r: ok())
    with draft_client(tmp_path, manager) as client:
        result = client.post("/v1/draft", json=body()).json()
    assert result["sentences"] == REPLY
    assert (result["reason"], result["model"], result["blockId"]) == ("ok", MODEL, "left")


def test_the_request_to_the_model_is_text_only_strict_and_low_effort(tmp_path):
    manager = Manager(lambda _r: ok())
    with draft_client(tmp_path, manager, GENAI_TEXT_MAX_TOKENS="900") as client:
        client.post("/v1/draft", json=body())
    [payload] = manager.payloads()
    assert payload["model"] == TEXT_MODEL
    assert payload["reasoning_effort"] == "low"
    assert payload["max_tokens"] == 900
    assert all(isinstance(m["content"], str) for m in payload["messages"])
    schema = payload["response_format"]["json_schema"]
    assert schema["strict"] is True
    assert schema["schema"]["properties"]["sentences"]["type"] == "array"
    assert schema["schema"]["additionalProperties"] is False
    assert "\n".join(LINES) in payload["messages"][1]["content"]
    assert "image_url" not in json.dumps(payload)


def test_each_reader_gets_its_own_instruction(tmp_path):
    manager = Manager(lambda _r: ok())
    with draft_client(tmp_path, manager) as client:
        for audience in ("developer", "pm", "higherUp", "client"):
            client.post("/v1/draft", json=body(audience=audience))
    system = [p["messages"][0]["content"] for p in manager.payloads()]
    assert len(set(system)) == 4


class TestTextSettingIsItsOwn:
    def test_with_no_text_model_a_draft_is_not_available_and_nothing_is_sent(self, tmp_path):
        manager = Manager(lambda _r: ok())
        with client_for(tmp_path, manager) as client:
            result = client.post("/v1/draft", json=body()).json()
        assert (result["sentences"], result["reason"]) == ([], "not-configured")
        assert manager.requests == []

    def test_a_role_request_still_uses_the_vision_model_when_a_text_model_is_set(self, tmp_path):
        manager = Manager(lambda r: ok() if b"sentences" in r.content or b"draft" in r.content else httpx.Response(200, json=chat_ok({"label": "caption"})))
        with draft_client(tmp_path, manager) as client:
            client.post("/v1/role", json=role_body())
            client.post("/v1/draft", json=body())
        models = [p["model"] for p in manager.payloads()]
        assert models == [MODEL, TEXT_MODEL]

    def test_the_vision_models_thinking_setting_does_not_change_the_text_request(self, tmp_path):
        manager = Manager(lambda _r: ok())
        with draft_client(tmp_path, manager, GENAI_THINKING_MODELS=MODEL, GENAI_THINKING_MAX_TOKENS="4000", GENAI_MAX_TOKENS="77") as client:
            client.post("/v1/draft", json=body())
        [payload] = manager.payloads()
        assert payload["max_tokens"] == 1500 and payload["reasoning_effort"] == "low"

    def test_the_settings_read_independently(self, tmp_path):
        base = {"GENAI_BASE_URL": "http://x/v1", "GENAI_API_KEY": KEY, "GENAI_MODEL": MODEL}
        assert Settings.from_env(base).text_model is None
        both = Settings.from_env({**base, "GENAI_TEXT_MODEL": TEXT_MODEL})
        assert (both.model, both.text_model) == (MODEL, TEXT_MODEL)
        assert Settings.from_env({**base, "GENAI_TEXT_MODEL": "  "}).text_model is None


class TestWindow:
    def test_a_draft_that_reports_a_big_count_holds_back_an_image_call(self, tmp_path):
        manager = Manager(lambda r: ok(prompt=9900, completion=0) if b"Lines:" in r.content else httpx.Response(200, json=chat_ok({"label": "caption"})))
        with draft_client(tmp_path, manager, clock=FakeClock()) as client:
            client.post("/v1/draft", json=body())
            role = client.post("/v1/role", json=role_body()).json()
        assert role["reason"] == "rate-limited" and len(manager.requests) == 1

    def test_an_image_call_that_used_the_window_makes_a_draft_wait_for_it(self, tmp_path):
        clock = FakeClock()
        manager = Manager(lambda r: httpx.Response(200, json=chat_ok({"label": "caption"}, prompt=9900, completion=0)) if b"image_url" in r.content else ok())
        with draft_client(tmp_path, manager, clock) as client:
            client.post("/v1/role", json=role_body())
            result = client.post("/v1/draft", json=body()).json()
        assert result["reason"] == "ok"
        assert round(sum(clock.slept)) == 60

    def test_a_failed_call_still_holds_its_worst_case(self, tmp_path):
        clock = FakeClock()
        manager = Manager(lambda _r: httpx.Response(503))
        with draft_client(tmp_path, manager, clock, GENAI_TEXT_MAX_TOKENS="6000") as client:
            first = client.post("/v1/draft", json=body()).json()
            assert clock.slept == []
            second = client.post("/v1/draft", json=body()).json()
        assert (first["reason"], second["reason"]) == ("unreachable", "unreachable")
        assert round(sum(clock.slept)) == 60

    def test_a_reply_settles_the_hold_to_what_was_used(self, tmp_path):
        clock = FakeClock()
        manager = Manager(lambda _r: ok(prompt=100, completion=50))
        with draft_client(tmp_path, manager, clock, GENAI_TEXT_MAX_TOKENS="6000") as client:
            for _ in range(3):
                assert client.post("/v1/draft", json=body()).json()["reason"] == "ok"
        assert clock.slept == []

    @pytest.mark.parametrize(
        "env,lines",
        [
            ({"GENAI_TEXT_MAX_TOKENS": "10000"}, LINES),
            ({}, ["x" * 40000]),
        ],
    )
    def test_a_call_that_could_never_fit_is_refused_before_it_is_sent(self, tmp_path, env, lines):
        clock = FakeClock()
        manager = Manager(lambda r: httpx.Response(200, json=chat_ok({"label": "caption"})) if b"image_url" in r.content else ok())
        with draft_client(tmp_path, manager, clock, **env) as client:
            result = client.post("/v1/draft", json=body(lines=lines)).json()
            after = client.post("/v1/role", json=role_body()).json()
        assert (result["sentences"], result["reason"]) == ([], "too-large")
        assert clock.slept == [] and after["reason"] == "ok"
        assert len(manager.requests) == 1  # only the image call

    def test_one_call_is_made_for_one_block(self, tmp_path):
        manager = Manager(lambda _r: ok())
        with draft_client(tmp_path, manager) as client:
            client.post("/v1/draft", json=body())
        assert len(manager.requests) == 1


class TestEmptyReply:
    def test_an_empty_reply_is_tried_once_more_and_the_second_can_be_used(self, tmp_path):
        manager = sequence(httpx.Response(200, json=chat_ok("")), ok())
        with draft_client(tmp_path, manager) as client:
            result = client.post("/v1/draft", json=body()).json()
        assert (result["reason"], result["sentences"]) == ("ok", REPLY)
        assert len(manager.requests) == 2

    def test_an_empty_list_counts_as_empty(self, tmp_path):
        manager = sequence(ok([]), ok())
        with draft_client(tmp_path, manager) as client:
            assert client.post("/v1/draft", json=body()).json()["reason"] == "ok"
        assert len(manager.requests) == 2

    def test_two_empty_replies_end_as_empty_with_no_third_try(self, tmp_path):
        manager = sequence(httpx.Response(200, json=chat_ok("")))
        with draft_client(tmp_path, manager) as client:
            result = client.post("/v1/draft", json=body()).json()
        assert (result["reason"], result["sentences"]) == ("empty", [])
        assert len(manager.requests) == 2

    def test_the_retry_reserves_its_own_worst_case(self, tmp_path):
        clock = FakeClock()
        manager = sequence(httpx.Response(200, json=chat_ok("", prompt=0, completion=0)))
        with draft_client(tmp_path, manager, clock, GENAI_TEXT_MAX_TOKENS="6000") as client:
            client.post("/v1/draft", json=body())
        assert round(sum(clock.slept)) == 60

    @pytest.mark.parametrize(
        "response,reason",
        [
            (httpx.Response(200, json=chat_ok("not json")), "malformed"),
            (httpx.Response(200, json=chat_ok({"sentences": ["a"], "extra": 1})), "malformed"),
            (httpx.Response(200, json=chat_ok({"sentences": [1]})), "malformed"),
            (httpx.Response(200, json=chat_ok({"sentences": ["  "]})), "malformed"),
            (httpx.Response(401), "auth"),
            (httpx.Response(429), "rate-limited"),
            (httpx.Response(500), "unreachable"),
            (httpx.Response(400), "malformed"),
        ],
    )
    def test_anything_else_is_a_typed_reason_and_is_not_tried_again(self, tmp_path, response, reason):
        manager = sequence(response)
        with draft_client(tmp_path, manager) as client:
            result = client.post("/v1/draft", json=body()).json()
        assert (result["sentences"], result["reason"]) == ([], reason)
        assert len(manager.requests) == 1

    def test_a_timeout_is_a_typed_reason(self, tmp_path):
        def slow(request):
            raise httpx.ReadTimeout("slow", request=request)

        with draft_client(tmp_path, Manager(slow)) as client:
            assert client.post("/v1/draft", json=body()).json()["reason"] == "timeout"

    @pytest.mark.parametrize(
        "bad",
        [{"audience": "boss"}, {"lines": []}, {"lines": "text"}, {"lines": [3]}],
    )
    def test_a_request_that_cannot_be_read_is_answered_with_a_typed_reason(self, tmp_path, bad):
        manager = Manager(lambda _r: ok())
        with draft_client(tmp_path, manager) as client:
            response = client.post("/v1/draft", json=body(**bad))
        assert response.status_code == 200
        assert (response.json()["sentences"], response.json()["reason"]) == ([], "malformed")
        assert manager.requests == []


class TestLog:
    def test_the_log_holds_lengths_status_and_token_counts_and_no_text(self, tmp_path):
        lines = [f"Detected: {SENTINEL} {{L1}}", "Decision: {w1}"]
        manager = Manager(lambda _r: ok([f"Detected: {SENTINEL}-REPLY {{L1}}", "Decision: {w1}"], prompt=210, completion=40))
        with draft_client(tmp_path, manager) as client:
            client.post("/v1/draft", json=body(lines=lines, blockId=f"{SENTINEL}-block"))
        raw = (tmp_path / "roles.log.jsonl").read_text()
        assert SENTINEL not in raw and KEY not in raw
        [line] = log_lines(tmp_path)
        assert set(line) == {
            "time", "requestId", "mode", "model", "result", "reason", "ms", "imageSha256",
            "promptTokens", "completionTokens", "finishReason", "schemaViolation", "textLength",
        }
        assert line["mode"] == "draft" and line["reason"] == "ok" and line["result"] == "ok"
        assert line["textLength"] == sum(len(x) for x in lines)
        assert (line["promptTokens"], line["completionTokens"]) == (210, 40)
        assert line["imageSha256"] is None

    def test_a_failure_is_logged_with_its_reason_and_still_no_text(self, tmp_path):
        manager = Manager(lambda _r: httpx.Response(401))
        with draft_client(tmp_path, manager) as client:
            client.post("/v1/draft", json=body(lines=[SENTINEL]))
        [line] = log_lines(tmp_path)
        assert (line["reason"], line["result"]) == ("auth", "fallback")
        assert SENTINEL not in (tmp_path / "roles.log.jsonl").read_text()

    def test_a_retried_call_logs_one_line_with_both_tries_counted(self, tmp_path):
        manager = sequence(httpx.Response(200, json=chat_ok("", prompt=100, completion=10)), ok(prompt=200, completion=30))
        with draft_client(tmp_path, manager) as client:
            client.post("/v1/draft", json=body())
        [line] = log_lines(tmp_path)
        assert (line["promptTokens"], line["completionTokens"]) == (300, 40)

    def test_role_lines_do_not_gain_a_text_length(self, tmp_path):
        with draft_client(tmp_path, Manager()) as client:
            client.post("/v1/role", json=role_body())
        assert "textLength" not in log_lines(tmp_path)[0]
