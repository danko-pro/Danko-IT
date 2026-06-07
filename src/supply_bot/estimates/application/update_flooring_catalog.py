from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

from supply_bot.application.errors import NotFoundError, ValidationError
from supply_bot.estimates.application.create_flooring_catalog import (
    CreateFlooringCoveringConsumableCommand,
    _flooring_custom_consumables_to_json,
    _normalize_required_text,
)

# FP3b: reject flat PATCH when a package assembly exists (safer than silent re-projection).
from supply_bot.estimates.application.flooring_catalog_assembly import (
    reject_flooring_flat_update_when_assembly_present,
)
from supply_bot.estimates.application.shared import (
    clamp_minimum,
    clamp_non_negative,
    normalize_optional_text,
)


def _reject_negative(value: float | int, *, field_label: str) -> None:
    if float(value) < 0:
        raise ValidationError(f"{field_label} cannot be negative")


@dataclass(frozen=True)
class UpdateFlooringCoveringCommand:
    covering_id: int
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
class UpdateFlooringPreparationCommand:
    preparation_id: int
    title: str | None
    labor_price_per_m2: float | int
    material_price_per_m2: float | int
    primer_consumption_per_m2: float | int
    primer_unit: str
    primer_price_per_unit: float | int
    note: str | None


@dataclass(frozen=True)
class UpdateFlooringLayoutCommand:
    layout_id: int
    title: str | None
    labor_price_per_m2: float | int
    labor_multiplier: float | int
    extra_waste_percent: float | int
    note: str | None


class FlooringCatalogUpdateStorage(Protocol):
    async def get_estimate_flooring_catalog_assembly(
        self,
        target_kind: str,
        target_id: int,
    ) -> dict[str, Any] | None: ...

    async def get_estimate_flooring_covering(self, covering_id: int) -> dict[str, Any] | None: ...

    async def update_estimate_flooring_covering(self, covering_id: int, **values: Any) -> bool: ...

    async def get_estimate_flooring_preparation(self, preparation_id: int) -> dict[str, Any] | None: ...

    async def update_estimate_flooring_preparation(self, preparation_id: int, **values: Any) -> bool: ...

    async def get_estimate_flooring_layout(self, layout_id: int) -> dict[str, Any] | None: ...

    async def update_estimate_flooring_layout(self, layout_id: int, **values: Any) -> bool: ...


class UpdateFlooringCoveringUseCase:
    def __init__(self, storage: FlooringCatalogUpdateStorage) -> None:
        self._storage = storage

    async def execute(self, command: UpdateFlooringCoveringCommand) -> dict[str, Any]:
        _reject_negative(command.material_price_per_m2, field_label="material_price_per_m2")
        _reject_negative(command.labor_price_per_m2, field_label="labor_price_per_m2")
        _reject_negative(command.base_waste_percent, field_label="base_waste_percent")
        _reject_negative(command.underlay_consumption_per_m2, field_label="underlay_consumption_per_m2")
        _reject_negative(command.glue_consumption_per_m2, field_label="glue_consumption_per_m2")
        _reject_negative(command.glue_price_per_unit, field_label="glue_price_per_unit")
        _reject_negative(command.primer_consumption_per_m2, field_label="primer_consumption_per_m2")
        _reject_negative(command.primer_price_per_unit, field_label="primer_price_per_unit")
        _reject_negative(command.svp_consumption_per_m2, field_label="svp_consumption_per_m2")
        _reject_negative(command.svp_price_per_unit, field_label="svp_price_per_unit")
        _reject_negative(command.grout_consumption_per_m2, field_label="grout_consumption_per_m2")
        _reject_negative(command.grout_price_per_unit, field_label="grout_price_per_unit")
        _reject_negative(command.instrument_price_per_m2, field_label="instrument_price_per_m2")
        for item in command.custom_consumables:
            _reject_negative(item.consumption_per_m2, field_label="custom_consumption_per_m2")
            _reject_negative(item.price_per_unit, field_label="custom_price_per_unit")

        title = _normalize_required_text(command.title, error_message="Floor covering title is required")
        await reject_flooring_flat_update_when_assembly_present(
            self._storage,
            "covering",
            command.covering_id,
        )
        updated = await self._storage.update_estimate_flooring_covering(
            command.covering_id,
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
        if not updated:
            raise NotFoundError("Floor covering catalog item not found")
        item = await self._storage.get_estimate_flooring_covering(command.covering_id)
        if not item:
            raise NotFoundError("Floor covering catalog item not found")
        return item


class UpdateFlooringPreparationUseCase:
    def __init__(self, storage: FlooringCatalogUpdateStorage) -> None:
        self._storage = storage

    async def execute(self, command: UpdateFlooringPreparationCommand) -> dict[str, Any]:
        _reject_negative(command.labor_price_per_m2, field_label="labor_price_per_m2")
        _reject_negative(command.material_price_per_m2, field_label="material_price_per_m2")
        _reject_negative(command.primer_consumption_per_m2, field_label="primer_consumption_per_m2")
        _reject_negative(command.primer_price_per_unit, field_label="primer_price_per_unit")

        title = _normalize_required_text(command.title, error_message="Floor preparation title is required")
        await reject_flooring_flat_update_when_assembly_present(
            self._storage,
            "preparation",
            command.preparation_id,
        )
        updated = await self._storage.update_estimate_flooring_preparation(
            command.preparation_id,
            title=title,
            labor_price_per_m2=clamp_non_negative(command.labor_price_per_m2),
            material_price_per_m2=clamp_non_negative(command.material_price_per_m2),
            primer_consumption_per_m2=clamp_non_negative(command.primer_consumption_per_m2),
            primer_unit=command.primer_unit.strip() or "л",
            primer_price_per_unit=clamp_non_negative(command.primer_price_per_unit),
            note=normalize_optional_text(command.note),
        )
        if not updated:
            raise NotFoundError("Floor preparation catalog item not found")
        item = await self._storage.get_estimate_flooring_preparation(command.preparation_id)
        if not item:
            raise NotFoundError("Floor preparation catalog item not found")
        return item


class UpdateFlooringLayoutUseCase:
    def __init__(self, storage: FlooringCatalogUpdateStorage) -> None:
        self._storage = storage

    async def execute(self, command: UpdateFlooringLayoutCommand) -> dict[str, Any]:
        _reject_negative(command.labor_price_per_m2, field_label="labor_price_per_m2")
        _reject_negative(command.labor_multiplier, field_label="labor_multiplier")
        _reject_negative(command.extra_waste_percent, field_label="extra_waste_percent")

        title = _normalize_required_text(command.title, error_message="Floor layout title is required")
        await reject_flooring_flat_update_when_assembly_present(
            self._storage,
            "layout",
            command.layout_id,
        )
        updated = await self._storage.update_estimate_flooring_layout(
            command.layout_id,
            title=title,
            labor_price_per_m2=clamp_non_negative(command.labor_price_per_m2),
            labor_multiplier=clamp_minimum(command.labor_multiplier, 0.1),
            extra_waste_percent=clamp_non_negative(command.extra_waste_percent),
            note=normalize_optional_text(command.note),
        )
        if not updated:
            raise NotFoundError("Floor layout catalog item not found")
        item = await self._storage.get_estimate_flooring_layout(command.layout_id)
        if not item:
            raise NotFoundError("Floor layout catalog item not found")
        return item
