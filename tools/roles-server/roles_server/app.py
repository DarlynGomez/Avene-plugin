"""The three endpoints, bound to this computer only, with the checks that keep it that way."""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import Any

import httpx
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, Response

from . import labels
from .classify import RoleRequest, classify, unsure
from .clock import Clock, RealClock
from .config import Settings
from .model_call import ModelCaller
from .provider import OpenAICompatibleProvider, Provider
from .requestlog import RequestLog
from .selftest import run_selftest, warm_up

PATHS = {"/v1/role", "/health", "/selftest"}
LOOPBACK_NAMES = {"127.0.0.1", "localhost", "[::1]"}
NULL_ORIGIN = "null"


def _host_name(header: str) -> str:
    """The host without its port, an address in square brackets keeps them."""
    if header.startswith("["):
        return header[: header.find("]") + 1]
    return header.split(":", 1)[0]


def create_app(
    settings: Settings,
    provider: Provider | None = None,
    clock: Clock | None = None,
    warm: bool = True,
) -> FastAPI:
    clock = clock or RealClock()
    log = RequestLog(settings.log_path)
    provider = provider or OpenAICompatibleProvider(settings.base_url, settings.api_key, httpx.AsyncClient())
    caller = ModelCaller(settings, provider, clock)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        # Nothing is accepted until the model has answered once or failed to, within the long allowance
        app.state.warm = False
        if warm:
            app.state.warm = (await warm_up(settings, caller, log)).reason == labels.OK
        yield

    app = FastAPI(lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)
    app.state.warm = False

    @app.middleware("http")
    async def loopback_and_cors(request: Request, call_next):
        if _host_name(request.headers.get("host", "")) not in LOOPBACK_NAMES:
            return JSONResponse({"detail": "This server answers on this computer only."}, status_code=403)
        origin = request.headers.get("origin")
        if origin is not None and request.url.path in PATHS and origin != NULL_ORIGIN:
            return JSONResponse({"detail": "Origin not allowed."}, status_code=403)
        if request.method == "OPTIONS" and request.url.path in PATHS:
            return _preflight(request)
        response = await call_next(request)
        if origin == NULL_ORIGIN and request.url.path in PATHS:
            response.headers["Access-Control-Allow-Origin"] = NULL_ORIGIN
            response.headers["Vary"] = "Origin"
        return response

    @app.exception_handler(RequestValidationError)
    async def unreadable(_request: Request, _error: RequestValidationError) -> JSONResponse:
        # A request the server cannot read is still answered, the plugin never sees an error
        return JSONResponse(unsure(labels.MALFORMED, settings.model))

    @app.post("/v1/role")
    async def role(body: RoleRequest) -> dict[str, Any]:
        return await classify(body, settings, caller, log)

    @app.get("/health")
    async def health() -> dict[str, Any]:
        return {"status": "ok", "model": settings.model, "warm": app.state.warm, "thinking": settings.is_thinking}

    @app.get("/selftest")
    async def selftest() -> dict[str, Any]:
        return await run_selftest(settings, caller, log)

    return app


def _preflight(request: Request) -> Response:
    headers = {"Vary": "Origin"}
    if request.headers.get("origin") == NULL_ORIGIN:
        wanted = {h.strip().lower() for h in request.headers.get("access-control-request-headers", "").split(",") if h.strip()}
        method = request.headers.get("access-control-request-method", "")
        if method in {"GET", "POST"} and wanted <= {"content-type"}:
            headers.update(
                {
                    "Access-Control-Allow-Origin": NULL_ORIGIN,
                    "Access-Control-Allow-Methods": "GET, POST",
                    "Access-Control-Allow-Headers": "content-type",
                    "Access-Control-Max-Age": "600",
                }
            )
            if request.headers.get("access-control-request-private-network") == "true":
                headers["Access-Control-Allow-Private-Network"] = "true"
    return Response(status_code=204, headers=headers)
