from __future__ import annotations

from typing import Any, Protocol


class MaterialFamilyOverviewStorage(Protocol):
    async def list_variants(self, family_id: int) -> list[dict[str, Any]]: ...

    async def list_skus(self, *, family_id: int) -> list[dict[str, Any]]: ...

    async def list_aliases(self, *, family_id: int) -> list[dict[str, Any]]: ...


async def build_material_family_overview(
    storage: MaterialFamilyOverviewStorage,
    family: dict[str, Any],
) -> dict[str, Any]:
    family_id = int(family["id"])
    variants = await storage.list_variants(family_id)
    skus = await storage.list_skus(family_id=family_id)
    aliases = await storage.list_aliases(family_id=family_id)
    return {
        "id": family_id,
        "code": family["code"],
        "canonical_name": family["canonical_name"],
        "default_unit": family["default_unit"],
        "category": family["category"],
        "dialog_fields": family["dialog_fields"],
        "is_active": family["is_active"],
        "variants_count": sum(1 for variant in variants if variant["is_active"]),
        "skus_count": sum(1 for sku in skus if sku["is_active"]),
        "aliases_count": sum(1 for alias in aliases if alias["is_active"]),
    }
