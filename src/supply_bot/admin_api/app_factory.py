from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from supply_bot.admin_api.route_registry import register_admin_routes
from supply_bot.config import Settings, load_settings
from supply_bot.storage import BotStorage

ADMIN_API_CORS_ORIGINS = (
    "http://127.0.0.1:5173",
    "http://localhost:5173",
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


def _build_admin_lifespan(settings: Settings, storage: BotStorage):
    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        await storage.initialize()
        await storage.ensure_runtime_settings(
            delivery_start=settings.default_delivery_start.strftime("%H:%M"),
            delivery_end=settings.default_delivery_end.strftime("%H:%M"),
            delivery_fallback=settings.default_delivery_fallback.strftime("%H:%M"),
        )
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
    "configure_admin_cors",
    "create_admin_app",
    "main",
]
