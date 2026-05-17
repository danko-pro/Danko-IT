from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

from supply_bot.application.errors import NotFoundError, OperationFailedError
from supply_bot.requests.application.item_values import (
    RequestItemValuesCommand,
    build_request_item_create_values,
)
from supply_bot.requests.application.read_models import (
    RequestDetailPayloadStorage,
    build_request_detail_payload,
)


class RequestItemCreateStorage(RequestDetailPayloadStorage, Protocol):
    async def get_draft(self, draft_id: int) -> dict[str, Any] | None: ...

    async def create_request_item(self, *, draft_id: int, **values: object) -> int: ...

    async def touch_draft(self, draft_id: int) -> None: ...


@dataclass(frozen=True, slots=True)
class CreateRequestItemCommand(RequestItemValuesCommand):
    draft_id: int


class CreateRequestItemUseCase:
    def __init__(self, storage: RequestItemCreateStorage) -> None:
        self.storage = storage

    async def execute(self, command: CreateRequestItemCommand) -> dict[str, Any]:
        draft = await self.storage.get_draft(command.draft_id)
        if not draft:
            raise NotFoundError("Draft not found")

        await self.storage.create_request_item(
            draft_id=command.draft_id,
            **build_request_item_create_values(command),
        )
        await self.storage.touch_draft(command.draft_id)
        fresh = await self.storage.get_draft(command.draft_id)
        if not fresh:
            raise OperationFailedError("Draft item creation failed")
        return await build_request_detail_payload(self.storage, fresh)
