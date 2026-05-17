from __future__ import annotations

import asyncio
from typing import Any

import pytest

from supply_bot.application.errors import NotFoundError, OperationFailedError, ValidationError
from supply_bot.requests.application.update_request_delivery import (
    UpdateRequestDeliveryCommand,
    UpdateRequestDeliveryUseCase,
)


class FakeRequestDeliveryStorage:
    def __init__(
        self,
        *,
        draft: dict[str, Any] | None,
        fresh_missing: bool = False,
    ) -> None:
        self.draft = draft
        self.fresh_missing = fresh_missing
        self.get_calls = 0
        self.replaced_values: dict[str, Any] | None = None
        self.items = [{"id": 10, "draft_id": 1, "raw_name": "Cement"}]
        self.group_profile = {"chat_id": 1001, "object_name": "Object Alpha"}

    async def get_draft(self, draft_id: int) -> dict[str, Any] | None:
        self.get_calls += 1
        if not self.draft or int(self.draft["id"]) != draft_id:
            return None
        if self.fresh_missing and self.get_calls > 1:
            return None
        return self.draft

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
    ) -> None:
        self.replaced_values = {
            "draft_id": draft_id,
            "requested_date": requested_date,
            "requested_time": requested_time,
            "confirmed_date": confirmed_date,
            "confirmed_time": confirmed_time,
            "proposed_date": proposed_date,
            "proposed_time": proposed_time,
            "waiting_for": waiting_for,
            "status": status,
        }

    async def list_request_items(self, draft_id: int) -> list[dict[str, Any]]:
        assert draft_id == 1
        return self.items

    async def get_group_profile(self, chat_id: int) -> dict[str, Any] | None:
        assert chat_id == 1001
        return self.group_profile


def test_update_request_delivery_normalizes_values_and_returns_detail_payload() -> None:
    draft = {"id": 1, "chat_id": 1001, "status": "collecting"}
    storage = FakeRequestDeliveryStorage(draft=draft)
    command = UpdateRequestDeliveryCommand(
        draft_id=1,
        delivery_date=" 2026-05-17 ",
        delivery_time=" 9:05 ",
    )

    result = asyncio.run(UpdateRequestDeliveryUseCase(storage).execute(command))

    assert storage.replaced_values == {
        "draft_id": 1,
        "requested_date": "2026-05-17",
        "requested_time": "09:05",
        "confirmed_date": "2026-05-17",
        "confirmed_time": "09:05",
        "proposed_date": None,
        "proposed_time": None,
        "waiting_for": "confirmation",
        "status": "collecting",
    }
    assert result == {
        "draft": draft,
        "items": storage.items,
        "group_profile": storage.group_profile,
    }


def test_update_request_delivery_blank_values_become_none() -> None:
    draft = {"id": 1, "chat_id": 1001, "status": "collecting"}
    storage = FakeRequestDeliveryStorage(draft=draft)
    command = UpdateRequestDeliveryCommand(draft_id=1, delivery_date=" ", delivery_time="")

    asyncio.run(UpdateRequestDeliveryUseCase(storage).execute(command))

    assert storage.replaced_values is not None
    assert storage.replaced_values["requested_date"] is None
    assert storage.replaced_values["requested_time"] is None
    assert storage.replaced_values["confirmed_date"] is None
    assert storage.replaced_values["confirmed_time"] is None


def test_update_request_delivery_raises_not_found_for_missing_draft() -> None:
    storage = FakeRequestDeliveryStorage(draft=None)
    command = UpdateRequestDeliveryCommand(draft_id=404, delivery_date=None, delivery_time=None)

    with pytest.raises(NotFoundError, match="Draft not found"):
        asyncio.run(UpdateRequestDeliveryUseCase(storage).execute(command))

    assert storage.replaced_values is None


@pytest.mark.parametrize(
    ("delivery_date", "delivery_time", "message"),
    [
        ("not-a-date", None, "Invalid delivery date format"),
        (None, "25:99", "Invalid time format: 25:99"),
    ],
)
def test_update_request_delivery_rejects_invalid_date_or_time(
    delivery_date: str | None,
    delivery_time: str | None,
    message: str,
) -> None:
    draft = {"id": 1, "chat_id": 1001, "status": "collecting"}
    storage = FakeRequestDeliveryStorage(draft=draft)
    command = UpdateRequestDeliveryCommand(
        draft_id=1,
        delivery_date=delivery_date,
        delivery_time=delivery_time,
    )

    with pytest.raises(ValidationError, match=message):
        asyncio.run(UpdateRequestDeliveryUseCase(storage).execute(command))

    assert storage.replaced_values is None


def test_update_request_delivery_raises_operation_failed_when_fresh_draft_missing() -> None:
    draft = {"id": 1, "chat_id": 1001, "status": "collecting"}
    storage = FakeRequestDeliveryStorage(draft=draft, fresh_missing=True)
    command = UpdateRequestDeliveryCommand(draft_id=1, delivery_date=None, delivery_time=None)

    with pytest.raises(OperationFailedError, match="Draft delivery update failed"):
        asyncio.run(UpdateRequestDeliveryUseCase(storage).execute(command))
