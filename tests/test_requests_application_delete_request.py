from __future__ import annotations

import asyncio
from typing import Any

import pytest

from supply_bot.application.errors import NotFoundError, ValidationError
from supply_bot.requests.application.delete_request import (
    DeleteRequestCommand,
    DeleteRequestUseCase,
)


class FakeRequestDeleteStorage:
    def __init__(self, draft: dict[str, Any] | None) -> None:
        self.draft = draft
        self.deleted_draft_id: int | None = None

    async def get_draft(self, draft_id: int) -> dict[str, Any] | None:
        return self.draft if self.draft and int(self.draft["id"]) == draft_id else None

    async def delete_draft(self, draft_id: int) -> None:
        self.deleted_draft_id = draft_id


def test_delete_request_raises_not_found_for_missing_draft() -> None:
    storage = FakeRequestDeleteStorage(draft=None)
    command = DeleteRequestCommand(draft_id=404)

    with pytest.raises(NotFoundError, match="Draft not found"):
        asyncio.run(DeleteRequestUseCase(storage).execute(command))

    assert storage.deleted_draft_id is None


def test_delete_request_rejects_disallowed_status() -> None:
    storage = FakeRequestDeleteStorage(draft={"id": 1, "status": "done"})
    command = DeleteRequestCommand(draft_id=1)

    with pytest.raises(
        ValidationError,
        match="Only drafts, awaiting confirmation, or cancelled requests can be deleted",
    ):
        asyncio.run(DeleteRequestUseCase(storage).execute(command))

    assert storage.deleted_draft_id is None


@pytest.mark.parametrize("status", ["collecting", "awaiting_confirmation", "cancelled"])
def test_delete_request_deletes_allowed_statuses(status: str) -> None:
    storage = FakeRequestDeleteStorage(draft={"id": 1, "status": status})
    command = DeleteRequestCommand(draft_id=1)

    result = asyncio.run(DeleteRequestUseCase(storage).execute(command))

    assert storage.deleted_draft_id == 1
    assert result == {"deleted": True, "draft_id": 1}
