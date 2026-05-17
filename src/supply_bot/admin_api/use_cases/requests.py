from __future__ import annotations

from typing import Any

from fastapi import HTTPException

from supply_bot.admin_api.app_helpers import (
    _admin_status_message,
    _request_detail_payload,
)
from supply_bot.admin_api.app_routes_requests_support import (
    build_request_item_create_values,
    build_request_item_update_values,
    normalize_request_delivery,
)
from supply_bot.admin_api.error_mapping import raise_application_http_error
from supply_bot.application.errors import ApplicationError
from supply_bot.domain.request_lifecycle import can_delete_request_status
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


async def list_recent_requests(storage_obj, *, limit: int = 20) -> list[dict[str, Any]]:
    try:
        return await ListRecentRequestsUseCase(storage_obj).execute(limit=limit)
    except ApplicationError as exc:
        raise_application_http_error(exc)


async def expire_stale_requests(storage_obj, settings_obj, *, max_age_hours: int | None = None) -> dict[str, int]:
    try:
        command = ExpireStaleRequestsCommand(
            max_age_hours=max_age_hours,
            default_max_age_hours=settings_obj.request_draft_stale_hours,
        )
        return await ExpireStaleRequestsUseCase(storage_obj).execute(command)
    except ApplicationError as exc:
        raise_application_http_error(exc)


async def get_request_detail(storage_obj, draft_id: int) -> dict[str, Any]:
    try:
        command = GetRequestDetailCommand(draft_id=draft_id)
        return await GetRequestDetailUseCase(storage_obj).execute(command)
    except ApplicationError as exc:
        raise_application_http_error(exc)


async def update_request_status(storage_obj, settings_obj, draft_id: int, status: str) -> dict[str, Any]:
    try:
        command = UpdateRequestStatusCommand(draft_id=draft_id, status=status)
        notifications = TelegramNotificationOutboxService(settings=settings_obj, storage=storage_obj)
        return await UpdateRequestStatusUseCase(
            storage_obj,
            notifications=notifications,
            status_message_resolver=_admin_status_message,
        ).execute(command)
    except ApplicationError as exc:
        raise_application_http_error(exc)


async def delete_request(storage_obj, draft_id: int) -> dict[str, Any]:
    draft = await storage_obj.get_draft(draft_id)
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")

    if not can_delete_request_status(draft["status"]):
        raise HTTPException(
            status_code=400,
            detail="Only drafts, awaiting confirmation, or cancelled requests can be deleted",
        )

    await storage_obj.delete_draft(draft_id)
    return {"deleted": True, "draft_id": draft_id}


async def update_request_delivery(storage_obj, draft_id: int, payload) -> dict[str, Any]:
    draft = await storage_obj.get_draft(draft_id)
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")

    delivery_date, delivery_time = normalize_request_delivery(payload.delivery_date, payload.delivery_time)

    await storage_obj.replace_draft_delivery(
        draft_id,
        requested_date=delivery_date,
        requested_time=delivery_time,
        confirmed_date=delivery_date,
        confirmed_time=delivery_time,
        proposed_date=None,
        proposed_time=None,
        waiting_for="confirmation",
        status=draft["status"],
    )
    fresh = await storage_obj.get_draft(draft_id)
    if not fresh:
        raise HTTPException(status_code=500, detail="Draft delivery update failed")
    return await _request_detail_payload(storage_obj, fresh)


async def create_request_item(storage_obj, draft_id: int, payload) -> dict[str, Any]:
    draft = await storage_obj.get_draft(draft_id)
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")

    await storage_obj.create_request_item(draft_id=draft_id, **build_request_item_create_values(payload))
    await storage_obj.touch_draft(draft_id)
    fresh = await storage_obj.get_draft(draft_id)
    if not fresh:
        raise HTTPException(status_code=500, detail="Draft item creation failed")
    return await _request_detail_payload(storage_obj, fresh)


async def update_request_item(storage_obj, item_id: int, payload) -> dict[str, Any]:
    item = await storage_obj.get_request_item(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Request item not found")

    await storage_obj.update_request_item(item_id, **build_request_item_update_values(payload))
    await storage_obj.touch_draft(int(item["draft_id"]))
    draft = await storage_obj.get_draft(int(item["draft_id"]))
    if not draft:
        raise HTTPException(status_code=500, detail="Draft item update failed")
    return await _request_detail_payload(storage_obj, draft)


async def delete_request_item(storage_obj, item_id: int) -> dict[str, Any]:
    item = await storage_obj.get_request_item(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Request item not found")

    draft_id = int(item["draft_id"])
    await storage_obj.delete_request_item(item_id)
    await storage_obj.touch_draft(draft_id)
    draft = await storage_obj.get_draft(draft_id)
    if not draft:
        raise HTTPException(status_code=500, detail="Draft item deletion failed")
    return await _request_detail_payload(storage_obj, draft)
