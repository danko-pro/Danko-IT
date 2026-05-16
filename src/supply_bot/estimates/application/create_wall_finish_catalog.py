from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Protocol

from supply_bot.application.errors import ValidationError
from supply_bot.estimates.application.shared import (
    clamp_minimum,
    clamp_non_negative,
    normalize_optional_text,
    normalize_required_text,
)


@dataclass(frozen=True)
class CreateWallFinishCoveringConsumableCommand:
    title: str
    consumption_per_m2: float | int
    unit: str
    price_per_unit: float | int


@dataclass(frozen=True)
class CreateWallFinishCoveringCommand:
    title: str | None
    material_price_per_m2: float | int
    labor_price_per_m2: float | int
    base_waste_percent: float | int
    glue_consumption_per_m2: float | int
    glue_unit: str
    glue_price_per_unit: float | int
    primer_consumption_per_m2: float | int
    primer_unit: str
    primer_price_per_unit: float | int
    putty_consumption_per_m2: float | int
    putty_unit: str
    putty_price_per_unit: float | int
    mesh_consumption_per_m2: float | int
    mesh_unit: str
    mesh_price_per_unit: float | int
    custom_consumables: list[CreateWallFinishCoveringConsumableCommand]
    instrument_price_per_m2: float | int
    note: str | None


@dataclass(frozen=True)
class CreateWallFinishPreparationCommand:
    title: str | None
    labor_price_per_m2: float | int
    material_price_per_m2: float | int
    primer_consumption_per_m2: float | int
    primer_unit: str
    primer_price_per_unit: float | int
    note: str | None


@dataclass(frozen=True)
class CreateWallFinishLayoutCommand:
    title: str | None
    labor_multiplier: float | int
    extra_waste_percent: float | int
    note: str | None


class WallFinishCatalogCreateStorage(Protocol):
    async def create_estimate_wall_finish_covering(
        self,
        *,
        title: str,
        material_price_per_m2: float,
        labor_price_per_m2: float,
        base_waste_percent: float,
        glue_consumption_per_m2: float,
        glue_unit: str,
        glue_price_per_unit: float,
        primer_consumption_per_m2: float,
        primer_unit: str,
        primer_price_per_unit: float,
        putty_consumption_per_m2: float,
        putty_unit: str,
        putty_price_per_unit: float,
        mesh_consumption_per_m2: float,
        mesh_unit: str,
        mesh_price_per_unit: float,
        custom_consumables_json: str,
        instrument_price_per_m2: float,
        note: str | None,
    ) -> int: ...

    async def create_estimate_wall_finish_preparation(
        self,
        *,
        title: str,
        labor_price_per_m2: float,
        material_price_per_m2: float,
        primer_consumption_per_m2: float,
        primer_unit: str,
        primer_price_per_unit: float,
        note: str | None,
    ) -> int: ...

    async def create_estimate_wall_finish_layout(
        self,
        *,
        title: str,
        labor_multiplier: float,
        extra_waste_percent: float,
        note: str | None,
    ) -> int: ...


class CreateWallFinishCoveringUseCase:
    """Сценарий создания покрытия стен без привязки к HTTP-слою."""

    def __init__(self, storage: WallFinishCatalogCreateStorage) -> None:
        self._storage = storage

    async def execute(self, command: CreateWallFinishCoveringCommand) -> int:
        title = _normalize_required_text(command.title, error_message="Wall finish title is required")
        return await self._storage.create_estimate_wall_finish_covering(
            title=title,
            material_price_per_m2=clamp_non_negative(command.material_price_per_m2),
            labor_price_per_m2=clamp_non_negative(command.labor_price_per_m2),
            base_waste_percent=clamp_non_negative(command.base_waste_percent),
            glue_consumption_per_m2=clamp_non_negative(command.glue_consumption_per_m2),
            glue_unit=command.glue_unit.strip() or "кг",
            glue_price_per_unit=clamp_non_negative(command.glue_price_per_unit),
            primer_consumption_per_m2=clamp_non_negative(command.primer_consumption_per_m2),
            primer_unit=command.primer_unit.strip() or "л",
            primer_price_per_unit=clamp_non_negative(command.primer_price_per_unit),
            putty_consumption_per_m2=clamp_non_negative(command.putty_consumption_per_m2),
            putty_unit=command.putty_unit.strip() or "кг",
            putty_price_per_unit=clamp_non_negative(command.putty_price_per_unit),
            mesh_consumption_per_m2=clamp_non_negative(command.mesh_consumption_per_m2),
            mesh_unit=command.mesh_unit.strip() or "м²",
            mesh_price_per_unit=clamp_non_negative(command.mesh_price_per_unit),
            custom_consumables_json=_wall_finish_custom_consumables_to_json(command.custom_consumables),
            instrument_price_per_m2=clamp_non_negative(command.instrument_price_per_m2),
            note=normalize_optional_text(command.note),
        )


class CreateWallFinishPreparationUseCase:
    """Сценарий создания подготовки стен без привязки к HTTP-слою."""

    def __init__(self, storage: WallFinishCatalogCreateStorage) -> None:
        self._storage = storage

    async def execute(self, command: CreateWallFinishPreparationCommand) -> int:
        title = _normalize_required_text(command.title, error_message="Wall preparation title is required")
        return await self._storage.create_estimate_wall_finish_preparation(
            title=title,
            labor_price_per_m2=clamp_non_negative(command.labor_price_per_m2),
            material_price_per_m2=clamp_non_negative(command.material_price_per_m2),
            primer_consumption_per_m2=clamp_non_negative(command.primer_consumption_per_m2),
            primer_unit=command.primer_unit.strip() or "л",
            primer_price_per_unit=clamp_non_negative(command.primer_price_per_unit),
            note=normalize_optional_text(command.note),
        )


class CreateWallFinishLayoutUseCase:
    """Сценарий создания схемы отделки стен без привязки к HTTP-слою."""

    def __init__(self, storage: WallFinishCatalogCreateStorage) -> None:
        self._storage = storage

    async def execute(self, command: CreateWallFinishLayoutCommand) -> int:
        title = _normalize_required_text(command.title, error_message="Wall layout title is required")
        return await self._storage.create_estimate_wall_finish_layout(
            title=title,
            labor_multiplier=clamp_minimum(command.labor_multiplier, 0.1),
            extra_waste_percent=clamp_non_negative(command.extra_waste_percent),
            note=normalize_optional_text(command.note),
        )


def _wall_finish_custom_consumables_to_json(items: list[CreateWallFinishCoveringConsumableCommand]) -> str:
    return json.dumps(
        [
            {
                "title": title,
                "consumption_per_m2": clamp_non_negative(item.consumption_per_m2),
                "unit": item.unit.strip() or "шт",
                "price_per_unit": clamp_non_negative(item.price_per_unit),
            }
            for item in items
            if (title := item.title.strip())
        ],
        ensure_ascii=False,
    )


def _normalize_required_text(value: str | None, *, error_message: str) -> str:
    try:
        return normalize_required_text(value, error_message=error_message)
    except ValueError as exc:
        raise ValidationError(str(exc)) from exc
