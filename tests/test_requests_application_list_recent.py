from __future__ import annotations

import asyncio
from typing import Any

from supply_bot.requests.application.list_recent_requests import ListRecentRequestsUseCase


class FakeRequestSummary:
    def __init__(self, payload: dict[str, Any]) -> None:
        self.payload = payload

    def to_api_dict(self) -> dict[str, Any]:
        return self.payload


class FakeRecentRequestsStorage:
    def __init__(self) -> None:
        self.requested_limits: list[int] = []

    async def list_recent_request_summaries(self, *, limit: int = 20) -> list[FakeRequestSummary]:
        self.requested_limits.append(limit)
        return [
            FakeRequestSummary(
                {
                    "id": 1,
                    "chat_id": 1001,
                    "master_name": "Admin",
                    "status": "collecting",
                    "items_count": 2,
                }
            )
        ]


def test_list_recent_requests_clamps_limit_to_minimum() -> None:
    storage = FakeRecentRequestsStorage()

    result = asyncio.run(ListRecentRequestsUseCase(storage).execute(limit=0))

    assert storage.requested_limits == [1]
    assert result == [
        {
            "id": 1,
            "chat_id": 1001,
            "master_name": "Admin",
            "status": "collecting",
            "items_count": 2,
        }
    ]


def test_list_recent_requests_clamps_limit_to_maximum() -> None:
    storage = FakeRecentRequestsStorage()

    asyncio.run(ListRecentRequestsUseCase(storage).execute(limit=500))

    assert storage.requested_limits == [100]


def test_list_recent_requests_returns_summary_api_dicts() -> None:
    storage = FakeRecentRequestsStorage()

    result = asyncio.run(ListRecentRequestsUseCase(storage).execute(limit=20))

    assert storage.requested_limits == [20]
    assert result[0]["id"] == 1
    assert result[0]["items_count"] == 2
