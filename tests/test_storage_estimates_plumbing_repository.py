from __future__ import annotations

import unittest

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from supply_bot.database.metadata import metadata
from supply_bot.storage_estimates.plumbing_repository import SqlAlchemyPlumbingRepository


class SqlAlchemyPlumbingRepositoryTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.engine = create_async_engine("sqlite+aiosqlite:///:memory:")
        async with self.engine.begin() as connection:
            await connection.run_sync(metadata.create_all)
        self.session_factory = async_sessionmaker(self.engine, expire_on_commit=False)
        self.repository = SqlAlchemyPlumbingRepository(self.session_factory)

    async def asyncTearDown(self) -> None:
        await self.engine.dispose()

    async def test_catalog_item_crud_and_soft_delete(self) -> None:
        owner_1 = self.repository.for_owner(1)
        item_id = await owner_1.create_plumbing_catalog_item(
            source_code="work-water-point",
            public_title="Монтаж точки ХВС/ГВС",
            technical_title="Точка водоснабжения (internal)",
            category="works",
            unit="шт",
            work_price=3500,
            material_price=200,
            coefficient=1.0,
            note="internal note",
            sort_order=10,
        )
        self.assertGreater(item_id, 0)

        created = await owner_1.get_plumbing_catalog_item(item_id)
        self.assertIsNotNone(created)
        self.assertEqual(created["source_code"], "work-water-point")
        self.assertEqual(created["public_title"], "Монтаж точки ХВС/ГВС")
        self.assertEqual(created["technical_title"], "Точка водоснабжения (internal)")
        self.assertEqual(created["work_price"], 3500)
        self.assertEqual(created["is_active"], 1)
        self.assertNotIn("owner_user_id", created)

        self.assertTrue(
            await owner_1.update_plumbing_catalog_item(
                item_id,
                public_title="Монтаж точки водоснабжения",
                work_price=3700,
            )
        )
        updated = await owner_1.get_plumbing_catalog_item(item_id)
        self.assertEqual(updated["public_title"], "Монтаж точки водоснабжения")
        self.assertEqual(updated["work_price"], 3700)

        self.assertFalse(await owner_1.update_plumbing_catalog_item(item_id))

        listed = await owner_1.list_plumbing_catalog_items()
        self.assertIn(item_id, {row["id"] for row in listed})

        self.assertTrue(await owner_1.delete_plumbing_catalog_item(item_id))
        self.assertNotIn(item_id, {row["id"] for row in await owner_1.list_plumbing_catalog_items()})
        self.assertIn(
            item_id,
            {row["id"] for row in await owner_1.list_plumbing_catalog_items(include_inactive=True)},
        )
        soft_deleted = await owner_1.get_plumbing_catalog_item(item_id)
        self.assertEqual(soft_deleted["is_active"], 0)
        self.assertFalse(await owner_1.delete_plumbing_catalog_item(item_id))

    async def test_catalog_items_owner_isolation_and_unique_source_code(self) -> None:
        global_repo = self.repository
        owner_1 = self.repository.for_owner(1)
        owner_2 = self.repository.for_owner(2)

        global_id = await global_repo.create_plumbing_catalog_item(
            source_code="pipe-ppr-d20",
            public_title="Труба PPR D20 (global)",
            category="materials",
            unit="м.п.",
            material_price=120,
        )
        owner_1_id = await owner_1.create_plumbing_catalog_item(
            source_code="pipe-ppr-d20",
            public_title="Труба PPR D20 (owner 1)",
            category="materials",
            unit="м.п.",
            material_price=140,
        )
        owner_2_id = await owner_2.create_plumbing_catalog_item(
            source_code="pipe-ppr-d20",
            public_title="Труба PPR D20 (owner 2)",
            category="materials",
            unit="м.п.",
            material_price=160,
        )

        owner_1_ids = {row["id"] for row in await owner_1.list_plumbing_catalog_items()}
        owner_2_ids = {row["id"] for row in await owner_2.list_plumbing_catalog_items()}
        self.assertIn(global_id, owner_1_ids)
        self.assertIn(owner_1_id, owner_1_ids)
        self.assertNotIn(owner_2_id, owner_1_ids)
        self.assertIn(global_id, owner_2_ids)
        self.assertIn(owner_2_id, owner_2_ids)
        self.assertNotIn(owner_1_id, owner_2_ids)
        self.assertIsNone(await owner_2.get_plumbing_catalog_item(owner_1_id))

        # owner не может править/удалять глобальный или чужой атом
        self.assertFalse(await owner_1.update_plumbing_catalog_item(global_id, public_title="Blocked"))
        self.assertFalse(await owner_1.delete_plumbing_catalog_item(global_id))
        self.assertFalse(await owner_2.update_plumbing_catalog_item(owner_1_id, public_title="Blocked"))
        self.assertEqual(
            (await global_repo.get_plumbing_catalog_item(global_id))["public_title"],
            "Труба PPR D20 (global)",
        )

        with self.assertRaises(IntegrityError):
            await global_repo.create_plumbing_catalog_item(
                source_code="pipe-ppr-d20",
                public_title="Duplicate global",
                category="materials",
                unit="м.п.",
            )
        with self.assertRaises(IntegrityError):
            await owner_1.create_plumbing_catalog_item(
                source_code="pipe-ppr-d20",
                public_title="Duplicate owner",
                category="materials",
                unit="м.п.",
            )

    async def test_zone_crud_and_owner_isolation(self) -> None:
        global_repo = self.repository
        owner_1 = self.repository.for_owner(1)
        owner_2 = self.repository.for_owner(2)

        global_zone_id = await global_repo.create_plumbing_zone(
            zone_code="zone-kitchen-sink",
            subgroup="Кухня",
            title="Зона мойки (global)",
            risk_percent=6.4,
            active_package_code="b",
        )
        owner_1_zone_id = await owner_1.create_plumbing_zone(
            zone_code="zone-kitchen-sink",
            subgroup="Кухня",
            title="Зона мойки (owner 1)",
        )

        global_zone = await owner_1.get_plumbing_zone(global_zone_id)
        self.assertEqual(global_zone["title"], "Зона мойки (global)")
        self.assertEqual(global_zone["risk_percent"], 6.4)
        self.assertEqual(global_zone["active_package_code"], "b")
        self.assertNotIn("owner_user_id", global_zone)

        owner_1_zone_ids = {row["id"] for row in await owner_1.list_plumbing_zones()}
        owner_2_zone_ids = {row["id"] for row in await owner_2.list_plumbing_zones()}
        self.assertIn(global_zone_id, owner_1_zone_ids)
        self.assertIn(owner_1_zone_id, owner_1_zone_ids)
        self.assertIn(global_zone_id, owner_2_zone_ids)
        self.assertNotIn(owner_1_zone_id, owner_2_zone_ids)
        self.assertIsNone(await owner_2.get_plumbing_zone(owner_1_zone_id))

        self.assertTrue(
            await owner_1.update_plumbing_zone(owner_1_zone_id, title="Зона мойки (изменено)", risk_percent=7.0)
        )
        self.assertEqual((await owner_1.get_plumbing_zone(owner_1_zone_id))["title"], "Зона мойки (изменено)")
        self.assertEqual((await owner_1.get_plumbing_zone(owner_1_zone_id))["risk_percent"], 7.0)
        self.assertFalse(await owner_1.update_plumbing_zone(global_zone_id, title="Blocked"))

        self.assertTrue(await owner_1.delete_plumbing_zone(owner_1_zone_id))
        self.assertNotIn(owner_1_zone_id, {row["id"] for row in await owner_1.list_plumbing_zones()})
        self.assertIn(
            owner_1_zone_id,
            {row["id"] for row in await owner_1.list_plumbing_zones(include_inactive=True)},
        )
        self.assertFalse(await owner_1.delete_plumbing_zone(owner_1_zone_id))

    async def test_replace_zone_items_composition(self) -> None:
        owner_1 = self.repository.for_owner(1)
        owner_2 = self.repository.for_owner(2)

        atom_a = await owner_1.create_plumbing_catalog_item(
            source_code="work-water-point",
            public_title="Точка ХВС/ГВС",
            category="works",
            unit="шт",
            work_price=3500,
        )
        foreign_atom = await owner_2.create_plumbing_catalog_item(
            source_code="foreign-atom",
            public_title="Чужой атом",
            category="works",
            unit="шт",
        )
        zone_id = await owner_1.create_plumbing_zone(
            zone_code="zone-kitchen-sink",
            subgroup="Кухня",
            title="Зона мойки",
        )

        self.assertTrue(
            await owner_1.replace_plumbing_zone_items(
                zone_id,
                [
                    {
                        "atomic_item_id": atom_a,
                        "atomic_source_code": "work-water-point",
                        "quantity": 2,
                        "coefficient": 1,
                    },
                    {"atomic_item_id": foreign_atom, "atomic_source_code": "foreign-atom", "quantity": 1},
                ],
            )
        )
        rows = await owner_1.list_plumbing_zone_items(zone_id)
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0]["atomic_source_code"], "work-water-point")
        self.assertEqual(rows[0]["atomic_item_id"], atom_a)
        self.assertEqual(rows[0]["quantity"], 2)
        # чужой атом не резолвится в atomic_item_id (не виден владельцу)
        self.assertEqual(rows[1]["atomic_source_code"], "foreign-atom")
        self.assertIsNone(rows[1]["atomic_item_id"])

        # повторная замена полностью перезаписывает состав
        self.assertTrue(
            await owner_1.replace_plumbing_zone_items(
                zone_id,
                [{"atomic_source_code": "work-water-point", "quantity": 5}],
            )
        )
        replaced = await owner_1.list_plumbing_zone_items(zone_id)
        self.assertEqual(len(replaced), 1)
        self.assertEqual(replaced[0]["quantity"], 5)

        # чужой владелец не видит и не может править состав приватной зоны
        self.assertEqual(await owner_2.list_plumbing_zone_items(zone_id), [])
        self.assertFalse(
            await owner_2.replace_plumbing_zone_items(
                zone_id,
                [{"atomic_source_code": "work-water-point", "quantity": 1}],
            )
        )
        self.assertEqual(len(await owner_1.list_plumbing_zone_items(zone_id)), 1)

    async def test_replace_zone_packages_with_items(self) -> None:
        owner_1 = self.repository.for_owner(1)
        owner_2 = self.repository.for_owner(2)

        faucet = await owner_1.create_plumbing_catalog_item(
            source_code="kitchen-faucet-b",
            public_title="Смеситель кухонный B",
            category="equipment",
            unit="шт",
            equipment_price=8000,
        )
        zone_id = await owner_1.create_plumbing_zone(
            zone_code="zone-kitchen-sink",
            subgroup="Кухня",
            title="Зона мойки",
        )

        self.assertTrue(
            await owner_1.replace_plumbing_zone_packages(
                zone_id,
                [
                    {
                        "package_code": "c",
                        "label": "Пакет C",
                        "items": [{"atomic_source_code": "kitchen-faucet-b", "quantity": 1}],
                    },
                    {
                        "package_code": "b",
                        "label": "Пакет B",
                        "items": [
                            {"atomic_item_id": faucet, "atomic_source_code": "kitchen-faucet-b", "quantity": 1},
                        ],
                    },
                ],
            )
        )
        packages = await owner_1.list_plumbing_zone_packages(zone_id)
        self.assertEqual([p["package_code"] for p in packages], ["c", "b"])
        package_b = next(p for p in packages if p["package_code"] == "b")
        self.assertEqual(package_b["label"], "Пакет B")
        self.assertEqual(len(package_b["items"]), 1)
        self.assertEqual(package_b["items"][0]["atomic_item_id"], faucet)
        self.assertEqual(package_b["items"][0]["atomic_source_code"], "kitchen-faucet-b")

        # повторная замена полностью перезаписывает пакеты и их состав
        self.assertTrue(
            await owner_1.replace_plumbing_zone_packages(
                zone_id,
                [{"package_code": "a", "label": "Пакет A", "items": []}],
            )
        )
        repackaged = await owner_1.list_plumbing_zone_packages(zone_id)
        self.assertEqual([p["package_code"] for p in repackaged], ["a"])
        self.assertEqual(repackaged[0]["items"], [])

        # чужой владелец не видит и не может править пакеты приватной зоны
        self.assertEqual(await owner_2.list_plumbing_zone_packages(zone_id), [])
        self.assertFalse(
            await owner_2.replace_plumbing_zone_packages(
                zone_id,
                [{"package_code": "c", "items": []}],
            )
        )

    async def test_audit_records_on_create_update_delete(self) -> None:
        owner_1 = self.repository.for_owner(1)
        owner_2 = self.repository.for_owner(2)

        item_id = await owner_1.create_plumbing_catalog_item(
            source_code="work-water-point",
            public_title="Точка ХВС/ГВС",
            category="works",
            unit="шт",
            work_price=3500,
        )
        await owner_1.update_plumbing_catalog_item(item_id, work_price=3700)
        await owner_1.delete_plumbing_catalog_item(item_id)

        audit = await owner_1.list_plumbing_catalog_audit(entity_type="item", entity_id=item_id)
        self.assertEqual([row["action"] for row in audit], ["create", "update", "delete"])
        self.assertTrue(all(row["changed_by_user_id"] == 1 for row in audit))

        create_row = audit[0]
        self.assertEqual(create_row["diff"]["source_code"], "work-water-point")
        self.assertEqual(create_row["diff"]["work_price"], 3500)
        self.assertEqual(audit[1]["diff"], {"work_price": 3700})
        self.assertEqual(audit[2]["diff"], {"is_active": 0})

        # аудит owner-scoped: чужой владелец не видит чужие записи
        self.assertEqual(await owner_2.list_plumbing_catalog_audit(entity_type="item"), [])

    async def test_audit_records_on_zone_and_composition_changes(self) -> None:
        owner_1 = self.repository.for_owner(1)

        zone_id = await owner_1.create_plumbing_zone(
            zone_code="zone-kitchen-sink",
            subgroup="Кухня",
            title="Зона мойки",
        )
        await owner_1.update_plumbing_zone(zone_id, title="Зона мойки (изм.)")
        await owner_1.replace_plumbing_zone_items(
            zone_id,
            [{"atomic_source_code": "work-water-point", "quantity": 2}],
        )
        await owner_1.replace_plumbing_zone_packages(
            zone_id,
            [{"package_code": "b", "label": "Пакет B", "items": []}],
        )

        zone_audit = await owner_1.list_plumbing_catalog_audit(entity_type="zone", entity_id=zone_id)
        self.assertEqual([row["action"] for row in zone_audit], ["create", "update"])
        self.assertEqual(zone_audit[0]["diff"]["zone_code"], "zone-kitchen-sink")
        self.assertEqual(zone_audit[1]["diff"], {"title": "Зона мойки (изм.)"})

        item_audit = await owner_1.list_plumbing_catalog_audit(entity_type="zone_item", entity_id=zone_id)
        self.assertEqual(len(item_audit), 1)
        self.assertEqual(item_audit[0]["action"], "update")
        self.assertEqual(item_audit[0]["diff"]["items"][0]["atomic_source_code"], "work-water-point")
        self.assertEqual(item_audit[0]["diff"]["items"][0]["quantity"], 2)

        package_audit = await owner_1.list_plumbing_catalog_audit(entity_type="package", entity_id=zone_id)
        self.assertEqual(len(package_audit), 1)
        self.assertEqual(package_audit[0]["diff"]["packages"][0]["package_code"], "b")


if __name__ == "__main__":
    unittest.main()
