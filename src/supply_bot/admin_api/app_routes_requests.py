# pyright: reportInvalidTypeForm=false
# mypy: disable-error-code=valid-type

from typing import Any

from fastapi import FastAPI, Request

from supply_bot.admin_api.app_helpers import _admin_status_message
from supply_bot.admin_api.deps import get_settings, get_storage
from supply_bot.admin_api.error_mapping import resolve_application_result
from supply_bot.admin_api.use_cases.requests import (
    create_request_item as create_request_item_use_case,
)
from supply_bot.admin_api.use_cases.requests import (
    delete_request as delete_request_use_case,
)
from supply_bot.admin_api.use_cases.requests import (
    delete_request_item as delete_request_item_use_case,
)
from supply_bot.admin_api.use_cases.requests import (
    update_request_delivery as update_request_delivery_use_case,
)
from supply_bot.admin_api.use_cases.requests import (
    update_request_item as update_request_item_use_case,
)
from supply_bot.requests.application.expire_stale_requests import (
    ExpireStaleRequestsCommand,
    ExpireStaleRequestsUseCase,
)
from supply_bot.requests.application.get_request_detail import (
    GetRequestDetailCommand,
    GetRequestDetailUseCase,
)
from supply_bot.requests.application.list_recent_requests import ListRecentRequestsUseCase
from supply_bot.requests.application.update_request_status import (
    UpdateRequestStatusCommand,
    UpdateRequestStatusUseCase,
)
from supply_bot.services.notifications import TelegramNotificationOutboxService


def register_request_routes(
    app: FastAPI,
    *,
    request_status_payload_model,
    request_action_result_model,
    request_delivery_payload_model,
    request_item_payload_model,
) -> None:
    # Роуты принимают Pydantic-модели из app.py во время сборки приложения.
    # Бизнес-операции заявок живут в use-case слое, чтобы ими могли пользоваться другие входы.
    @app.get("/api/requests/recent")
    async def recent_requests(request: Request, limit: int = 20) -> list[dict[str, Any]]:
        storage_obj = get_storage(request)
        return await resolve_application_result(
            ListRecentRequestsUseCase(storage_obj).execute(limit=limit)
        )

    @app.post("/api/requests/expire-stale")
    async def expire_stale_requests(request: Request, max_age_hours: int | None = None) -> dict[str, int]:
        settings_obj = get_settings(request)
        storage_obj = get_storage(request)
        command = ExpireStaleRequestsCommand(
            max_age_hours=max_age_hours,
            default_max_age_hours=settings_obj.request_draft_stale_hours,
        )
        return await resolve_application_result(
            ExpireStaleRequestsUseCase(storage_obj).execute(command)
        )

    @app.get("/api/requests/{draft_id}")
    async def request_detail(request: Request, draft_id: int) -> dict[str, Any]:
        storage_obj = get_storage(request)
        command = GetRequestDetailCommand(draft_id=draft_id)
        return await resolve_application_result(
            GetRequestDetailUseCase(storage_obj).execute(command)
        )

    async def update_request_status(
        request: Request,
        draft_id: int,
        payload,
    ):
        settings_obj = get_settings(request)
        storage_obj = get_storage(request)
        command = UpdateRequestStatusCommand(draft_id=draft_id, status=payload.status)
        notifications = TelegramNotificationOutboxService(settings=settings_obj, storage=storage_obj)
        result = await resolve_application_result(
            UpdateRequestStatusUseCase(
                storage_obj,
                notifications=notifications,
                status_message_resolver=_admin_status_message,
            ).execute(command)
        )
        return request_action_result_model(**result)

    update_request_status.__annotations__["payload"] = request_status_payload_model
    app.patch("/api/requests/{draft_id}/status", response_model=request_action_result_model)(update_request_status)

    @app.delete("/api/requests/{draft_id}")
    async def delete_request(request: Request, draft_id: int) -> dict[str, Any]:
        return await delete_request_use_case(get_storage(request), draft_id)

    async def update_request_delivery(
        request: Request,
        draft_id: int,
        payload,
    ) -> dict[str, Any]:
        return await update_request_delivery_use_case(get_storage(request), draft_id, payload)

    update_request_delivery.__annotations__["payload"] = request_delivery_payload_model
    app.patch("/api/requests/{draft_id}/delivery")(update_request_delivery)

    async def create_request_item(
        request: Request,
        draft_id: int,
        payload,
    ) -> dict[str, Any]:
        return await create_request_item_use_case(get_storage(request), draft_id, payload)

    create_request_item.__annotations__["payload"] = request_item_payload_model
    app.post("/api/requests/{draft_id}/items")(create_request_item)

    async def update_request_item(
        request: Request,
        item_id: int,
        payload,
    ) -> dict[str, Any]:
        return await update_request_item_use_case(get_storage(request), item_id, payload)

    update_request_item.__annotations__["payload"] = request_item_payload_model
    app.patch("/api/requests/items/{item_id}")(update_request_item)

    @app.delete("/api/requests/items/{item_id}")
    async def delete_request_item(request: Request, item_id: int) -> dict[str, Any]:
        return await delete_request_item_use_case(get_storage(request), item_id)
