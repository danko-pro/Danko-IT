from __future__ import annotations

import json
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
from supply_bot.estimates.application.plumbing_snapshot import (
    PUBLIC_FORBIDDEN_KEYS,
    BuildPlumbingSnapshotUseCase,
    catalog_item_unit_price,
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


# --- A3.2: сборка снапшота с запеканием резерва + whitelist ---


def _atom(
    item_id: int,
    source_code: str,
    *,
    work: float = 0.0,
    material: float = 0.0,
    equipment: float = 0.0,
    consumables: float = 0.0,
    coefficient: float = 1.0,
    category: str = "works",
    unit: str = "шт",
    technical_title: str | None = None,
    source: str | None = None,
    note: str | None = None,
) -> dict[str, Any]:
    return {
        "id": item_id,
        "source_code": source_code,
        "public_title": source_code,
        "technical_title": technical_title,
        "category": category,
        "unit": unit,
        "work_price": work,
        "material_price": material,
        "equipment_price": equipment,
        "consumables_price": consumables,
        "coefficient": coefficient,
        "catalog_group": None,
        "source": source,
        "note": note,
        "is_active": 1,
        "sort_order": 100,
    }


# Эталон «Зона мойки» (zone-kitchen-sink) из plumbing-seed.ts / public-estimate-plumbing-zones.ts.
_KITCHEN_SINK_ATOMS: list[dict[str, Any]] = [
    _atom(1, "work-water-point", work=3500, technical_title="Точка водоснабжения", source="Смета работ"),
    _atom(2, "work-sewer-point", work=2500),
    _atom(3, "work-sink-mixer-siphon-connect", work=1500),
    _atom(4, "kitchen-sink-siphon", work=1500, material=2500, consumables=500, category="materials"),
    _atom(5, "pipe-sewer-50", material=155, category="materials", unit="м.п."),
    _atom(6, "pipe-ppr-d20", material=115, category="materials", unit="м.п."),
    _atom(7, "ppr-d20-outlet", material=121.28, category="materials"),
    _atom(8, "ppr-d20-fitting", material=10.05, category="materials"),
    _atom(9, "pipe-clamp-ppr-d20", material=77.52, category="materials"),
    _atom(10, "pipe-clamp-sewer", material=86.64, category="materials"),
    _atom(11, "work-groove-pipe", work=900, unit="м.п."),
    _atom(12, "kitchen-faucet-c", equipment=6000, category="equipment"),
    _atom(13, "kitchen-sink-bowl-c", equipment=6500, category="equipment"),
    _atom(14, "kitchen-faucet-b", work=2500, material=1300, consumables=500, equipment=12000, category="equipment"),
    _atom(15, "kitchen-sink-bowl-b", category="equipment"),
    _atom(16, "kitchen-faucet-a", work=3000, material=1500, consumables=500, equipment=22000, category="equipment"),
    _atom(17, "kitchen-sink-bowl-a", category="equipment"),
]

_ATOM_ID_BY_CODE = {atom["source_code"]: atom["id"] for atom in _KITCHEN_SINK_ATOMS}


def _composition(source_code: str, quantity: float, coefficient: float = 1.0) -> dict[str, Any]:
    return {
        "atomic_item_id": _ATOM_ID_BY_CODE[source_code],
        "atomic_source_code": source_code,
        "quantity": quantity,
        "coefficient": coefficient,
        "sort_order": 100,
    }


_KITCHEN_SINK_BASE: list[dict[str, Any]] = [
    _composition("work-water-point", 1),
    _composition("work-sewer-point", 1),
    _composition("work-sink-mixer-siphon-connect", 1),
    _composition("kitchen-sink-siphon", 1),
    _composition("pipe-sewer-50", 3.5),
    _composition("pipe-ppr-d20", 20),
    _composition("ppr-d20-outlet", 12),
    _composition("ppr-d20-fitting", 12),
    _composition("pipe-clamp-ppr-d20", 30),
    _composition("pipe-clamp-sewer", 5.25),
    _composition("work-groove-pipe", 6),
]

_KITCHEN_SINK_PACKAGES: list[dict[str, Any]] = [
    {
        "package_code": "c",
        "label": "Пакет C",
        "items": [_composition("kitchen-faucet-c", 1), _composition("kitchen-sink-bowl-c", 1)],
    },
    {
        "package_code": "b",
        "label": "Пакет B",
        "items": [_composition("kitchen-faucet-b", 1), _composition("kitchen-sink-bowl-b", 1)],
    },
    {
        "package_code": "a",
        "label": "Пакет A",
        "items": [_composition("kitchen-faucet-a", 1), _composition("kitchen-sink-bowl-a", 1)],
    },
]

_KITCHEN_SINK_ZONE: dict[str, Any] = {
    "id": 100,
    "zone_code": "zone-kitchen-sink",
    "subgroup": "Кухня",
    "title": "Зона мойки",
    "description": "База + пакет смеситель/мойка.",
    "disclaimer": "Ориентировочный расчёт труб и штробления без проекта.",
    "risk_percent": 6.4,
    "active_package_code": "b",
    "is_active": 1,
    "sort_order": 100,
}


class FakeSnapshotStorage:
    def __init__(
        self,
        items: list[dict[str, Any]],
        zones: list[dict[str, Any]],
        zone_items: dict[int, list[dict[str, Any]]],
        zone_packages: dict[int, list[dict[str, Any]]],
    ) -> None:
        self._items = items
        self._zones = zones
        self._zone_items = zone_items
        self._zone_packages = zone_packages

    async def list_plumbing_catalog_items(self, *, include_inactive: bool = False) -> list[dict[str, Any]]:
        return list(self._items)

    async def list_plumbing_zones(self, *, include_inactive: bool = False) -> list[dict[str, Any]]:
        return list(self._zones)

    async def list_plumbing_zone_items(self, zone_id: int) -> list[dict[str, Any]]:
        return list(self._zone_items.get(zone_id, []))

    async def list_plumbing_zone_packages(self, zone_id: int) -> list[dict[str, Any]]:
        return list(self._zone_packages.get(zone_id, []))


def _kitchen_sink_storage() -> FakeSnapshotStorage:
    return FakeSnapshotStorage(
        items=_KITCHEN_SINK_ATOMS,
        zones=[_KITCHEN_SINK_ZONE],
        zone_items={100: _KITCHEN_SINK_BASE},
        zone_packages={100: _KITCHEN_SINK_PACKAGES},
    )


def _collect_keys(value: Any) -> set[str]:
    keys: set[str] = set()
    if isinstance(value, dict):
        for key, child in value.items():
            keys.add(key)
            keys |= _collect_keys(child)
    elif isinstance(value, list):
        for child in value:
            keys |= _collect_keys(child)
    return keys


class PlumbingSnapshotUnitPriceTests(unittest.TestCase):
    def test_unit_price_matches_seed_formula(self) -> None:
        # round((work+material+equipment+consumables) * coefficient) — как catalogItemUnitPrice.
        self.assertEqual(catalog_item_unit_price({"work_price": 3500}), 3500)
        self.assertEqual(catalog_item_unit_price({"material_price": 121.28}), 121)
        self.assertEqual(catalog_item_unit_price({"material_price": 10.05}), 10)
        self.assertEqual(
            catalog_item_unit_price(
                {"work_price": 2500, "material_price": 1300, "consumables_price": 500, "equipment_price": 12000}
            ),
            16300,
        )


class PlumbingSnapshotParityTests(unittest.IsolatedAsyncioTestCase):
    async def test_sink_zone_package_totals_match_reference(self) -> None:
        snapshot = await BuildPlumbingSnapshotUseCase(_kitchen_sink_storage(), version="test").build()

        self.assertEqual(len(snapshot.zones), 1)
        zone = snapshot.zones[0]
        self.assertEqual(zone.base_total, 24612)

        totals = {package.code: package.total for package in zone.packages}
        # Эталон из public-estimate-plumbing-zones.ts (calculateZoneTotal): subtotal × (1 + 6.4%), запечён.
        self.assertEqual(totals, {"c": 39487, "b": 43530, "a": 54915})

        # Разложение пакета B: subtotal 40912, резерв round(40912×6.4%)=2618, итог 43530.
        package_b = next(package for package in zone.packages if package.code == "b")
        self.assertEqual(package_b.subtotal, 40912)
        self.assertEqual(package_b.risk_amount, 2618)
        self.assertEqual(package_b.total, 43530)

        # Активный пакет зоны (b) — итоговая сумма зоны.
        self.assertEqual(zone.active_package, "b")
        self.assertEqual(zone.total, 43530)

    async def test_public_payload_bakes_reserve_into_total(self) -> None:
        use_case = BuildPlumbingSnapshotUseCase(_kitchen_sink_storage(), version="2026-05-29T00:00:00Z")
        public = await use_case.build_public()

        self.assertEqual(public["version"], "2026-05-29T00:00:00Z")
        zone = public["zones"][0]
        package_totals = {package["code"]: package["total"] for package in zone["packages"]}
        self.assertEqual(package_totals, {"c": 39487, "b": 43530, "a": 54915})
        # Запечённый резерв: ни subtotal, ни процент в публичном пакете не лежат.
        for package in zone["packages"]:
            self.assertNotIn("subtotal", package)
            self.assertNotIn("riskAmount", package)
            self.assertNotIn("risk_percent", package)


class PlumbingSnapshotWhitelistTests(unittest.IsolatedAsyncioTestCase):
    async def test_public_payload_has_no_internal_keys(self) -> None:
        use_case = BuildPlumbingSnapshotUseCase(_kitchen_sink_storage(), version="test")
        public = await use_case.build_public()

        keys = _collect_keys(public)
        leaked = keys & PUBLIC_FORBIDDEN_KEYS
        self.assertEqual(leaked, set(), f"Публичный payload содержит internal-поля: {sorted(leaked)}")

        # Двойная проверка по сырому JSON (на случай вложенных значений-строк).
        rendered = json.dumps(public, ensure_ascii=False)
        for token in ("risk_percent", "riskPercent", "technical_title", "work_price", "material_price"):
            self.assertNotIn(token, rendered)

    async def test_internal_payload_keeps_reserve_and_breakdown(self) -> None:
        use_case = BuildPlumbingSnapshotUseCase(_kitchen_sink_storage(), version="test")
        internal = await use_case.build_internal()

        zone = internal["zones"][0]
        self.assertEqual(zone["riskPercent"], 6.4)
        package_b = next(package for package in zone["packages"] if package["code"] == "b")
        self.assertEqual(package_b["subtotal"], 40912)
        self.assertEqual(package_b["riskAmount"], 2618)
        self.assertEqual(package_b["total"], 43530)
        # У внутренних строк состава видна цена за единицу (разбивка для админки).
        self.assertIn("unitPrice", zone["base"][0])


if __name__ == "__main__":
    unittest.main()
