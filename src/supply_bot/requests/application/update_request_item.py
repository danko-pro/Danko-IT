from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

from supply_bot.application.errors import NotFoundError, OperationFailedError
from supply_bot.requests.application.item_values import (
    RequestItemUpdateValuesCommand,
    build_request_item_update_values,
)
from supply_bot.requests.application.read_models import (
    RequestDetailPayloadStorage,
    build_request_detail_payload,
)


class RequestItemUpdateStorage(RequestDetailPayloadStorage, Protocol):
    async def get_request_item(self, item_id: int) -> dict[str, Any] | None: ...

    async def update_request_item(self, item_id: int, **values: object) -> None: ...

    async def touch_draft(self, draft_id: int) -> None: ...

    async def get_draft(self, draft_id: int) -> dict[str, Any] | None: ...


@dataclass(frozen=True, slots=True)
class UpdateRequestItemCommand(RequestItemUpdateValuesCommand):
    item_id: int


class UpdateRequestItemUseCase:
    def __init__(self, storage: RequestItemUpdateStorage) -> None:
        self.storage = storage

    async def execute(self, command: UpdateRequestItemCommand) -> dict[str, Any]:
        item = await self.storage.get_request_item(command.item_id)
        if not item:
            raise NotFoundError("Request item not found")

        await self.storage.update_request_item(
            command.item_id,
            **build_request_item_update_values(command),
        )
        draft_id = int(item["draft_id"])
        await self.storage.touch_draft(draft_id)
        draft = await self.storage.get_draft(draft_id)
        if not draft:
            raise OperationFailedError("Draft item update failed")
        return await build_request_detail_payload(self.storage, draft)
