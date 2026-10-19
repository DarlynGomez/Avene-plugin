"""GET /selftest: image input, schema enforcement, model name and latency."""

import httpx

from tests.helpers import MODEL, Manager, chat_ok, client_for, log_lines


def test_a_healthy_manager_passes_with_the_model_name_it_reports(tmp_path):
    manager = Manager(lambda _r: httpx.Response(200, json=chat_ok({"label": "button text"}, model="reported:frozen")))
    with client_for(tmp_path, manager) as client:
        body = client.get("/selftest").json()
    assert body["status"] == "pass" and body["failures"] == []
    assert body["image_input_ok"] is True and body["schema_enforced"] is True
    assert body["model"] == "reported:frozen"
    assert isinstance(body["latency_ms"], int)
    assert [r["name"] for r in body["results"]] == ["button", "heading", "note"]
    assert len(manager.requests) == 4, "three test crops and one free text probe"
    assert {line["mode"] for line in log_lines(tmp_path)} == {"selftest"}


def test_free_text_from_the_manager_is_reported_as_a_schema_violation(tmp_path):
    manager = Manager(lambda _r: httpx.Response(200, json=chat_ok("This is a blue button that says Sign up.")))
    with client_for(tmp_path, manager) as client:
        body = client.get("/selftest").json()
    assert body["status"] == "fail" and body["schema_enforced"] is False
    assert body["image_input_ok"] is True
    assert body["probe"] == {"reason": "malformed", "schema_valid": False}
    assert all(line["schemaViolation"] is True for line in log_lines(tmp_path))


def test_only_the_probe_breaking_the_schema_is_enough_to_say_it_is_not_enforced(tmp_path):
    def respond(request):
        text = request.content.decode()
        if "Describe this image in a paragraph" in text:
            return httpx.Response(200, json=chat_ok("A long paragraph about a button."))
        return httpx.Response(200, json=chat_ok({"label": "button text"}))

    with client_for(tmp_path, Manager(respond)) as client:
        body = client.get("/selftest").json()
    assert body["schema_enforced"] is False and body["failures"] == ["malformed"]
    assert [r["reason"] for r in body["results"]] == ["ok", "ok", "ok"]


def test_a_manager_that_rejects_the_image_is_reported(tmp_path):
    with client_for(tmp_path, Manager(lambda _r: httpx.Response(400, text="image input not supported"))) as client:
        body = client.get("/selftest").json()
    assert body["status"] == "fail" and body["image_input_ok"] is False


def test_an_unreachable_manager_fails_the_selftest_and_never_errors(tmp_path):
    def down(_r):
        raise httpx.ConnectError("refused")

    with client_for(tmp_path, Manager(down)) as client:
        response = client.get("/selftest")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "fail" and body["failures"] == ["unreachable"] and body["model"] == MODEL
    assert body["schema_enforced"] is False


def test_a_bad_key_is_reported_before_a_session(tmp_path):
    with client_for(tmp_path, Manager(lambda _r: httpx.Response(401))) as client:
        assert client.get("/selftest").json()["failures"] == ["auth"]
