from __future__ import annotations

import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from supply_bot.database.metadata import metadata
from supply_bot.estimates.application.plumbing_snapshot import BuildPlumbingSnapshotUseCase
from supply_bot.storage_estimates.plumbing_repository import SqlAlchemyPlumbingRepository
from supply_bot.storage_estimates.plumbing_seed import (
    PLUMBING_SEED_ATOMS,
    PLUMBING_SEED_ZONES,
    ensure_global_plumbing_defaults,
)
from supply_bot.storage_estimates.tables import (
    estimate_plumbing_catalog_items,
    estimate_plumbing_zone_items,
    estimate_plumbing_zone_package_items,
    estimate_plumbing_zone_packages,
    estimate_plumbing_zones,
)

# Ожидаемые количества строк (производные от seed-данных, A5; +7 зон в A8.2).
_EXPECTED_ATOMS = 97
_EXPECTED_ZONES = 12
_EXPECTED_ZONE_ITEMS = 71
_EXPECTED_PACKAGES = 9
_EXPECTED_PACKAGE_ITEMS = 14

# Парити-эталон «Зоны мойки» (zone-kitchen-sink), из A3 / public-estimate-plumbing-zones.ts.
_SINK_BASE_TOTAL = 24612
_SINK_PACKAGE_TOTALS = {"c": 39487, "b": 43530, "a": 54915}

# A8.2: итоги мигрированных legacy-зон (единый итог = Σ атомов × (1 + 6.4 %), запечён).
# Производны от текущих чисел plumbingRates — намеренные, не случайные.
_MIGRATED_ZONE_TOTALS = {
    "zone-bathroom-set": 118955,  # 34000+16300+61500 = 111800 ×1.064
    "zone-bathroom-bath": 62776,  # 38000+4500+16500 = 59000 ×1.064
    "zone-bathroom-hygienic-shower": 15428,  # 14500 ×1.064
    "zone-bathroom-towel-rail": 22344,  # 21000 ×1.064
    "zone-tech-washer-output": 12236,  # 11500 ×1.064
    "zone-water-node": 75863,  # 41000+24500+5800 = 71300 ×1.064 (4 отсечных крана)
    "zone-water-leak-protection": 67564,  # 63500 ×1.064
}


class PlumbingSeedTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        # Чистая временная файловая БД SQLite (надёжнее in-memory: данные переживают переподключение).
        self._tmp = TemporaryDirectory()
        db_path = Path(self._tmp.name) / "plumbing-seed.sqlite3"
        self.engine = create_async_engine(f"sqlite+aiosqlite:///{db_path.as_posix()}")
        async with self.engine.begin() as connection:
            await connection.run_sync(metadata.create_all)
        self.session_factory = async_sessionmaker(self.engine, expire_on_commit=False)

    async def asyncTearDown(self) -> None:
        await self.engine.dispose()
        self._tmp.cleanup()

    async def _counts(self) -> dict[str, int]:
        tables = {
            "atoms": estimate_plumbing_catalog_items,
            "zones": estimate_plumbing_zones,
            "zone_items": estimate_plumbing_zone_items,
            "packages": estimate_plumbing_zone_packages,
            "package_items": estimate_plumbing_zone_package_items,
        }
        async with self.session_factory() as session:
            counts: dict[str, int] = {}
            for name, table in tables.items():
                counts[name] = int(
                    (await session.execute(select(func.count()).select_from(table))).scalar_one()
                )
            return counts

    def test_seed_dataset_has_unique_source_codes_and_zone_codes(self) -> None:
        codes = [atom.source_code for atom in PLUMBING_SEED_ATOMS]
        self.assertEqual(len(codes), len(set(codes)), "Дубли source_code в seed-атомах")
        self.assertEqual(len(codes), _EXPECTED_ATOMS)
        zone_codes = [zone.zone_code for zone in PLUMBING_SEED_ZONES]
        self.assertEqual(len(zone_codes), len(set(zone_codes)), "Дубли zone_code в seed-зонах")
        self.assertEqual(len(zone_codes), _EXPECTED_ZONES)

    async def test_seed_inserts_expected_counts_as_global_defaults(self) -> None:
        report = await ensure_global_plumbing_defaults(self.session_factory)

        self.assertEqual(report.atoms_total, _EXPECTED_ATOMS)
        self.assertEqual(report.atoms_inserted, _EXPECTED_ATOMS)
        self.assertEqual(report.atoms_updated, 0)
        self.assertEqual(report.zones_inserted, _EXPECTED_ZONES)
        self.assertTrue(report.changed)

        counts = await self._counts()
        self.assertEqual(
            counts,
            {
                "atoms": _EXPECTED_ATOMS,
                "zones": _EXPECTED_ZONES,
                "zone_items": _EXPECTED_ZONE_ITEMS,
                "packages": _EXPECTED_PACKAGES,
                "package_items": _EXPECTED_PACKAGE_ITEMS,
            },
        )

        # Все строки — глобальные дефолты (owner_user_id IS NULL).
        async with self.session_factory() as session:
            owned = int(
                (
                    await session.execute(
                        select(func.count())
                        .select_from(estimate_plumbing_catalog_items)
                        .where(estimate_plumbing_catalog_items.c.owner_user_id.is_not(None))
                    )
                ).scalar_one()
            )
        self.assertEqual(owned, 0)

    async def test_seed_is_idempotent_on_second_run(self) -> None:
        first = await ensure_global_plumbing_defaults(self.session_factory)
        self.assertTrue(first.changed)
        counts_after_first = await self._counts()

        second = await ensure_global_plumbing_defaults(self.session_factory)
        # Второй прогон: ноль изменений и ноль дублей.
        self.assertFalse(second.changed)
        self.assertEqual(second.atoms_inserted, 0)
        self.assertEqual(second.atoms_updated, 0)
        self.assertEqual(second.zones_inserted, 0)
        self.assertEqual(second.zones_updated, 0)
        self.assertEqual(second.zone_items_replaced, 0)
        self.assertEqual(second.packages_replaced, 0)

        counts_after_second = await self._counts()
        self.assertEqual(counts_after_first, counts_after_second)

    async def test_snapshot_parity_after_seed(self) -> None:
        await ensure_global_plumbing_defaults(self.session_factory)

        # Глобальный (owner=None) репозиторий читает только глобальные дефолты.
        repository = SqlAlchemyPlumbingRepository(self.session_factory)
        snapshot = await BuildPlumbingSnapshotUseCase(repository, version="seed-test").build()

        sink = next(zone for zone in snapshot.zones if zone.code == "zone-kitchen-sink")
        self.assertEqual(sink.base_total, _SINK_BASE_TOTAL)
        totals = {package.code: package.total for package in sink.packages}
        self.assertEqual(totals, _SINK_PACKAGE_TOTALS)
        # Активный пакет зоны (b) — итог зоны с запечённым резервом.
        self.assertEqual(sink.active_package, "b")
        self.assertEqual(sink.total, _SINK_PACKAGE_TOTALS["b"])

    async def test_migrated_legacy_zones_totals(self) -> None:
        # A8.2: каждая мигрированная legacy-опция стала зоной без пакетов с единым запечённым итогом.
        await ensure_global_plumbing_defaults(self.session_factory)

        repository = SqlAlchemyPlumbingRepository(self.session_factory)
        snapshot = await BuildPlumbingSnapshotUseCase(repository, version="seed-test").build()
        by_code = {zone.code: zone for zone in snapshot.zones}

        for zone_code, expected_total in _MIGRATED_ZONE_TOTALS.items():
            with self.subTest(zone=zone_code):
                zone = by_code[zone_code]
                self.assertEqual(zone.packages, (), "Мигрированная зона не должна иметь пакетов C/B/A")
                self.assertIsNone(zone.active_package)
                self.assertEqual(zone.total, expected_total)

    async def test_snapshot_parity_stable_after_reseed(self) -> None:
        await ensure_global_plumbing_defaults(self.session_factory)
        await ensure_global_plumbing_defaults(self.session_factory)

        repository = SqlAlchemyPlumbingRepository(self.session_factory)
        snapshot = await BuildPlumbingSnapshotUseCase(repository, version="seed-test").build()
        sink = next(zone for zone in snapshot.zones if zone.code == "zone-kitchen-sink")
        totals = {package.code: package.total for package in sink.packages}
        self.assertEqual(totals, _SINK_PACKAGE_TOTALS)


if __name__ == "__main__":
    unittest.main()
