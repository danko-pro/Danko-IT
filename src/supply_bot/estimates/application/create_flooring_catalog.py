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
class CreateFlooringCoveringConsumableCommand:
    title: str
    consumption_per_m2: float | int
    unit: str
    price_per_unit: float | int


@dataclass(frozen=True)
class CreateFlooringCoveringCommand:
    title: str | None
    material_price_per_m2: float | int
    labor_price_per_m2: float | int
    base_waste_percent: float | int
    underlay_mode: str
    underlay_consumption_per_m2: float | int
    glue_consumption_per_m2: float | int
    glue_unit: str
    glue_price_per_unit: float | int
    primer_consumption_per_m2: float | int
    primer_unit: str
    primer_price_per_unit: float | int
    svp_consumption_per_m2: float | int
    svp_unit: str
    svp_price_per_unit: float | int
    grout_consumption_per_m2: float | int
    grout_unit: str
    grout_price_per_unit: float | int
    custom_consumables: list[CreateFlooringCoveringConsumableCommand]
    needs_plinth: bool
    instrument_price_per_m2: float | int
    note: str | None


@dataclass(frozen=True)
class CreateFlooringPreparationCommand:
    title: str | None
    labor_price_per_m2: float | int
    material_price_per_m2: float | int
    primer_consumption_per_m2: float | int
    primer_unit: str
    primer_price_per_unit: float | int
    note: str | None


@dataclass(frozen=True)
class CreateFlooringLayoutCommand:
    title: str | None
    labor_multiplier: float | int
    extra_waste_percent: float | int
    note: str | None


class FlooringCatalogCreateStorage(Protocol):
    async def create_estimate_flooring_covering(
        self,
        *,
        title: str,
        material_price_per_m2: float,
        labor_price_per_m2: float,
        base_waste_percent: float,
        underlay_mode: str,
        underlay_consumption_per_m2: float,
        glue_consumption_per_m2: float,
        glue_unit: str,
        glue_price_per_unit: float,
        primer_consumption_per_m2: float,
        primer_unit: str,
        primer_price_per_unit: float,
        svp_consumption_per_m2: float,
        svp_unit: str,
        svp_price_per_unit: float,
        grout_consumption_per_m2: float,
        grout_unit: str,
        grout_price_per_unit: float,
        custom_consumables_json: str,
        needs_plinth: bool,
        instrument_price_per_m2: float,
        note: str | None,
    ) -> int: ...

    async def create_estimate_flooring_preparation(
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

    async def create_estimate_flooring_layout(
        self,
        *,
        title: str,
        labor_multiplier: float,
        extra_waste_percent: float,
        note: str | None,
    ) -> int: ...


class CreateFlooringCoveringUseCase:
    """Сценарий создания покрытия пола без привязки к HTTP-слою."""

    def __init__(self, storage: FlooringCatalogCreateStorage) -> None:
        self._storage = storage

    async def execute(self, command: CreateFlooringCoveringCommand) -> int:
        title = _normalize_required_text(command.title, error_message="Floor covering title is required")
        return await self._storage.create_estimate_flooring_covering(
            title=title,
            material_price_per_m2=clamp_non_negative(command.material_price_per_m2),
            labor_price_per_m2=clamp_non_negative(command.labor_price_per_m2),
            base_waste_percent=clamp_non_negative(command.base_waste_percent),
            underlay_mode=command.underlay_mode.strip() or "none",
            underlay_consumption_per_m2=clamp_non_negative(command.underlay_consumption_per_m2),
            glue_consumption_per_m2=clamp_non_negative(command.glue_consumption_per_m2),
            glue_unit=command.glue_unit.strip() or "кг",
            glue_price_per_unit=clamp_non_negative(command.glue_price_per_unit),
            primer_consumption_per_m2=clamp_non_negative(command.primer_consumption_per_m2),
            primer_unit=command.primer_unit.strip() or "л",
            primer_price_per_unit=clamp_non_negative(command.primer_price_per_unit),
            svp_consumption_per_m2=clamp_non_negative(command.svp_consumption_per_m2),
            svp_unit=command.svp_unit.strip() or "шт",
            svp_price_per_unit=clamp_non_negative(command.svp_price_per_unit),
            grout_consumption_per_m2=clamp_non_negative(command.grout_consumption_per_m2),
            grout_unit=command.grout_unit.strip() or "кг",
            grout_price_per_unit=clamp_non_negative(command.grout_price_per_unit),
            custom_consumables_json=_flooring_custom_consumables_to_json(command.custom_consumables),
            needs_plinth=command.needs_plinth,
            instrument_price_per_m2=clamp_non_negative(command.instrument_price_per_m2),
            note=normalize_optional_text(command.note),
        )


class CreateFlooringPreparationUseCase:
    """Сценарий создания подготовки пола без привязки к HTTP-слою."""

    def __init__(self, storage: FlooringCatalogCreateStorage) -> None:
        self._storage = storage

    async def execute(self, command: CreateFlooringPreparationCommand) -> int:
        title = _normalize_required_text(command.title, error_message="Floor preparation title is required")
        return await self._storage.create_estimate_flooring_preparation(
            title=title,
            labor_price_per_m2=clamp_non_negative(command.labor_price_per_m2),
            material_price_per_m2=clamp_non_negative(command.material_price_per_m2),
            primer_consumption_per_m2=clamp_non_negative(command.primer_consumption_per_m2),
            primer_unit=command.primer_unit.strip() or "л",
            primer_price_per_unit=clamp_non_negative(command.primer_price_per_unit),
            note=normalize_optional_text(command.note),
        )


class CreateFlooringLayoutUseCase:
    """Сценарий создания схемы укладки пола без привязки к HTTP-слою."""

    def __init__(self, storage: FlooringCatalogCreateStorage) -> None:
        self._storage = storage

    async def execute(self, command: CreateFlooringLayoutCommand) -> int:
        title = _normalize_required_text(command.title, error_message="Floor layout title is required")
        return await self._storage.create_estimate_flooring_layout(
            title=title,
            labor_multiplier=clamp_minimum(command.labor_multiplier, 0.1),
            extra_waste_percent=clamp_non_negative(command.extra_waste_percent),
            note=normalize_optional_text(command.note),
        )


def _flooring_custom_consumables_to_json(items: list[CreateFlooringCoveringConsumableCommand]) -> str:
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
