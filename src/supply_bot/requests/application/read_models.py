from __future__ import annotations

from typing import Any, Protocol


class RequestDetailPayloadStorage(Protocol):
    async def list_request_items(self, draft_id: int) -> list[dict[str, Any]]: ...

    async def get_group_profile(self, chat_id: int) -> dict[str, Any] | None: ...


async def build_request_detail_payload(
    storage: RequestDetailPayloadStorage,
    draft: dict[str, Any],
) -> dict[str, Any]:
    items = await storage.list_request_items(int(draft["id"]))
    group_profile = await storage.get_group_profile(int(draft["chat_id"]))
    return {
        "draft": draft,
        "items": items,
        "group_profile": group_profile,
    }
