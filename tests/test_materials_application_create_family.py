from __future__ import annotations

import asyncio
from typing import Any

import pytest

from supply_bot.application.errors import OperationFailedError, ValidationError
from supply_bot.materials.application.create_family import (
    CreateMaterialFamilyCommand,
    CreateMaterialFamilyUseCase,
)


class FakeMaterialFamilyCreateStorage:
    def __init__(self, *, return_created_family: bool = True) -> None:
        self.return_created_family = return_created_family
        self.created_values: dict[str, Any] | None = None
        self.created_family_id = 7

    async def create_family(
        self,
        *,
        canonical_name: str,
        default_unit: str,
        dialog_fields: list[str],
        category: str | None,
    ) -> int:
        self.created_values = {
            "canonical_name": canonical_name,
            "default_unit": default_unit,
            "dialog_fields": dialog_fields,
            "category": category,
        }
        return self.created_family_id

    async def get_family(self, family_id: int) -> dict[str, Any] | None:
        if not self.return_created_family or family_id != self.created_family_id:
            return None
        assert self.created_values is not None
        return {
            "id": family_id,
            "code": "paint",
            "canonical_name": self.created_values["canonical_name"],
            "default_unit": self.created_values["default_unit"],
            "category": self.created_values["category"],
            "dialog_fields": self.created_values["dialog_fields"],
            "is_active": 1,
        }

    async def list_variants(self, family_id: int) -> list[dict[str, Any]]:
        return [{"id": 1, "family_id": family_id, "is_active": 1}]

    async def list_skus(self, *, family_id: int) -> list[dict[str, Any]]:
        return [{"id": 2, "family_id": family_id, "is_active": 1}]

    async def list_aliases(self, *, family_id: int) -> list[dict[str, Any]]:
        return [{"id": 3, "family_id": family_id, "is_active": 1}]


def test_create_material_family_normalizes_values_and_returns_overview() -> None:
    storage = FakeMaterialFamilyCreateStorage()
    command = CreateMaterialFamilyCommand(
        canonical_name="  Paint  ",
        default_unit=" l ",
        dialog_fields=[" brand ", " ", "color"],
        category="  ",
    )

    result = asyncio.run(CreateMaterialFamilyUseCase(storage).execute(command))

    assert storage.created_values == {
        "canonical_name": "Paint",
        "default_unit": "l",
        "dialog_fields": ["brand", "color"],
        "category": None,
    }
    assert result == {
        "id": 7,
        "code": "paint",
        "canonical_name": "Paint",
        "default_unit": "l",
        "category": None,
        "dialog_fields": ["brand", "color"],
        "is_active": 1,
        "variants_count": 1,
        "skus_count": 1,
        "aliases_count": 1,
    }


def test_create_material_family_rejects_empty_canonical_name() -> None:
    storage = FakeMaterialFamilyCreateStorage()
    command = CreateMaterialFamilyCommand(
        canonical_name=" ",
        default_unit="pcs",
        dialog_fields=[],
        category=None,
    )

    with pytest.raises(ValidationError, match="canonical_name is required"):
        asyncio.run(CreateMaterialFamilyUseCase(storage).execute(command))

    assert storage.created_values is None


def test_create_material_family_rejects_empty_default_unit() -> None:
    storage = FakeMaterialFamilyCreateStorage()
    command = CreateMaterialFamilyCommand(
        canonical_name="Paint",
        default_unit=" ",
        dialog_fields=[],
        category=None,
    )

    with pytest.raises(ValidationError, match="default_unit is required"):
        asyncio.run(CreateMaterialFamilyUseCase(storage).execute(command))

    assert storage.created_values is None


def test_create_material_family_raises_operation_failed_when_created_family_missing() -> None:
    storage = FakeMaterialFamilyCreateStorage(return_created_family=False)
    command = CreateMaterialFamilyCommand(
        canonical_name="Paint",
        default_unit="pcs",
        dialog_fields=[],
        category=None,
    )

    with pytest.raises(OperationFailedError, match="Family was not created"):
        asyncio.run(CreateMaterialFamilyUseCase(storage).execute(command))
