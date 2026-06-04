from __future__ import annotations

import unittest

from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from supply_bot.application.errors import ValidationError
from supply_bot.database.metadata import metadata
from supply_bot.estimates.application.flooring_catalog_assembly import (
    validate_flooring_catalog_assembly_target_kind,
    validate_flooring_package_for_publication,
)
from supply_bot.storage_estimates.runtime_repository import SqlAlchemyEstimateRuntimeRepository


def _sample_covering_kwargs(**overrides: object) -> dict[str, object]:
    values: dict[str, object] = {
        "title": "Ламинат",
        "material_price_per_m2": 100,
        "labor_price_per_m2": 200,
        "base_waste_percent": 5,
        "underlay_mode": "none",
        "underlay_consumption_per_m2": 1,
        "glue_consumption_per_m2": 0,
        "glue_unit": "кг",
        "glue_price_per_unit": 0,
        "primer_consumption_per_m2": 0,
        "primer_unit": "л",
        "primer_price_per_unit": 0,
        "svp_consumption_per_m2": 0,
        "svp_unit": "шт",
        "svp_price_per_unit": 0,
        "grout_consumption_per_m2": 0,
        "grout_unit": "кг",
        "grout_price_per_unit": 0,
        "custom_consumables_json": "[]",
        "needs_plinth": True,
        "instrument_price_per_m2": 0,
    }
    values.update(overrides)
    return values


def _sample_row(**overrides: object) -> dict[str, object]:
    values: dict[str, object] = {
        "section": "covering",
        "kind": "material",
        "formula": "flat_per_m2",
        "title": "Клей",
        "unit": "кг",
        "price": 120.5,
        "consumption_per_m2": 0.35,
        "public_category": "materials",
    }
    values.update(overrides)
    return values


class SqlAlchemyEstimateFlooringCatalogAssemblyTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.engine = create_async_engine("sqlite+aiosqlite:///:memory:")
        async with self.engine.begin() as connection:
            await connection.run_sync(metadata.create_all)
        self.session_factory = async_sessionmaker(self.engine, expire_on_commit=False)
        self.repository = SqlAlchemyEstimateRuntimeRepository(self.session_factory)

    async def asyncTearDown(self) -> None:
        await self.engine.dispose()

    async def test_create_and_read_covering_assembly_with_rows(self) -> None:
        covering_id = await self.repository.create_estimate_flooring_covering(**_sample_covering_kwargs())
        assembly_id = await self.repository.replace_estimate_flooring_catalog_assembly(
            "covering",
            covering_id,
            "Состав ламината",
            [_sample_row(), _sample_row(title="Грунт", price=80, public_category="consumables")],
        )
        assembly = await self.repository.get_estimate_flooring_catalog_assembly("covering", covering_id)
        self.assertIsNotNone(assembly)
        assert assembly is not None
        self.assertEqual(assembly_id, assembly["id"])
        self.assertEqual("Состав ламината", assembly["title"])
        self.assertEqual("covering", assembly["target_kind"])
        self.assertEqual(covering_id, assembly["target_id"])
        self.assertEqual(2, len(assembly["rows"]))
        self.assertEqual(120.5, assembly["rows"][0]["price"])
        self.assertEqual("Клей", assembly["rows"][0]["title"])

    async def test_replace_atomically_overwrites_rows(self) -> None:
        covering_id = await self.repository.create_estimate_flooring_covering(**_sample_covering_kwargs())
        await self.repository.replace_estimate_flooring_catalog_assembly(
            "covering",
            covering_id,
            "Первая версия",
            [_sample_row(title="Старая строка")],
        )
        await self.repository.replace_estimate_flooring_catalog_assembly(
            "covering",
            covering_id,
            "Вторая версия",
            [_sample_row(title="Новая строка A"), _sample_row(title="Новая строка B", price=10)],
        )
        assembly = await self.repository.get_estimate_flooring_catalog_assembly("covering", covering_id)
        assert assembly is not None
        self.assertEqual("Вторая версия", assembly["title"])
        self.assertEqual(2, len(assembly["rows"]))
        titles = {row["title"] for row in assembly["rows"]}
        self.assertEqual({"Новая строка A", "Новая строка B"}, titles)

    async def test_rows_preserve_copied_values_when_library_item_changes(self) -> None:
        item_id = await self.repository.create_estimate_flooring_assembly_item(
            source_code="covering_glue",
            section="covering",
            title="Клей из библиотеки",
            kind="material",
            formula="flat_per_m2",
            unit="кг",
            price=100,
            consumption_per_m2=0.2,
        )
        covering_id = await self.repository.create_estimate_flooring_covering(**_sample_covering_kwargs())
        await self.repository.replace_estimate_flooring_catalog_assembly(
            "covering",
            covering_id,
            "С кубиком",
            [_sample_row(assembly_item_id=item_id, price=100, title="Клей из библиотеки")],
        )
        await self.repository.update_estimate_flooring_assembly_item(
            item_id,
            price=999,
            title="Другое имя",
        )
        assembly = await self.repository.get_estimate_flooring_catalog_assembly("covering", covering_id)
        assert assembly is not None
        row = assembly["rows"][0]
        self.assertEqual(item_id, row["assembly_item_id"])
        self.assertEqual(100, row["price"])
        self.assertEqual("Клей из библиотеки", row["title"])

    async def test_delete_assembly_cascades_rows(self) -> None:
        covering_id = await self.repository.create_estimate_flooring_covering(**_sample_covering_kwargs())
        await self.repository.replace_estimate_flooring_catalog_assembly(
            "covering",
            covering_id,
            "Удаляемая",
            [_sample_row()],
        )
        deleted = await self.repository.delete_estimate_flooring_catalog_assembly("covering", covering_id)
        self.assertTrue(deleted)
        self.assertIsNone(await self.repository.get_estimate_flooring_catalog_assembly("covering", covering_id))

    async def test_delete_catalog_target_deletes_attached_assembly(self) -> None:
        covering_id = await self.repository.create_estimate_flooring_covering(
            **_sample_covering_kwargs(title="РџРѕРєСЂС‹С‚РёРµ СЃРѕ СЃР±РѕСЂРєРѕР№")
        )
        preparation_id = await self.repository.create_estimate_flooring_preparation(
            title="РџРѕРґРіРѕС‚РѕРІРєР° СЃРѕ СЃР±РѕСЂРєРѕР№",
            labor_price_per_m2=100,
            material_price_per_m2=0,
            primer_consumption_per_m2=0,
            primer_unit="Р»",
            primer_price_per_unit=0,
        )
        layout_id = await self.repository.create_estimate_flooring_layout(
            title="РЈРєР»Р°РґРєР° СЃРѕ СЃР±РѕСЂРєРѕР№",
            labor_price_per_m2=200,
            labor_multiplier=1,
            extra_waste_percent=0,
        )

        await self.repository.replace_estimate_flooring_catalog_assembly(
            "covering",
            covering_id,
            "РЎР±РѕСЂРєР° РїРѕРєСЂС‹С‚РёСЏ",
            [_sample_row()],
        )
        await self.repository.replace_estimate_flooring_catalog_assembly(
            "preparation",
            preparation_id,
            "РЎР±РѕСЂРєР° РїРѕРґРіРѕС‚РѕРІРєРё",
            [_sample_row(section="work", kind="work", public_category="works")],
        )
        await self.repository.replace_estimate_flooring_catalog_assembly(
            "layout",
            layout_id,
            "РЎР±РѕСЂРєР° СѓРєР»Р°РґРєРё",
            [_sample_row(section="work", kind="work", public_category="works")],
        )

        self.assertTrue(await self.repository.delete_estimate_flooring_covering(covering_id))
        self.assertTrue(await self.repository.delete_estimate_flooring_preparation(preparation_id))
        self.assertTrue(await self.repository.delete_estimate_flooring_layout(layout_id))

        self.assertIsNone(await self.repository.get_estimate_flooring_catalog_assembly("covering", covering_id))
        self.assertIsNone(await self.repository.get_estimate_flooring_catalog_assembly("preparation", preparation_id))
        self.assertIsNone(await self.repository.get_estimate_flooring_catalog_assembly("layout", layout_id))

    async def test_owner_and_global_assembly_isolation(self) -> None:
        global_repo = self.repository
        owner_1 = self.repository.for_owner(1)
        owner_2 = self.repository.for_owner(2)

        global_covering_id = await global_repo.create_estimate_flooring_covering(
            **_sample_covering_kwargs(title="Глобальный")
        )
        owner_covering_id = await owner_1.create_estimate_flooring_covering(
            **_sample_covering_kwargs(title="Личный")
        )

        await global_repo.replace_estimate_flooring_catalog_assembly(
            "covering",
            global_covering_id,
            "Глобальная сборка",
            [_sample_row(title="global row")],
        )
        await owner_1.replace_estimate_flooring_catalog_assembly(
            "covering",
            owner_covering_id,
            "Сборка владельца 1",
            [_sample_row(title="owner row")],
        )

        global_read = await global_repo.get_estimate_flooring_catalog_assembly("covering", global_covering_id)
        owner_1_global_read = await owner_1.get_estimate_flooring_catalog_assembly("covering", global_covering_id)
        owner_1_private_read = await owner_1.get_estimate_flooring_catalog_assembly("covering", owner_covering_id)
        owner_2_private_read = await owner_2.get_estimate_flooring_catalog_assembly("covering", owner_covering_id)

        assert global_read is not None
        assert owner_1_global_read is not None
        assert owner_1_private_read is not None
        self.assertEqual("Глобальная сборка", global_read["title"])
        self.assertEqual("Глобальная сборка", owner_1_global_read["title"])
        self.assertEqual("Сборка владельца 1", owner_1_private_read["title"])
        self.assertIsNone(owner_2_private_read)

        self.assertFalse(
            await owner_2.delete_estimate_flooring_catalog_assembly("covering", owner_covering_id)
        )

    async def test_invalid_target_kind_rejected(self) -> None:
        with self.assertRaises(ValidationError):
            validate_flooring_catalog_assembly_target_kind("invalid")
        covering_id = await self.repository.create_estimate_flooring_covering(**_sample_covering_kwargs())
        with self.assertRaises(ValidationError):
            await self.repository.get_estimate_flooring_catalog_assembly("invalid", covering_id)


def _valid_row(**overrides: object) -> dict[str, object]:
    values: dict[str, object] = {
        "section": "covering",
        "kind": "material",
        "formula": "flat_per_m2",
        "title": "Tile",
        "unit": "m2",
        "price": 1000,
        "consumption_per_m2": 1,
        "package_size": None,
        "layer_mm": None,
        "sort_order": 10,
        "is_enabled": True,
        "public_category": "materials",
        "public_title": "Tile",
    }
    values.update(overrides)
    return values


class ValidateFlooringPackageForPublicationTests(unittest.TestCase):
    def test_accepts_valid_covering_preparation_layout(self) -> None:
        validate_flooring_package_for_publication("covering", [_valid_row()])
        validate_flooring_package_for_publication(
            "preparation",
            [_valid_row(section="work", kind="work", public_category="works")],
        )
        validate_flooring_package_for_publication(
            "layout",
            [_valid_row(section="work", kind="work", public_category="works")],
        )

    def test_rejects_empty_all_disabled_and_wrong_kind(self) -> None:
        with self.assertRaises(ValidationError):
            validate_flooring_package_for_publication("covering", [])
        with self.assertRaises(ValidationError):
            validate_flooring_package_for_publication("covering", [_valid_row(is_enabled=False)])
        with self.assertRaises(ValidationError):
            validate_flooring_package_for_publication(
                "covering",
                [_valid_row(kind="consumable", public_category="consumables", section="consumable")],
            )
        with self.assertRaises(ValidationError):
            validate_flooring_package_for_publication(
                "preparation",
                [_valid_row(section="work", kind="work", public_category="works", is_enabled=False)],
            )

    def test_rejects_package_aware_formula_missing_fields(self) -> None:
        with self.assertRaises(ValidationError):
            validate_flooring_package_for_publication(
                "covering",
                [
                    _valid_row(),
                    _valid_row(
                        kind="consumable",
                        section="consumable",
                        public_category="consumables",
                        formula="package_consumption",
                        price=600,
                        consumption_per_m2=1.5,
                        package_size=None,
                    ),
                ],
            )
        with self.assertRaises(ValidationError):
            validate_flooring_package_for_publication(
                "covering",
                [
                    _valid_row(),
                    _valid_row(
                        kind="consumable",
                        section="consumable",
                        public_category="consumables",
                        formula="kg_layer_consumption",
                        price=600,
                        consumption_per_m2=1.5,
                        package_size=25,
                        layer_mm=0,
                    ),
                ],
            )

    def test_allows_disabled_invalid_package_rows_when_enabled_minimum_valid(self) -> None:
        validate_flooring_package_for_publication(
            "covering",
            [
                _valid_row(),
                _valid_row(
                    kind="consumable",
                    section="consumable",
                    public_category="consumables",
                    formula="package_consumption",
                    price=600,
                    consumption_per_m2=1.5,
                    package_size=None,
                    is_enabled=False,
                ),
            ],
        )
