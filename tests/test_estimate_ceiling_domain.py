from __future__ import annotations

import unittest

from supply_bot.estimates.domain.ceiling import (
    build_ceiling_project_item_from_catalog,
    build_ceiling_specification,
    build_ceiling_summary,
    calculate_ceiling_item_totals,
    calculate_ceiling_quantity,
)


def _catalog_item(**overrides):
    item = {
        "id": 10,
        "source_code": "POT-001",
        "title": "Base ceiling",
        "category": "base",
        "unit": "m2",
        "work_price": 100,
        "material_price": 200,
        "equipment_price": 300,
        "consumables_price": 400,
        "price_factor": 1.5,
        "quantity_source": "room_area",
        "quantity_formula": "ceiling_area",
        "note": "catalog note",
        "sort_order": 30,
    }
    item.update(overrides)
    return item


class EstimateCeilingDomainTests(unittest.TestCase):
    def test_quantity_manual(self) -> None:
        self.assertEqual(calculate_ceiling_quantity("manual", quantity=12.5), 12.5)

    def test_quantity_by_room_area(self) -> None:
        self.assertEqual(calculate_ceiling_quantity("room_area", room_area_m2=18.2), 18.2)

    def test_quantity_by_room_perimeter(self) -> None:
        self.assertEqual(calculate_ceiling_quantity("room_perimeter", room_perimeter_m=21.4), 21.4)

    def test_quantity_by_pieces(self) -> None:
        self.assertEqual(calculate_ceiling_quantity("pieces", pieces=4), 4.0)

    def test_negative_quantity_clamps_to_zero_and_unknown_source_uses_manual_fallback(self) -> None:
        self.assertEqual(calculate_ceiling_quantity("manual", quantity=-3), 0.0)
        self.assertEqual(calculate_ceiling_quantity("room_area", room_area_m2=-8), 0.0)
        self.assertEqual(calculate_ceiling_quantity("unknown", quantity=7), 7.0)
        self.assertEqual(calculate_ceiling_quantity("unknown"), 0.0)

    def test_totals_include_all_price_categories_and_price_factor(self) -> None:
        totals = calculate_ceiling_item_totals(
            quantity=2,
            work_price=10,
            material_price=20,
            equipment_price=30,
            consumables_price=40,
            price_factor=1.5,
        )

        self.assertEqual(totals["work_total"], 30.0)
        self.assertEqual(totals["material_total"], 60.0)
        self.assertEqual(totals["equipment_total"], 90.0)
        self.assertEqual(totals["consumables_total"], 120.0)
        self.assertEqual(totals["total"], 300.0)

    def test_totals_clamp_negative_quantity_price_and_factor(self) -> None:
        totals = calculate_ceiling_item_totals(
            quantity=-2,
            work_price=-10,
            material_price=20,
            equipment_price=30,
            consumables_price=40,
            price_factor=-1,
        )

        self.assertEqual(totals["work_total"], 0.0)
        self.assertEqual(totals["material_total"], 0.0)
        self.assertEqual(totals["equipment_total"], 0.0)
        self.assertEqual(totals["consumables_total"], 0.0)
        self.assertEqual(totals["total"], 0.0)

    def test_build_project_item_saves_snapshots_and_is_not_mutated_by_catalog_changes(self) -> None:
        catalog_item = _catalog_item()
        project_item = build_ceiling_project_item_from_catalog(catalog_item, room_area_m2=10)

        self.assertEqual(project_item["source_catalog_item_id"], 10)
        self.assertEqual(project_item["source_code_snapshot"], "POT-001")
        self.assertEqual(project_item["title_snapshot"], "Base ceiling")
        self.assertEqual(project_item["category_snapshot"], "base")
        self.assertEqual(project_item["unit_snapshot"], "m2")
        self.assertEqual(project_item["quantity"], 10.0)
        self.assertEqual(project_item["quantity_source"], "room_area")
        self.assertEqual(project_item["quantity_formula_snapshot"], "ceiling_area")
        self.assertEqual(project_item["work_price_snapshot"], 100.0)
        self.assertEqual(project_item["material_price_snapshot"], 200.0)
        self.assertEqual(project_item["equipment_price_snapshot"], 300.0)
        self.assertEqual(project_item["consumables_price_snapshot"], 400.0)
        self.assertEqual(project_item["price_factor_snapshot"], 1.5)
        self.assertEqual(project_item["work_total"], 1500.0)
        self.assertEqual(project_item["material_total"], 3000.0)
        self.assertEqual(project_item["equipment_total"], 4500.0)
        self.assertEqual(project_item["consumables_total"], 6000.0)
        self.assertEqual(project_item["total"], 15000.0)
        self.assertEqual(project_item["note_snapshot"], "catalog note")
        self.assertEqual(project_item["is_enabled"], 1)
        self.assertEqual(project_item["sort_order"], 30)

        catalog_item["title"] = "Changed"
        catalog_item["work_price"] = 999
        self.assertEqual(project_item["title_snapshot"], "Base ceiling")
        self.assertEqual(project_item["work_price_snapshot"], 100.0)

    def test_summary_excludes_disabled_items(self) -> None:
        summary = build_ceiling_summary(
            [
                {
                    "is_enabled": 1,
                    "work_total": 10,
                    "material_total": 20,
                    "equipment_total": 30,
                    "consumables_total": 40,
                },
                {
                    "is_enabled": 0,
                    "work_total": 100,
                    "material_total": 200,
                    "equipment_total": 300,
                    "consumables_total": 400,
                },
            ]
        )

        self.assertEqual(summary["items_count"], 2)
        self.assertEqual(summary["enabled_items_count"], 1)
        self.assertEqual(summary["work_total"], 10.0)
        self.assertEqual(summary["material_total"], 20.0)
        self.assertEqual(summary["equipment_total"], 30.0)
        self.assertEqual(summary["consumables_total"], 40.0)
        self.assertEqual(summary["grand_total"], 100.0)

    def test_specification_groups_same_enabled_items_and_skips_disabled(self) -> None:
        specification = build_ceiling_specification(
            [
                {
                    "is_enabled": 1,
                    "category_snapshot": "base",
                    "title_snapshot": "Ceiling",
                    "unit_snapshot": "m2",
                    "quantity": 10,
                    "work_total": 100,
                    "material_total": 200,
                    "equipment_total": 300,
                    "consumables_total": 400,
                    "total": 1000,
                },
                {
                    "is_enabled": True,
                    "category_snapshot": "base",
                    "title_snapshot": "Ceiling",
                    "unit_snapshot": "m2",
                    "quantity": 5,
                    "work_total": 50,
                    "material_total": 100,
                    "equipment_total": 150,
                    "consumables_total": 200,
                    "total": 500,
                },
                {
                    "is_enabled": False,
                    "category_snapshot": "base",
                    "title_snapshot": "Ceiling",
                    "unit_snapshot": "m2",
                    "quantity": 100,
                    "work_total": 1000,
                    "material_total": 1000,
                    "equipment_total": 1000,
                    "consumables_total": 1000,
                    "total": 4000,
                },
            ]
        )

        self.assertEqual(len(specification), 1)
        self.assertEqual(specification[0]["category"], "base")
        self.assertEqual(specification[0]["title"], "Ceiling")
        self.assertEqual(specification[0]["unit"], "m2")
        self.assertEqual(specification[0]["quantity"], 15.0)
        self.assertEqual(specification[0]["work_total"], 150.0)
        self.assertEqual(specification[0]["material_total"], 300.0)
        self.assertEqual(specification[0]["equipment_total"], 450.0)
        self.assertEqual(specification[0]["consumables_total"], 600.0)
        self.assertEqual(specification[0]["total"], 1500.0)


if __name__ == "__main__":
    unittest.main()
