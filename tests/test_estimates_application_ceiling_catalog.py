from __future__ import annotations

import unittest
from typing import Any

from supply_bot.application.errors import NotFoundError, ValidationError
from supply_bot.estimates.application.ceiling_catalog import (
    CreateCeilingCatalogItemCommand,
    CreateCeilingCatalogItemUseCase,
    UpdateCeilingCatalogItemCommand,
    UpdateCeilingCatalogItemUseCase,
)


class FakeCeilingCatalogStorage:
    def __init__(
        self,
        *,
        update_result: object = True,
        catalog_item: dict[str, Any] | None = None,
    ) -> None:
        self.update_result = update_result
        self.catalog_item = catalog_item or {"id": 10, "title": "Updated"}
        self.create_calls: list[dict[str, object]] = []
        self.update_calls: list[tuple[int, dict[str, object]]] = []

    async def create_estimate_ceiling_catalog_item(self, **kwargs: object) -> int:
        self.create_calls.append(kwargs)
        return 501

    async def update_estimate_ceiling_catalog_item(self, item_id: int, **updates: object) -> object:
        self.update_calls.append((item_id, updates))
        return self.update_result

    async def get_estimate_ceiling_catalog_item(self, item_id: int) -> dict[str, Any] | None:
        return self.catalog_item


def _create_command(**overrides: object) -> CreateCeilingCatalogItemCommand:
    values: dict[str, object] = {
        "source_code": " PT-1 ",
        "title": " Ceiling ",
        "category": " Work ",
        "unit": " м2 ",
        "work_price": -10,
        "material_price": 20,
        "equipment_price": -1,
        "consumables_price": 3,
        "price_factor": None,
        "quantity_source": " manual ",
        "quantity_formula": " q ",
        "include_section": "   ",
        "package_code": " MID ",
        "note": " Note ",
        "is_active": True,
        "sort_order": None,
    }
    values.update(overrides)
    return CreateCeilingCatalogItemCommand(**values)


class CeilingCatalogUseCaseTests(unittest.IsolatedAsyncioTestCase):
    async def test_create_happy_path_normalizes_values(self) -> None:
        storage = FakeCeilingCatalogStorage()

        item_id = await CreateCeilingCatalogItemUseCase(storage).execute(_create_command())

        self.assertEqual(item_id, 501)
        self.assertEqual(
            storage.create_calls,
            [
                {
                    "source_code": "PT-1",
                    "title": "Ceiling",
                    "category": "Work",
                    "unit": "м2",
                    "work_price": 0.0,
                    "material_price": 20.0,
                    "equipment_price": 0.0,
                    "consumables_price": 3.0,
                    "price_factor": 1.0,
                    "quantity_source": "manual",
                    "quantity_formula": "q",
                    "include_section": "ceilings",
                    "package_code": "MID",
                    "note": "Note",
                    "is_active": True,
                    "sort_order": 100,
                }
            ],
        )

    async def test_create_rejects_required_fields(self) -> None:
        cases = [
            ("source_code", "Ceiling source code is required"),
            ("title", "Ceiling title is required"),
            ("category", "Ceiling category is required"),
            ("unit", "Ceiling unit is required"),
        ]
        for field, message in cases:
            storage = FakeCeilingCatalogStorage()
            with self.subTest(field=field):
                with self.assertRaisesRegex(ValidationError, message):
                    await CreateCeilingCatalogItemUseCase(storage).execute(_create_command(**{field: "   "}))
                self.assertEqual(storage.create_calls, [])

    async def test_create_applies_sort_order_and_include_section_defaults(self) -> None:
        storage = FakeCeilingCatalogStorage()

        await CreateCeilingCatalogItemUseCase(storage).execute(
            _create_command(include_section=None, sort_order=-5, is_active=None)
        )

        call = storage.create_calls[0]
        self.assertEqual(call["include_section"], "ceilings")
        self.assertEqual(call["sort_order"], 0)
        self.assertIs(call["is_active"], False)

    async def test_update_builds_text_price_bool_and_sort_updates(self) -> None:
        storage = FakeCeilingCatalogStorage(catalog_item={"id": 10, "title": "Updated"})

        item = await UpdateCeilingCatalogItemUseCase(storage).execute(
            UpdateCeilingCatalogItemCommand(
                item_id=10,
                payload={
                    "source_code": " PT-2 ",
                    "title": " Updated ",
                    "category": " Work ",
                    "unit": " шт ",
                    "quantity_source": " manual ",
                    "quantity_formula": "   ",
                    "include_section": " ceilings ",
                    "package_code": " MIN ",
                    "note": "   ",
                    "work_price": -1,
                    "material_price": 2,
                    "equipment_price": -3,
                    "consumables_price": 4,
                    "price_factor": "",
                    "is_active": False,
                    "sort_order": -5,
                },
            )
        )

        self.assertEqual(item, {"id": 10, "title": "Updated"})
        self.assertEqual(
            storage.update_calls,
            [
                (
                    10,
                    {
                        "source_code": "PT-2",
                        "title": "Updated",
                        "category": "Work",
                        "unit": "шт",
                        "quantity_source": "manual",
                        "quantity_formula": None,
                        "include_section": "ceilings",
                        "package_code": "MIN",
                        "note": None,
                        "work_price": 0.0,
                        "material_price": 2.0,
                        "equipment_price": 0.0,
                        "consumables_price": 4.0,
                        "price_factor": 1.0,
                        "is_active": False,
                        "sort_order": 0,
                    },
                )
            ],
        )

    async def test_update_rejects_missing_item(self) -> None:
        storage = FakeCeilingCatalogStorage(update_result=False)

        with self.assertRaisesRegex(NotFoundError, "Ceiling catalog item not found"):
            await UpdateCeilingCatalogItemUseCase(storage).execute(
                UpdateCeilingCatalogItemCommand(item_id=10, payload={"title": "Updated"})
            )

        self.assertEqual(storage.update_calls, [(10, {"title": "Updated"})])
