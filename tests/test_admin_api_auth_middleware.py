from __future__ import annotations

from pathlib import Path
from tempfile import TemporaryDirectory

from fastapi.testclient import TestClient

from supply_bot.admin_api.app import create_admin_app
from supply_bot.admin_api.auth import hash_admin_password
from supply_bot.config import load_settings


def _create_auth_settings_file(root: Path, *, cookie_secure: bool = False) -> Path:
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
                f"ADMIN_SESSION_COOKIE_SECURE={int(cookie_secure)}",
                "PROJECT_DOCUMENTS_DIR=./project-documents",
            ]
        ),
        encoding="utf-8",
    )
    return config_path


def test_admin_api_middleware_requires_session_for_private_routes() -> None:
    with TemporaryDirectory() as tmp_dir:
        root = Path(tmp_dir)
        settings = load_settings(_create_auth_settings_file(root))

        with TestClient(create_admin_app(settings)) as client:
            assert client.get("/api/auth/session").status_code == 200
            assert client.get("/api/health").status_code == 200

            for path in (
                "/api/dashboard/summary",
                "/api/requests/recent",
                "/api/materials/families",
                "/api/calculator/projects",
            ):
                response = client.get(path)
                assert response.status_code == 401
                assert response.json()["detail"] == "Admin authentication required"

            reset_response = client.post("/api/requests/expire-stale")
            assert reset_response.status_code == 401
            assert reset_response.json()["detail"] == "Admin authentication required"


def test_admin_api_middleware_accepts_valid_session_for_private_routes() -> None:
    with TemporaryDirectory() as tmp_dir:
        root = Path(tmp_dir)
        settings = load_settings(_create_auth_settings_file(root))

        with TestClient(create_admin_app(settings)) as client:
            login_response = client.post("/api/auth/login", json={"password": "admin-pass"})

            assert login_response.status_code == 200
            assert login_response.json()["authenticated"] is True
            assert client.get("/api/calculator/projects").status_code == 200


def test_admin_session_cookie_secure_flag_is_configurable() -> None:
    with TemporaryDirectory() as tmp_dir:
        root = Path(tmp_dir)
        settings = load_settings(_create_auth_settings_file(root, cookie_secure=True))

        with TestClient(create_admin_app(settings)) as client:
            login_response = client.post("/api/auth/login", json={"password": "admin-pass"})

            assert login_response.status_code == 200
            assert "secure" in login_response.headers["set-cookie"].lower()
