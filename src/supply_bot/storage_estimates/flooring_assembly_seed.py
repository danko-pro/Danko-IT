from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from supply_bot.storage_estimates.runtime_repository import SqlAlchemyEstimateRuntimeRepository

DEFAULT_FLOORING_ASSEMBLY_ITEMS: tuple[dict[str, object], ...] = (
    {
        "source_code": "covering-porcelain-120x60",
        "section": "covering",
        "title": "Керамогранит 120×60",
        "kind": "material",
        "formula": "flat_per_m2",
        "unit": "m2",
        "price": 2900,
        "consumption_per_m2": 1,
        "sort_order": 10,
    },
    {
        "source_code": "covering-laminate-33",
        "section": "covering",
        "title": "Ламинат 33 класс",
        "kind": "material",
        "formula": "flat_per_m2",
        "unit": "m2",
        "price": 930,
        "consumption_per_m2": 1,
        "sort_order": 20,
    },
    {
        "source_code": "work-porcelain-large",
        "section": "work",
        "title": "Укладка крупноформатного керамогранита",
        "kind": "work",
        "formula": "flat_per_m2",
        "unit": "m2",
        "price": 2000,
        "consumption_per_m2": 1,
        "sort_order": 30,
    },
    {
        "source_code": "work-laminate",
        "section": "work",
        "title": "Укладка ламината",
        "kind": "work",
        "formula": "flat_per_m2",
        "unit": "m2",
        "price": 1000,
        "consumption_per_m2": 1,
        "sort_order": 40,
    },
    {
        "source_code": "prep-primer",
        "section": "preparation",
        "title": "Грунт глубокого проникновения",
        "kind": "consumable",
        "formula": "liquid_layers",
        "unit": "l",
        "price": 1250,
        "consumption_per_m2": 0.2,
        "package_size": 10,
        "layer_mm": 1,
        "sort_order": 50,
    },
    {
        "source_code": "prep-waterproofing",
        "section": "preparation",
        "title": "Гидроизоляция обмазочная",
        "kind": "consumable",
        "formula": "liquid_layers",
        "unit": "l",
        "price": 3200,
        "consumption_per_m2": 0.7,
        "package_size": 10,
        "layer_mm": 2,
        "sort_order": 60,
    },
    {
        "source_code": "consumable-tile-glue",
        "section": "consumable",
        "title": "Клей плиточный",
        "kind": "consumable",
        "formula": "kg_layer_consumption",
        "unit": "kg",
        "price": 600,
        "consumption_per_m2": 1.5,
        "package_size": 25,
        "layer_mm": 5,
        "sort_order": 70,
    },
    {
        "source_code": "consumable-svp",
        "section": "consumable",
        "title": "СВП 2 мм",
        "kind": "consumable",
        "formula": "piece_consumption",
        "unit": "pcs",
        "price": 30,
        "consumption_per_m2": 4,
        "sort_order": 80,
    },
    {
        "source_code": "consumable-underlay-roll",
        "section": "consumable",
        "title": "Подложка рулонная",
        "kind": "consumable",
        "formula": "roll_meter_consumption",
        "unit": "m",
        "price": 1500,
        "consumption_per_m2": 1,
        "package_size": 30,
        "sort_order": 90,
    },
    {
        "source_code": "tool-flooring",
        "section": "tool",
        "title": "Инструмент и мелкий расходник",
        "kind": "tool",
        "formula": "flat_per_m2",
        "unit": "m2",
        "price": 40,
        "consumption_per_m2": 1,
        "sort_order": 100,
    },
)


async def ensure_global_flooring_assembly_defaults(session_factory: async_sessionmaker[AsyncSession]) -> None:
    repository = SqlAlchemyEstimateRuntimeRepository(session_factory).for_owner(None)
    existing = {row["source_code"] for row in await repository.list_estimate_flooring_assembly_items()}
    for item in DEFAULT_FLOORING_ASSEMBLY_ITEMS:
        if item["source_code"] in existing:
            continue
        await repository.create_estimate_flooring_assembly_item(**item)


__all__ = ["DEFAULT_FLOORING_ASSEMBLY_ITEMS", "ensure_global_flooring_assembly_defaults"]
