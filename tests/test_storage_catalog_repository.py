from __future__ import annotations

import unittest

from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from supply_bot.database.metadata import metadata
from supply_bot.storage_catalog import SqlAlchemyCatalogRepository


class SqlAlchemyCatalogRepositoryTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.engine = create_async_engine("sqlite+aiosqlite:///:memory:")
        async with self.engine.begin() as connection:
            await connection.run_sync(metadata.create_all)
        self.session_factory = async_sessionmaker(self.engine, expire_on_commit=False)

    async def asyncTearDown(self) -> None:
        await self.engine.dispose()

    async def test_owner_catalog_isolation_keeps_global_catalog_visible(self) -> None:
        global_catalog = SqlAlchemyCatalogRepository(self.session_factory)
        user_one_catalog = global_catalog.for_owner(1)
        user_two_catalog = global_catalog.for_owner(2)

        global_id = await global_catalog.create_family(
            canonical_name="Global family",
            default_unit="pcs",
            dialog_fields=[],
        )
        user_one_id = await user_one_catalog.create_family(
            canonical_name="User one family",
            default_unit="pcs",
            dialog_fields=[],
        )
        user_two_id = await user_two_catalog.create_family(
            canonical_name="User two family",
            default_unit="pcs",
            dialog_fields=[],
        )

        global_ids = {item["id"] for item in await global_catalog.list_families()}
        user_one_ids = {item["id"] for item in await user_one_catalog.list_families()}
        user_two_ids = {item["id"] for item in await user_two_catalog.list_families()}

        self.assertEqual(global_ids, {global_id})
        self.assertEqual(user_one_ids, {global_id, user_one_id})
        self.assertEqual(user_two_ids, {global_id, user_two_id})
        self.assertNotIn(user_two_id, user_one_ids)
        self.assertNotIn(user_one_id, user_two_ids)
