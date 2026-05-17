from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

from supply_bot.application.errors import NotFoundError
from supply_bot.requests.application.read_models import (
    RequestDetailPayloadStorage,
    build_request_detail_payload,
)


class RequestDetailStorage(RequestDetailPayloadStorage, Protocol):
    async def get_draft(self, draft_id: int) -> dict[str, Any] | None: ...


@dataclass(frozen=True, slots=True)
class GetRequestDetailCommand:
    draft_id: int


class GetRequestDetailUseCase:
    def __init__(self, storage: RequestDetailStorage) -> None:
        self.storage = storage

    async def execute(self, command: GetRequestDetailCommand) -> dict[str, Any]:
        draft = await self.storage.get_draft(command.draft_id)
        if not draft:
            raise NotFoundError("Draft not found")
        return await build_request_detail_payload(self.storage, draft)
