from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

from supply_bot.application.errors import ValidationError
from supply_bot.estimates.application.create_flooring_catalog import (
    CreateFlooringCoveringCommand,
    CreateFlooringLayoutCommand,
    CreateFlooringPreparationCommand,
)
from supply_bot.estimates.application.flooring_catalog_assembly import (
    FLOORING_CATALOG_ASSEMBLY_VERSION,
    FlooringCatalogAssemblyRowCommand,
    _normalize_rows,
    _normalize_version,
    validate_flooring_package_for_publication,
)
from supply_bot.estimates.application.flooring_package_projection import (
    build_flooring_package_projection,
    catalog_update_values_from_projection,
)
from supply_bot.estimates.application.flooring_synthetic_assembly import (
    build_synthetic_flooring_catalog_assembly,
    catalog_updates_for_synthetic_assembly,
)
from supply_bot.estimates.application.shared import normalize_required_text


class FlooringCatalogFromAssemblyCreateStorage(Protocol):
    async def create_estimate_flooring_catalog_with_assembly(
        self,
        *,
        target_kind: str,
        catalog_values: dict[str, Any],
        assembly_title: str,
        assembly_rows: list[dict[str, Any]],
        version: str = FLOORING_CATALOG_ASSEMBLY_VERSION,
    ) -> int: ...


@dataclass(frozen=True)
class CreateFlooringCatalogFromAssemblyCommand:
    target_kind: str
    covering: CreateFlooringCoveringCommand | None = None
    preparation: CreateFlooringPreparationCommand | None = None
    layout: CreateFlooringLayoutCommand | None = None
    assembly_title: str | None = None
    assembly_version: str | None = None
    assembly_rows: list[FlooringCatalogAssemblyRowCommand] | None = None


class CreateFlooringCatalogFromAssemblyUseCase:
    """Atomically create a global catalog row and its package assembly (PF4)."""

    def __init__(self, storage: FlooringCatalogFromAssemblyCreateStorage) -> None:
        self._storage = storage

    async def execute(self, command: CreateFlooringCatalogFromAssemblyCommand) -> int:
        target_kind = (command.target_kind or "").strip()
        catalog_values, normalized_kind = _catalog_values_for_target(command)
        assembly_title = normalize_required_text(
            command.assembly_title,
            error_message="Flooring catalog assembly title is required",
        )
        version = _normalize_version(command.assembly_version)
        normalized_rows = _normalize_rows(command.assembly_rows or [], target_kind=normalized_kind)
        validate_flooring_package_for_publication(normalized_kind, normalized_rows)

        projection = build_flooring_package_projection(normalized_kind, normalized_rows)
        catalog_updates = catalog_update_values_from_projection(
            normalized_kind,
            projection,
            assembly_rows=normalized_rows,
        )
        catalog_values.update(catalog_updates)

        return await self._storage.create_estimate_flooring_catalog_with_assembly(
            target_kind=normalized_kind,
            catalog_values=catalog_values,
            assembly_title=assembly_title,
            assembly_rows=normalized_rows,
            version=version,
        )


class CreateFlooringCatalogFromFlatBootstrapStorage(Protocol):
    async def create_estimate_flooring_catalog_with_assembly(
        self,
        *,
        target_kind: str,
        catalog_values: dict[str, Any],
        assembly_title: str,
        assembly_rows: list[dict[str, Any]],
        version: str = FLOORING_CATALOG_ASSEMBLY_VERSION,
    ) -> int: ...


@dataclass(frozen=True)
class CreateFlooringCatalogFromFlatBootstrapCommand:
    target_kind: str
    covering: CreateFlooringCoveringCommand | None = None
    preparation: CreateFlooringPreparationCommand | None = None
    layout: CreateFlooringLayoutCommand | None = None


class CreateFlooringCatalogFromFlatBootstrapUseCase:
    """Create catalog row with PF2 synthetic technical package (snapshot promote)."""

    def __init__(self, storage: CreateFlooringCatalogFromFlatBootstrapStorage) -> None:
        self._storage = storage

    async def execute(self, command: CreateFlooringCatalogFromFlatBootstrapCommand) -> int:
        catalog_values, normalized_kind = _catalog_values_for_target(command)
        synthetic = build_synthetic_flooring_catalog_assembly(normalized_kind, catalog_values)
        catalog_updates = catalog_updates_for_synthetic_assembly(
            normalized_kind,
            catalog_values,
            synthetic.rows,
        )
        merged_values = {**catalog_values, **catalog_updates}

        return await self._storage.create_estimate_flooring_catalog_with_assembly(
            target_kind=normalized_kind,
            catalog_values=merged_values,
            assembly_title=synthetic.title,
            assembly_rows=synthetic.rows,
            version=synthetic.version,
        )


def _catalog_values_for_target(
    command: CreateFlooringCatalogFromAssemblyCommand | CreateFlooringCatalogFromFlatBootstrapCommand,
) -> tuple[dict[str, Any], str]:
    provided = sum(
        1
        for payload in (command.covering, command.preparation, command.layout)
        if payload is not None
    )
    if provided != 1:
        raise ValidationError("Exactly one flooring catalog target payload is required")

    if command.covering is not None:
        return _build_covering_catalog_values(command.covering), "covering"
    if command.preparation is not None:
        return _build_preparation_catalog_values(command.preparation), "preparation"
    if command.layout is not None:
        return _build_layout_catalog_values(command.layout), "layout"
    raise ValidationError("Flooring catalog create payload is required")


def _build_covering_catalog_values(command: CreateFlooringCoveringCommand) -> dict[str, Any]:
    from supply_bot.estimates.application.create_flooring_catalog import (
        _flooring_custom_consumables_to_json,
        _normalize_required_text,
    )
    from supply_bot.estimates.application.shared import clamp_non_negative, normalize_optional_text

    title = _normalize_required_text(command.title, error_message="Floor covering title is required")
    return {
        "title": title,
        "material_price_per_m2": clamp_non_negative(command.material_price_per_m2),
        "labor_price_per_m2": clamp_non_negative(command.labor_price_per_m2),
        "base_waste_percent": clamp_non_negative(command.base_waste_percent),
        "underlay_mode": command.underlay_mode.strip() or "none",
        "underlay_consumption_per_m2": clamp_non_negative(command.underlay_consumption_per_m2),
        "glue_consumption_per_m2": clamp_non_negative(command.glue_consumption_per_m2),
        "glue_unit": command.glue_unit.strip() or "кг",
        "glue_price_per_unit": clamp_non_negative(command.glue_price_per_unit),
        "primer_consumption_per_m2": clamp_non_negative(command.primer_consumption_per_m2),
        "primer_unit": command.primer_unit.strip() or "л",
        "primer_price_per_unit": clamp_non_negative(command.primer_price_per_unit),
        "svp_consumption_per_m2": clamp_non_negative(command.svp_consumption_per_m2),
        "svp_unit": command.svp_unit.strip() or "шт",
        "svp_price_per_unit": clamp_non_negative(command.svp_price_per_unit),
        "grout_consumption_per_m2": clamp_non_negative(command.grout_consumption_per_m2),
        "grout_unit": command.grout_unit.strip() or "кг",
        "grout_price_per_unit": clamp_non_negative(command.grout_price_per_unit),
        "custom_consumables_json": _flooring_custom_consumables_to_json(command.custom_consumables),
        "needs_plinth": command.needs_plinth,
        "instrument_price_per_m2": clamp_non_negative(command.instrument_price_per_m2),
        "note": normalize_optional_text(command.note),
    }


def _build_preparation_catalog_values(command: CreateFlooringPreparationCommand) -> dict[str, Any]:
    from supply_bot.estimates.application.create_flooring_catalog import _normalize_required_text
    from supply_bot.estimates.application.shared import clamp_non_negative, normalize_optional_text

    title = _normalize_required_text(command.title, error_message="Floor preparation title is required")
    return {
        "title": title,
        "labor_price_per_m2": clamp_non_negative(command.labor_price_per_m2),
        "material_price_per_m2": clamp_non_negative(command.material_price_per_m2),
        "primer_consumption_per_m2": clamp_non_negative(command.primer_consumption_per_m2),
        "primer_unit": command.primer_unit.strip() or "л",
        "primer_price_per_unit": clamp_non_negative(command.primer_price_per_unit),
        "note": normalize_optional_text(command.note),
    }


def _build_layout_catalog_values(command: CreateFlooringLayoutCommand) -> dict[str, Any]:
    from supply_bot.estimates.application.create_flooring_catalog import _normalize_required_text
    from supply_bot.estimates.application.shared import clamp_minimum, clamp_non_negative, normalize_optional_text

    title = _normalize_required_text(command.title, error_message="Floor layout title is required")
    return {
        "title": title,
        "labor_price_per_m2": clamp_non_negative(command.labor_price_per_m2),
        "labor_multiplier": clamp_minimum(command.labor_multiplier, 0.1),
        "extra_waste_percent": clamp_non_negative(command.extra_waste_percent),
        "note": normalize_optional_text(command.note),
    }
