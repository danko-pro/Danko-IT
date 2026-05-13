from __future__ import annotations

from fastapi import HTTPException, Request

from supply_bot.admin_api.auth import SESSION_COOKIE_NAME, AdminSession, read_admin_session_token
from supply_bot.config import Settings
from supply_bot.file_storage import FileStorageAdapter
from supply_bot.storage import BotStorage
from supply_bot.storage_auth import SqlAlchemyUserAuthRepository
from supply_bot.storage_catalog import SqlAlchemyCatalogRepository
from supply_bot.storage_dashboard import SqlAlchemyDashboardReadModel


def get_settings(request: Request) -> Settings:
    return getattr(request.state, "settings", request.app.state.settings)


def get_storage(request: Request) -> BotStorage:
    return getattr(request.state, "storage", request.app.state.storage)


def get_file_storage(request: Request) -> FileStorageAdapter:
    return getattr(request.state, "file_storage", request.app.state.file_storage)


def get_user_auth_repository(request: Request) -> SqlAlchemyUserAuthRepository:
    return request.app.state.user_auth_repository


def get_catalog_storage(request: Request) -> SqlAlchemyCatalogRepository:
    session = get_optional_admin_session(request)
    owner_user_id = session.user_id if session and session.user_id is not None else None
    return request.app.state.catalog_repository.for_owner(owner_user_id)


def get_dashboard_read_model(request: Request) -> SqlAlchemyDashboardReadModel:
    session = get_optional_admin_session(request)
    if session is not None and session.role != "admin" and session.user_id is not None:
        owner_user_id = int(session.user_id)
        project_owner_user_id = owner_user_id
    else:
        owner_user_id = None
        project_owner_user_id = request.app.state.system_project_owner_id
    return request.app.state.dashboard_read_model.for_scope(
        owner_user_id=owner_user_id,
        project_owner_user_id=project_owner_user_id,
    )


def get_optional_admin_session(request: Request) -> AdminSession | None:
    state_session = getattr(request.state, "admin_session", None)
    if isinstance(state_session, AdminSession):
        return state_session

    settings = get_settings(request)
    if not settings.admin_auth_enabled:
        return AdminSession(subject="local-admin", role="admin", expires_at=0, mode="local-bypass")

    token = request.cookies.get(SESSION_COOKIE_NAME)
    return read_admin_session_token(token, settings.admin_session_secret)


def require_admin_session(request: Request) -> AdminSession:
    session = get_optional_admin_session(request)
    if session is not None:
        return session
    raise HTTPException(status_code=401, detail="Admin authentication required")
