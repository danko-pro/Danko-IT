from __future__ import annotations

import unittest

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from supply_bot.database.metadata import metadata
from supply_bot.storage_estimates.ceiling_repository import SqlAlchemyCeilingRepository


class SqlAlchemyCeilingRepositoryTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.engine = create_async_engine("sqlite+aiosqlite:///:memory:")
        async with self.engine.begin() as connection:
            await connection.run_sync(metadata.create_all)
        self.session_factory = async_sessionmaker(self.engine, expire_on_commit=False)
        self.repository = SqlAlchemyCeilingRepository(self.session_factory)

    async def asyncTearDown(self) -> None:
        await self.engine.dispose()

    async def test_config_create_get_ensure_and_update(self) -> None:
        owner_1 = self.repository.for_owner(1)
        owner_2 = self.repository.for_owner(2)
        project_id = await owner_1.create_estimate_project(name="Ceilings")

        with self.assertRaises(RuntimeError):
            await self.repository.ensure_estimate_ceiling_config(project_id)

        created_config = await owner_1.ensure_estimate_ceiling_config(project_id)
        self.assertEqual(created_config["project_id"], project_id)
        self.assertEqual(created_config["price_factor"], 1)

        ensured_config = await owner_1.ensure_estimate_ceiling_config(project_id)
        self.assertEqual(ensured_config["project_id"], project_id)

        await owner_1.update_estimate_ceiling_config(
            project_id,
            default_package_code="MID",
            price_factor=1.2,
            note="note",
        )
        updated_config = await owner_1.get_estimate_ceiling_config(project_id)
        self.assertIsNotNone(updated_config)
        self.assertEqual(updated_config["default_package_code"], "MID")
        self.assertEqual(updated_config["price_factor"], 1.2)
        self.assertEqual(updated_config["note"], "note")
        self.assertIsNone(await owner_2.get_estimate_ceiling_config(project_id))

    async def test_catalog_global_and_user_items_are_owner_scoped_with_unique_source_code(self) -> None:
        global_repo = self.repository
        owner_1 = self.repository.for_owner(1)
        owner_2 = self.repository.for_owner(2)

        global_item_id = await global_repo.create_estimate_ceiling_catalog_item(
            source_code="POT-001",
            title="Global ceiling",
            category="base",
            unit="m2",
            work_price=100,
        )
        owner_item_id = await owner_1.create_estimate_ceiling_catalog_item(
            source_code="POT-001",
            title="Owner ceiling",
            category="base",
            unit="m2",
            work_price=200,
        )
        owner_2_item_id = await owner_2.create_estimate_ceiling_catalog_item(
            source_code="POT-001",
            title="Owner 2 ceiling",
            category="base",
            unit="m2",
            work_price=300,
        )

        owner_1_ids = {item["id"] for item in await owner_1.list_estimate_ceiling_catalog_items()}
        owner_2_ids = {item["id"] for item in await owner_2.list_estimate_ceiling_catalog_items()}
        self.assertIn(global_item_id, owner_1_ids)
        self.assertIn(owner_item_id, owner_1_ids)
        self.assertNotIn(owner_2_item_id, owner_1_ids)
        self.assertIn(global_item_id, owner_2_ids)
        self.assertIn(owner_2_item_id, owner_2_ids)
        self.assertNotIn(owner_item_id, owner_2_ids)
        self.assertIsNone(await owner_2.get_estimate_ceiling_catalog_item(owner_item_id))

        await owner_1.update_estimate_ceiling_catalog_item(owner_item_id, title="Owner ceiling updated")
        self.assertEqual(
            (await owner_1.get_estimate_ceiling_catalog_item(owner_item_id))["title"],
            "Owner ceiling updated",
        )
        self.assertFalse(await owner_1.update_estimate_ceiling_catalog_item(global_item_id, title="Blocked"))
        global_item = await global_repo.get_estimate_ceiling_catalog_item(global_item_id)
        self.assertEqual(global_item["title"], "Global ceiling")

        with self.assertRaises(IntegrityError):
            await global_repo.create_estimate_ceiling_catalog_item(
                source_code="POT-001",
                title="Duplicate global",
                category="base",
                unit="m2",
            )
        with self.assertRaises(IntegrityError):
            await owner_1.create_estimate_ceiling_catalog_item(
                source_code="POT-001",
                title="Duplicate owner",
                category="base",
                unit="m2",
            )

    async def test_ceiling_rooms_are_owner_scoped_and_replaceable(self) -> None:
        owner_1 = self.repository.for_owner(1)
        owner_2 = self.repository.for_owner(2)
        catalog_item_id = await self.repository.create_estimate_ceiling_catalog_item(
            source_code="POT-ROOM",
            title="Room ceiling",
            category="base",
            unit="m2",
        )
        project_id = await owner_1.create_estimate_project(name="Rooms")
        room_1_id = await owner_1.create_estimate_room(project_id=project_id, name="Living room")
        room_2_id = await owner_1.create_estimate_room(project_id=project_id, name="Bedroom")
        foreign_project_id = await owner_2.create_estimate_project(name="Foreign")
        foreign_room_id = await owner_2.create_estimate_room(project_id=foreign_project_id, name="Foreign room")

        await owner_1.replace_estimate_ceiling_rooms(
            project_id,
            [
                {
                    "room_id": room_1_id,
                    "default_catalog_item_id": catalog_item_id,
                    "is_enabled": True,
                    "ceiling_area_m2": 15.5,
                    "area_source": "manual",
                    "perimeter_m": 16,
                    "perimeter_source": "manual",
                    "package_code_snapshot": "MIN",
                    "note": "first",
                    "sort_order": 20,
                },
                {
                    "room_id": foreign_room_id,
                    "default_catalog_item_id": catalog_item_id,
                    "is_enabled": True,
                },
            ],
        )
        rows = await owner_1.list_estimate_ceiling_rooms(project_id)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["room_id"], room_1_id)
        self.assertEqual(rows[0]["default_catalog_item_id"], catalog_item_id)
        self.assertEqual(rows[0]["ceiling_area_m2"], 15.5)
        self.assertEqual(rows[0]["sort_order"], 20)
        self.assertEqual(await owner_2.list_estimate_ceiling_rooms(project_id), [])

        await owner_1.replace_estimate_ceiling_rooms(project_id, [{"room_id": room_2_id, "is_enabled": False}])
        replaced_rows = await owner_1.list_estimate_ceiling_rooms(project_id)
        self.assertEqual(len(replaced_rows), 1)
        self.assertEqual(replaced_rows[0]["room_id"], room_2_id)
        self.assertEqual(replaced_rows[0]["is_enabled"], 0)

    async def test_project_ceiling_items_are_owner_scoped_and_keep_snapshots(self) -> None:
        owner_1 = self.repository.for_owner(1)
        owner_2 = self.repository.for_owner(2)
        catalog_item_id = await owner_1.create_estimate_ceiling_catalog_item(
            source_code="POT-SNAP",
            title="Catalog title",
            category="base",
            unit="m2",
            work_price=100,
            material_price=200,
            equipment_price=300,
            consumables_price=400,
            price_factor=1.1,
        )
        project_id = await owner_1.create_estimate_project(name="Items")
        room_id = await owner_1.create_estimate_room(project_id=project_id, name="Room")
        foreign_project_id = await owner_2.create_estimate_project(name="Foreign")
        foreign_room_id = await owner_2.create_estimate_room(project_id=foreign_project_id, name="Foreign room")

        item_id = await owner_1.create_estimate_project_ceiling_item(
            project_id=project_id,
            room_id=room_id,
            source_catalog_item_id=catalog_item_id,
            source_code_snapshot="POT-SNAP",
            title_snapshot="Snapshot title",
            category_snapshot="base",
            unit_snapshot="m2",
            quantity=10,
            quantity_source="area",
            quantity_formula_snapshot="room_area",
            work_price_snapshot=100,
            material_price_snapshot=200,
            equipment_price_snapshot=300,
            consumables_price_snapshot=400,
            price_factor_snapshot=1.1,
            work_total=1000,
            material_total=2000,
            equipment_total=3000,
            consumables_total=4000,
            total=10000,
            note_snapshot="snapshot note",
            is_enabled=True,
            sort_order=30,
        )
        ignored_item_id = await owner_1.create_estimate_project_ceiling_item(
            project_id=project_id,
            room_id=foreign_room_id,
            source_catalog_item_id=catalog_item_id,
            title_snapshot="No room",
            unit_snapshot="pcs",
        )
        self.assertGreater(ignored_item_id, 0)

        items = await owner_1.list_estimate_project_ceiling_items(project_id)
        self.assertEqual(len(items), 2)
        item = next(row for row in items if row["id"] == item_id)
        self.assertEqual(item["room_id"], room_id)
        self.assertEqual(item["source_catalog_item_id"], catalog_item_id)
        self.assertEqual(item["source_code_snapshot"], "POT-SNAP")
        self.assertEqual(item["title_snapshot"], "Snapshot title")
        self.assertEqual(item["work_price_snapshot"], 100)
        self.assertEqual(item["total"], 10000)
        self.assertIsNone(next(row for row in items if row["id"] == ignored_item_id)["room_id"])
        self.assertEqual(await owner_2.list_estimate_project_ceiling_items(project_id), [])

        await owner_1.update_estimate_ceiling_catalog_item(catalog_item_id, title="Catalog changed", work_price=999)
        unchanged_item = (await owner_1.list_estimate_project_ceiling_items(project_id))[0]
        self.assertEqual(unchanged_item["title_snapshot"], "Snapshot title")
        self.assertEqual(unchanged_item["work_price_snapshot"], 100)

        self.assertIsNone(await owner_2.update_estimate_project_ceiling_item(item_id, title_snapshot="Blocked"))
        self.assertIsNone(await owner_2.delete_estimate_project_ceiling_item(item_id))

        updated_project_id = await owner_1.update_estimate_project_ceiling_item(
            item_id,
            room_id=room_id,
            source_catalog_item_id=catalog_item_id,
            source_code_snapshot="POT-SNAP-UPD",
            title_snapshot="Updated snapshot",
            category_snapshot="updated",
            unit_snapshot="lm",
            quantity=5,
            quantity_source="perimeter",
            quantity_formula_snapshot="room_perimeter",
            work_price_snapshot=10,
            material_price_snapshot=20,
            equipment_price_snapshot=30,
            consumables_price_snapshot=40,
            price_factor_snapshot=1.3,
            work_total=50,
            material_total=100,
            equipment_total=150,
            consumables_total=200,
            total=500,
            note_snapshot="updated note",
            is_enabled=False,
            sort_order=40,
        )
        self.assertEqual(updated_project_id, project_id)
        updated_items = await owner_1.list_estimate_project_ceiling_items(project_id)
        updated_item = next(row for row in updated_items if row["id"] == item_id)
        self.assertEqual(updated_item["title_snapshot"], "Updated snapshot")
        self.assertEqual(updated_item["quantity_source"], "perimeter")
        self.assertEqual(updated_item["is_enabled"], 0)
        self.assertEqual(updated_item["total"], 500)

        deleted_project_id = await owner_1.delete_estimate_project_ceiling_item(item_id)
        self.assertEqual(deleted_project_id, project_id)
        remaining_ids = {row["id"] for row in await owner_1.list_estimate_project_ceiling_items(project_id)}
        self.assertNotIn(item_id, remaining_ids)
