from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

from supply_bot.application.errors import NotFoundError, OperationFailedError
from supply_bot.requests.application.read_models import (
    RequestDetailPayloadStorage,
    build_request_detail_payload,
)


class RequestItemDeleteStorage(RequestDetailPayloadStorage, Protocol):
    async def get_request_item(self, item_id: int) -> dict[str, Any] | None: ...

    async def delete_request_item(self, item_id: int) -> None: ...

    async def touch_draft(self, draft_id: int) -> None: ...

    async def get_draft(self, draft_id: int) -> dict[str, Any] | None: ...


@dataclass(frozen=True, slots=True)
class DeleteRequestItemCommand:
    item_id: int


class DeleteRequestItemUseCase:
    def __init__(self, storage: RequestItemDeleteStorage) -> None:
        self.storage = storage

    async def execute(self, command: DeleteRequestItemCommand) -> dict[str, Any]:
        item = await self.storage.get_request_item(command.item_id)
        if not item:
            raise NotFoundError("Request item not found")

        draft_id = int(item["draft_id"])
        await self.storage.delete_request_item(command.item_id)
        await self.storage.touch_draft(draft_id)
        draft = await self.storage.get_draft(draft_id)
        if not draft:
            raise OperationFailedError("Draft item deletion failed")
        return await build_request_detail_payload(self.storage, draft)
