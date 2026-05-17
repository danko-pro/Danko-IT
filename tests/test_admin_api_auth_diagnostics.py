from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from supply_bot.admin_api.app import create_admin_app
from supply_bot.admin_api.auth import hash_admin_password
from supply_bot.config import load_settings


def _write_auth_settings_file(
    root: Path,
    *,
    cookie_secure: bool = True,
    cookie_samesite: str = "None",
) -> tuple[Path, str, str]:
    admin_secret = "test-session-secret-for-diagnostics"
    password_hash = hash_admin_password("admin-pass", salt="fixed-salt", iterations=120000)
    config_path = root / ".env.test"
    config_path.write_text(
        "\n".join(
            [
                "BOT_TOKEN=test-token",
                "DEBUG=1",
                "DATABASE_PATH=./test.sqlite3",
                f"ADMIN_PASSWORD_HASH={password_hash}",
                f"ADMIN_SESSION_SECRET={admin_secret}",
                "ADMIN_SESSION_TTL_SECONDS=3600",
                f"ADMIN_SESSION_COOKIE_SECURE={int(cookie_secure)}",
                f"ADMIN_SESSION_COOKIE_SAMESITE={cookie_samesite}",
                "PROJECT_DOCUMENTS_DIR=./project-documents",
            ]
        ),
        encoding="utf-8",
    )
    return config_path, admin_secret, password_hash


def test_auth_diagnostics_endpoint_returns_safe_config_without_secrets(
    tmp_path: Path,
    monkeypatch,
) -> None:
    monkeypatch.setenv("ADMIN_API_CORS_ORIGINS", "https://name-danko-site.onrender.com")
    config_path, admin_secret, password_hash = _write_auth_settings_file(tmp_path)
    settings = load_settings(config_path)

    with TestClient(create_admin_app(settings)) as client:
        response = client.get("/api/auth/diagnostics")

    assert response.status_code == 200
    payload = response.json()
    response_text = response.text
    assert payload["auth_enabled"] is True
    assert payload["cookie"] == {
        "name": "supply_admin_session",
        "secure": True,
        "samesite": "none",
        "httponly": True,
        "path": "/",
    }
    assert payload["cors"] == {
        "allow_credentials": True,
        "origins": ["https://name-danko-site.onrender.com"],
    }
    assert payload["login_rate_limit"] == {
        "enabled": True,
        "attempts": 5,
        "window_seconds": 600,
        "lockout_seconds": 900,
    }
    assert payload["warnings"] == []
    assert admin_secret not in response_text
    assert password_hash not in response_text
    assert "admin-pass" not in response_text


def test_auth_middleware_401_body_unchanged_and_includes_diagnostic_headers(tmp_path: Path) -> None:
    config_path, _, _ = _write_auth_settings_file(tmp_path, cookie_secure=False, cookie_samesite="lax")
    settings = load_settings(config_path)

    with TestClient(create_admin_app(settings)) as client:
        response = client.get("/api/dashboard/summary")

    assert response.status_code == 401
    assert response.json() == {"detail": "Admin authentication required"}
    assert response.headers["X-Auth-Reason"] == "missing-or-invalid-session"
    assert response.headers["X-Auth-Cookie-Name"] == "supply_admin_session"
