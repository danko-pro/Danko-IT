from __future__ import annotations

import unittest
from typing import Any

from supply_bot.application.errors import NotFoundError, ValidationError
from supply_bot.estimates.application.plumbing_catalog import (
    CreatePlumbingCatalogItemCommand,
    CreatePlumbingCatalogItemUseCase,
    CreatePlumbingZoneCommand,
    CreatePlumbingZoneUseCase,
    DeletePlumbingCatalogItemUseCase,
    DeletePlumbingZoneUseCase,
    ReplacePlumbingZoneItemsCommand,
    ReplacePlumbingZoneItemsUseCase,
    ReplacePlumbingZonePackagesCommand,
    ReplacePlumbingZonePackagesUseCase,
    UpdatePlumbingCatalogItemCommand,
    UpdatePlumbingCatalogItemUseCase,
    UpdatePlumbingZoneCommand,
    UpdatePlumbingZoneUseCase,
)


class FakePlumbingStorage:
    def __init__(
        self,
        *,
        item_update_result: object = True,
        item_delete_result: object = True,
        zone_update_result: object = True,
        zone_delete_result: object = True,
        replace_items_result: object = True,
        replace_packages_result: object = True,
        catalog_item: dict[str, Any] | None = None,
        zone: dict[str, Any] | None = None,
    ) -> None:
        self.item_update_result = item_update_result
        self.item_delete_result = item_delete_result
        self.zone_update_result = zone_update_result
        self.zone_delete_result = zone_delete_result
        self.replace_items_result = replace_items_result
        self.replace_packages_result = replace_packages_result
        self.catalog_item = catalog_item or {"id": 10, "public_title": "Updated"}
        self.zone = zone or {"id": 20, "title": "Updated zone"}
        self.create_item_calls: list[dict[str, object]] = []
        self.update_item_calls: list[tuple[int, dict[str, object]]] = []
        self.delete_item_calls: list[int] = []
        self.create_zone_calls: list[dict[str, object]] = []
        self.update_zone_calls: list[tuple[int, dict[str, object]]] = []
        self.delete_zone_calls: list[int] = []
        self.replace_items_calls: list[tuple[int, list[dict[str, Any]]]] = []
        self.replace_packages_calls: list[tuple[int, list[dict[str, Any]]]] = []

    async def create_plumbing_catalog_item(self, **kwargs: object) -> int:
        self.create_item_calls.append(kwargs)
        return 501

    async def update_plumbing_catalog_item(self, item_id: int, **updates: object) -> object:
        self.update_item_calls.append((item_id, updates))
        return self.item_update_result

    async def get_plumbing_catalog_item(self, item_id: int) -> dict[str, Any] | None:
        return self.catalog_item

    async def delete_plumbing_catalog_item(self, item_id: int) -> object:
        self.delete_item_calls.append(item_id)
        return self.item_delete_result

    async def create_plumbing_zone(self, **kwargs: object) -> int:
        self.create_zone_calls.append(kwargs)
        return 601

    async def update_plumbing_zone(self, zone_id: int, **updates: object) -> object:
        self.update_zone_calls.append((zone_id, updates))
        return self.zone_update_result

    async def get_plumbing_zone(self, zone_id: int) -> dict[str, Any] | None:
        return self.zone

    async def delete_plumbing_zone(self, zone_id: int) -> object:
        self.delete_zone_calls.append(zone_id)
        return self.zone_delete_result

    async def replace_plumbing_zone_items(self, zone_id: int, items: list[dict[str, Any]]) -> object:
        self.replace_items_calls.append((zone_id, items))
        return self.replace_items_result

    async def replace_plumbing_zone_packages(self, zone_id: int, packages: list[dict[str, Any]]) -> object:
        self.replace_packages_calls.append((zone_id, packages))
        return self.replace_packages_result


def _create_item_command(**overrides: object) -> CreatePlumbingCatalogItemCommand:
    values: dict[str, object] = {
        "source_code": " work-water-point ",
        "public_title": " Монтаж точки ХВС/ГВС ",
        "category": " works ",
        "unit": " шт ",
        "technical_title": " Точка водоснабжения ",
        "work_price": -10,
        "material_price": 200,
        "equipment_price": -1,
        "consumables_price": 50,
        "coefficient": None,
        "catalog_group": " Работы · ХВС/ГВС ",
        "source": " Смета работ ",
        "note": " internal ",
        "is_active": True,
        "sort_order": None,
    }
    values.update(overrides)
    return CreatePlumbingCatalogItemCommand(**values)


def _create_zone_command(**overrides: object) -> CreatePlumbingZoneCommand:
    values: dict[str, object] = {
        "zone_code": " zone-kitchen-sink ",
        "subgroup": " Кухня ",
        "title": " Зона мойки ",
        "description": " База ",
        "disclaimer": " Ориентировочный расчёт ",
        "risk_percent": None,
        "active_package_code": " B ",
        "is_active": True,
        "sort_order": None,
    }
    values.update(overrides)
    return CreatePlumbingZoneCommand(**values)


class PlumbingCatalogItemUseCaseTests(unittest.IsolatedAsyncioTestCase):
    async def test_create_normalizes_values(self) -> None:
        storage = FakePlumbingStorage()

        item_id = await CreatePlumbingCatalogItemUseCase(storage).execute(_create_item_command())

        self.assertEqual(item_id, 501)
        self.assertEqual(
            storage.create_item_calls,
            [
                {
                    "source_code": "work-water-point",
                    "public_title": "Монтаж точки ХВС/ГВС",
                    "category": "works",
                    "unit": "шт",
                    "technical_title": "Точка водоснабжения",
                    "work_price": 0.0,
                    "material_price": 200.0,
                    "equipment_price": 0.0,
                    "consumables_price": 50.0,
                    "coefficient": 1.0,
                    "catalog_group": "Работы · ХВС/ГВС",
                    "source": "Смета работ",
                    "note": "internal",
                    "is_active": True,
                    "sort_order": 100,
                }
            ],
        )

    async def test_create_rejects_required_fields(self) -> None:
        cases = [
            ("source_code", "Plumbing source code is required"),
            ("public_title", "Plumbing public title is required"),
            ("category", "Plumbing category is required"),
            ("unit", "Plumbing unit is required"),
        ]
        for field, message in cases:
            storage = FakePlumbingStorage()
            with self.subTest(field=field):
                with self.assertRaisesRegex(ValidationError, message):
                    await CreatePlumbingCatalogItemUseCase(storage).execute(_create_item_command(**{field: "  "}))
                self.assertEqual(storage.create_item_calls, [])

    async def test_update_builds_partial_updates(self) -> None:
        storage = FakePlumbingStorage(catalog_item={"id": 10, "public_title": "Updated"})

        item = await UpdatePlumbingCatalogItemUseCase(storage).execute(
            UpdatePlumbingCatalogItemCommand(
                item_id=10,
                payload={
                    "public_title": " Updated ",
                    "note": "   ",
                    "work_price": -5,
                    "coefficient": "",
                    "is_active": False,
                    "sort_order": -3,
                },
            )
        )

        self.assertEqual(item, {"id": 10, "public_title": "Updated"})
        self.assertEqual(
            storage.update_item_calls,
            [
                (
                    10,
                    {
                        "public_title": "Updated",
                        "note": None,
                        "work_price": 0.0,
                        "coefficient": 1.0,
                        "is_active": False,
                        "sort_order": 0,
                    },
                )
            ],
        )

    async def test_update_rejects_missing_item(self) -> None:
        storage = FakePlumbingStorage(item_update_result=False)

        with self.assertRaisesRegex(NotFoundError, "Plumbing catalog item not found"):
            await UpdatePlumbingCatalogItemUseCase(storage).execute(
                UpdatePlumbingCatalogItemCommand(item_id=10, payload={"public_title": "x"})
            )

    async def test_delete_rejects_missing_item(self) -> None:
        storage = FakePlumbingStorage(item_delete_result=False)

        with self.assertRaisesRegex(NotFoundError, "Plumbing catalog item not found"):
            await DeletePlumbingCatalogItemUseCase(storage).execute(10)
        self.assertEqual(storage.delete_item_calls, [10])


class PlumbingZoneUseCaseTests(unittest.IsolatedAsyncioTestCase):
    async def test_create_zone_normalizes_values(self) -> None:
        storage = FakePlumbingStorage()

        zone_id = await CreatePlumbingZoneUseCase(storage).execute(_create_zone_command())

        self.assertEqual(zone_id, 601)
        self.assertEqual(
            storage.create_zone_calls,
            [
                {
                    "zone_code": "zone-kitchen-sink",
                    "subgroup": "Кухня",
                    "title": "Зона мойки",
                    "description": "База",
                    "disclaimer": "Ориентировочный расчёт",
                    "risk_percent": 6.4,
                    "active_package_code": "b",
                    "is_active": True,
                    "sort_order": 100,
                }
            ],
        )

    async def test_create_zone_rejects_bad_package_code(self) -> None:
        storage = FakePlumbingStorage()

        with self.assertRaisesRegex(ValidationError, "package code must be one of"):
            await CreatePlumbingZoneUseCase(storage).execute(_create_zone_command(active_package_code="z"))
        self.assertEqual(storage.create_zone_calls, [])

    async def test_create_zone_allows_empty_package_code(self) -> None:
        storage = FakePlumbingStorage()

        await CreatePlumbingZoneUseCase(storage).execute(_create_zone_command(active_package_code="  ", risk_percent=8))

        call = storage.create_zone_calls[0]
        self.assertIsNone(call["active_package_code"])
        self.assertEqual(call["risk_percent"], 8.0)

    async def test_update_zone_partial(self) -> None:
        storage = FakePlumbingStorage(zone={"id": 20, "title": "Updated zone"})

        zone = await UpdatePlumbingZoneUseCase(storage).execute(
            UpdatePlumbingZoneCommand(
                zone_id=20,
                payload={"title": " Updated zone ", "risk_percent": 7.5, "active_package_code": "A"},
            )
        )

        self.assertEqual(zone, {"id": 20, "title": "Updated zone"})
        self.assertEqual(
            storage.update_zone_calls,
            [(20, {"title": "Updated zone", "risk_percent": 7.5, "active_package_code": "a"})],
        )

    async def test_delete_zone_rejects_missing(self) -> None:
        storage = FakePlumbingStorage(zone_delete_result=False)

        with self.assertRaisesRegex(NotFoundError, "Plumbing zone not found"):
            await DeletePlumbingZoneUseCase(storage).execute(20)
        self.assertEqual(storage.delete_zone_calls, [20])

    async def test_replace_zone_items_normalizes_rows(self) -> None:
        storage = FakePlumbingStorage()

        await ReplacePlumbingZoneItemsUseCase(storage).execute(
            ReplacePlumbingZoneItemsCommand(
                zone_id=20,
                items=[
                    {
                        "atomic_item_id": "5",
                        "atomic_source_code": " work-water-point ",
                        "quantity": 2,
                        "coefficient": "",
                    },
                    {"atomic_item_id": 0, "atomic_source_code": "pipe-ppr-d20", "quantity": -1},
                ],
            )
        )

        zone_id, rows = storage.replace_items_calls[0]
        self.assertEqual(zone_id, 20)
        self.assertEqual(
            rows,
            [
                {
                    "atomic_item_id": 5,
                    "atomic_source_code": "work-water-point",
                    "quantity": 2.0,
                    "coefficient": 1.0,
                    "sort_order": 0,
                },
                {
                    "atomic_item_id": None,
                    "atomic_source_code": "pipe-ppr-d20",
                    "quantity": 0.0,
                    "coefficient": 1.0,
                    "sort_order": 0,
                },
            ],
        )

    async def test_replace_zone_items_missing_source_code(self) -> None:
        storage = FakePlumbingStorage()

        with self.assertRaisesRegex(ValidationError, "atomic source code is required"):
            await ReplacePlumbingZoneItemsUseCase(storage).execute(
                ReplacePlumbingZoneItemsCommand(zone_id=20, items=[{"quantity": 1}])
            )
        self.assertEqual(storage.replace_items_calls, [])

    async def test_replace_zone_packages_normalizes(self) -> None:
        storage = FakePlumbingStorage()

        await ReplacePlumbingZonePackagesUseCase(storage).execute(
            ReplacePlumbingZonePackagesCommand(
                zone_id=20,
                packages=[
                    {
                        "package_code": "B",
                        "label": " Пакет B ",
                        "items": [{"atomic_source_code": "kitchen-faucet-b", "quantity": 1}],
                    }
                ],
            )
        )

        zone_id, packages = storage.replace_packages_calls[0]
        self.assertEqual(zone_id, 20)
        self.assertEqual(
            packages,
            [
                {
                    "package_code": "b",
                    "label": "Пакет B",
                    "sort_order": 0,
                    "items": [
                        {
                            "atomic_item_id": None,
                            "atomic_source_code": "kitchen-faucet-b",
                            "quantity": 1.0,
                            "coefficient": 1.0,
                            "sort_order": 0,
                        }
                    ],
                }
            ],
        )

    async def test_replace_zone_items_rejects_missing_zone(self) -> None:
        storage = FakePlumbingStorage(replace_items_result=False)

        with self.assertRaisesRegex(NotFoundError, "Plumbing zone not found"):
            await ReplacePlumbingZoneItemsUseCase(storage).execute(
                ReplacePlumbingZoneItemsCommand(
                    zone_id=20, items=[{"atomic_source_code": "work-water-point", "quantity": 1}]
                )
            )


if __name__ == "__main__":
    unittest.main()
