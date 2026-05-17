from __future__ import annotations

import asyncio
from typing import Any

import pytest

from supply_bot.application.errors import NotFoundError, OperationFailedError, ValidationError
from supply_bot.requests.application.create_request_item import (
    CreateRequestItemCommand,
    CreateRequestItemUseCase,
)
from supply_bot.requests.application.delete_request_item import (
    DeleteRequestItemCommand,
    DeleteRequestItemUseCase,
)
from supply_bot.requests.application.update_request_item import (
    UpdateRequestItemCommand,
    UpdateRequestItemUseCase,
)


class FakeRequestItemCrudStorage:
    def __init__(
        self,
        *,
        draft: dict[str, Any] | None = None,
        item: dict[str, Any] | None = None,
        fresh_missing: bool = False,
    ) -> None:
        self.draft = {"id": 1, "chat_id": 1001, "status": "collecting"} if draft is None else draft
        self.item = item
        self.fresh_missing = fresh_missing
        self.get_draft_calls = 0
        self.created_values: dict[str, Any] | None = None
        self.updated_values: dict[str, Any] | None = None
        self.deleted_item_id: int | None = None
        self.touched_draft_ids: list[int] = []
        self.items = [{"id": 10, "draft_id": 1, "raw_name": "Cement"}]
        self.group_profile = {"chat_id": 1001, "object_name": "Object Alpha"}

    async def get_draft(self, draft_id: int) -> dict[str, Any] | None:
        self.get_draft_calls += 1
        if not self.draft or int(self.draft["id"]) != draft_id:
            return None
        mutation_happened = (
            self.created_values is not None
            or self.updated_values is not None
            or self.deleted_item_id is not None
        )
        if self.fresh_missing and mutation_happened:
            return None
        return self.draft

    async def create_request_item(self, *, draft_id: int, **values: object) -> int:
        self.created_values = {"draft_id": draft_id, **values}
        return 10

    async def get_request_item(self, item_id: int) -> dict[str, Any] | None:
        return self.item if self.item and int(self.item["id"]) == item_id else None

    async def update_request_item(self, item_id: int, **values: object) -> None:
        self.updated_values = {"item_id": item_id, **values}

    async def delete_request_item(self, item_id: int) -> None:
        self.deleted_item_id = item_id

    async def touch_draft(self, draft_id: int) -> None:
        self.touched_draft_ids.append(draft_id)

    async def list_request_items(self, draft_id: int) -> list[dict[str, Any]]:
        assert draft_id == 1
        return self.items

    async def get_group_profile(self, chat_id: int) -> dict[str, Any] | None:
        assert chat_id == 1001
        return self.group_profile


def test_create_request_item_normalizes_values_and_returns_detail_payload() -> None:
    storage = FakeRequestItemCrudStorage()
    command = CreateRequestItemCommand(
        draft_id=1,
        title="  Cement  ",
        quantity=2,
        unit=" kg ",
        thickness_mm=1,
        length_mm=2,
        width_mm=3,
        note="  Note ",
    )

    result = asyncio.run(CreateRequestItemUseCase(storage).execute(command))

    assert storage.created_values == {
        "draft_id": 1,
        "family_id": None,
        "variant_id": None,
        "sku_id": None,
        "raw_name": "Cement",
        "normalized_name": "Cement",
        "quantity": 2.0,
        "unit": "kg",
        "thickness_mm": 1.0,
        "length_mm": 2.0,
        "width_mm": 3.0,
        "note": "Note",
    }
    assert storage.touched_draft_ids == [1]
    assert result == {
        "draft": storage.draft,
        "items": storage.items,
        "group_profile": storage.group_profile,
    }


def test_create_request_item_raises_not_found_for_missing_draft() -> None:
    storage = FakeRequestItemCrudStorage(draft=None)
    command = CreateRequestItemCommand(
        draft_id=404,
        title="Cement",
        quantity=1,
        unit=None,
        thickness_mm=None,
        length_mm=None,
        width_mm=None,
        note=None,
    )

    with pytest.raises(NotFoundError, match="Draft not found"):
        asyncio.run(CreateRequestItemUseCase(storage).execute(command))

    assert storage.created_values is None


def test_create_request_item_rejects_invalid_values() -> None:
    storage = FakeRequestItemCrudStorage()
    command = CreateRequestItemCommand(
        draft_id=1,
        title=" ",
        quantity=-1,
        unit=None,
        thickness_mm=None,
        length_mm=None,
        width_mm=None,
        note=None,
    )

    with pytest.raises(ValidationError, match="Item title is required"):
        asyncio.run(CreateRequestItemUseCase(storage).execute(command))

    assert storage.created_values is None


def test_create_request_item_raises_operation_failed_when_fresh_draft_missing() -> None:
    storage = FakeRequestItemCrudStorage(fresh_missing=True)
    command = CreateRequestItemCommand(
        draft_id=1,
        title="Cement",
        quantity=1,
        unit=None,
        thickness_mm=None,
        length_mm=None,
        width_mm=None,
        note=None,
    )

    with pytest.raises(OperationFailedError, match="Draft item creation failed"):
        asyncio.run(CreateRequestItemUseCase(storage).execute(command))


def test_update_request_item_normalizes_values_and_returns_detail_payload() -> None:
    storage = FakeRequestItemCrudStorage(item={"id": 10, "draft_id": 1})
    command = UpdateRequestItemCommand(
        item_id=10,
        title="  Sand  ",
        quantity=4,
        unit=" bag ",
        thickness_mm=None,
        length_mm=None,
        width_mm=None,
        note=" ",
        detach_catalog=True,
    )

    result = asyncio.run(UpdateRequestItemUseCase(storage).execute(command))

    assert storage.updated_values == {
        "item_id": 10,
        "raw_name": "Sand",
        "normalized_name": "Sand",
        "quantity": 4.0,
        "unit": "bag",
        "thickness_mm": None,
        "length_mm": None,
        "width_mm": None,
        "note": None,
        "family_id": None,
        "variant_id": None,
        "sku_id": None,
    }
    assert storage.touched_draft_ids == [1]
    assert result["draft"] == storage.draft


def test_update_request_item_raises_not_found_for_missing_item() -> None:
    storage = FakeRequestItemCrudStorage(item=None)
    command = UpdateRequestItemCommand(
        item_id=404,
        title="Sand",
        quantity=1,
        unit=None,
        thickness_mm=None,
        length_mm=None,
        width_mm=None,
        note=None,
        detach_catalog=False,
    )

    with pytest.raises(NotFoundError, match="Request item not found"):
        asyncio.run(UpdateRequestItemUseCase(storage).execute(command))

    assert storage.updated_values is None


def test_update_request_item_raises_operation_failed_when_fresh_draft_missing() -> None:
    storage = FakeRequestItemCrudStorage(item={"id": 10, "draft_id": 1}, fresh_missing=True)
    command = UpdateRequestItemCommand(
        item_id=10,
        title="Sand",
        quantity=1,
        unit=None,
        thickness_mm=None,
        length_mm=None,
        width_mm=None,
        note=None,
        detach_catalog=False,
    )

    with pytest.raises(OperationFailedError, match="Draft item update failed"):
        asyncio.run(UpdateRequestItemUseCase(storage).execute(command))


def test_delete_request_item_deletes_item_and_returns_detail_payload() -> None:
    storage = FakeRequestItemCrudStorage(item={"id": 10, "draft_id": 1})
    command = DeleteRequestItemCommand(item_id=10)

    result = asyncio.run(DeleteRequestItemUseCase(storage).execute(command))

    assert storage.deleted_item_id == 10
    assert storage.touched_draft_ids == [1]
    assert result == {
        "draft": storage.draft,
        "items": storage.items,
        "group_profile": storage.group_profile,
    }


def test_delete_request_item_raises_not_found_for_missing_item() -> None:
    storage = FakeRequestItemCrudStorage(item=None)
    command = DeleteRequestItemCommand(item_id=404)

    with pytest.raises(NotFoundError, match="Request item not found"):
        asyncio.run(DeleteRequestItemUseCase(storage).execute(command))

    assert storage.deleted_item_id is None


def test_delete_request_item_raises_operation_failed_when_fresh_draft_missing() -> None:
    storage = FakeRequestItemCrudStorage(item={"id": 10, "draft_id": 1}, fresh_missing=True)
    command = DeleteRequestItemCommand(item_id=10)

    with pytest.raises(OperationFailedError, match="Draft item deletion failed"):
        asyncio.run(DeleteRequestItemUseCase(storage).execute(command))
