from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator

import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from supply_bot.admin_api.auth import SESSION_COOKIE_NAME, read_admin_session_token
from supply_bot.admin_api.route_registry import register_admin_routes
from supply_bot.config import Settings, load_settings
from supply_bot.storage import BotStorage

PUBLIC_ADMIN_API_PATHS = (
    "/api/health",
    "/api/auth/session",
    "/api/auth/login",
    "/api/auth/logout",
)

ADMIN_API_CORS_ORIGINS = (
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:4173",
    "http://localhost:4173",
)


def create_admin_app(settings: Settings | None = None) -> FastAPI:
    resolved_settings = settings or load_settings()
    storage = BotStorage(resolved_settings.database_path)
    app = FastAPI(
        title="Supply Bot Admin API",
        version="0.2.0",
        lifespan=_build_admin_lifespan(resolved_settings, storage),
    )
    configure_admin_cors(app)
    configure_admin_auth(app)
    register_admin_routes(app)
    return app


def configure_admin_cors(app: FastAPI) -> None:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(ADMIN_API_CORS_ORIGINS),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


def configure_admin_auth(app: FastAPI) -> None:
    @app.middleware("http")
    async def require_admin_api_session(request: Request, call_next):
        if not _should_require_admin_session(request):
            return await call_next(request)

        settings = request.app.state.settings
        token = request.cookies.get(SESSION_COOKIE_NAME)
        session = read_admin_session_token(token, settings.admin_session_secret)
        if session is None:
            return JSONResponse(
                status_code=401,
                content={"detail": "Admin authentication required"},
            )
        return await call_next(request)


def _should_require_admin_session(request: Request) -> bool:
    if request.method == "OPTIONS":
        return False

    path = request.url.path.rstrip("/") or "/"
    if not path.startswith("/api/") or path in PUBLIC_ADMIN_API_PATHS:
        return False

    settings = getattr(request.app.state, "settings", None)
    return bool(settings and settings.admin_auth_enabled)


def _build_admin_lifespan(settings: Settings, storage: BotStorage):
    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        await storage.initialize()
        await storage.ensure_runtime_settings(
            delivery_start=settings.default_delivery_start.strftime("%H:%M"),
            delivery_end=settings.default_delivery_end.strftime("%H:%M"),
            delivery_fallback=settings.default_delivery_fallback.strftime("%H:%M"),
        )
        await storage.expire_stale_active_drafts(max_age_hours=settings.request_draft_stale_hours)
        app.state.settings = settings
        app.state.storage = storage
        yield

    return lifespan


def main() -> None:
    uvicorn.run(
        create_admin_app(),
        host="127.0.0.1",
        port=8000,
        log_level="info",
    )


__all__ = [
    "ADMIN_API_CORS_ORIGINS",
    "PUBLIC_ADMIN_API_PATHS",
    "configure_admin_auth",
    "configure_admin_cors",
    "create_admin_app",
    "main",
]
