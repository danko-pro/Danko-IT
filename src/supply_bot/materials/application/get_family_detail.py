from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

from supply_bot.application.errors import NotFoundError
from supply_bot.materials.application.read_models import (
    MaterialFamilyOverviewStorage,
    build_material_family_overview,
)


class MaterialFamilyDetailStorage(MaterialFamilyOverviewStorage, Protocol):
    async def get_family(self, family_id: int) -> dict[str, Any] | None: ...

    async def list_aliases(self, *, family_id: int) -> list[dict[str, Any]]: ...

    async def list_variants(self, family_id: int) -> list[dict[str, Any]]: ...

    async def list_skus(self, *, family_id: int) -> list[dict[str, Any]]: ...


@dataclass(frozen=True, slots=True)
class GetMaterialFamilyDetailCommand:
    family_id: int


class GetMaterialFamilyDetailUseCase:
    def __init__(self, storage: MaterialFamilyDetailStorage) -> None:
        self.storage = storage

    async def execute(self, command: GetMaterialFamilyDetailCommand) -> dict[str, Any]:
        family = await self.storage.get_family(command.family_id)
        if not family:
            raise NotFoundError("Family not found")
        aliases = await self.storage.list_aliases(family_id=command.family_id)
        variants = await self.storage.list_variants(command.family_id)
        skus = await self.storage.list_skus(family_id=command.family_id)
        return {
            "family": await build_material_family_overview(self.storage, family),
            "aliases": aliases,
            "variants": variants,
            "skus": skus,
        }
