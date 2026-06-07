from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol

from supply_bot.estimates.application.flooring_catalog_assembly import FlooringCatalogAssemblyStorage
from supply_bot.estimates.application.flooring_synthetic_assembly import (
    build_synthetic_flooring_catalog_assembly,
    catalog_updates_for_synthetic_assembly,
)


@dataclass
class FlooringSyntheticMigrationReport:
    coverings_migrated: int = 0
    preparations_migrated: int = 0
    layouts_migrated: int = 0
    skipped_existing_assembly: int = 0
    migrated_target_ids: dict[str, list[int]] = field(
        default_factory=lambda: {"covering": [], "preparation": [], "layout": []}
    )

    @property
    def migrated_total(self) -> int:
        return self.coverings_migrated + self.preparations_migrated + self.layouts_migrated

    @property
    def changed(self) -> bool:
        return self.migrated_total > 0


class FlooringSyntheticMigrationStorage(FlooringCatalogAssemblyStorage, Protocol):
    async def list_estimate_flooring_coverings(self) -> list[dict[str, Any]]: ...

    async def list_estimate_flooring_preparations(self) -> list[dict[str, Any]]: ...

    async def list_estimate_flooring_layouts(self) -> list[dict[str, Any]]: ...


class MigrateGlobalFlooringSyntheticAssembliesUseCase:
    """Create synthetic catalog assemblies for global flat-only flooring rows (PF2)."""

    def __init__(self, storage: FlooringSyntheticMigrationStorage) -> None:
        self._storage = storage

    async def execute(self) -> FlooringSyntheticMigrationReport:
        report = FlooringSyntheticMigrationReport()
        await self._migrate_kind("covering", await self._storage.list_estimate_flooring_coverings(), report)
        await self._migrate_kind("preparation", await self._storage.list_estimate_flooring_preparations(), report)
        await self._migrate_kind("layout", await self._storage.list_estimate_flooring_layouts(), report)
        return report

    async def _migrate_kind(
        self,
        target_kind: str,
        rows: list[dict[str, Any]],
        report: FlooringSyntheticMigrationReport,
    ) -> None:
        for row in rows:
            target_id = int(row["id"])
            existing = await self._storage.get_estimate_flooring_catalog_assembly(target_kind, target_id)
            if existing is not None:
                report.skipped_existing_assembly += 1
                continue

            payload = build_synthetic_flooring_catalog_assembly(target_kind, row)
            catalog_updates = catalog_updates_for_synthetic_assembly(target_kind, row, payload.rows)
            await self._storage.replace_estimate_flooring_catalog_assembly(
                target_kind,
                target_id,
                payload.title,
                payload.rows,
                version=payload.version,
                catalog_updates=catalog_updates,
            )

            if target_kind == "covering":
                report.coverings_migrated += 1
            elif target_kind == "preparation":
                report.preparations_migrated += 1
            else:
                report.layouts_migrated += 1
            report.migrated_target_ids[target_kind].append(target_id)
