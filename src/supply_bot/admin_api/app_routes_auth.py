from __future__ import annotations

from typing import Any

from fastapi import FastAPI, HTTPException, Request, Response

from supply_bot.admin_api.auth import (
    AdminSession,
    clear_admin_session_cookie,
    create_admin_session_token,
    set_admin_session_cookie,
    verify_admin_password,
)
from supply_bot.admin_api.deps import get_optional_admin_session, get_settings
from supply_bot.config import Settings


def _session_payload(settings: Settings, session: AdminSession | None) -> dict[str, Any]:
    if not settings.admin_auth_enabled:
        return {
            "auth_enabled": False,
            "authenticated": True,
            "mode": "local-bypass",
            "user": {
                "subject": "local-admin",
                "role": "admin",
            },
            "expires_at": None,
        }

    return {
        "auth_enabled": True,
        "authenticated": session is not None,
        "mode": "session",
        "user": (
            {
                "subject": session.subject,
                "role": session.role,
            }
            if session is not None
            else None
        ),
        "expires_at": session.expires_at_iso if session is not None else None,
    }


def register_auth_routes(
    app: FastAPI,
    *,
    admin_login_payload_model,
) -> None:
    @app.get("/api/auth/session")
    async def auth_session(request: Request) -> dict[str, Any]:
        settings_obj = get_settings(request)
        session = get_optional_admin_session(request)
        return _session_payload(settings_obj, session)

    async def auth_login(
        request: Request,
        response: Response,
        payload,
    ) -> dict[str, Any]:
        settings_obj = get_settings(request)
        if not settings_obj.admin_auth_enabled:
            return _session_payload(settings_obj, get_optional_admin_session(request))

        if not verify_admin_password(payload.password, settings_obj.admin_password_hash):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        token, session = create_admin_session_token(
            settings_obj.admin_session_secret or "",
            ttl_seconds=settings_obj.admin_session_ttl_seconds,
        )
        set_admin_session_cookie(
            response,
            token=token,
            max_age=settings_obj.admin_session_ttl_seconds,
        )
        return _session_payload(settings_obj, session)

    auth_login.__annotations__["payload"] = admin_login_payload_model
    app.post("/api/auth/login")(auth_login)

    @app.post("/api/auth/logout")
    async def auth_logout(request: Request, response: Response) -> dict[str, Any]:
        settings_obj = get_settings(request)
        clear_admin_session_cookie(response)
        return _session_payload(
            settings_obj,
            None if settings_obj.admin_auth_enabled else get_optional_admin_session(request),
        )
