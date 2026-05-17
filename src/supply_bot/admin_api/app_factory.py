from __future__ import annotations

import asyncio
import hashlib
import os
from contextlib import asynccontextmanager
from dataclasses import replace
from typing import AsyncIterator

import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import insert, select, text

from supply_bot.admin_api.auth import SESSION_COOKIE_NAME, read_admin_session_token
from supply_bot.admin_api.auth_rate_limit import LoginRateLimiter
from supply_bot.admin_api.route_registry import register_admin_routes
from supply_bot.config import Settings, load_settings
from supply_bot.database import DatabaseRuntime, create_database_runtime
from supply_bot.database.metadata import metadata
from supply_bot.file_storage import FileStorageAdapter, create_file_storage_adapter
from supply_bot.storage import BotStorage
from supply_bot.storage.delegating import DomainDelegatingStorage
from supply_bot.storage_auth import SqlAlchemyUserAuthRepository
from supply_bot.storage_auth.tables import app_users
from supply_bot.storage_catalog import SqlAlchemyCatalogRepository
from supply_bot.storage_dashboard import SqlAlchemyDashboardReadModel
from supply_bot.storage_estimates.runtime_repository import SqlAlchemyEstimateRuntimeRepository
from supply_bot.storage_notifications import SqlAlchemyTelegramNotificationRepository
from supply_bot.storage_projects import SqlAlchemyProjectWorkspaceRepository
from supply_bot.storage_requests import SqlAlchemyRequestRuntimeRepository

PUBLIC_ADMIN_API_PATHS = (
    "/api/health",
    "/api/auth/diagnostics",
    "/api/auth/session",
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/logout",
)

SYSTEM_PROJECT_OWNER_EMAIL_DOMAIN = "system.local"
LEGACY_ESTIMATE_RUNTIME_OWNER_TABLES = (
    "estimate_projects",
    "estimate_rooms",
    "estimate_room_walls",
    "estimate_room_floor_sections",
    "estimate_room_openings",
    "estimate_warm_floor_configs",
    "estimate_warm_floor_rooms",
    "estimate_flooring_configs",
    "estimate_flooring_rooms",
    "estimate_flooring_room_zones",
    "estimate_wall_finish_configs",
    "estimate_wall_finish_rooms",
    "estimate_wall_finish_room_zones",
    "estimate_project_doors",
    "estimate_project_door_components",
)

ADMIN_API_CORS_ORIGINS = (
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:4173",
    "http://localhost:4173",
)


def resolve_admin_cors_origins() -> tuple[str, ...]:
    raw_origins = os.getenv("ADMIN_API_CORS_ORIGINS", "").strip()
    if not raw_origins:
        return ADMIN_API_CORS_ORIGINS
    return tuple(origin.strip().rstrip("/") for origin in raw_origins.split(",") if origin.strip())


def create_admin_app(settings: Settings | None = None) -> FastAPI:
    resolved_settings = settings or load_settings()
    legacy_storage = BotStorage(resolved_settings.database_path)
    file_storage = create_file_storage_adapter(resolved_settings)
    database_runtime = create_database_runtime(resolved_settings)
    catalog_repository = SqlAlchemyCatalogRepository(database_runtime.session_factory)
    request_repository = SqlAlchemyRequestRuntimeRepository(database_runtime.session_factory)
    notification_repository = SqlAlchemyTelegramNotificationRepository(database_runtime.session_factory)
    project_repository = SqlAlchemyProjectWorkspaceRepository(database_runtime.session_factory)
    estimate_repository = SqlAlchemyEstimateRuntimeRepository(database_runtime.session_factory)
    dashboard_read_model = SqlAlchemyDashboardReadModel(database_runtime.session_factory)
    system_project_owner_id = _resolve_system_project_owner_id(resolved_settings)
    storage = DomainDelegatingStorage(
        legacy_storage,
        catalog_storage=catalog_repository.for_owner(None),
        request_storage=request_repository.for_owner(None),
        notification_storage=notification_repository.for_owner(None),
        project_storage=project_repository.for_owner(system_project_owner_id),
        estimate_storage=estimate_repository.for_owner(system_project_owner_id),
    )
    app = FastAPI(
        title="Supply Bot Admin API",
        version="0.2.0",
        lifespan=_build_admin_lifespan(
            resolved_settings,
            storage,
            file_storage,
            database_runtime,
            catalog_repository,
            request_repository,
            notification_repository,
            project_repository,
            estimate_repository,
            dashboard_read_model,
            system_project_owner_id,
        ),
    )
    app.state.auth_login_rate_limiter = LoginRateLimiter(
        attempts=resolved_settings.admin_login_rate_limit_attempts,
        window_seconds=resolved_settings.admin_login_rate_limit_window_seconds,
        lockout_seconds=resolved_settings.admin_login_rate_limit_lockout_seconds,
    )
    configure_admin_cors(app)
    configure_admin_auth(app)
    register_admin_routes(app)
    return app


def configure_admin_cors(app: FastAPI) -> None:
    cors_origins = resolve_admin_cors_origins()
    app.state.admin_cors_origins = cors_origins
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(cors_origins),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["Retry-After", "X-Auth-Reason", "X-Auth-Cookie-Name"],
    )


def configure_admin_auth(app: FastAPI) -> None:
    @app.middleware("http")
    async def require_admin_api_session(request: Request, call_next):
        settings = request.app.state.settings
        request.state.settings = settings
        request.state.storage = request.app.state.storage
        request.state.file_storage = request.app.state.file_storage

        if not _should_require_admin_session(request):
            return await call_next(request)

        token = request.cookies.get(SESSION_COOKIE_NAME)
        session = read_admin_session_token(token, settings.admin_session_secret)
        if session is None:
            return JSONResponse(
                status_code=401,
                content={"detail": "Admin authentication required"},
                headers={
                    "X-Auth-Reason": "missing-or-invalid-session",
                    "X-Auth-Cookie-Name": SESSION_COOKIE_NAME,
                },
            )
        request.state.admin_session = session
        if session.role != "admin" and session.user_id is not None:
            await _configure_user_tenant_runtime(request, settings, session)
        return await call_next(request)


def _should_require_admin_session(request: Request) -> bool:
    if request.method == "OPTIONS":
        return False

    path = request.url.path.rstrip("/") or "/"
    if not path.startswith("/api/") or path in PUBLIC_ADMIN_API_PATHS:
        return False

    settings = getattr(request.app.state, "settings", None)
    return bool(settings and settings.admin_auth_enabled)


async def _configure_user_tenant_runtime(request: Request, settings: Settings, session) -> None:
    user_id = int(session.user_id)
    cache = request.app.state.user_runtime_cache
    cached_runtime = cache.get(user_id)
    if cached_runtime is None:
        lock = request.app.state.user_runtime_locks.setdefault(user_id, asyncio.Lock())
        async with lock:
            cached_runtime = cache.get(user_id)
            if cached_runtime is None:
                user_root = settings.database_path.parent / "users" / str(user_id)
                user_settings = replace(
                    settings,
                    database_path=user_root / "supply_bot.sqlite3",
                    project_documents_dir=settings.project_documents_dir / "users" / str(user_id),
                )
                user_legacy_storage = BotStorage(user_settings.database_path)
                user_file_storage = create_file_storage_adapter(user_settings)
                user_storage = DomainDelegatingStorage(
                    user_legacy_storage,
                    catalog_storage=request.app.state.catalog_repository.for_owner(user_id),
                    request_storage=request.app.state.request_repository.for_owner(user_id),
                    notification_storage=request.app.state.notification_repository.for_owner(user_id),
                    project_storage=request.app.state.project_repository.for_owner(user_id),
                    estimate_storage=request.app.state.estimate_repository.for_owner(user_id),
                )
                await user_storage.initialize()
                await user_storage.ensure_runtime_settings(
                    delivery_start=user_settings.default_delivery_start.strftime("%H:%M"),
                    delivery_end=user_settings.default_delivery_end.strftime("%H:%M"),
                    delivery_fallback=user_settings.default_delivery_fallback.strftime("%H:%M"),
                )
                cached_runtime = (user_settings, user_storage, user_file_storage)
                cache[user_id] = cached_runtime

    request.state.settings, request.state.storage, request.state.file_storage = cached_runtime


def _build_admin_lifespan(
    settings: Settings,
    storage: DomainDelegatingStorage,
    file_storage: FileStorageAdapter,
    database_runtime: DatabaseRuntime,
    catalog_repository: SqlAlchemyCatalogRepository,
    request_repository: SqlAlchemyRequestRuntimeRepository,
    notification_repository: SqlAlchemyTelegramNotificationRepository,
    project_repository: SqlAlchemyProjectWorkspaceRepository,
    estimate_repository: SqlAlchemyEstimateRuntimeRepository,
    dashboard_read_model: SqlAlchemyDashboardReadModel,
    system_project_owner_id: int,
):
    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        if database_runtime.backend == "sqlite":
            await database_runtime.create_metadata(metadata)
        await _ensure_system_project_owner(database_runtime, owner_id=system_project_owner_id)
        await storage.initialize()
        if database_runtime.backend == "sqlite":
            await _claim_legacy_estimate_runtime_owner(database_runtime, owner_id=system_project_owner_id)
        await storage.ensure_runtime_settings(
            delivery_start=settings.default_delivery_start.strftime("%H:%M"),
            delivery_end=settings.default_delivery_end.strftime("%H:%M"),
            delivery_fallback=settings.default_delivery_fallback.strftime("%H:%M"),
        )
        await storage.expire_stale_active_drafts(max_age_hours=settings.request_draft_stale_hours)
        app.state.settings = settings
        app.state.storage = storage
        app.state.file_storage = file_storage
        app.state.database_runtime = database_runtime
        app.state.user_auth_repository = SqlAlchemyUserAuthRepository(database_runtime.session_factory)
        app.state.catalog_repository = catalog_repository
        app.state.request_repository = request_repository
        app.state.notification_repository = notification_repository
        app.state.project_repository = project_repository
        app.state.estimate_repository = estimate_repository
        app.state.dashboard_read_model = dashboard_read_model
        app.state.system_project_owner_id = system_project_owner_id
        app.state.user_runtime_cache = {}
        app.state.user_runtime_locks = {}
        try:
            yield
        finally:
            await database_runtime.dispose()

    return lifespan

async def _claim_legacy_estimate_runtime_owner(
    database_runtime: DatabaseRuntime,
    *,
    owner_id: int,
) -> None:
    async with database_runtime.session_factory() as session:
        for table in LEGACY_ESTIMATE_RUNTIME_OWNER_TABLES:
            await session.execute(
                text(f"UPDATE {table} SET owner_user_id = :owner_id WHERE owner_user_id IS NULL"),
                {"owner_id": owner_id},
            )
        await session.commit()

def _resolve_system_project_owner_id(settings: Settings) -> int:
    raw_key = str(settings.database_path.resolve())
    digest = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()
    return -((int(digest[:12], 16) % 2_000_000_000) + 1)


async def _ensure_system_project_owner(database_runtime: DatabaseRuntime, *, owner_id: int) -> None:
    async with database_runtime.session_factory() as session:
        existing = await session.execute(
            select(app_users.c.id).where(app_users.c.id == owner_id)
        )
        if existing.scalar_one_or_none() is not None:
            return
        await session.execute(
            insert(app_users).values(
                id=owner_id,
                email=f"local-admin-{abs(owner_id)}@{SYSTEM_PROJECT_OWNER_EMAIL_DOMAIN}",
                display_name="Local admin",
                password_hash="local-bypass",
                role="admin",
            )
        )
        await session.commit()


def main() -> None:
    uvicorn.run(
        create_admin_app(),
        host=os.getenv("ADMIN_API_HOST", "127.0.0.1"),
        port=int(os.getenv("PORT", os.getenv("ADMIN_API_PORT", "8000"))),
        log_level="info",
    )


__all__ = [
    "ADMIN_API_CORS_ORIGINS",
    "PUBLIC_ADMIN_API_PATHS",
    "configure_admin_auth",
    "configure_admin_cors",
    "create_admin_app",
    "main",
    "resolve_admin_cors_origins",
]


