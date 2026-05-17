from __future__ import annotations

from typing import Any

from supply_bot.admin_api.app_helpers import _admin_status_message
from supply_bot.admin_api.error_mapping import raise_application_http_error
from supply_bot.application.errors import ApplicationError
from supply_bot.requests.application.create_request_item import (
    CreateRequestItemCommand,
    CreateRequestItemUseCase,
)
from supply_bot.requests.application.delete_request import (
    DeleteRequestCommand,
    DeleteRequestUseCase,
)
from supply_bot.requests.application.delete_request_item import (
    DeleteRequestItemCommand,
    DeleteRequestItemUseCase,
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
from supply_bot.requests.application.update_request_delivery import (
    UpdateRequestDeliveryCommand,
    UpdateRequestDeliveryUseCase,
)
from supply_bot.requests.application.update_request_item import (
    UpdateRequestItemCommand,
    UpdateRequestItemUseCase,
)
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
    try:
        command = DeleteRequestCommand(draft_id=draft_id)
        return await DeleteRequestUseCase(storage_obj).execute(command)
    except ApplicationError as exc:
        raise_application_http_error(exc)


async def update_request_delivery(storage_obj, draft_id: int, payload) -> dict[str, Any]:
    try:
        command = UpdateRequestDeliveryCommand(
            draft_id=draft_id,
            delivery_date=payload.delivery_date,
            delivery_time=payload.delivery_time,
        )
        return await UpdateRequestDeliveryUseCase(storage_obj).execute(command)
    except ApplicationError as exc:
        raise_application_http_error(exc)


async def create_request_item(storage_obj, draft_id: int, payload) -> dict[str, Any]:
    try:
        command = CreateRequestItemCommand(
            draft_id=draft_id,
            title=payload.title,
            quantity=payload.quantity,
            unit=payload.unit,
            thickness_mm=payload.thickness_mm,
            length_mm=payload.length_mm,
            width_mm=payload.width_mm,
            note=payload.note,
        )
        return await CreateRequestItemUseCase(storage_obj).execute(command)
    except ApplicationError as exc:
        raise_application_http_error(exc)


async def update_request_item(storage_obj, item_id: int, payload) -> dict[str, Any]:
    try:
        command = UpdateRequestItemCommand(
            item_id=item_id,
            title=payload.title,
            quantity=payload.quantity,
            unit=payload.unit,
            thickness_mm=payload.thickness_mm,
            length_mm=payload.length_mm,
            width_mm=payload.width_mm,
            note=payload.note,
            detach_catalog=payload.detach_catalog,
        )
        return await UpdateRequestItemUseCase(storage_obj).execute(command)
    except ApplicationError as exc:
        raise_application_http_error(exc)


async def delete_request_item(storage_obj, item_id: int) -> dict[str, Any]:
    try:
        command = DeleteRequestItemCommand(item_id=item_id)
        return await DeleteRequestItemUseCase(storage_obj).execute(command)
    except ApplicationError as exc:
        raise_application_http_error(exc)
