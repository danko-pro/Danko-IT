from __future__ import annotations

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
from supply_bot.estimates.application.flooring_catalog_assembly import FLOORING_FLAT_CATALOG_CREATE_BLOCKED


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
    async def test_covering_flat_create_is_blocked(self) -> None:
        storage = FakeFlooringCatalogStorage()

        with self.assertRaisesRegex(ValidationError, FLOORING_FLAT_CATALOG_CREATE_BLOCKED):
            await CreateFlooringCoveringUseCase(storage).execute(_covering_command())

        storage.assert_no_writes(self)

    async def test_preparation_flat_create_is_blocked(self) -> None:
        storage = FakeFlooringCatalogStorage()
        command = CreateFlooringPreparationCommand(
            title="Preparation",
            labor_price_per_m2=0,
            material_price_per_m2=0,
            primer_consumption_per_m2=0,
            primer_unit="л",
            primer_price_per_unit=0,
            note=None,
        )

        with self.assertRaisesRegex(ValidationError, FLOORING_FLAT_CATALOG_CREATE_BLOCKED):
            await CreateFlooringPreparationUseCase(storage).execute(command)

        storage.assert_no_writes(self)

    async def test_layout_flat_create_is_blocked(self) -> None:
        storage = FakeFlooringCatalogStorage()
        command = CreateFlooringLayoutCommand(
            title="Layout",
            labor_price_per_m2=0,
            labor_multiplier=1,
            extra_waste_percent=0,
            note=None,
        )

        with self.assertRaisesRegex(ValidationError, FLOORING_FLAT_CATALOG_CREATE_BLOCKED):
            await CreateFlooringLayoutUseCase(storage).execute(command)

        storage.assert_no_writes(self)
