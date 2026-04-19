from __future__ import annotations

from fastapi import HTTPException, Request

from supply_bot.admin_api.auth import SESSION_COOKIE_NAME, AdminSession, read_admin_session_token
from supply_bot.config import Settings
from supply_bot.storage import BotStorage


def get_settings(request: Request) -> Settings:
    return request.app.state.settings


def get_storage(request: Request) -> BotStorage:
    return request.app.state.storage


def get_optional_admin_session(request: Request) -> AdminSession | None:
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
