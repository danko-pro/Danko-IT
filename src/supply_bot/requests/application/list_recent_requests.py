from __future__ import annotations

from typing import Any, Protocol


class RecentRequestsListStorage(Protocol):
    async def list_recent_request_summaries(self, *, limit: int = 20) -> list[Any]: ...


class ListRecentRequestsUseCase:
    def __init__(self, storage: RecentRequestsListStorage) -> None:
        self.storage = storage

    async def execute(self, *, limit: int = 20) -> list[dict[str, Any]]:
        summaries = await self.storage.list_recent_request_summaries(limit=_clamp_limit(limit))
        return [summary.to_api_dict() for summary in summaries]


def _clamp_limit(limit: int, *, maximum: int = 100) -> int:
    return max(1, min(limit, maximum))
