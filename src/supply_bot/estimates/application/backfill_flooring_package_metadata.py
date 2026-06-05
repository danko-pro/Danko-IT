from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol

from supply_bot.application.errors import ValidationError
from supply_bot.estimates.application.flooring_catalog_assembly import (
    FLOORING_CATALOG_ASSEMBLY_VERSION,
    validate_flooring_package_for_publication,
)
from supply_bot.estimates.application.flooring_package_projection import (
    build_flooring_package_projection,
    catalog_update_values_from_projection,
)
from supply_bot.estimates.application.flooring_consumable_package_defaults import (
    consumable_package_defaults_for_title,
)

_PACKAGE_AWARE_FORMULAS = frozenset(
    {
        "package_consumption",
        "layer_consumption",
        "piece_consumption",
        "kg_layer_consumption",
        "liquid_layers",
        "roll_meter_consumption",
        "sheet_area_consumption",
    }
)


@dataclass
class FlooringPackageMetadataBackfillReport:
    assemblies_updated: int = 0
    assemblies_skipped: int = 0
    rows_backfilled: int = 0
    updated_target_ids: list[int] = field(default_factory=list)
    skipped_target_ids: list[int] = field(default_factory=list)

    @property
    def changed(self) -> bool:
        return self.assemblies_updated > 0


class FlooringPackageMetadataBackfillStorage(Protocol):
    async def list_estimate_flooring_coverings(self) -> list[dict[str, Any]]: ...

    async def get_estimate_flooring_catalog_assembly(
        self,
        target_kind: str,
        target_id: int,
    ) -> dict[str, Any] | None: ...

    async def replace_estimate_flooring_catalog_assembly(
        self,
        target_kind: str,
        target_id: int,
        title: str,
        rows: list[dict[str, Any]],
        *,
        version: str = FLOORING_CATALOG_ASSEMBLY_VERSION,
        catalog_updates: dict[str, Any] | None = None,
    ) -> int: ...


def backfill_covering_assembly_rows(rows: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], int]:
    """Convert raw glue/SVP/primer/grout consumables to package-aware rows (idempotent)."""

    updated_rows: list[dict[str, Any]] = []
    changed_count = 0
    for row in rows:
        updated, changed = backfill_covering_assembly_row(row)
        updated_rows.append(updated)
        if changed:
            changed_count += 1
    return updated_rows, changed_count


def backfill_covering_assembly_row(row: dict[str, Any]) -> tuple[dict[str, Any], bool]:
    if (row.get("kind") or "").strip() != "consumable":
        return row, False
    if is_covering_consumable_package_aware(row):
        return row, False

    package_defaults = consumable_package_defaults_for_title(_row_title(row))
    if package_defaults is None:
        return row, False

    target_formula, package_size = package_defaults
    formula = (row.get("formula") or "").strip()
    price = _non_negative(row.get("price"))
    if price <= 0:
        return row, False

    if formula == "unit_consumption":
        return (
            {
                **row,
                "formula": target_formula,
                "package_size": package_size,
                "price": round(price * package_size, 6),
            },
            True,
        )

    if formula == "piece_consumption" and target_formula == "piece_consumption":
        return (
            {
                **row,
                "package_size": package_size,
                "price": round(price * package_size, 6),
            },
            True,
        )

    return row, False


def is_covering_consumable_package_aware(row: dict[str, Any]) -> bool:
    formula = (row.get("formula") or "").strip()
    package_size = _non_negative(row.get("package_size"))
    return formula in _PACKAGE_AWARE_FORMULAS and package_size > 0


class BackfillFlooringPackageMetadataUseCase:
    """Backfill package_size and package formulas on existing global covering assemblies (PF5c6)."""

    def __init__(self, storage: FlooringPackageMetadataBackfillStorage) -> None:
        self._storage = storage

    async def execute(self) -> FlooringPackageMetadataBackfillReport:
        report = FlooringPackageMetadataBackfillReport()
        for catalog_row in await self._storage.list_estimate_flooring_coverings():
            target_id = int(catalog_row["id"])
            assembly = await self._storage.get_estimate_flooring_catalog_assembly("covering", target_id)
            if assembly is None:
                continue

            rows = list(assembly.get("rows") or [])
            updated_rows, row_changes = backfill_covering_assembly_rows(rows)
            if row_changes <= 0:
                continue

            try:
                validate_flooring_package_for_publication("covering", updated_rows)
                projection = build_flooring_package_projection("covering", updated_rows)
                catalog_updates = catalog_update_values_from_projection(
                    "covering",
                    projection,
                    assembly_rows=updated_rows,
                )
            except ValidationError:
                report.assemblies_skipped += 1
                report.skipped_target_ids.append(target_id)
                continue

            await self._storage.replace_estimate_flooring_catalog_assembly(
                "covering",
                target_id,
                assembly.get("title") or "",
                updated_rows,
                version=assembly.get("version") or FLOORING_CATALOG_ASSEMBLY_VERSION,
                catalog_updates=catalog_updates,
            )
            report.assemblies_updated += 1
            report.rows_backfilled += row_changes
            report.updated_target_ids.append(target_id)
        return report


def _row_title(row: dict[str, Any]) -> str:
    return str(row.get("public_title") or row.get("title") or "").strip()


def _non_negative(value: Any) -> float:
    if value in (None, ""):
        return 0.0
    if isinstance(value, bool):
        return 0.0
    try:
        parsed = float(str(value).replace(",", "."))
    except (TypeError, ValueError):
        return 0.0
    return parsed if parsed > 0 else 0.0
