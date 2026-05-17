from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Protocol

from supply_bot.application.errors import NotFoundError, ValidationError


class MaterialAliasCreateStorage(Protocol):
    async def get_family(self, family_id: int) -> dict[str, Any] | None: ...

    async def get_variant(self, variant_id: int) -> dict[str, Any] | None: ...

    async def get_sku(self, sku_id: int) -> dict[str, Any] | None: ...

    async def create_alias(
        self,
        alias: str,
        *,
        family_id: int | None,
        variant_id: int | None,
        sku_id: int | None,
        priority: int,
    ) -> int: ...


@dataclass(frozen=True, slots=True)
class CreateMaterialAliasCommand:
    alias: str | None
    family_id: int | None
    variant_id: int | None
    sku_id: int | None
    priority: int


class CreateMaterialAliasUseCase:
    def __init__(self, storage: MaterialAliasCreateStorage) -> None:
        self.storage = storage

    async def execute(self, command: CreateMaterialAliasCommand) -> dict[str, Any]:
        alias = (command.alias or "").strip()
        if not alias:
            raise ValidationError("alias is required")

        if command.family_id is None and command.variant_id is None and command.sku_id is None:
            raise ValidationError("Target family, variant or sku is required")

        if command.family_id is not None:
            await _require_material_family(self.storage, command.family_id)

        if command.variant_id is not None:
            variant = await _require_material_variant(self.storage, command.variant_id)
            if command.family_id is not None:
                _ensure_variant_belongs_to_family(variant, command.family_id)

        if command.sku_id is not None:
            sku = await _require_material_sku(self.storage, command.sku_id)
            _ensure_sku_matches_target(
                sku,
                family_id=command.family_id,
                variant_id=command.variant_id,
            )

        await self.storage.create_alias(
            alias,
            family_id=command.family_id,
            variant_id=command.variant_id,
            sku_id=command.sku_id,
            priority=command.priority,
        )

        return {
            "created_count": len(split_material_alias_values(alias)),
            "family_id": command.family_id,
            "variant_id": command.variant_id,
            "sku_id": command.sku_id,
        }


def split_material_alias_values(raw_value: str) -> list[str]:
    parts = [part.strip() for part in re.split(r"[,;\n]+", raw_value) if part.strip()]
    return parts or [raw_value.strip()]


async def _require_material_family(storage: MaterialAliasCreateStorage, family_id: int) -> dict[str, Any]:
    family = await storage.get_family(family_id)
    if not family:
        raise NotFoundError("Family not found")
    return family


async def _require_material_variant(storage: MaterialAliasCreateStorage, variant_id: int) -> dict[str, Any]:
    variant = await storage.get_variant(variant_id)
    if not variant:
        raise NotFoundError("Variant not found")
    return variant


async def _require_material_sku(storage: MaterialAliasCreateStorage, sku_id: int) -> dict[str, Any]:
    sku = await storage.get_sku(sku_id)
    if not sku:
        raise NotFoundError("SKU not found")
    return sku


def _ensure_variant_belongs_to_family(variant: dict[str, Any], family_id: int) -> None:
    if int(variant["family_id"]) != family_id:
        raise ValidationError("Variant does not belong to family")


def _ensure_sku_matches_target(
    sku: dict[str, Any],
    *,
    family_id: int | None,
    variant_id: int | None,
) -> None:
    if family_id is not None and int(sku["family_id"]) != family_id:
        raise ValidationError("SKU does not belong to family")
    if variant_id is not None and sku["variant_id"] != variant_id:
        raise ValidationError("SKU does not belong to variant")
