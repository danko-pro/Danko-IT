from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from supply_bot.admin_api.app import create_admin_app
from supply_bot.admin_api.auth import hash_admin_password
from supply_bot.config import load_settings


def _write_rate_limited_auth_settings_file(
    root: Path,
    *,
    attempts: int = 2,
    window_seconds: int = 600,
    lockout_seconds: int = 120,
) -> Path:
    config_path = root / ".env.test"
    config_path.write_text(
        "\n".join(
            [
                "BOT_TOKEN=test-token",
                "DEBUG=1",
                "DATABASE_PATH=./test.sqlite3",
                f"ADMIN_PASSWORD_HASH={hash_admin_password('admin-pass', salt='fixed-salt', iterations=120000)}",
                "ADMIN_SESSION_SECRET=test-session-secret",
                "ADMIN_SESSION_TTL_SECONDS=3600",
                "ADMIN_SESSION_COOKIE_SECURE=0",
                "PROJECT_DOCUMENTS_DIR=./project-documents",
                f"ADMIN_LOGIN_RATE_LIMIT_ATTEMPTS={attempts}",
                f"ADMIN_LOGIN_RATE_LIMIT_WINDOW_SECONDS={window_seconds}",
                f"ADMIN_LOGIN_RATE_LIMIT_LOCKOUT_SECONDS={lockout_seconds}",
            ]
        ),
        encoding="utf-8",
    )
    return config_path


def test_invalid_login_attempts_return_401_until_lockout_then_429(tmp_path: Path) -> None:
    settings = load_settings(_write_rate_limited_auth_settings_file(tmp_path, attempts=2))

    with TestClient(create_admin_app(settings)) as client:
        first_response = client.post("/api/auth/login", json={"password": "wrong-pass"})
        second_response = client.post("/api/auth/login", json={"password": "wrong-pass"})
        third_response = client.post("/api/auth/login", json={"password": "wrong-pass"})

    assert first_response.status_code == 401
    assert first_response.json() == {"detail": "Invalid credentials"}

    assert second_response.status_code == 429
    assert second_response.json() == {"detail": "Too many failed login attempts. Try again later."}
    assert int(second_response.headers["Retry-After"]) > 0
    assert second_response.headers["X-Auth-Reason"] == "login-rate-limited"

    assert third_response.status_code == 429
    assert third_response.json() == {"detail": "Too many failed login attempts. Try again later."}


def test_successful_login_resets_failed_attempts_and_keeps_response_shape(tmp_path: Path) -> None:
    settings = load_settings(_write_rate_limited_auth_settings_file(tmp_path, attempts=2))

    with TestClient(create_admin_app(settings)) as client:
        failed_response = client.post("/api/auth/login", json={"password": "wrong-pass"})
        login_response = client.post("/api/auth/login", json={"password": "admin-pass"})
        next_failed_response = client.post("/api/auth/login", json={"password": "wrong-pass"})

    assert failed_response.status_code == 401
    assert login_response.status_code == 200
    login_payload = login_response.json()
    assert set(login_payload) == {
        "auth_enabled",
        "authenticated",
        "mode",
        "user",
        "expires_at",
    }
    assert login_payload["authenticated"] is True
    assert "login_rate_limit" not in login_payload

    assert next_failed_response.status_code == 401
    assert next_failed_response.json() == {"detail": "Invalid credentials"}


def test_auth_diagnostics_contains_safe_login_rate_limit_config(tmp_path: Path) -> None:
    settings = load_settings(
        _write_rate_limited_auth_settings_file(
            tmp_path,
            attempts=3,
            window_seconds=120,
            lockout_seconds=180,
        )
    )

    with TestClient(create_admin_app(settings)) as client:
        response = client.get("/api/auth/diagnostics")

    assert response.status_code == 200
    assert response.json()["login_rate_limit"] == {
        "enabled": True,
        "attempts": 3,
        "window_seconds": 120,
        "lockout_seconds": 180,
    }
    assert "admin-pass" not in response.text
    assert "test-session-secret" not in response.text
