from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

from supply_bot.application.errors import NotFoundError, OperationFailedError, ValidationError


class MaterialVariantCreateStorage(Protocol):
    async def get_family(self, family_id: int) -> dict[str, Any] | None: ...

    async def create_variant(self, family_id: int, display_name: str) -> int: ...

    async def get_variant(self, variant_id: int) -> dict[str, Any] | None: ...


@dataclass(frozen=True, slots=True)
class CreateMaterialVariantCommand:
    family_id: int
    display_name: str | None


class CreateMaterialVariantUseCase:
    def __init__(self, storage: MaterialVariantCreateStorage) -> None:
        self.storage = storage

    async def execute(self, command: CreateMaterialVariantCommand) -> dict[str, Any]:
        family = await self.storage.get_family(command.family_id)
        if not family:
            raise NotFoundError("Family not found")

        display_name = (command.display_name or "").strip()
        if not display_name:
            raise ValidationError("display_name is required")

        variant_id = await self.storage.create_variant(command.family_id, display_name)
        variant = await self.storage.get_variant(variant_id)
        if not variant:
            raise OperationFailedError("Variant was not created")
        return variant
