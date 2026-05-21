# pyright: reportInvalidTypeForm=false
# mypy: disable-error-code=valid-type

from typing import Any

from fastapi import Depends, FastAPI, Request

from supply_bot.admin_api.app_helpers import _parse_hhmm
from supply_bot.admin_api.auth import AdminSession
from supply_bot.admin_api.deps import (
    get_dashboard_read_model,
    get_settings,
    get_storage,
    require_admin_session,
)
from supply_bot.projects.application.dashboard_root_read_model import build_dashboard_root_summary_payload
from supply_bot.services.notifications import TelegramNotificationOutboxService


def register_support_routes(
    app: FastAPI,
    *,
    delivery_settings_payload_model,
) -> None:
    # Модели payload передаются из app.py при сборке приложения.
    # Для FastAPI это нормальный route-factory подход, но статический анализатор
    # помечает такие inner annotations как invalid type form.
    # Low-volatility utility endpoints are grouped here to keep app.py transport-only.
    @app.get("/api/health")
    async def healthcheck() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/api/dashboard/summary")
    async def dashboard_summary(request: Request) -> dict[str, Any]:
        return await get_dashboard_read_model(request).get_summary()

    @app.get("/api/dashboard/root-summary")
    async def dashboard_root_summary(
        request: Request,
        _session: AdminSession = Depends(require_admin_session),
    ) -> dict[str, Any]:
        storage_obj = get_storage(request)
        projects = await storage_obj.list_projects()
        project_ids = [int(project["id"]) for project in projects]
        ledger_entries_by_project = await storage_obj.list_project_ledger_entries_for_projects(project_ids)
        return build_dashboard_root_summary_payload(
            projects=projects,
            ledger_entries_by_project=ledger_entries_by_project,
        )

    @app.get("/api/groups")
    async def groups(request: Request, limit: int = 20) -> list[dict[str, Any]]:
        return await get_storage(request).list_group_profiles(limit=limit)

    @app.get("/api/notifications/telegram")
    async def telegram_notifications(
        request: Request,
        status: str | None = "pending",
        limit: int = 50,
    ) -> list[dict[str, Any]]:
        notifications = await get_storage(request).list_telegram_notifications(status=status, limit=limit)
        return [notification.to_api_dict() for notification in notifications]

    @app.post("/api/notifications/telegram/flush")
    async def flush_telegram_notifications(request: Request, limit: int = 20) -> dict[str, int]:
        notifications = TelegramNotificationOutboxService(
            settings=get_settings(request),
            storage=get_storage(request),
        )
        result = await notifications.flush_pending(limit=limit)
        return {
            "delivered_count": result.delivered_count,
            "failed_count": result.failed_count,
        }

    @app.get("/api/settings/delivery")
    async def delivery_settings(request: Request) -> dict[str, str]:
        settings_obj = get_settings(request)
        storage_obj = get_storage(request)
        return await storage_obj.get_delivery_defaults(
            {
                "delivery_start": settings_obj.default_delivery_start.strftime("%H:%M"),
                "delivery_end": settings_obj.default_delivery_end.strftime("%H:%M"),
                "delivery_fallback": settings_obj.default_delivery_fallback.strftime("%H:%M"),
            }
        )

    @app.patch("/api/settings/delivery")
    async def update_delivery_settings(
        request: Request,
        payload: delivery_settings_payload_model,
    ) -> dict[str, str]:
        storage_obj = get_storage(request)
        delivery_start = _parse_hhmm(payload.delivery_start)
        delivery_end = _parse_hhmm(payload.delivery_end)
        delivery_fallback = _parse_hhmm(payload.delivery_fallback)
        await storage_obj.update_delivery_defaults(
            delivery_start=delivery_start,
            delivery_end=delivery_end,
            delivery_fallback=delivery_fallback,
        )
        return await storage_obj.get_delivery_defaults(
            {
                "delivery_start": delivery_start,
                "delivery_end": delivery_end,
                "delivery_fallback": delivery_fallback,
            }
        )
