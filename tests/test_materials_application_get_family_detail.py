from __future__ import annotations

import asyncio
from typing import Any

import pytest

from supply_bot.application.errors import NotFoundError
from supply_bot.materials.application.get_family_detail import (
    GetMaterialFamilyDetailCommand,
    GetMaterialFamilyDetailUseCase,
)


class FakeMaterialFamilyDetailStorage:
    def __init__(self, family: dict[str, Any] | None) -> None:
        self.family = family
        self.aliases = [{"id": 11, "family_id": 1, "alias": "alias", "is_active": 1}]
        self.variants = [{"id": 21, "family_id": 1, "display_name": "Variant", "is_active": 1}]
        self.skus = [{"id": 31, "family_id": 1, "title": "SKU", "is_active": 1}]

    async def get_family(self, family_id: int) -> dict[str, Any] | None:
        return self.family if self.family and int(self.family["id"]) == family_id else None

    async def list_aliases(self, *, family_id: int) -> list[dict[str, Any]]:
        return self.aliases

    async def list_variants(self, family_id: int) -> list[dict[str, Any]]:
        return self.variants

    async def list_skus(self, *, family_id: int) -> list[dict[str, Any]]:
        return self.skus


def _family() -> dict[str, Any]:
    return {
        "id": 1,
        "code": "paint",
        "canonical_name": "Paint",
        "default_unit": "l",
        "category": "finish",
        "dialog_fields": ["brand", "color"],
        "is_active": 1,
    }


def test_get_material_family_detail_returns_family_aliases_variants_skus() -> None:
    storage = FakeMaterialFamilyDetailStorage(_family())

    result = asyncio.run(
        GetMaterialFamilyDetailUseCase(storage).execute(GetMaterialFamilyDetailCommand(family_id=1))
    )

    assert result["family"] == {
        "id": 1,
        "code": "paint",
        "canonical_name": "Paint",
        "default_unit": "l",
        "category": "finish",
        "dialog_fields": ["brand", "color"],
        "is_active": 1,
        "variants_count": 1,
        "skus_count": 1,
        "aliases_count": 1,
    }
    assert result["aliases"] == storage.aliases
    assert result["variants"] == storage.variants
    assert result["skus"] == storage.skus


def test_get_material_family_detail_raises_not_found_for_missing_family() -> None:
    storage = FakeMaterialFamilyDetailStorage(None)

    with pytest.raises(NotFoundError, match="Family not found"):
        asyncio.run(
            GetMaterialFamilyDetailUseCase(storage).execute(
                GetMaterialFamilyDetailCommand(family_id=404)
            )
        )
