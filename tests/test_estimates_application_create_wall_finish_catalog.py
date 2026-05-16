from __future__ import annotations

import json
import unittest

from supply_bot.estimates.application.create_wall_finish_catalog import (
    CreateWallFinishCoveringCommand,
    CreateWallFinishCoveringConsumableCommand,
    CreateWallFinishCoveringUseCase,
    CreateWallFinishLayoutCommand,
    CreateWallFinishLayoutUseCase,
    CreateWallFinishPreparationCommand,
    CreateWallFinishPreparationUseCase,
)


class FakeWallFinishCatalogStorage:
    def __init__(self) -> None:
        self.covering_calls: list[dict[str, object]] = []
        self.preparation_calls: list[dict[str, object]] = []
        self.layout_calls: list[dict[str, object]] = []

    async def create_estimate_wall_finish_covering(self, **kwargs: object) -> int:
        self.covering_calls.append(kwargs)
        return 101

    async def create_estimate_wall_finish_preparation(self, **kwargs: object) -> int:
        self.preparation_calls.append(kwargs)
        return 202

    async def create_estimate_wall_finish_layout(self, **kwargs: object) -> int:
        self.layout_calls.append(kwargs)
        return 303

    def assert_no_writes(self, test_case: unittest.TestCase) -> None:
        test_case.assertEqual(self.covering_calls, [])
        test_case.assertEqual(self.preparation_calls, [])
        test_case.assertEqual(self.layout_calls, [])


def _covering_command(**overrides: object) -> CreateWallFinishCoveringCommand:
    values: dict[str, object] = {
        "title": " Обои ",
        "material_price_per_m2": -10,
        "labor_price_per_m2": 20,
        "base_waste_percent": -5,
        "glue_consumption_per_m2": -1,
        "glue_unit": "  ",
        "glue_price_per_unit": -2,
        "primer_consumption_per_m2": -3,
        "primer_unit": "  ",
        "primer_price_per_unit": -4,
        "putty_consumption_per_m2": -5,
        "putty_unit": "  ",
        "putty_price_per_unit": -6,
        "mesh_consumption_per_m2": -7,
        "mesh_unit": "  ",
        "mesh_price_per_unit": -8,
        "custom_consumables": [
            CreateWallFinishCoveringConsumableCommand(
                title=" Расходник ",
                consumption_per_m2=-1,
                unit="  ",
                price_per_unit=-2,
            ),
            CreateWallFinishCoveringConsumableCommand(
                title="   ",
                consumption_per_m2=999,
                unit="ignored",
                price_per_unit=999,
            ),
        ],
        "instrument_price_per_m2": -9,
        "note": " Note ",
    }
    values.update(overrides)
    return CreateWallFinishCoveringCommand(**values)


class CreateWallFinishCatalogUseCaseTests(unittest.IsolatedAsyncioTestCase):
    async def test_covering_create_normalizes_values_and_returns_id(self) -> None:
        storage = FakeWallFinishCatalogStorage()

        covering_id = await CreateWallFinishCoveringUseCase(storage).execute(_covering_command())

        self.assertEqual(covering_id, 101)
        self.assertEqual(len(storage.covering_calls), 1)
        call = storage.covering_calls[0]
        self.assertEqual(call["title"], "Обои")
        self.assertEqual(call["material_price_per_m2"], 0.0)
        self.assertEqual(call["labor_price_per_m2"], 20.0)
        self.assertEqual(call["base_waste_percent"], 0.0)
        self.assertEqual(call["glue_consumption_per_m2"], 0.0)
        self.assertEqual(call["glue_unit"], "кг")
        self.assertEqual(call["glue_price_per_unit"], 0.0)
        self.assertEqual(call["primer_consumption_per_m2"], 0.0)
        self.assertEqual(call["primer_unit"], "л")
        self.assertEqual(call["primer_price_per_unit"], 0.0)
        self.assertEqual(call["putty_consumption_per_m2"], 0.0)
        self.assertEqual(call["putty_unit"], "кг")
        self.assertEqual(call["putty_price_per_unit"], 0.0)
        self.assertEqual(call["mesh_consumption_per_m2"], 0.0)
        self.assertEqual(call["mesh_unit"], "м²")
        self.assertEqual(call["mesh_price_per_unit"], 0.0)
        self.assertEqual(call["instrument_price_per_m2"], 0.0)
        self.assertEqual(call["note"], "Note")
        self.assertEqual(
            json.loads(str(call["custom_consumables_json"])),
            [
                {
                    "title": "Расходник",
                    "consumption_per_m2": 0.0,
                    "unit": "шт",
                    "price_per_unit": 0.0,
                }
            ],
        )

    async def test_covering_create_rejects_empty_title(self) -> None:
        storage = FakeWallFinishCatalogStorage()

        with self.assertRaisesRegex(ValueError, "Wall finish title is required"):
            await CreateWallFinishCoveringUseCase(storage).execute(_covering_command(title="   "))

        storage.assert_no_writes(self)

    async def test_covering_create_converts_empty_note_to_none(self) -> None:
        storage = FakeWallFinishCatalogStorage()

        await CreateWallFinishCoveringUseCase(storage).execute(_covering_command(note="   "))

        self.assertIsNone(storage.covering_calls[0]["note"])

    async def test_preparation_create_normalizes_values_and_returns_id(self) -> None:
        storage = FakeWallFinishCatalogStorage()
        command = CreateWallFinishPreparationCommand(
            title=" Подготовка ",
            labor_price_per_m2=-10,
            material_price_per_m2=20,
            primer_consumption_per_m2=-1,
            primer_unit="  ",
            primer_price_per_unit=-2,
            note=" Note ",
        )

        preparation_id = await CreateWallFinishPreparationUseCase(storage).execute(command)

        self.assertEqual(preparation_id, 202)
        self.assertEqual(
            storage.preparation_calls,
            [
                {
                    "title": "Подготовка",
                    "labor_price_per_m2": 0.0,
                    "material_price_per_m2": 20.0,
                    "primer_consumption_per_m2": 0.0,
                    "primer_unit": "л",
                    "primer_price_per_unit": 0.0,
                    "note": "Note",
                }
            ],
        )

    async def test_preparation_create_rejects_empty_title(self) -> None:
        storage = FakeWallFinishCatalogStorage()
        command = CreateWallFinishPreparationCommand(
            title="   ",
            labor_price_per_m2=1,
            material_price_per_m2=1,
            primer_consumption_per_m2=1,
            primer_unit="л",
            primer_price_per_unit=1,
            note=None,
        )

        with self.assertRaisesRegex(ValueError, "Wall preparation title is required"):
            await CreateWallFinishPreparationUseCase(storage).execute(command)

        storage.assert_no_writes(self)

    async def test_layout_create_normalizes_values_and_returns_id(self) -> None:
        storage = FakeWallFinishCatalogStorage()
        command = CreateWallFinishLayoutCommand(
            title=" Елочка ",
            labor_multiplier=0,
            extra_waste_percent=-10,
            note=" Note ",
        )

        layout_id = await CreateWallFinishLayoutUseCase(storage).execute(command)

        self.assertEqual(layout_id, 303)
        self.assertEqual(
            storage.layout_calls,
            [
                {
                    "title": "Елочка",
                    "labor_multiplier": 0.1,
                    "extra_waste_percent": 0.0,
                    "note": "Note",
                }
            ],
        )

    async def test_layout_create_rejects_empty_title(self) -> None:
        storage = FakeWallFinishCatalogStorage()
        command = CreateWallFinishLayoutCommand(
            title="   ",
            labor_multiplier=1,
            extra_waste_percent=1,
            note=None,
        )

        with self.assertRaisesRegex(ValueError, "Wall layout title is required"):
            await CreateWallFinishLayoutUseCase(storage).execute(command)

        storage.assert_no_writes(self)
