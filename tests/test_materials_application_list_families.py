from __future__ import annotations

import asyncio
from typing import Any

from supply_bot.materials.application.list_families import ListMaterialFamiliesUseCase


class FakeMaterialFamilyStorage:
    def __init__(self, families: list[dict[str, Any]]) -> None:
        self.families = families

    async def list_families(self) -> list[dict[str, Any]]:
        return self.families

    async def list_variants(self, family_id: int) -> list[dict[str, Any]]:
        return [
            {"id": family_id * 10 + 1, "family_id": family_id, "is_active": 1},
            {"id": family_id * 10 + 2, "family_id": family_id, "is_active": 0},
        ]

    async def list_skus(self, *, family_id: int) -> list[dict[str, Any]]:
        return [
            {"id": family_id * 100 + 1, "family_id": family_id, "is_active": 1},
            {"id": family_id * 100 + 2, "family_id": family_id, "is_active": 1},
        ]

    async def list_aliases(self, *, family_id: int) -> list[dict[str, Any]]:
        return [
            {"id": family_id * 1000 + 1, "family_id": family_id, "is_active": 1},
            {"id": family_id * 1000 + 2, "family_id": family_id, "is_active": 0},
        ]


def _family(family_id: int) -> dict[str, Any]:
    return {
        "id": family_id,
        "code": f"family-{family_id}",
        "canonical_name": f"Family {family_id}",
        "default_unit": "pcs",
        "category": "test",
        "dialog_fields": ["brand"],
        "is_active": 1,
    }


def test_list_material_families_returns_overview_shape() -> None:
    storage = FakeMaterialFamilyStorage([_family(1)])

    result = asyncio.run(ListMaterialFamiliesUseCase(storage).execute(limit=100))

    assert result == [
        {
            "id": 1,
            "code": "family-1",
            "canonical_name": "Family 1",
            "default_unit": "pcs",
            "category": "test",
            "dialog_fields": ["brand"],
            "is_active": 1,
            "variants_count": 1,
            "skus_count": 2,
            "aliases_count": 1,
        }
    ]


def test_list_material_families_clamps_limit_to_minimum_one() -> None:
    storage = FakeMaterialFamilyStorage([_family(1), _family(2)])

    result = asyncio.run(ListMaterialFamiliesUseCase(storage).execute(limit=0))

    assert len(result) == 1
    assert result[0]["id"] == 1


def test_list_material_families_clamps_limit_to_maximum_one_hundred() -> None:
    storage = FakeMaterialFamilyStorage([_family(index) for index in range(1, 106)])

    result = asyncio.run(ListMaterialFamiliesUseCase(storage).execute(limit=200))

    assert len(result) == 100
    assert result[-1]["id"] == 100
