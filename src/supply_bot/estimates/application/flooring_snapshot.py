from __future__ import annotations

from typing import Any

# Детерминированный публичный seed v1 — парити с F1 (public-estimate-flooring.ts /
# generated/flooring.snapshot.json). CRM seed в estimate_flooring_* может отличаться.
DEFAULT_PUBLIC_FLOORING_SNAPSHOT: dict[str, Any] = {
    "version": "flooring-v1",
    "coverings": [
        {
            "code": "porcelain",
            "title": "Керамогранит",
            "materialPricePerM2": 2900,
            "laborPricePerM2": 2000,
            "baseWastePercent": 10,
            "underlayPricePerM2": 0,
            "adhesivePricePerM2": 450,
            "primerPricePerM2": 25,
            "svpPricePerM2": 120,
            "groutPricePerM2": 90,
            "toolConsumablesPerM2": 40,
        },
        {
            "code": "quartz_vinyl",
            "title": "Кварцвинил",
            "materialPricePerM2": 1700,
            "laborPricePerM2": 800,
            "baseWastePercent": 5,
            "underlayPricePerM2": 220,
            "adhesivePricePerM2": 0,
            "primerPricePerM2": 25,
            "svpPricePerM2": 0,
            "groutPricePerM2": 0,
            "toolConsumablesPerM2": 80,
        },
        {
            "code": "laminate",
            "title": "Ламинат",
            "materialPricePerM2": 930,
            "laborPricePerM2": 1000,
            "baseWastePercent": 10,
            "underlayPricePerM2": 220,
            "adhesivePricePerM2": 0,
            "primerPricePerM2": 25,
            "svpPricePerM2": 0,
            "groutPricePerM2": 0,
            "toolConsumablesPerM2": 40,
        },
        {
            "code": "carpet",
            "title": "Ковролин",
            "materialPricePerM2": 1500,
            "laborPricePerM2": 900,
            "baseWastePercent": 7,
            "underlayPricePerM2": 0,
            "adhesivePricePerM2": 250,
            "primerPricePerM2": 25,
            "svpPricePerM2": 0,
            "groutPricePerM2": 0,
            "toolConsumablesPerM2": 40,
        },
        {
            "code": "engineered_wood",
            "title": "Инженерная доска",
            "materialPricePerM2": 6000,
            "laborPricePerM2": 2500,
            "baseWastePercent": 10,
            "underlayPricePerM2": 0,
            "adhesivePricePerM2": 900,
            "primerPricePerM2": 120,
            "svpPricePerM2": 0,
            "groutPricePerM2": 0,
            "toolConsumablesPerM2": 120,
        },
    ],
    "preparations": [
        {
            "code": "none",
            "title": "Без подготовки",
            "laborPricePerM2": 300,
            "materialPricePerM2": 100,
        },
        {
            "code": "primer",
            "title": "Грунтование",
            "laborPricePerM2": 250,
            "materialPricePerM2": 120,
        },
        {
            "code": "self_leveling",
            "title": "Наливной пол",
            "laborPricePerM2": 650,
            "materialPricePerM2": 120,
        },
        {
            "code": "waterproofing",
            "title": "Гидроизоляция",
            "laborPricePerM2": 300,
            "materialPricePerM2": 80,
        },
    ],
    "layouts": [
        {
            "code": "straight",
            "title": "Прямая",
            "laborFactor": 1.1,
            "additionalWastePercent": 5,
        },
        {
            "code": "large_format_straight",
            "title": "Крупный формат",
            "laborFactor": 1.2,
            "additionalWastePercent": 10,
        },
        {
            "code": "glue",
            "title": "Клеевая",
            "laborFactor": 1.25,
            "additionalWastePercent": 5,
        },
        {
            "code": "floating",
            "title": "Плавающая",
            "laborFactor": 1,
            "additionalWastePercent": 3,
        },
    ],
    "plinthTypes": [
        {
            "code": "none",
            "title": "Без плинтуса",
            "materialPricePerMeter": 0,
            "laborPricePerMeter": 0,
            "factor": 1,
        },
        {
            "code": "duropolymer",
            "title": "Дюрополимерный",
            "materialPricePerMeter": 450,
            "laborPricePerMeter": 450,
            "factor": 1,
        },
        {
            "code": "painted_mdf",
            "title": "МДФ окрашенный",
            "materialPricePerMeter": 650,
            "laborPricePerMeter": 500,
            "factor": 1,
        },
    ],
    "globalAddons": {
        "thresholdPrice": 900,
        "demolitionPricePerM2": 150,
    },
}

PUBLIC_FLOORING_FORBIDDEN_KEYS = frozenset(
    {
        "id",
        "owner_user_id",
        "note",
        "source",
        "created_at",
        "updated_at",
        "custom_consumables_json",
        "risk_percent",
        "riskPercent",
        "technical_title",
        "technicalTitle",
        "work_price",
        "material_price",
        "equipment_price",
        "consumables_price",
        "coefficient",
        "material_price_per_m2",
        "labor_price_per_m2",
        "glue_consumption_per_m2",
        "primer_consumption_per_m2",
    }
)

EXPECTED_COVERING_CODES = frozenset(
    {"porcelain", "quartz_vinyl", "laminate", "carpet", "engineered_wood"}
)
EXPECTED_PREPARATION_CODES = frozenset({"none", "primer", "self_leveling", "waterproofing"})
EXPECTED_LAYOUT_CODES = frozenset({"straight", "large_format_straight", "glue", "floating"})
EXPECTED_PLINTH_CODES = frozenset({"none", "duropolymer", "painted_mdf"})


def build_public_flooring_snapshot() -> dict[str, Any]:
    return {
        "version": DEFAULT_PUBLIC_FLOORING_SNAPSHOT["version"],
        "coverings": [dict(item) for item in DEFAULT_PUBLIC_FLOORING_SNAPSHOT["coverings"]],
        "preparations": [dict(item) for item in DEFAULT_PUBLIC_FLOORING_SNAPSHOT["preparations"]],
        "layouts": [dict(item) for item in DEFAULT_PUBLIC_FLOORING_SNAPSHOT["layouts"]],
        "plinthTypes": [dict(item) for item in DEFAULT_PUBLIC_FLOORING_SNAPSHOT["plinthTypes"]],
        "globalAddons": dict(DEFAULT_PUBLIC_FLOORING_SNAPSHOT["globalAddons"]),
    }


class BuildFlooringSnapshotUseCase:
    async def build_public(self) -> dict[str, Any]:
        return build_public_flooring_snapshot()

    async def build_internal(self) -> dict[str, Any]:
        return await self.build_public()


__all__ = [
    "BuildFlooringSnapshotUseCase",
    "DEFAULT_PUBLIC_FLOORING_SNAPSHOT",
    "EXPECTED_COVERING_CODES",
    "EXPECTED_LAYOUT_CODES",
    "EXPECTED_PLINTH_CODES",
    "EXPECTED_PREPARATION_CODES",
    "PUBLIC_FLOORING_FORBIDDEN_KEYS",
    "build_public_flooring_snapshot",
]
