from __future__ import annotations

import asyncio
from typing import Any

import pytest

from supply_bot.application.errors import NotFoundError, ValidationError
from supply_bot.materials.application.create_alias import (
    CreateMaterialAliasCommand,
    CreateMaterialAliasUseCase,
)


class FakeMaterialAliasCreateStorage:
    def __init__(
        self,
        *,
        family: dict[str, Any] | None = None,
        variant: dict[str, Any] | None = None,
        sku: dict[str, Any] | None = None,
    ) -> None:
        self.family = family
        self.variant = variant
        self.sku = sku
        self.created_values: dict[str, Any] | None = None

    async def get_family(self, family_id: int) -> dict[str, Any] | None:
        return self.family if self.family and int(self.family["id"]) == family_id else None

    async def get_variant(self, variant_id: int) -> dict[str, Any] | None:
        return self.variant if self.variant and int(self.variant["id"]) == variant_id else None

    async def get_sku(self, sku_id: int) -> dict[str, Any] | None:
        return self.sku if self.sku and int(self.sku["id"]) == sku_id else None

    async def create_alias(
        self,
        alias: str,
        *,
        family_id: int | None,
        variant_id: int | None,
        sku_id: int | None,
        priority: int,
    ) -> int:
        self.created_values = {
            "alias": alias,
            "family_id": family_id,
            "variant_id": variant_id,
            "sku_id": sku_id,
            "priority": priority,
        }
        return 21


def test_create_material_alias_validates_targets_and_returns_count() -> None:
    storage = FakeMaterialAliasCreateStorage(
        family={"id": 1},
        variant={"id": 2, "family_id": 1},
        sku={"id": 3, "family_id": 1, "variant_id": 2},
    )
    command = CreateMaterialAliasCommand(
        alias=" alpha\nbeta; gamma, delta ",
        family_id=1,
        variant_id=2,
        sku_id=3,
        priority=50,
    )

    result = asyncio.run(CreateMaterialAliasUseCase(storage).execute(command))

    assert storage.created_values == {
        "alias": "alpha\nbeta; gamma, delta",
        "family_id": 1,
        "variant_id": 2,
        "sku_id": 3,
        "priority": 50,
    }
    assert result == {
        "created_count": 4,
        "family_id": 1,
        "variant_id": 2,
        "sku_id": 3,
    }


def test_create_material_alias_rejects_empty_alias() -> None:
    storage = FakeMaterialAliasCreateStorage(family={"id": 1})
    command = CreateMaterialAliasCommand(alias=" ", family_id=1, variant_id=None, sku_id=None, priority=100)

    with pytest.raises(ValidationError, match="alias is required"):
        asyncio.run(CreateMaterialAliasUseCase(storage).execute(command))

    assert storage.created_values is None


def test_create_material_alias_rejects_missing_target() -> None:
    storage = FakeMaterialAliasCreateStorage()
    command = CreateMaterialAliasCommand(
        alias="Alias",
        family_id=None,
        variant_id=None,
        sku_id=None,
        priority=100,
    )

    with pytest.raises(ValidationError, match="Target family, variant or sku is required"):
        asyncio.run(CreateMaterialAliasUseCase(storage).execute(command))

    assert storage.created_values is None


@pytest.mark.parametrize(
    ("command", "message"),
    [
        (
            CreateMaterialAliasCommand(alias="Alias", family_id=404, variant_id=None, sku_id=None, priority=100),
            "Family not found",
        ),
        (
            CreateMaterialAliasCommand(alias="Alias", family_id=None, variant_id=404, sku_id=None, priority=100),
            "Variant not found",
        ),
        (
            CreateMaterialAliasCommand(alias="Alias", family_id=None, variant_id=None, sku_id=404, priority=100),
            "SKU not found",
        ),
    ],
)
def test_create_material_alias_raises_not_found_for_missing_targets(
    command: CreateMaterialAliasCommand,
    message: str,
) -> None:
    storage = FakeMaterialAliasCreateStorage()

    with pytest.raises(NotFoundError, match=message):
        asyncio.run(CreateMaterialAliasUseCase(storage).execute(command))

    assert storage.created_values is None


def test_create_material_alias_rejects_variant_from_other_family() -> None:
    storage = FakeMaterialAliasCreateStorage(family={"id": 1}, variant={"id": 2, "family_id": 99})
    command = CreateMaterialAliasCommand(
        alias="Alias",
        family_id=1,
        variant_id=2,
        sku_id=None,
        priority=100,
    )

    with pytest.raises(ValidationError, match="Variant does not belong to family"):
        asyncio.run(CreateMaterialAliasUseCase(storage).execute(command))

    assert storage.created_values is None


@pytest.mark.parametrize(
    ("sku", "command", "message"),
    [
        (
            {"id": 3, "family_id": 99, "variant_id": 2},
            CreateMaterialAliasCommand(alias="Alias", family_id=1, variant_id=None, sku_id=3, priority=100),
            "SKU does not belong to family",
        ),
        (
            {"id": 3, "family_id": 1, "variant_id": 99},
            CreateMaterialAliasCommand(alias="Alias", family_id=None, variant_id=2, sku_id=3, priority=100),
            "SKU does not belong to variant",
        ),
    ],
)
def test_create_material_alias_rejects_sku_target_mismatch(
    sku: dict[str, Any],
    command: CreateMaterialAliasCommand,
    message: str,
) -> None:
    storage = FakeMaterialAliasCreateStorage(family={"id": 1}, variant={"id": 2, "family_id": 1}, sku=sku)

    with pytest.raises(ValidationError, match=message):
        asyncio.run(CreateMaterialAliasUseCase(storage).execute(command))

    assert storage.created_values is None
