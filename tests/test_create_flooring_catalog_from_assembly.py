from __future__ import annotations

import unittest

from supply_bot.application.errors import ValidationError
from supply_bot.estimates.application.create_flooring_catalog import CreateFlooringCoveringCommand
from supply_bot.estimates.application.create_flooring_catalog_from_assembly import (
    CreateFlooringCatalogFromAssemblyCommand,
    CreateFlooringCatalogFromAssemblyUseCase,
    CreateFlooringCatalogFromFlatBootstrapCommand,
    CreateFlooringCatalogFromFlatBootstrapUseCase,
)
from supply_bot.estimates.application.flooring_catalog_assembly import FlooringCatalogAssemblyRowCommand


class FakeFromAssemblyStorage:
    def __init__(self) -> None:
        self.calls: list[dict[str, object]] = []

    async def create_estimate_flooring_catalog_with_assembly(self, **kwargs: object) -> int:
        self.calls.append(kwargs)
        return 42


def _material_row(**overrides: object) -> FlooringCatalogAssemblyRowCommand:
    values: dict[str, object] = {
        "assembly_item_id": None,
        "section": "covering",
        "kind": "material",
        "formula": "flat_per_m2",
        "title": "Covering",
        "unit": "m2",
        "price": 100,
        "consumption_per_m2": 1,
        "package_size": None,
        "layer_mm": None,
        "sort_order": 10,
        "is_enabled": True,
        "public_category": "materials",
        "public_title": "Covering",
    }
    values.update(overrides)
    return FlooringCatalogAssemblyRowCommand(**values)


def _covering_command(**overrides: object) -> CreateFlooringCoveringCommand:
    values: dict[str, object] = {
        "title": "Covering",
        "material_price_per_m2": 0,
        "labor_price_per_m2": 0,
        "base_waste_percent": 0,
        "underlay_mode": "none",
        "underlay_consumption_per_m2": 1,
        "glue_consumption_per_m2": 0,
        "glue_unit": "kg",
        "glue_price_per_unit": 0,
        "primer_consumption_per_m2": 0,
        "primer_unit": "l",
        "primer_price_per_unit": 0,
        "svp_consumption_per_m2": 0,
        "svp_unit": "pcs",
        "svp_price_per_unit": 0,
        "grout_consumption_per_m2": 0,
        "grout_unit": "kg",
        "grout_price_per_unit": 0,
        "custom_consumables": [],
        "needs_plinth": True,
        "instrument_price_per_m2": 0,
        "note": None,
    }
    values.update(overrides)
    return CreateFlooringCoveringCommand(**values)


class CreateFlooringCatalogFromAssemblyUseCaseTests(unittest.IsolatedAsyncioTestCase):
    async def test_invalid_package_does_not_write(self) -> None:
        storage = FakeFromAssemblyStorage()
        command = CreateFlooringCatalogFromAssemblyCommand(
            target_kind="covering",
            covering=_covering_command(),
            assembly_title="Package",
            assembly_rows=[_material_row(kind="work", section="work", public_category="works")],
        )

        with self.assertRaises(ValidationError):
            await CreateFlooringCatalogFromAssemblyUseCase(storage).execute(command)

        self.assertEqual(storage.calls, [])

    async def test_valid_package_calls_atomic_storage(self) -> None:
        storage = FakeFromAssemblyStorage()
        command = CreateFlooringCatalogFromAssemblyCommand(
            target_kind="covering",
            covering=_covering_command(material_price_per_m2=50),
            assembly_title="Package",
            assembly_rows=[_material_row(price=100)],
        )

        target_id = await CreateFlooringCatalogFromAssemblyUseCase(storage).execute(command)

        self.assertEqual(target_id, 42)
        self.assertEqual(len(storage.calls), 1)
        call = storage.calls[0]
        self.assertEqual(call["target_kind"], "covering")
        self.assertEqual(call["catalog_values"]["title"], "Covering")
        self.assertEqual(call["catalog_values"]["material_price_per_m2"], 100.0)
        self.assertEqual(len(call["assembly_rows"]), 1)


class CreateFlooringCatalogFromFlatBootstrapUseCaseTests(unittest.IsolatedAsyncioTestCase):
    async def test_bootstrap_creates_synthetic_package(self) -> None:
        storage = FakeFromAssemblyStorage()
        command = CreateFlooringCatalogFromFlatBootstrapCommand(
            target_kind="covering",
            covering=_covering_command(material_price_per_m2=250),
        )

        target_id = await CreateFlooringCatalogFromFlatBootstrapUseCase(storage).execute(command)

        self.assertEqual(target_id, 42)
        self.assertEqual(len(storage.calls), 1)
        rows = storage.calls[0]["assembly_rows"]
        self.assertTrue(any(row.get("kind") == "material" for row in rows))
