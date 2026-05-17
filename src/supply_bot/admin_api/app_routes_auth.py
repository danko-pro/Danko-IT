from __future__ import annotations

from typing import Any

from fastapi import FastAPI, HTTPException, Request, Response

from supply_bot.admin_api.auth import (
    SESSION_COOKIE_NAME,
    AdminSession,
    clear_admin_session_cookie,
    create_admin_session_token,
    hash_admin_password,
    set_admin_session_cookie,
    verify_admin_password,
)
from supply_bot.admin_api.deps import get_optional_admin_session, get_settings, get_user_auth_repository
from supply_bot.config import Settings, build_auth_runtime_warnings
from supply_bot.storage_auth import normalize_app_user_email


def _session_payload(settings: Settings, session: AdminSession | None) -> dict[str, Any]:
    if not settings.admin_auth_enabled:
        return {
            "auth_enabled": False,
            "authenticated": True,
            "mode": "local-bypass",
            "user": {
                "id": None,
                "subject": "local-admin",
                "role": "admin",
                "email": None,
                "display_name": "Local admin",
            },
            "expires_at": None,
        }

    return {
        "auth_enabled": True,
        "authenticated": session is not None,
        "mode": "session",
        "user": (
            {
                "id": session.user_id,
                "subject": session.subject,
                "role": session.role,
                "email": session.email,
                "display_name": session.display_name,
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
    user_register_payload_model,
) -> None:
    @app.get("/api/auth/diagnostics")
    async def auth_diagnostics(request: Request) -> dict[str, Any]:
        settings_obj = get_settings(request)
        cors_origins = tuple(getattr(request.app.state, "admin_cors_origins", ()))
        return {
            "auth_enabled": settings_obj.admin_auth_enabled,
            "cookie": {
                "name": SESSION_COOKIE_NAME,
                "secure": settings_obj.admin_session_cookie_secure,
                "samesite": settings_obj.admin_session_cookie_samesite,
                "httponly": True,
                "path": "/",
            },
            "cors": {
                "allow_credentials": True,
                "origins": list(cors_origins),
            },
            "warnings": build_auth_runtime_warnings(settings_obj, cors_origins=cors_origins),
        }

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

        email = normalize_app_user_email(getattr(payload, "email", "") or "")
        if email:
            user_repository = get_user_auth_repository(request)
            user = await user_repository.get_app_user_by_email(email)
            if (
                user is None
                or not int(user["is_active"])
                or not verify_admin_password(payload.password, str(user["password_hash"]))
            ):
                raise HTTPException(status_code=401, detail="Invalid credentials")

            await user_repository.touch_app_user_login(int(user["id"]))
            token, session = create_admin_session_token(
                settings_obj.admin_session_secret or "",
                ttl_seconds=settings_obj.admin_session_ttl_seconds,
                subject=str(user["email"]),
                role=str(user["role"] or "user"),
                user_id=int(user["id"]),
                email=str(user["email"]),
                display_name=str(user["display_name"] or ""),
            )
            set_admin_session_cookie(
                response,
                token=token,
                max_age=settings_obj.admin_session_ttl_seconds,
                secure=settings_obj.admin_session_cookie_secure,
                samesite=settings_obj.admin_session_cookie_samesite,
            )
            return _session_payload(settings_obj, session)

        if not settings_obj.admin_password_enabled or not verify_admin_password(
            payload.password,
            settings_obj.admin_password_hash,
        ):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        token, session = create_admin_session_token(
            settings_obj.admin_session_secret or "",
            ttl_seconds=settings_obj.admin_session_ttl_seconds,
        )
        set_admin_session_cookie(
            response,
            token=token,
            max_age=settings_obj.admin_session_ttl_seconds,
            secure=settings_obj.admin_session_cookie_secure,
            samesite=settings_obj.admin_session_cookie_samesite,
        )
        return _session_payload(settings_obj, session)

    auth_login.__annotations__["payload"] = admin_login_payload_model
    app.post("/api/auth/login")(auth_login)

    async def auth_register(
        request: Request,
        response: Response,
        payload,
    ) -> dict[str, Any]:
        settings_obj = get_settings(request)
        if not settings_obj.admin_auth_enabled:
            raise HTTPException(status_code=400, detail="User registration requires ADMIN_SESSION_SECRET")

        email = normalize_app_user_email(payload.email)
        password = str(payload.password or "").strip()
        if not email or "@" not in email:
            raise HTTPException(status_code=400, detail="Valid email is required")
        if len(password) < 8:
            raise HTTPException(status_code=400, detail="Password must contain at least 8 characters")

        try:
            user = await get_user_auth_repository(request).create_app_user(
                email=email,
                display_name=str(payload.display_name or "").strip(),
                password_hash=hash_admin_password(password),
            )
        except ValueError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc

        token, session = create_admin_session_token(
            settings_obj.admin_session_secret or "",
            ttl_seconds=settings_obj.admin_session_ttl_seconds,
            subject=str(user["email"]),
            role=str(user["role"] or "user"),
            user_id=int(user["id"]),
            email=str(user["email"]),
            display_name=str(user["display_name"] or ""),
        )
        set_admin_session_cookie(
            response,
            token=token,
            max_age=settings_obj.admin_session_ttl_seconds,
            secure=settings_obj.admin_session_cookie_secure,
            samesite=settings_obj.admin_session_cookie_samesite,
        )
        return _session_payload(settings_obj, session)

    auth_register.__annotations__["payload"] = user_register_payload_model
    app.post("/api/auth/register")(auth_register)

    @app.post("/api/auth/logout")
    async def auth_logout(request: Request, response: Response) -> dict[str, Any]:
        settings_obj = get_settings(request)
        clear_admin_session_cookie(
            response,
            secure=settings_obj.admin_session_cookie_secure,
            samesite=settings_obj.admin_session_cookie_samesite,
        )
        return _session_payload(
            settings_obj,
            None if settings_obj.admin_auth_enabled else get_optional_admin_session(request),
        )
