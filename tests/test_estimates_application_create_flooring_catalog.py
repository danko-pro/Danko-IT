from __future__ import annotations

import json
import unittest

from supply_bot.application.errors import ValidationError
from supply_bot.estimates.application.create_flooring_catalog import (
    CreateFlooringCoveringCommand,
    CreateFlooringCoveringConsumableCommand,
    CreateFlooringCoveringUseCase,
    CreateFlooringLayoutCommand,
    CreateFlooringLayoutUseCase,
    CreateFlooringPreparationCommand,
    CreateFlooringPreparationUseCase,
)


class FakeFlooringCatalogStorage:
    def __init__(self) -> None:
        self.covering_calls: list[dict[str, object]] = []
        self.preparation_calls: list[dict[str, object]] = []
        self.layout_calls: list[dict[str, object]] = []

    async def create_estimate_flooring_covering(self, **kwargs: object) -> int:
        self.covering_calls.append(kwargs)
        return 101

    async def create_estimate_flooring_preparation(self, **kwargs: object) -> int:
        self.preparation_calls.append(kwargs)
        return 201

    async def create_estimate_flooring_layout(self, **kwargs: object) -> int:
        self.layout_calls.append(kwargs)
        return 301

    def assert_no_writes(self, test_case: unittest.TestCase) -> None:
        test_case.assertEqual(self.covering_calls, [])
        test_case.assertEqual(self.preparation_calls, [])
        test_case.assertEqual(self.layout_calls, [])


def _covering_command(**overrides: object) -> CreateFlooringCoveringCommand:
    values: dict[str, object] = {
        "title": " Covering ",
        "material_price_per_m2": -100,
        "labor_price_per_m2": -200,
        "base_waste_percent": -5,
        "underlay_mode": " ",
        "underlay_consumption_per_m2": -1,
        "glue_consumption_per_m2": -2,
        "glue_unit": " ",
        "glue_price_per_unit": -3,
        "primer_consumption_per_m2": -4,
        "primer_unit": " ",
        "primer_price_per_unit": -5,
        "svp_consumption_per_m2": -6,
        "svp_unit": " ",
        "svp_price_per_unit": -7,
        "grout_consumption_per_m2": -8,
        "grout_unit": " ",
        "grout_price_per_unit": -9,
        "custom_consumables": [
            CreateFlooringCoveringConsumableCommand(
                title=" Custom item ",
                consumption_per_m2=-1,
                unit=" ",
                price_per_unit=-50,
            ),
            CreateFlooringCoveringConsumableCommand(
                title="   ",
                consumption_per_m2=5,
                unit="kg",
                price_per_unit=100,
            ),
        ],
        "needs_plinth": True,
        "instrument_price_per_m2": -10,
        "note": " Note ",
    }
    values.update(overrides)
    return CreateFlooringCoveringCommand(**values)


class CreateFlooringCatalogUseCaseTests(unittest.IsolatedAsyncioTestCase):
    async def test_covering_create_normalizes_values_and_returns_id(self) -> None:
        storage = FakeFlooringCatalogStorage()

        covering_id = await CreateFlooringCoveringUseCase(storage).execute(_covering_command())

        self.assertEqual(covering_id, 101)
        self.assertEqual(len(storage.covering_calls), 1)
        call = storage.covering_calls[0]
        self.assertEqual(call["title"], "Covering")
        self.assertEqual(call["material_price_per_m2"], 0.0)
        self.assertEqual(call["labor_price_per_m2"], 0.0)
        self.assertEqual(call["base_waste_percent"], 0.0)
        self.assertEqual(call["underlay_mode"], "none")
        self.assertEqual(call["underlay_consumption_per_m2"], 0.0)
        self.assertEqual(call["glue_consumption_per_m2"], 0.0)
        self.assertEqual(call["glue_unit"], "кг")
        self.assertEqual(call["glue_price_per_unit"], 0.0)
        self.assertEqual(call["primer_consumption_per_m2"], 0.0)
        self.assertEqual(call["primer_unit"], "л")
        self.assertEqual(call["primer_price_per_unit"], 0.0)
        self.assertEqual(call["svp_consumption_per_m2"], 0.0)
        self.assertEqual(call["svp_unit"], "шт")
        self.assertEqual(call["svp_price_per_unit"], 0.0)
        self.assertEqual(call["grout_consumption_per_m2"], 0.0)
        self.assertEqual(call["grout_unit"], "кг")
        self.assertEqual(call["grout_price_per_unit"], 0.0)
        self.assertEqual(call["needs_plinth"], True)
        self.assertEqual(call["instrument_price_per_m2"], 0.0)
        self.assertEqual(call["note"], "Note")
        self.assertEqual(
            json.loads(str(call["custom_consumables_json"])),
            [
                {
                    "title": "Custom item",
                    "consumption_per_m2": 0.0,
                    "unit": "шт",
                    "price_per_unit": 0.0,
                }
            ],
        )

    async def test_covering_create_rejects_empty_title(self) -> None:
        storage = FakeFlooringCatalogStorage()

        with self.assertRaisesRegex(ValidationError, "Floor covering title is required"):
            await CreateFlooringCoveringUseCase(storage).execute(_covering_command(title="   "))

        storage.assert_no_writes(self)

    async def test_covering_create_converts_empty_note_to_none(self) -> None:
        storage = FakeFlooringCatalogStorage()

        await CreateFlooringCoveringUseCase(storage).execute(_covering_command(note="   "))

        self.assertEqual(storage.covering_calls[0]["note"], None)

    async def test_preparation_create_normalizes_values_and_returns_id(self) -> None:
        storage = FakeFlooringCatalogStorage()
        command = CreateFlooringPreparationCommand(
            title=" Preparation ",
            labor_price_per_m2=-100,
            material_price_per_m2=-200,
            primer_consumption_per_m2=-1,
            primer_unit=" ",
            primer_price_per_unit=-50,
            note=" Note ",
        )

        preparation_id = await CreateFlooringPreparationUseCase(storage).execute(command)

        self.assertEqual(preparation_id, 201)
        self.assertEqual(
            storage.preparation_calls,
            [
                {
                    "title": "Preparation",
                    "labor_price_per_m2": 0.0,
                    "material_price_per_m2": 0.0,
                    "primer_consumption_per_m2": 0.0,
                    "primer_unit": "л",
                    "primer_price_per_unit": 0.0,
                    "note": "Note",
                }
            ],
        )

    async def test_preparation_create_rejects_empty_title(self) -> None:
        storage = FakeFlooringCatalogStorage()
        command = CreateFlooringPreparationCommand(
            title="   ",
            labor_price_per_m2=0,
            material_price_per_m2=0,
            primer_consumption_per_m2=0,
            primer_unit="л",
            primer_price_per_unit=0,
            note=None,
        )

        with self.assertRaisesRegex(ValidationError, "Floor preparation title is required"):
            await CreateFlooringPreparationUseCase(storage).execute(command)

        storage.assert_no_writes(self)

    async def test_layout_create_normalizes_values_and_returns_id(self) -> None:
        storage = FakeFlooringCatalogStorage()
        command = CreateFlooringLayoutCommand(
            title=" Layout ",
            labor_price_per_m2=-700,
            labor_multiplier=0,
            extra_waste_percent=-5,
            note=" Note ",
        )

        layout_id = await CreateFlooringLayoutUseCase(storage).execute(command)

        self.assertEqual(layout_id, 301)
        self.assertEqual(
            storage.layout_calls,
            [
                {
                    "title": "Layout",
                    "labor_price_per_m2": 0.0,
                    "labor_multiplier": 0.1,
                    "extra_waste_percent": 0.0,
                    "note": "Note",
                }
            ],
        )

    async def test_layout_create_rejects_empty_title(self) -> None:
        storage = FakeFlooringCatalogStorage()
        command = CreateFlooringLayoutCommand(
            title="   ",
            labor_price_per_m2=0,
            labor_multiplier=1,
            extra_waste_percent=0,
            note=None,
        )

        with self.assertRaisesRegex(ValidationError, "Floor layout title is required"):
            await CreateFlooringLayoutUseCase(storage).execute(command)

        storage.assert_no_writes(self)
