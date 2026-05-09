from supply_bot.admin_api.app_factory import ADMIN_API_CORS_ORIGINS


def test_admin_api_cors_origins_include_default_and_fallback_dev_ports() -> None:
    assert "http://127.0.0.1:5173" in ADMIN_API_CORS_ORIGINS
    assert "http://localhost:5173" in ADMIN_API_CORS_ORIGINS
    assert "http://127.0.0.1:5174" in ADMIN_API_CORS_ORIGINS
    assert "http://localhost:5174" in ADMIN_API_CORS_ORIGINS
