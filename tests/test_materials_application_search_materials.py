from __future__ import annotations

import asyncio

from supply_bot.domain.materials import MaterialSearchTarget
from supply_bot.materials.application.search_materials import SearchMaterialsUseCase


class FakeMaterialSearchStorage:
    def __init__(self) -> None:
        self.seen_query: str | None = None

    async def search_material_targets(self, query: str) -> list[MaterialSearchTarget]:
        self.seen_query = query
        return [
            MaterialSearchTarget(
                type="family",
                id=1,
                title="Paint",
                family_id=1,
                variant_id=None,
                sku_id=None,
            )
        ]


def test_search_materials_returns_target_api_dicts() -> None:
    storage = FakeMaterialSearchStorage()

    result = asyncio.run(SearchMaterialsUseCase(storage).execute("paint"))

    assert storage.seen_query == "paint"
    assert result == [
        {
            "type": "family",
            "id": 1,
            "title": "Paint",
            "family_id": 1,
            "variant_id": None,
            "sku_id": None,
        }
    ]
