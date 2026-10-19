"""Loopback only, CORS for the plugin iframe, the three endpoints, and no key anywhere."""

import json

import httpx
import pytest

from roles_server.config import ConfigError, Settings
from tests.helpers import KEY, Manager, chat_ok, client_for, log_lines, png_b64, role_body, settings


def test_it_refuses_to_be_configured_to_listen_anywhere_but_this_computer(tmp_path):
    for host in ("0.0.0.0", "192.168.1.20", "::", "example.com"):
        with pytest.raises(ConfigError):
            settings(tmp_path, ROLES_HOST=host)
    assert settings(tmp_path).host == "127.0.0.1"
    assert settings(tmp_path, ROLES_HOST="localhost").host == "localhost"


def test_the_entry_point_binds_the_configured_loopback_address():
    from roles_server import __main__ as entry

    source = open(entry.__file__, encoding="utf-8").read()
    assert "host=settings.host" in source and "0.0.0.0" not in source


@pytest.mark.parametrize("host", ["evil.example.com", "192.168.1.20:8750", "0.0.0.0:8750", "127.0.0.1.evil.com", ""])
def test_a_request_with_a_host_that_is_not_loopback_is_rejected_before_any_work(tmp_path, host):
    manager = Manager()
    with client_for(tmp_path, manager) as client:
        for method, path in (("POST", "/v1/role"), ("GET", "/health"), ("GET", "/selftest")):
            response = client.request(method, path, headers={"host": host}, json=role_body() if method == "POST" else None)
            assert response.status_code == 403
    assert manager.requests == []


@pytest.mark.parametrize("host", ["127.0.0.1:8750", "localhost:8750", "localhost", "[::1]:8750"])
def test_loopback_hosts_are_served(tmp_path, host):
    with client_for(tmp_path, Manager()) as client:
        assert client.get("/health", headers={"host": host}).status_code == 200


def preflight(client, origin="null", method="POST", headers="content-type", path="/v1/role", **extra):
    request_headers = {"origin": origin, "access-control-request-method": method, **extra}
    if headers:
        request_headers["access-control-request-headers"] = headers
    return client.options(path, headers=request_headers)


def test_the_null_origin_of_the_plugin_iframe_passes_preflight(tmp_path):
    with client_for(tmp_path, Manager()) as client:
        for path, method in (("/v1/role", "POST"), ("/health", "GET"), ("/selftest", "GET")):
            response = preflight(client, path=path, method=method)
            assert response.status_code == 204
            assert response.headers["access-control-allow-origin"] == "null"
            assert response.headers["access-control-allow-methods"] == "GET, POST"
            assert response.headers["access-control-allow-headers"] == "content-type"


def test_preflight_allows_only_get_post_and_the_content_type_header(tmp_path):
    with client_for(tmp_path, Manager()) as client:
        for method in ("PUT", "DELETE", "PATCH"):
            assert "access-control-allow-origin" not in preflight(client, method=method).headers
        denied = preflight(client, headers="authorization, content-type")
        assert denied.status_code == 204 and "access-control-allow-headers" not in denied.headers
        assert "access-control-allow-origin" not in denied.headers


def test_private_network_preflight_is_answered_for_the_null_origin(tmp_path):
    with client_for(tmp_path, Manager()) as client:
        response = preflight(client, **{"access-control-request-private-network": "true"})
    assert response.headers["access-control-allow-private-network"] == "true"


def test_any_other_origin_is_refused(tmp_path):
    manager = Manager()
    with client_for(tmp_path, manager) as client:
        assert preflight(client, origin="https://evil.example").status_code == 403
        assert client.post("/v1/role", json=role_body(), headers={"origin": "https://evil.example"}).status_code == 403
    assert manager.requests == []


def test_a_real_request_from_the_null_origin_carries_the_allow_header(tmp_path):
    with client_for(tmp_path, Manager()) as client:
        response = client.post("/v1/role", json=role_body(), headers={"origin": "null"})
    assert response.status_code == 200 and response.headers["access-control-allow-origin"] == "null"


def test_health_reports_readiness_and_makes_no_model_call(tmp_path):
    manager = Manager()
    with client_for(tmp_path, manager) as client:
        body = client.get("/health").json()
    assert body == {"status": "ok", "model": "vision-model:test-frozen", "warm": False, "thinking": False}
    assert manager.requests == []


def test_warm_up_asks_the_model_once_at_start_with_the_long_allowance(tmp_path):
    manager = Manager()
    with client_for(tmp_path, manager, warm=True) as client:
        assert len(manager.requests) == 1
        assert manager.requests[0].extensions["timeout"]["read"] == 60.0
        assert client.get("/health").json()["warm"] is True
    first = log_lines(tmp_path)[0]
    assert first["mode"] == "warmup" and first["reason"] == "ok" and first["ms"] >= 0


def test_a_failed_warm_up_does_not_stop_the_server_and_is_logged(tmp_path):
    manager = Manager(lambda _r: httpx.Response(503))
    with client_for(tmp_path, manager, warm=True) as client:
        assert client.get("/health").json()["warm"] is False
    assert log_lines(tmp_path)[0]["reason"] == "unreachable"


def test_the_live_timeout_is_a_setting(tmp_path):
    manager = Manager()
    with client_for(tmp_path, manager, GENAI_TIMEOUT_SECONDS="2.5") as client:
        client.post("/v1/role", json=role_body())
    assert manager.requests[0].extensions["timeout"]["read"] == 2.5


def test_each_log_line_holds_only_the_allowed_fields_and_no_image_or_key(tmp_path):
    image = png_b64(130, 40)
    manager = Manager()
    with client_for(tmp_path, manager) as client:
        client.post("/v1/role", json=role_body(image=image, requestId="abc"))
    [line] = log_lines(tmp_path)
    assert set(line) == {
        "time", "requestId", "mode", "model", "result", "reason", "ms", "imageSha256",
        "promptTokens", "completionTokens", "finishReason", "schemaViolation",
    }
    assert line["requestId"] == "abc" and line["promptTokens"] == 300 and line["finishReason"] == "stop"
    assert len(line["imageSha256"]) == 16 and image not in json.dumps(line)


def test_no_key_appears_in_any_log_or_response_whatever_fails(tmp_path):
    kinds = [
        lambda _r: httpx.Response(401, text=f"bad key {KEY}"),
        lambda _r: httpx.Response(429, text=KEY),
        lambda _r: httpx.Response(200, json=chat_ok(KEY)),
        lambda _r: httpx.Response(200, json=chat_ok({"label": KEY})),
        lambda _r: httpx.Response(500, text=f"Authorization: Bearer {KEY}"),
    ]
    seen = []
    for respond in kinds:
        manager = Manager(respond)
        with client_for(tmp_path, manager, warm=True) as client:
            seen.append(client.post("/v1/role", json=role_body()).text)
            seen.append(client.post("/v1/role", json=role_body(mode="precompute")).text)
            seen.append(client.get("/health").text)
            seen.append(client.get("/selftest").text)
            seen.append(client.post("/v1/role", json={"broken": KEY}).text)
    log = (tmp_path / "roles.log.jsonl").read_text()
    assert KEY not in log and all(KEY not in text for text in seen)
    assert "sk-" not in log
    assert KEY not in repr(Settings.from_env({"GENAI_BASE_URL": "http://x", "GENAI_API_KEY": KEY, "GENAI_MODEL": "m"}))


def test_crops_are_saved_in_precompute_mode_only(tmp_path):
    crops = tmp_path / "crops"
    with client_for(tmp_path, Manager(), ROLES_CROP_DIR=str(crops)) as client:
        client.post("/v1/role", json=role_body(requestId="live-1"))
        assert not crops.exists()
        client.post("/v1/role", json=role_body(requestId="pre/1", mode="precompute"))
    assert [p.name for p in crops.iterdir()] == ["pre_1.png"]


def test_the_live_timeout_defaults_to_ten_seconds(tmp_path):
    manager = Manager()
    with client_for(tmp_path, manager) as client:
        client.post("/v1/role", json=role_body())
    assert manager.requests[0].extensions["timeout"]["read"] == 10.0
