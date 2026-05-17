from __future__ import annotations

from typing import Any, Protocol


class MaterialSearchTarget(Protocol):
    def to_api_dict(self) -> dict[str, Any]: ...


class MaterialSearchStorage(Protocol):
    async def search_material_targets(self, query: str) -> list[MaterialSearchTarget]: ...


class SearchMaterialsUseCase:
    def __init__(self, storage: MaterialSearchStorage) -> None:
        self.storage = storage

    async def execute(self, query: str) -> list[dict[str, Any]]:
        targets = await self.storage.search_material_targets(query)
        return [target.to_api_dict() for target in targets]
