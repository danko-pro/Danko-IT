from __future__ import annotations

from typing import Any, Protocol

from supply_bot.materials.application.read_models import (
    MaterialFamilyOverviewStorage,
    build_material_family_overview,
)


class MaterialFamiliesListStorage(MaterialFamilyOverviewStorage, Protocol):
    async def list_families(self) -> list[dict[str, Any]]: ...


class ListMaterialFamiliesUseCase:
    def __init__(self, storage: MaterialFamiliesListStorage) -> None:
        self.storage = storage

    async def execute(self, *, limit: int = 100) -> list[dict[str, Any]]:
        families = await self.storage.list_families()
        trimmed = families[: max(1, min(limit, 100))]
        return [await build_material_family_overview(self.storage, family) for family in trimmed]
