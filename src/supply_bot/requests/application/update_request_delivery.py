from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from typing import Any, Protocol

from supply_bot.application.errors import NotFoundError, OperationFailedError, ValidationError
from supply_bot.requests.application.read_models import (
    RequestDetailPayloadStorage,
    build_request_detail_payload,
)


class RequestDeliveryUpdateStorage(RequestDetailPayloadStorage, Protocol):
    async def get_draft(self, draft_id: int) -> dict[str, Any] | None: ...

    async def replace_draft_delivery(
        self,
        draft_id: int,
        *,
        requested_date: str | None,
        requested_time: str | None,
        confirmed_date: str | None,
        confirmed_time: str | None,
        proposed_date: str | None,
        proposed_time: str | None,
        waiting_for: str | None,
        status: str,
    ) -> None: ...


@dataclass(frozen=True, slots=True)
class UpdateRequestDeliveryCommand:
    draft_id: int
    delivery_date: str | None
    delivery_time: str | None


class UpdateRequestDeliveryUseCase:
    def __init__(self, storage: RequestDeliveryUpdateStorage) -> None:
        self.storage = storage

    async def execute(self, command: UpdateRequestDeliveryCommand) -> dict[str, Any]:
        draft = await self.storage.get_draft(command.draft_id)
        if not draft:
            raise NotFoundError("Draft not found")

        delivery_date, delivery_time = normalize_request_delivery(
            command.delivery_date,
            command.delivery_time,
        )

        await self.storage.replace_draft_delivery(
            command.draft_id,
            requested_date=delivery_date,
            requested_time=delivery_time,
            confirmed_date=delivery_date,
            confirmed_time=delivery_time,
            proposed_date=None,
            proposed_time=None,
            waiting_for="confirmation",
            status=draft["status"],
        )
        fresh = await self.storage.get_draft(command.draft_id)
        if not fresh:
            raise OperationFailedError("Draft delivery update failed")
        return await build_request_detail_payload(self.storage, fresh)


def normalize_request_delivery(
    delivery_date: str | None,
    delivery_time: str | None,
) -> tuple[str | None, str | None]:
    normalized_date = delivery_date.strip() if delivery_date and delivery_date.strip() else None
    normalized_time = delivery_time.strip() if delivery_time and delivery_time.strip() else None

    if normalized_date is not None:
        try:
            normalized_date = date.fromisoformat(normalized_date).isoformat()
        except ValueError as exc:
            raise ValidationError("Invalid delivery date format") from exc

    if normalized_time is not None:
        normalized_time = _parse_hhmm(normalized_time)

    return normalized_date, normalized_time


def _parse_hhmm(value: str) -> str:
    text = value.strip()
    try:
        return datetime.strptime(text, "%H:%M").strftime("%H:%M")
    except ValueError as exc:
        raise ValidationError(f"Invalid time format: {value}") from exc
