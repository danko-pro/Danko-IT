from __future__ import annotations

import unittest
from typing import Any

from supply_bot.estimates.application.ceiling_project_items import (
    CeilingProjectItemValuesCommand,
    CreateCeilingProjectItemCommand,
    CreateCeilingProjectItemUseCase,
    DeleteCeilingProjectItemCommand,
    DeleteCeilingProjectItemUseCase,
    UpdateCeilingProjectItemCommand,
    UpdateCeilingProjectItemUseCase,
)


class FakeCeilingProjectItemStorage:
    def __init__(
        self,
        *,
        project: dict[str, Any] | None = None,
        rooms: list[dict[str, Any]] | None = None,
        catalog_item: dict[str, Any] | None = None,
        create_result: int | None = 501,
        update_project_id: int | None = 10,
        delete_project_id: int | None = 10,
    ) -> None:
        self.project = project
        self.rooms = rooms or [{"id": 1}]
        self.catalog_item = catalog_item if catalog_item is not None else {"id": 100}
        self.create_result = create_result
        self.update_project_id = update_project_id
        self.delete_project_id = delete_project_id
        self.create_calls: list[dict[str, object]] = []
        self.update_calls: list[tuple[int, dict[str, object]]] = []
        self.delete_calls: list[int] = []

    async def get_estimate_project(self, project_id: int) -> dict[str, Any] | None:
        return self.project

    async def list_estimate_rooms(self, project_id: int) -> list[dict[str, Any]]:
        return self.rooms

    async def get_estimate_ceiling_catalog_item(self, item_id: int) -> dict[str, Any] | None:
        if self.catalog_item and int(self.catalog_item["id"]) == int(item_id):
            return self.catalog_item
        return None

    async def create_estimate_project_ceiling_item(self, *, project_id: int, **kwargs: object) -> int | None:
        self.create_calls.append({"project_id": project_id, **kwargs})
        return self.create_result

    async def update_estimate_project_ceiling_item(self, item_id: int, **kwargs: object) -> int | None:
        self.update_calls.append((item_id, kwargs))
        return self.update_project_id

    async def delete_estimate_project_ceiling_item(self, item_id: int) -> int | None:
        self.delete_calls.append(item_id)
        return self.delete_project_id

    def assert_no_writes(self, test_case: unittest.TestCase) -> None:
        test_case.assertEqual(self.create_calls, [])
        test_case.assertEqual(self.update_calls, [])
        test_case.assertEqual(self.delete_calls, [])


def _item_values(**overrides: object) -> CeilingProjectItemValuesCommand:
    values: dict[str, object] = {
        "room_id": 1,
        "source_catalog_item_id": 100,
        "source_code_snapshot": " PT-1 ",
        "title_snapshot": " Ceiling ",
        "category_snapshot": " Work ",
        "unit_snapshot": " м2 ",
        "quantity": -5,
        "quantity_source": "   ",
        "quantity_formula_snapshot": " q ",
        "work_price_snapshot": 10,
        "material_price_snapshot": -20,
        "equipment_price_snapshot": 30,
        "consumables_price_snapshot": -40,
        "price_factor_snapshot": None,
        "work_total": 100,
        "material_total": -200,
        "equipment_total": 300,
        "consumables_total": -400,
        "total": 500,
        "note_snapshot": " Note ",
        "is_enabled": True,
        "sort_order": None,
    }
    values.update(overrides)
    return CeilingProjectItemValuesCommand(**values)


class CeilingProjectItemUseCaseTests(unittest.IsolatedAsyncioTestCase):
    async def test_create_happy_path_normalizes_values_and_returns_project_id(self) -> None:
        storage = FakeCeilingProjectItemStorage(project={"id": 10})

        project_id = await CreateCeilingProjectItemUseCase(storage).execute(
            CreateCeilingProjectItemCommand(project_id=10, item=_item_values())
        )

        self.assertEqual(project_id, 10)
        self.assertEqual(
            storage.create_calls,
            [
                {
                    "project_id": 10,
                    "room_id": 1,
                    "source_catalog_item_id": 100,
                    "source_code_snapshot": "PT-1",
                    "title_snapshot": "Ceiling",
                    "category_snapshot": "Work",
                    "unit_snapshot": "м2",
                    "quantity": 0.0,
                    "quantity_source": "manual",
                    "quantity_formula_snapshot": "q",
                    "work_price_snapshot": 10.0,
                    "material_price_snapshot": 0.0,
                    "equipment_price_snapshot": 30.0,
                    "consumables_price_snapshot": 0.0,
                    "price_factor_snapshot": 1.0,
                    "work_total": 100.0,
                    "material_total": 0.0,
                    "equipment_total": 300.0,
                    "consumables_total": 0.0,
                    "total": 500.0,
                    "note_snapshot": "Note",
                    "is_enabled": True,
                    "sort_order": 100,
                }
            ],
        )

    async def test_create_rejects_missing_project(self) -> None:
        storage = FakeCeilingProjectItemStorage(project=None)

        with self.assertRaisesRegex(ValueError, "Calculator project not found"):
            await CreateCeilingProjectItemUseCase(storage).execute(
                CreateCeilingProjectItemCommand(project_id=10, item=_item_values())
            )

        storage.assert_no_writes(self)

    async def test_create_rejects_unknown_room(self) -> None:
        storage = FakeCeilingProjectItemStorage(project={"id": 10})

        with self.assertRaisesRegex(ValueError, "Unknown ceiling room selected"):
            await CreateCeilingProjectItemUseCase(storage).execute(
                CreateCeilingProjectItemCommand(project_id=10, item=_item_values(room_id=999))
            )

        storage.assert_no_writes(self)

    async def test_create_rejects_unknown_catalog(self) -> None:
        storage = FakeCeilingProjectItemStorage(project={"id": 10})

        with self.assertRaisesRegex(ValueError, "Unknown ceiling catalog item selected"):
            await CreateCeilingProjectItemUseCase(storage).execute(
                CreateCeilingProjectItemCommand(project_id=10, item=_item_values(source_catalog_item_id=999))
            )

        storage.assert_no_writes(self)

    async def test_create_rejects_required_title_or_unit(self) -> None:
        cases = [
            ("title_snapshot", "Ceiling title is required"),
            ("unit_snapshot", "Ceiling unit is required"),
        ]
        for field, message in cases:
            storage = FakeCeilingProjectItemStorage(project={"id": 10})
            with self.subTest(field=field):
                with self.assertRaisesRegex(ValueError, message):
                    await CreateCeilingProjectItemUseCase(storage).execute(
                        CreateCeilingProjectItemCommand(project_id=10, item=_item_values(**{field: "   "}))
                    )
                storage.assert_no_writes(self)

    async def test_update_rejects_missing_project_id(self) -> None:
        storage = FakeCeilingProjectItemStorage(project={"id": 10})

        with self.assertRaisesRegex(ValueError, "Ceiling project_id is required"):
            await UpdateCeilingProjectItemUseCase(storage).execute(
                UpdateCeilingProjectItemCommand(item_id=55, project_id=None, item=_item_values())
            )

        storage.assert_no_writes(self)

    async def test_update_returns_project_id(self) -> None:
        storage = FakeCeilingProjectItemStorage(project={"id": 10}, update_project_id=12)

        project_id = await UpdateCeilingProjectItemUseCase(storage).execute(
            UpdateCeilingProjectItemCommand(item_id=55, project_id=10, item=_item_values())
        )

        self.assertEqual(project_id, 12)
        self.assertEqual(storage.update_calls[0][0], 55)

    async def test_update_rejects_missing_item(self) -> None:
        storage = FakeCeilingProjectItemStorage(project={"id": 10}, update_project_id=None)

        with self.assertRaisesRegex(ValueError, "Ceiling project item not found"):
            await UpdateCeilingProjectItemUseCase(storage).execute(
                UpdateCeilingProjectItemCommand(item_id=55, project_id=10, item=_item_values())
            )

    async def test_delete_happy_path_returns_project_id(self) -> None:
        storage = FakeCeilingProjectItemStorage(delete_project_id=12)

        project_id = await DeleteCeilingProjectItemUseCase(storage).execute(DeleteCeilingProjectItemCommand(item_id=55))

        self.assertEqual(project_id, 12)
        self.assertEqual(storage.delete_calls, [55])

    async def test_delete_rejects_missing_item(self) -> None:
        storage = FakeCeilingProjectItemStorage(delete_project_id=None)

        with self.assertRaisesRegex(ValueError, "Ceiling project item not found"):
            await DeleteCeilingProjectItemUseCase(storage).execute(DeleteCeilingProjectItemCommand(item_id=55))
