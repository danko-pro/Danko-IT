from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

from supply_bot.application.errors import NotFoundError, ValidationError
from supply_bot.domain.request_lifecycle import can_delete_request_status


class RequestDeleteStorage(Protocol):
    async def get_draft(self, draft_id: int) -> dict[str, Any] | None: ...

    async def delete_draft(self, draft_id: int) -> None: ...


@dataclass(frozen=True, slots=True)
class DeleteRequestCommand:
    draft_id: int


class DeleteRequestUseCase:
    def __init__(self, storage: RequestDeleteStorage) -> None:
        self.storage = storage

    async def execute(self, command: DeleteRequestCommand) -> dict[str, Any]:
        draft = await self.storage.get_draft(command.draft_id)
        if not draft:
            raise NotFoundError("Draft not found")

        if not can_delete_request_status(draft["status"]):
            raise ValidationError("Only drafts, awaiting confirmation, or cancelled requests can be deleted")

        await self.storage.delete_draft(command.draft_id)
        return {"deleted": True, "draft_id": command.draft_id}
