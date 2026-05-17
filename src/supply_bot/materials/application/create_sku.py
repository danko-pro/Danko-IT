from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any, Protocol

from supply_bot.application.errors import NotFoundError, OperationFailedError, ValidationError


class MaterialSkuCreateStorage(Protocol):
    async def get_family(self, family_id: int) -> dict[str, Any] | None: ...

    async def get_variant(self, variant_id: int) -> dict[str, Any] | None: ...

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
    ) -> int: ...

    async def get_sku(self, sku_id: int) -> dict[str, Any] | None: ...


@dataclass(frozen=True, slots=True)
class CreateMaterialSkuCommand:
    family_id: int
    variant_id: int | None
    title: str | None
    article: str | None
    brand: str | None
    unit: str | None
    thickness_mm: float | int | None
    length_mm: float | int | None
    width_mm: float | int | None
    source_description: str | None


class CreateMaterialSkuUseCase:
    def __init__(self, storage: MaterialSkuCreateStorage) -> None:
        self.storage = storage

    async def execute(self, command: CreateMaterialSkuCommand) -> dict[str, Any]:
        await _require_material_family(self.storage, command.family_id)

        if command.variant_id is not None:
            variant = await _require_material_variant(self.storage, command.variant_id)
            _ensure_variant_belongs_to_family(variant, command.family_id)

        title = (command.title or "").strip()
        unit = (command.unit or "").strip()
        if not title:
            raise ValidationError("title is required")
        if not unit:
            raise ValidationError("unit is required")

        sku_id = await self.storage.create_sku(
            family_id=command.family_id,
            variant_id=command.variant_id,
            title=title,
            article=_normalize_optional_text(command.article),
            brand=_normalize_optional_text(command.brand),
            unit=unit,
            thickness_mm=_ensure_positive_optional_number(command.thickness_mm, "thickness_mm"),
            length_mm=_ensure_positive_optional_number(command.length_mm, "length_mm"),
            width_mm=_ensure_positive_optional_number(command.width_mm, "width_mm"),
            source_description=_normalize_optional_text(command.source_description),
        )
        sku = await self.storage.get_sku(sku_id)
        if not sku:
            raise OperationFailedError("SKU was not created")
        return sku


async def _require_material_family(storage: MaterialSkuCreateStorage, family_id: int) -> dict[str, Any]:
    family = await storage.get_family(family_id)
    if not family:
        raise NotFoundError("Family not found")
    return family


async def _require_material_variant(storage: MaterialSkuCreateStorage, variant_id: int) -> dict[str, Any]:
    variant = await storage.get_variant(variant_id)
    if not variant:
        raise NotFoundError("Variant not found")
    return variant


def _ensure_variant_belongs_to_family(variant: dict[str, Any], family_id: int) -> None:
    if int(variant["family_id"]) != family_id:
        raise ValidationError("Variant does not belong to family")


def _ensure_positive_optional_number(value: float | int | None, field_name: str) -> float | None:
    if value is None:
        return None
    numeric_value = float(value)
    if not math.isfinite(numeric_value) or numeric_value <= 0:
        raise ValidationError(f"{field_name} must be positive")
    return numeric_value


def _normalize_optional_text(value: str | None) -> str | None:
    normalized = (value or "").strip()
    return normalized or None
