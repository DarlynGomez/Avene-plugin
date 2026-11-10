"""POST /v1/alt: the path, the strict schema, the shared window, one call at a time, the one retry, and a log with no image or text."""

import json

import httpx
import pytest

from roles_server.alt_schema import INSTRUCTION, parse_alt
from roles_server.app import PATHS
from tests.helpers import KEY, MODEL, FakeClock, Manager, chat_ok, client_for, log_lines, png_b64, role_body

SENTINEL = "SECRET-DESCRIPTION-MARKER"


def body(**overrides):
    return {"requestId": "a-1", "image": png_b64(200, 120), "width": 320, "height": 180, **overrides}


def reply(kind="describe", text="Order summary icon that opens the cart", **usage):
    return httpx.Response(200, json=chat_ok({"kind": kind, "text": text}, **usage))


def sequence(*responses):
    queue = list(responses)
    return Manager(lambda _request: queue.pop(0) if len(queue) > 1 else queue[0])


def test_the_path_is_one_the_plugin_may_reach():
    assert "/v1/alt" in PATHS


def test_the_null_origin_passes_preflight_and_any_other_origin_is_refused(tmp_path):
    with client_for(tmp_path, Manager(lambda _r: reply())) as client:
        headers = {
            "origin": "null",
            "access-control-request-method": "POST",
            "access-control-request-headers": "content-type",
        }
        preflight = client.options("/v1/alt", headers=headers)
        assert preflight.status_code == 204
        assert preflight.headers["access-control-allow-origin"] == "null"
        real = client.post("/v1/alt", json=body(), headers={"origin": "null"})
        assert real.status_code == 200 and real.headers["access-control-allow-origin"] == "null"
        assert client.post("/v1/alt", json=body(), headers={"origin": "https://evil.example"}).status_code == 403


class TestTheRequest:
    def test_the_model_gets_one_image_a_strict_three_kind_schema_and_the_layer_size(self, tmp_path):
        manager = Manager(lambda _r: reply())
        with client_for(tmp_path, manager, GENAI_ALT_MAX_TOKENS="150") as client:
            client.post("/v1/alt", json=body())
        [payload] = manager.payloads()
        assert payload["model"] == MODEL
        assert payload["temperature"] == 0 and payload["max_tokens"] == 150
        schema = payload["response_format"]["json_schema"]
        assert schema["name"] == "alt" and schema["strict"] is True
        assert schema["schema"]["properties"]["kind"]["enum"] == ["describe", "decorative", "unsure"]
        assert schema["schema"]["required"] == ["kind", "text"]
        assert schema["schema"]["additionalProperties"] is False
        content = payload["messages"][0]["content"]
        assert [part["type"] for part in content] == ["text", "image_url"]
        assert content[1]["image_url"]["url"].startswith("data:image/png;base64,")
        assert "Layer size: 320 by 180 pixels." in content[0]["text"]

    def test_the_instruction_is_the_data_file_and_says_what_was_asked_for(self):
        for phrase in (
            "cannot see",
            "one short sentence",
            "what it is for before how it looks",
            '"image of", "picture of" or "photo of"',
            "visible text exactly",
            "Never guess who a person is",
            "decorative",
            "unsure",
        ):
            assert phrase in INSTRUCTION

    def test_only_the_alt_request_uses_the_alt_schema_and_a_role_request_is_unchanged(self, tmp_path):
        manager = Manager(lambda r: reply() if b'"alt"' in r.content else httpx.Response(200, json=chat_ok({"label": "caption"})))
        with client_for(tmp_path, manager) as client:
            client.post("/v1/role", json=role_body())
            client.post("/v1/alt", json=body())
        names = [p["response_format"]["json_schema"]["name"] for p in manager.payloads()]
        assert names == ["role", "alt"]


class TestTheAnswer:
    def test_a_description_comes_back_with_its_kind_and_the_model(self, tmp_path):
        with client_for(tmp_path, Manager(lambda _r: reply())) as client:
            result = client.post("/v1/alt", json=body()).json()
        assert (result["kind"], result["text"], result["reason"], result["model"]) == (
            "describe", "Order summary icon that opens the cart", "ok", MODEL,
        )

    @pytest.mark.parametrize("kind", ["decorative", "unsure"])
    def test_decorative_and_unsure_carry_no_text_whatever_the_model_wrote(self, tmp_path, kind):
        with client_for(tmp_path, Manager(lambda _r: reply(kind, "some words"))) as client:
            result = client.post("/v1/alt", json=body()).json()
        assert (result["kind"], result["text"], result["reason"]) == (kind, "", "ok")

    def test_the_text_is_trimmed(self, tmp_path):
        with client_for(tmp_path, Manager(lambda _r: reply(text="  A sign  "))) as client:
            assert client.post("/v1/alt", json=body()).json()["text"] == "A sign"


class TestWindow:
    def test_an_alt_call_that_used_the_window_holds_back_a_role_call(self, tmp_path):
        manager = Manager(lambda r: reply(prompt=9900, completion=0) if b'"alt"' in r.content else httpx.Response(200, json=chat_ok({"label": "caption"})))
        with client_for(tmp_path, manager, FakeClock()) as client:
            client.post("/v1/alt", json=body())
            role = client.post("/v1/role", json=role_body()).json()
        assert role["reason"] == "rate-limited" and len(manager.requests) == 1

    def test_a_role_call_that_used_the_window_makes_an_alt_call_wait_for_it(self, tmp_path):
        clock = FakeClock()
        manager = Manager(lambda r: reply() if b'"alt"' in r.content else httpx.Response(200, json=chat_ok({"label": "caption"}, prompt=9900, completion=0)))
        with client_for(tmp_path, manager, clock) as client:
            client.post("/v1/role", json=role_body())
            result = client.post("/v1/alt", json=body()).json()
        assert result["reason"] == "ok"
        assert round(sum(clock.slept)) == 60

    def test_a_reply_settles_the_hold_to_what_was_used(self, tmp_path):
        clock = FakeClock()
        manager = Manager(lambda _r: reply(prompt=300, completion=30))
        with client_for(tmp_path, manager, clock) as client:
            for _ in range(5):
                assert client.post("/v1/alt", json=body()).json()["reason"] == "ok"
        assert clock.slept == []

    def test_a_failed_call_still_holds_its_worst_case(self, tmp_path):
        clock = FakeClock()
        manager = Manager(lambda _r: httpx.Response(503))
        with client_for(tmp_path, manager, clock, GENAI_ALT_MAX_TOKENS="6000") as client:
            first = client.post("/v1/alt", json=body()).json()
            assert clock.slept == []
            second = client.post("/v1/alt", json=body()).json()
        assert (first["reason"], second["reason"]) == ("unreachable", "unreachable")
        assert round(sum(clock.slept)) == 60

    def test_a_call_that_could_never_fit_is_refused_before_it_is_sent(self, tmp_path):
        clock = FakeClock()
        manager = Manager(lambda _r: reply())
        with client_for(tmp_path, manager, clock, GENAI_ALT_MAX_TOKENS="20000") as client:
            result = client.post("/v1/alt", json=body()).json()
        assert (result["kind"], result["text"], result["reason"]) == ("unsure", "", "too-large")
        assert clock.slept == [] and manager.requests == []

    def test_one_call_is_made_for_one_image(self, tmp_path):
        manager = Manager(lambda _r: reply())
        with client_for(tmp_path, manager) as client:
            client.post("/v1/alt", json=body())
        assert len(manager.requests) == 1


class TestEmptyReply:
    def test_an_empty_reply_is_tried_once_more_and_the_second_can_be_used(self, tmp_path):
        manager = sequence(httpx.Response(200, json=chat_ok("")), reply())
        with client_for(tmp_path, manager) as client:
            result = client.post("/v1/alt", json=body()).json()
        assert (result["reason"], result["kind"]) == ("ok", "describe")
        assert len(manager.requests) == 2

    def test_a_description_with_no_words_counts_as_empty(self, tmp_path):
        manager = sequence(reply("describe", "  "), reply())
        with client_for(tmp_path, manager) as client:
            assert client.post("/v1/alt", json=body()).json()["reason"] == "ok"
        assert len(manager.requests) == 2

    def test_two_empty_replies_end_as_empty_with_no_third_try(self, tmp_path):
        manager = sequence(httpx.Response(200, json=chat_ok("")))
        with client_for(tmp_path, manager) as client:
            result = client.post("/v1/alt", json=body()).json()
        assert (result["reason"], result["text"], result["kind"]) == ("empty", "", "unsure")
        assert len(manager.requests) == 2

    def test_the_retry_reserves_its_own_worst_case(self, tmp_path):
        clock = FakeClock()
        manager = sequence(httpx.Response(200, json=chat_ok("", prompt=0, completion=0)))
        with client_for(tmp_path, manager, clock, GENAI_ALT_MAX_TOKENS="6000") as client:
            client.post("/v1/alt", json=body())
        assert round(sum(clock.slept)) == 60

    @pytest.mark.parametrize(
        "response,reason",
        [
            (httpx.Response(200, json=chat_ok("not json")), "malformed"),
            (httpx.Response(200, json=chat_ok({"kind": "describe"})), "malformed"),
            (httpx.Response(200, json=chat_ok({"kind": "poem", "text": "x"})), "malformed"),
            (httpx.Response(200, json=chat_ok({"kind": "describe", "text": 3})), "malformed"),
            (httpx.Response(200, json=chat_ok({"kind": "describe", "text": "a", "extra": 1})), "malformed"),
            (httpx.Response(401), "auth"),
            (httpx.Response(429), "rate-limited"),
            (httpx.Response(500), "unreachable"),
            (httpx.Response(400), "malformed"),
        ],
    )
    def test_anything_else_is_a_typed_reason_and_is_not_tried_again(self, tmp_path, response, reason):
        manager = sequence(response)
        with client_for(tmp_path, manager) as client:
            result = client.post("/v1/alt", json=body()).json()
        assert (result["kind"], result["text"], result["reason"]) == ("unsure", "", reason)
        assert len(manager.requests) == 1

    def test_a_timeout_is_a_typed_reason(self, tmp_path):
        def slow(request):
            raise httpx.ReadTimeout("slow", request=request)

        with client_for(tmp_path, Manager(slow)) as client:
            assert client.post("/v1/alt", json=body()).json()["reason"] == "timeout"

    @pytest.mark.parametrize(
        "bad",
        [{"image": "not an image"}, {"width": 0}, {"height": "tall"}, {"image": 4}],
    )
    def test_a_request_that_cannot_be_used_is_answered_with_a_typed_reason(self, tmp_path, bad):
        manager = Manager(lambda _r: reply())
        with client_for(tmp_path, manager) as client:
            response = client.post("/v1/alt", json=body(**bad))
        assert response.status_code == 200
        assert (response.json()["kind"], response.json()["reason"]) == ("unsure", "malformed")
        assert manager.requests == []


class TestParse:
    @pytest.mark.parametrize(
        "content,expected",
        [
            ('{"kind":"describe","text":"A sign"}', ("describe", "A sign", "ok")),
            ('{"kind":"decorative","text":""}', ("decorative", "", "ok")),
            ('{"kind":"unsure","text":"x"}', ("unsure", "", "ok")),
            ("", (None, "", "empty")),
            ('{"kind":"describe","text":""}', (None, "", "empty")),
            ("[]", (None, "", "malformed")),
        ],
    )
    def test_the_strict_reading(self, content, expected):
        assert parse_alt(content) == expected


class TestLog:
    def test_the_log_holds_lengths_status_and_token_counts_and_no_image_or_text(self, tmp_path):
        image = png_b64(200, 120)
        manager = Manager(lambda _r: reply(text=f"{SENTINEL} on a table", prompt=410, completion=30))
        with client_for(tmp_path, manager) as client:
            client.post("/v1/alt", json=body(image=image))
        raw = (tmp_path / "roles.log.jsonl").read_text()
        assert SENTINEL not in raw and "on a table" not in raw
        assert KEY not in raw and image[:40] not in raw
        [line] = log_lines(tmp_path)
        assert set(line) == {
            "time", "requestId", "mode", "model", "result", "reason", "ms", "imageSha256",
            "promptTokens", "completionTokens", "finishReason", "schemaViolation", "textLength",
        }
        assert line["mode"] == "alt" and line["result"] == "describe" and line["reason"] == "ok"
        assert line["imageSha256"] is None
        assert (line["promptTokens"], line["completionTokens"]) == (410, 30)
        assert line["textLength"] == len(f"{SENTINEL} on a table")

    def test_a_refused_image_is_logged_without_any_of_it(self, tmp_path):
        with client_for(tmp_path, Manager(lambda _r: reply())) as client:
            client.post("/v1/alt", json=body(image="definitely-not-base64!!"))
        [line] = log_lines(tmp_path)
        assert line["reason"] == "malformed" and line["imageSha256"] is None
        assert "definitely" not in (tmp_path / "roles.log.jsonl").read_text()


class TestStyle:
    @pytest.mark.parametrize(
        "style,phrase",
        [
            ("concise", "Style: concise."),
            ("descriptive", "Style: descriptive."),
            ("functional", "Style: functional."),
        ],
    )
    def test_each_setting_adds_its_own_line_to_what_the_model_is_asked(self, tmp_path, style, phrase):
        manager = Manager(lambda _r: reply())
        with client_for(tmp_path, manager) as client:
            client.post("/v1/alt", json=body(style=style))
        text = manager.payloads()[0]["messages"][0]["content"][0]["text"]
        assert phrase in text
        assert text.count("Style:") == 1

    def test_no_setting_means_concise(self, tmp_path):
        manager = Manager(lambda _r: reply())
        with client_for(tmp_path, manager) as client:
            client.post("/v1/alt", json=body())
        assert "Style: concise." in manager.payloads()[0]["messages"][0]["content"][0]["text"]

    def test_a_setting_that_is_not_one_of_the_three_is_answered_as_malformed_and_never_sent(self, tmp_path):
        manager = Manager(lambda _r: reply())
        with client_for(tmp_path, manager) as client:
            result = client.post("/v1/alt", json=body(style="poetic")).json()
        assert (result["kind"], result["reason"]) == ("unsure", "malformed")
        assert manager.requests == []

    def test_the_setting_is_not_written_to_the_log(self, tmp_path):
        with client_for(tmp_path, Manager(lambda _r: reply())) as client:
            client.post("/v1/alt", json=body(style="functional"))
        assert "functional" not in (tmp_path / "roles.log.jsonl").read_text()
