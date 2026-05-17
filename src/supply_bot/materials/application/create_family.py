from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

from supply_bot.application.errors import OperationFailedError, ValidationError
from supply_bot.materials.application.read_models import (
    MaterialFamilyOverviewStorage,
    build_material_family_overview,
)


class MaterialFamilyCreateStorage(MaterialFamilyOverviewStorage, Protocol):
    async def create_family(
        self,
        *,
        canonical_name: str,
        default_unit: str,
        dialog_fields: list[str],
        category: str | None,
    ) -> int: ...

    async def get_family(self, family_id: int) -> dict[str, Any] | None: ...


@dataclass(frozen=True, slots=True)
class CreateMaterialFamilyCommand:
    canonical_name: str | None
    default_unit: str | None
    dialog_fields: list[str]
    category: str | None


class CreateMaterialFamilyUseCase:
    def __init__(self, storage: MaterialFamilyCreateStorage) -> None:
        self.storage = storage

    async def execute(self, command: CreateMaterialFamilyCommand) -> dict[str, Any]:
        canonical_name = (command.canonical_name or "").strip()
        default_unit = (command.default_unit or "").strip()
        if not canonical_name:
            raise ValidationError("canonical_name is required")
        if not default_unit:
            raise ValidationError("default_unit is required")

        family_id = await self.storage.create_family(
            canonical_name=canonical_name,
            default_unit=default_unit,
            dialog_fields=[field.strip() for field in command.dialog_fields if field.strip()],
            category=command.category.strip() if command.category and command.category.strip() else None,
        )
        family = await self.storage.get_family(family_id)
        if not family:
            raise OperationFailedError("Family was not created")
        return await build_material_family_overview(self.storage, family)
