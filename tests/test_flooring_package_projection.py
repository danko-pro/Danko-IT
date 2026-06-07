from __future__ import annotations

import unittest

from supply_bot.application.errors import ValidationError
from supply_bot.estimates.application.flooring_package_projection import (
    build_flooring_package_projection,
    calculate_flooring_assembly_row_total,
)


def row(**overrides: object) -> dict[str, object]:
    values: dict[str, object] = {
        "section": "consumable",
        "kind": "consumable",
        "formula": "unit_consumption",
        "title": "Generic consumable",
        "unit": "kg",
        "price": 100,
        "consumption_per_m2": 1,
        "package_size": None,
        "layer_mm": None,
        "is_enabled": True,
        "public_category": "consumables",
        "public_title": None,
        "id": 123,
        "assembly_item_id": 456,
        "note": "internal",
    }
    values.update(overrides)
    return values


class FlooringPackageProjectionTests(unittest.TestCase):
    def test_row_total_matches_catalog_editor_formula_semantics(self) -> None:
        self.assertEqual(
            calculate_flooring_assembly_row_total(
                row(
                    kind="material",
                    formula="flat_per_m2",
                    public_category="materials",
                    price=1000,
                    consumption_per_m2=1.1,
                )
            ),
            1100,
        )
        self.assertEqual(
            calculate_flooring_assembly_row_total(
                row(formula="package_consumption", price=600, package_size=25, consumption_per_m2=1.5)
            ),
            36,
        )
        self.assertEqual(
            calculate_flooring_assembly_row_total(
                row(formula="kg_layer_consumption", price=600, package_size=25, consumption_per_m2=1.5, layer_mm=5)
            ),
            180,
        )
        self.assertEqual(
            calculate_flooring_assembly_row_total(row(formula="piece_consumption", price=30, consumption_per_m2=4)),
            120,
        )
        self.assertEqual(
            calculate_flooring_assembly_row_total(
                row(kind="tool", formula="fixed_area_allocation", public_category="tools", price=5000, package_size=50)
            ),
            100,
        )

    def test_covering_projection_builds_flat_rates_and_safe_spec_lines(self) -> None:
        projection = build_flooring_package_projection(
            "covering",
            [
                row(
                    section="covering",
                    kind="material",
                    formula="flat_per_m2",
                    title="Porcelain 120x60",
                    unit="m2",
                    price=2900,
                    consumption_per_m2=1.1,
                    public_category="materials",
                ),
                row(
                    title="Клей плиточный",
                    formula="kg_layer_consumption",
                    price=600,
                    package_size=25,
                    consumption_per_m2=1.5,
                    layer_mm=5,
                ),
                row(
                    title="Грунт",
                    formula="package_consumption",
                    unit="l",
                    price=1250,
                    package_size=10,
                    consumption_per_m2=0.2,
                ),
                row(title="СВП 2 мм", formula="piece_consumption", unit="pcs", price=30, consumption_per_m2=4),
                row(title="Затирка", formula="package_consumption", price=180, package_size=5, consumption_per_m2=0.5),
                row(
                    section="tool",
                    kind="tool",
                    formula="flat_per_m2",
                    title="Tool consumables",
                    unit="m2",
                    price=40,
                    consumption_per_m2=10,
                    public_category="tools",
                ),
                row(
                    title="Disabled glue",
                    formula="unit_consumption",
                    price=999,
                    consumption_per_m2=999,
                    is_enabled=False,
                ),
            ],
        )

        self.assertEqual(projection["flat"]["materialPricePerM2"], 3190)
        self.assertEqual(projection["flat"]["laborPricePerM2"], 0)
        self.assertEqual(projection["flat"]["adhesivePricePerM2"], 180)
        self.assertEqual(projection["flat"]["primerPricePerM2"], 25)
        self.assertEqual(projection["flat"]["svpPricePerM2"], 120)
        self.assertEqual(projection["flat"]["groutPricePerM2"], 18)
        self.assertEqual(projection["flat"]["toolConsumablesPerM2"], 40)
        self.assertEqual(len(projection["specLines"]), 6)

        forbidden = {
            "id",
            "assembly_id",
            "assembly_item_id",
            "owner_user_id",
            "note",
            "source",
            "created_at",
            "updated_at",
        }
        for line in projection["specLines"]:
            self.assertFalse(forbidden & set(line))
            self.assertEqual(line["basis"], "area")
            self.assertGreater(line["unitPrice"], 0)

    def test_preparation_and_layout_projection_accept_work_only(self) -> None:
        preparation = build_flooring_package_projection(
            "preparation",
            [
                row(
                    section="work",
                    kind="work",
                    formula="flat_per_m2",
                    title="Level floor",
                    price=900,
                    consumption_per_m2=1.2,
                    public_category="works",
                )
            ],
        )
        layout = build_flooring_package_projection(
            "layout",
            [
                row(
                    section="work",
                    kind="work",
                    formula="flat_per_m2",
                    title="Lay tile",
                    price=2000,
                    consumption_per_m2=1.25,
                    public_category="works",
                )
            ],
        )

        self.assertEqual(preparation["flat"], {"laborPricePerM2": 1080, "materialPricePerM2": 0.0})
        self.assertEqual(layout["flat"], {"laborPricePerM2": 2500})

    def test_covering_rejects_work_rows(self) -> None:
        with self.assertRaises(ValidationError):
            build_flooring_package_projection(
                "covering",
                [
                    row(
                        section="work",
                        kind="work",
                        formula="flat_per_m2",
                        title="Install",
                        price=1000,
                        public_category="works",
                    )
                ],
            )

    def test_spec_line_price_times_quantity_matches_flat_row_total(self) -> None:
        projection = build_flooring_package_projection(
            "covering",
            [
                row(
                    title="Клей плиточный",
                    formula="kg_layer_consumption",
                    unit="kg",
                    price=600,
                    package_size=25,
                    consumption_per_m2=1.5,
                    layer_mm=5,
                )
            ],
        )

        line = projection["specLines"][0]
        self.assertEqual(line["unitPrice"] * line["quantityPerBasis"], projection["flat"]["adhesivePricePerM2"])
        self.assertEqual(line["packageSize"], 25)
        self.assertEqual(line["packageUnit"], "kg")

    def test_spec_line_procurement_fields_for_package_formulas(self) -> None:
        projection = build_flooring_package_projection(
            "covering",
            [
                row(
                    title="Клей плиточный",
                    formula="kg_layer_consumption",
                    unit="kg",
                    price=600,
                    package_size=25,
                    consumption_per_m2=1.5,
                    layer_mm=5,
                ),
                row(
                    title="Грунт",
                    formula="package_consumption",
                    unit="l",
                    price=1250,
                    package_size=10,
                    consumption_per_m2=0.2,
                ),
                row(
                    title="СВП 2 мм",
                    formula="piece_consumption",
                    unit="pcs",
                    price=30,
                    package_size=100,
                    consumption_per_m2=4,
                ),
            ],
        )

        glue = projection["specLines"][0]
        self.assertEqual(glue["purchaseMode"], "package")
        self.assertEqual(glue["packagePrice"], 600)
        self.assertEqual(glue["purchaseAggregation"], "project")
        self.assertEqual(glue["aggregationKey"], glue["code"])
        self.assertEqual(glue["calculationNote"], "1.5 kg/m²/mm × 5 mm")

        primer = projection["specLines"][1]
        self.assertEqual(primer["purchaseMode"], "package")
        self.assertEqual(primer["packagePrice"], 1250)
        self.assertEqual(primer["calculationNote"], "0.2 l/m²")

    def test_spec_line_omits_package_purchase_mode_for_raw_formulas(self) -> None:
        projection = build_flooring_package_projection(
            "covering",
            [
                row(
                    section="covering",
                    kind="material",
                    formula="flat_per_m2",
                    title="Porcelain 120x60",
                    unit="m2",
                    price=2900,
                    consumption_per_m2=1.1,
                    public_category="materials",
                ),
                row(title="Underlay", formula="unit_consumption", unit="m2", price=220, consumption_per_m2=1),
                row(
                    section="tool",
                    kind="tool",
                    formula="fixed_area_allocation",
                    title="Tool kit",
                    unit="m2",
                    price=5000,
                    package_size=50,
                    public_category="tools",
                ),
            ],
        )

        material, underlay, tool = projection["specLines"]
        self.assertNotIn("purchaseMode", material)
        self.assertNotIn("packagePrice", material)
        self.assertEqual(material["aggregationKey"], material["code"])

        self.assertNotIn("purchaseMode", underlay)
        self.assertEqual(underlay["calculationNote"], "1 m2/m²")

        self.assertNotIn("purchaseMode", tool)
        self.assertNotIn("packagePrice", tool)
        self.assertEqual(tool["packageSize"], 50)

    def test_layout_work_package_mode_aggregates_per_room(self) -> None:
        projection = build_flooring_package_projection(
            "layout",
            [
                row(
                    section="work",
                    kind="work",
                    formula="package_consumption",
                    title="Lay tile",
                    unit="m2",
                    price=2000,
                    package_size=10,
                    consumption_per_m2=1.25,
                    public_category="works",
                )
            ],
        )

        line = projection["specLines"][0]
        self.assertEqual(line["purchaseMode"], "package")
        self.assertEqual(line["purchaseAggregation"], "room")


if __name__ == "__main__":
    unittest.main()
