from __future__ import annotations

import unittest

from supply_bot.application.errors import ValidationError
from supply_bot.estimates.application.door_catalog import (
    CreateDoorCatalogItemCommand,
    CreateDoorCatalogItemUseCase,
    CreateDoorComponentCatalogItemCommand,
    CreateDoorComponentCatalogItemUseCase,
    ListDoorCatalogUseCase,
    ListDoorComponentCatalogUseCase,
)


class FakeDoorCatalogStorage:
    def __init__(self) -> None:
        self.door_catalog = [{"id": 1, "title": "Door"}]
        self.component_catalog = [{"id": 2, "title": "Handle"}]
        self.door_create_calls: list[dict[str, object]] = []
        self.component_create_calls: list[dict[str, object]] = []

    async def list_estimate_door_catalog(self) -> list[dict[str, object]]:
        return self.door_catalog

    async def create_estimate_door_catalog_item(self, **kwargs: object) -> int:
        self.door_create_calls.append(kwargs)
        return 101

    async def list_estimate_door_component_catalog(self) -> list[dict[str, object]]:
        return self.component_catalog

    async def create_estimate_door_component_catalog_item(self, **kwargs: object) -> int:
        self.component_create_calls.append(kwargs)
        return 202

    def assert_no_writes(self, test_case: unittest.TestCase) -> None:
        test_case.assertEqual(self.door_create_calls, [])
        test_case.assertEqual(self.component_create_calls, [])


def _door_command(**overrides: object) -> CreateDoorCatalogItemCommand:
    values: dict[str, object] = {
        "title": " Дверь ",
        "width_mm": 800,
        "height_mm": 2100,
        "thickness_mm": 40,
        "purchase_price": 1000,
        "sale_price": 1500,
        "install_price": 500,
        "note": " Note ",
    }
    values.update(overrides)
    return CreateDoorCatalogItemCommand(**values)


def _component_command(**overrides: object) -> CreateDoorComponentCatalogItemCommand:
    values: dict[str, object] = {
        "category_code": " Handles ",
        "title": " Ручка ",
        "unit": "  ",
        "purchase_price": 100,
        "sale_price": 150,
        "note": " Note ",
    }
    values.update(overrides)
    return CreateDoorComponentCatalogItemCommand(**values)


class DoorCatalogUseCaseTests(unittest.IsolatedAsyncioTestCase):
    async def test_list_door_catalog_returns_storage_result_as_is(self) -> None:
        storage = FakeDoorCatalogStorage()

        result = await ListDoorCatalogUseCase(storage).execute()

        self.assertIs(result, storage.door_catalog)

    async def test_create_door_catalog_normalizes_title_note_and_validates_size(self) -> None:
        storage = FakeDoorCatalogStorage()

        door_id = await CreateDoorCatalogItemUseCase(storage).execute(_door_command())

        self.assertEqual(door_id, 101)
        self.assertEqual(
            storage.door_create_calls,
            [
                {
                    "title": "Дверь",
                    "width_mm": 800.0,
                    "height_mm": 2100.0,
                    "thickness_mm": 40,
                    "purchase_price": 1000,
                    "sale_price": 1500,
                    "install_price": 500,
                    "note": "Note",
                }
            ],
        )

    async def test_create_door_catalog_rejects_empty_title(self) -> None:
        storage = FakeDoorCatalogStorage()

        with self.assertRaisesRegex(ValidationError, "Door title is required"):
            await CreateDoorCatalogItemUseCase(storage).execute(_door_command(title="   "))

        storage.assert_no_writes(self)

    async def test_create_door_catalog_rejects_invalid_width_or_height(self) -> None:
        cases = [
            _door_command(width_mm=0),
            _door_command(width_mm=None),
            _door_command(height_mm=0),
            _door_command(height_mm=None),
        ]
        for command in cases:
            storage = FakeDoorCatalogStorage()
            with self.subTest(command=command):
                with self.assertRaisesRegex(ValidationError, "Door width and height must be positive"):
                    await CreateDoorCatalogItemUseCase(storage).execute(command)
                storage.assert_no_writes(self)

    async def test_list_door_component_catalog_returns_storage_result_as_is(self) -> None:
        storage = FakeDoorCatalogStorage()

        result = await ListDoorComponentCatalogUseCase(storage).execute()

        self.assertIs(result, storage.component_catalog)

    async def test_create_component_catalog_normalizes_values(self) -> None:
        storage = FakeDoorCatalogStorage()

        component_id = await CreateDoorComponentCatalogItemUseCase(storage).execute(_component_command())

        self.assertEqual(component_id, 202)
        self.assertEqual(
            storage.component_create_calls,
            [
                {
                    "category_code": "handles",
                    "title": "Ручка",
                    "unit": "шт",
                    "purchase_price": 100,
                    "sale_price": 150,
                    "note": "Note",
                }
            ],
        )

    async def test_create_component_catalog_rejects_empty_title(self) -> None:
        storage = FakeDoorCatalogStorage()

        with self.assertRaisesRegex(ValidationError, "Door component title is required"):
            await CreateDoorComponentCatalogItemUseCase(storage).execute(_component_command(title="   "))

        storage.assert_no_writes(self)
