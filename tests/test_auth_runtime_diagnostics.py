from __future__ import annotations

from dataclasses import replace
from pathlib import Path

from supply_bot.config import Settings, build_auth_runtime_warnings, load_settings


def _write_settings_file(
    root: Path,
    *,
    admin_session_secret: str | None = "test-session-secret",
    cookie_secure: bool = False,
    cookie_samesite: str | None = None,
) -> Path:
    lines = [
        "BOT_TOKEN=test-token",
        "DEBUG=1",
        "DATABASE_PATH=./test.sqlite3",
        "PROJECT_DOCUMENTS_DIR=./project-documents",
        "ADMIN_SESSION_TTL_SECONDS=3600",
        f"ADMIN_SESSION_COOKIE_SECURE={int(cookie_secure)}",
    ]
    if admin_session_secret is not None:
        lines.append(f"ADMIN_SESSION_SECRET={admin_session_secret}")
    if cookie_samesite is not None:
        lines.append(f"ADMIN_SESSION_COOKIE_SAMESITE={cookie_samesite}")

    config_path = root / ".env.test"
    config_path.write_text("\n".join(lines), encoding="utf-8")
    return config_path


def _load_test_settings(
    tmp_path: Path,
    *,
    admin_session_secret: str | None = "test-session-secret",
    cookie_secure: bool = False,
    cookie_samesite: str | None = None,
) -> Settings:
    return load_settings(
        _write_settings_file(
            tmp_path,
            admin_session_secret=admin_session_secret,
            cookie_secure=cookie_secure,
            cookie_samesite=cookie_samesite,
        )
    )


def test_auth_runtime_warnings_include_missing_session_secret(tmp_path: Path) -> None:
    settings = _load_test_settings(tmp_path, admin_session_secret=None)

    warnings = build_auth_runtime_warnings(
        settings,
        cors_origins=("https://name-danko-site.onrender.com",),
    )

    assert "ADMIN_SESSION_SECRET is not configured; admin auth is disabled/local-bypass." in warnings


def test_auth_runtime_warnings_include_insecure_cookie_for_auth_enabled(tmp_path: Path) -> None:
    settings = _load_test_settings(tmp_path, cookie_secure=False, cookie_samesite="lax")

    warnings = build_auth_runtime_warnings(
        settings,
        cors_origins=("https://name-danko-site.onrender.com",),
    )

    assert "Production HTTPS deployments should use ADMIN_SESSION_COOKIE_SECURE=true." in warnings


def test_auth_runtime_warnings_include_samesite_not_none_for_cross_origin(tmp_path: Path) -> None:
    settings = _load_test_settings(tmp_path, cookie_secure=True, cookie_samesite="lax")

    warnings = build_auth_runtime_warnings(
        settings,
        cors_origins=("https://name-danko-site.onrender.com",),
    )

    assert (
        "Cross-origin frontend/backend deployments usually require "
        "ADMIN_SESSION_COOKIE_SAMESITE=none."
    ) in warnings


def test_auth_runtime_warnings_include_samesite_none_without_secure(tmp_path: Path) -> None:
    settings = _load_test_settings(tmp_path, cookie_secure=True, cookie_samesite="none")
    settings = replace(settings, admin_session_cookie_secure=False)

    warnings = build_auth_runtime_warnings(
        settings,
        cors_origins=("https://name-danko-site.onrender.com",),
    )

    assert "ADMIN_SESSION_COOKIE_SAMESITE=none requires ADMIN_SESSION_COOKIE_SECURE=true." in warnings


def test_auth_runtime_warnings_include_missing_production_cors_origin(tmp_path: Path) -> None:
    settings = _load_test_settings(tmp_path, cookie_secure=True, cookie_samesite="none")

    warnings = build_auth_runtime_warnings(
        settings,
        cors_origins=("http://127.0.0.1:5173", "http://localhost:5173"),
    )

    assert "Production admin frontend origin may be missing from ADMIN_API_CORS_ORIGINS." in warnings
