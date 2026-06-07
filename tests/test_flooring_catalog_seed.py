from __future__ import annotations

import unittest

from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from supply_bot.database import metadata
from supply_bot.estimates.application.flooring_snapshot import (
    EXPECTED_COVERING_CODES,
    EXPECTED_LAYOUT_CODES,
    EXPECTED_PREPARATION_CODES,
    BuildFlooringSnapshotUseCase,
)
from supply_bot.storage_estimates.flooring_catalog_seed import ensure_global_flooring_catalog_defaults
from supply_bot.storage_estimates.flooring_synthetic_assembly_seed import (
    ensure_global_flooring_synthetic_catalog_assemblies,
)
from supply_bot.storage_estimates.runtime_repository import SqlAlchemyEstimateRuntimeRepository


class GlobalFlooringCatalogSeedTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.engine = create_async_engine("sqlite+aiosqlite:///:memory:")
        async with self.engine.begin() as connection:
            await connection.run_sync(metadata.create_all)
        self.session_factory = async_sessionmaker(self.engine, expire_on_commit=False)
        self.repository = SqlAlchemyEstimateRuntimeRepository(self.session_factory)

    async def asyncTearDown(self) -> None:
        await self.engine.dispose()

    async def test_seeded_defaults_publish_package_backed_public_snapshot(self) -> None:
        await ensure_global_flooring_catalog_defaults(self.session_factory)
        await ensure_global_flooring_synthetic_catalog_assemblies(self.session_factory)

        payload = await BuildFlooringSnapshotUseCase(self.repository).build_public()

        self.assertEqual({item["code"] for item in payload["coverings"]}, EXPECTED_COVERING_CODES)
        self.assertEqual({item["code"] for item in payload["preparations"]}, EXPECTED_PREPARATION_CODES)
        self.assertEqual({item["code"] for item in payload["layouts"]}, EXPECTED_LAYOUT_CODES)
        for section in ("coverings", "preparations", "layouts"):
            for item in payload[section]:
                self.assertIn("specLines", item)
                self.assertGreater(len(item["specLines"]), 0)

    async def test_seed_is_idempotent(self) -> None:
        await ensure_global_flooring_catalog_defaults(self.session_factory)
        await ensure_global_flooring_catalog_defaults(self.session_factory)

        self.assertEqual(len(await self.repository.list_estimate_flooring_coverings()), len(EXPECTED_COVERING_CODES))
        self.assertEqual(
            len(await self.repository.list_estimate_flooring_preparations()),
            len(EXPECTED_PREPARATION_CODES),
        )
        self.assertEqual(len(await self.repository.list_estimate_flooring_layouts()), len(EXPECTED_LAYOUT_CODES))


if __name__ == "__main__":
    unittest.main()
