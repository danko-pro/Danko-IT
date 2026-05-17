from __future__ import annotations

import asyncio
from typing import Any

import pytest

from supply_bot.application.errors import NotFoundError, OperationFailedError, ValidationError
from supply_bot.materials.application.create_sku import (
    CreateMaterialSkuCommand,
    CreateMaterialSkuUseCase,
)


class FakeMaterialSkuCreateStorage:
    def __init__(
        self,
        *,
        family: dict[str, Any] | None = None,
        variant: dict[str, Any] | None = None,
        return_created_sku: bool = True,
    ) -> None:
        self.family = {"id": 1} if family is None else family
        self.variant = variant
        self.return_created_sku = return_created_sku
        self.created_values: dict[str, Any] | None = None
        self.created_sku_id = 11

    async def get_family(self, family_id: int) -> dict[str, Any] | None:
        return self.family if self.family and int(self.family["id"]) == family_id else None

    async def get_variant(self, variant_id: int) -> dict[str, Any] | None:
        return self.variant if self.variant and int(self.variant["id"]) == variant_id else None

    async def create_sku(
        self,
        *,
        family_id: int,
        variant_id: int | None,
        title: str,
        article: str | None,
        brand: str | None,
        unit: str,
        thickness_mm: float | None,
        length_mm: float | None,
        width_mm: float | None,
        source_description: str | None,
    ) -> int:
        self.created_values = {
            "family_id": family_id,
            "variant_id": variant_id,
            "title": title,
            "article": article,
            "brand": brand,
            "unit": unit,
            "thickness_mm": thickness_mm,
            "length_mm": length_mm,
            "width_mm": width_mm,
            "source_description": source_description,
        }
        return self.created_sku_id

    async def get_sku(self, sku_id: int) -> dict[str, Any] | None:
        if not self.return_created_sku or sku_id != self.created_sku_id:
            return None
        assert self.created_values is not None
        return {"id": sku_id, **self.created_values}


def test_create_material_sku_normalizes_values_and_returns_created_sku() -> None:
    storage = FakeMaterialSkuCreateStorage(variant={"id": 2, "family_id": 1})
    command = CreateMaterialSkuCommand(
        family_id=1,
        variant_id=2,
        title="  Paint SKU  ",
        article="  A-1 ",
        brand="  Brand ",
        unit=" kg ",
        thickness_mm=1,
        length_mm=2.5,
        width_mm=3,
        source_description="  Source ",
    )

    result = asyncio.run(CreateMaterialSkuUseCase(storage).execute(command))

    assert storage.created_values == {
        "family_id": 1,
        "variant_id": 2,
        "title": "Paint SKU",
        "article": "A-1",
        "brand": "Brand",
        "unit": "kg",
        "thickness_mm": 1.0,
        "length_mm": 2.5,
        "width_mm": 3.0,
        "source_description": "Source",
    }
    assert result == {"id": 11, **storage.created_values}


def test_create_material_sku_raises_not_found_for_missing_family() -> None:
    storage = FakeMaterialSkuCreateStorage(family={})
    command = CreateMaterialSkuCommand(
        family_id=404,
        variant_id=None,
        title="SKU",
        article=None,
        brand=None,
        unit="pcs",
        thickness_mm=None,
        length_mm=None,
        width_mm=None,
        source_description=None,
    )

    with pytest.raises(NotFoundError, match="Family not found"):
        asyncio.run(CreateMaterialSkuUseCase(storage).execute(command))

    assert storage.created_values is None


def test_create_material_sku_raises_not_found_for_missing_variant() -> None:
    storage = FakeMaterialSkuCreateStorage()
    command = CreateMaterialSkuCommand(
        family_id=1,
        variant_id=404,
        title="SKU",
        article=None,
        brand=None,
        unit="pcs",
        thickness_mm=None,
        length_mm=None,
        width_mm=None,
        source_description=None,
    )

    with pytest.raises(NotFoundError, match="Variant not found"):
        asyncio.run(CreateMaterialSkuUseCase(storage).execute(command))

    assert storage.created_values is None


def test_create_material_sku_rejects_variant_from_other_family() -> None:
    storage = FakeMaterialSkuCreateStorage(variant={"id": 2, "family_id": 99})
    command = CreateMaterialSkuCommand(
        family_id=1,
        variant_id=2,
        title="SKU",
        article=None,
        brand=None,
        unit="pcs",
        thickness_mm=None,
        length_mm=None,
        width_mm=None,
        source_description=None,
    )

    with pytest.raises(ValidationError, match="Variant does not belong to family"):
        asyncio.run(CreateMaterialSkuUseCase(storage).execute(command))

    assert storage.created_values is None


@pytest.mark.parametrize(
    ("title", "unit", "message"),
    [
        (" ", "pcs", "title is required"),
        ("SKU", " ", "unit is required"),
    ],
)
def test_create_material_sku_rejects_empty_required_text(
    title: str,
    unit: str,
    message: str,
) -> None:
    storage = FakeMaterialSkuCreateStorage()
    command = CreateMaterialSkuCommand(
        family_id=1,
        variant_id=None,
        title=title,
        article=None,
        brand=None,
        unit=unit,
        thickness_mm=None,
        length_mm=None,
        width_mm=None,
        source_description=None,
    )

    with pytest.raises(ValidationError, match=message):
        asyncio.run(CreateMaterialSkuUseCase(storage).execute(command))

    assert storage.created_values is None


def test_create_material_sku_rejects_non_positive_dimensions() -> None:
    storage = FakeMaterialSkuCreateStorage()
    command = CreateMaterialSkuCommand(
        family_id=1,
        variant_id=None,
        title="SKU",
        article=None,
        brand=None,
        unit="pcs",
        thickness_mm=-1,
        length_mm=None,
        width_mm=None,
        source_description=None,
    )

    with pytest.raises(ValidationError, match="thickness_mm must be positive"):
        asyncio.run(CreateMaterialSkuUseCase(storage).execute(command))

    assert storage.created_values is None


def test_create_material_sku_raises_operation_failed_when_created_sku_missing() -> None:
    storage = FakeMaterialSkuCreateStorage(return_created_sku=False)
    command = CreateMaterialSkuCommand(
        family_id=1,
        variant_id=None,
        title="SKU",
        article=None,
        brand=None,
        unit="pcs",
        thickness_mm=None,
        length_mm=None,
        width_mm=None,
        source_description=None,
    )

    with pytest.raises(OperationFailedError, match="SKU was not created"):
        asyncio.run(CreateMaterialSkuUseCase(storage).execute(command))
