from __future__ import annotations

import asyncio
from typing import Any

import pytest

from supply_bot.application.errors import NotFoundError, OperationFailedError, ValidationError
from supply_bot.materials.application.create_variant import (
    CreateMaterialVariantCommand,
    CreateMaterialVariantUseCase,
)


class FakeMaterialVariantCreateStorage:
    def __init__(
        self,
        *,
        missing_family: bool = False,
        return_created_variant: bool = True,
    ) -> None:
        self.family = None if missing_family else {"id": 1, "canonical_name": "Paint"}
        self.return_created_variant = return_created_variant
        self.created_values: dict[str, Any] | None = None
        self.created_variant_id = 9

    async def get_family(self, family_id: int) -> dict[str, Any] | None:
        return self.family if self.family and int(self.family["id"]) == family_id else None

    async def create_variant(self, family_id: int, display_name: str) -> int:
        self.created_values = {
            "family_id": family_id,
            "display_name": display_name,
        }
        return self.created_variant_id

    async def get_variant(self, variant_id: int) -> dict[str, Any] | None:
        if not self.return_created_variant or variant_id != self.created_variant_id:
            return None
        assert self.created_values is not None
        return {
            "id": variant_id,
            "family_id": self.created_values["family_id"],
            "display_name": self.created_values["display_name"],
            "is_active": 1,
        }


def test_create_material_variant_returns_created_variant() -> None:
    storage = FakeMaterialVariantCreateStorage()
    command = CreateMaterialVariantCommand(family_id=1, display_name="  Matte  ")

    result = asyncio.run(CreateMaterialVariantUseCase(storage).execute(command))

    assert storage.created_values == {
        "family_id": 1,
        "display_name": "Matte",
    }
    assert result == {
        "id": 9,
        "family_id": 1,
        "display_name": "Matte",
        "is_active": 1,
    }


def test_create_material_variant_raises_not_found_for_missing_family() -> None:
    storage = FakeMaterialVariantCreateStorage(missing_family=True)
    command = CreateMaterialVariantCommand(family_id=404, display_name="Matte")

    with pytest.raises(NotFoundError, match="Family not found"):
        asyncio.run(CreateMaterialVariantUseCase(storage).execute(command))

    assert storage.created_values is None


def test_create_material_variant_rejects_empty_display_name() -> None:
    storage = FakeMaterialVariantCreateStorage()
    command = CreateMaterialVariantCommand(family_id=1, display_name=" ")

    with pytest.raises(ValidationError, match="display_name is required"):
        asyncio.run(CreateMaterialVariantUseCase(storage).execute(command))

    assert storage.created_values is None


def test_create_material_variant_raises_operation_failed_when_created_variant_missing() -> None:
    storage = FakeMaterialVariantCreateStorage(return_created_variant=False)
    command = CreateMaterialVariantCommand(family_id=1, display_name="Matte")

    with pytest.raises(OperationFailedError, match="Variant was not created"):
        asyncio.run(CreateMaterialVariantUseCase(storage).execute(command))
