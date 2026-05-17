from __future__ import annotations

import asyncio
from typing import Any

import pytest

from supply_bot.application.errors import NotFoundError
from supply_bot.requests.application.get_request_detail import (
    GetRequestDetailCommand,
    GetRequestDetailUseCase,
)


class FakeRequestDetailStorage:
    def __init__(self, *, draft: dict[str, Any] | None) -> None:
        self.draft = draft
        self.items = [
            {
                "id": 10,
                "draft_id": 1,
                "raw_name": "Cement",
                "quantity": 2,
            }
        ]
        self.group_profile = {
            "chat_id": 1001,
            "object_name": "Object Alpha",
        }

    async def get_draft(self, draft_id: int) -> dict[str, Any] | None:
        return self.draft if self.draft and int(self.draft["id"]) == draft_id else None

    async def list_request_items(self, draft_id: int) -> list[dict[str, Any]]:
        assert draft_id == 1
        return self.items

    async def get_group_profile(self, chat_id: int) -> dict[str, Any] | None:
        assert chat_id == 1001
        return self.group_profile


def test_get_request_detail_returns_payload_shape() -> None:
    draft = {
        "id": 1,
        "chat_id": 1001,
        "master_name": "Admin",
        "status": "collecting",
    }
    storage = FakeRequestDetailStorage(draft=draft)
    command = GetRequestDetailCommand(draft_id=1)

    result = asyncio.run(GetRequestDetailUseCase(storage).execute(command))

    assert result == {
        "draft": draft,
        "items": storage.items,
        "group_profile": storage.group_profile,
    }


def test_get_request_detail_raises_not_found_for_missing_draft() -> None:
    storage = FakeRequestDetailStorage(draft=None)
    command = GetRequestDetailCommand(draft_id=404)

    with pytest.raises(NotFoundError, match="Draft not found"):
        asyncio.run(GetRequestDetailUseCase(storage).execute(command))
