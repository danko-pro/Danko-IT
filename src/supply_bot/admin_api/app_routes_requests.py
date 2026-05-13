# pyright: reportInvalidTypeForm=false
# mypy: disable-error-code=valid-type

from typing import Any

from fastapi import FastAPI, Request

from supply_bot.admin_api.deps import get_settings, get_storage
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
    expire_stale_requests as expire_stale_requests_use_case,
)
from supply_bot.admin_api.use_cases.requests import (
    get_request_detail,
    list_recent_requests,
)
from supply_bot.admin_api.use_cases.requests import (
    update_request_delivery as update_request_delivery_use_case,
)
from supply_bot.admin_api.use_cases.requests import (
    update_request_item as update_request_item_use_case,
)
from supply_bot.admin_api.use_cases.requests import (
    update_request_status as update_request_status_use_case,
)


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
        return await list_recent_requests(get_storage(request), limit=limit)

    @app.post("/api/requests/expire-stale")
    async def expire_stale_requests(request: Request, max_age_hours: int | None = None) -> dict[str, int]:
        return await expire_stale_requests_use_case(
            get_storage(request),
            get_settings(request),
            max_age_hours=max_age_hours,
        )

    @app.get("/api/requests/{draft_id}")
    async def request_detail(request: Request, draft_id: int) -> dict[str, Any]:
        return await get_request_detail(get_storage(request), draft_id)

    async def update_request_status(
        request: Request,
        draft_id: int,
        payload,
    ):
        result = await update_request_status_use_case(
            get_storage(request),
            get_settings(request),
            draft_id,
            payload.status,
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
