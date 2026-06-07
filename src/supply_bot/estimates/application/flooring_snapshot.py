from __future__ import annotations

import hashlib
from collections.abc import Mapping, Sequence
from typing import Any, Protocol

from supply_bot.admin_api.calculator_payloads.flooring_custom_consumables import parse_flooring_custom_consumables
from supply_bot.utils import normalize_text, slugify

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

EXPECTED_COVERING_CODES = frozenset({"porcelain", "quartz_vinyl", "laminate", "carpet", "engineered_wood"})
EXPECTED_PREPARATION_CODES = frozenset({"none", "primer", "self_leveling", "waterproofing"})
EXPECTED_LAYOUT_CODES = frozenset({"straight", "large_format_straight", "glue", "floating"})
EXPECTED_PLINTH_CODES = frozenset({"none", "duropolymer", "painted_mdf"})

# Глобальная цена подложки для агрегации underlayPricePerM2 (как F1 / catalog-editor preview).
DEFAULT_PUBLIC_UNDERLAY_PRICE_PER_M2 = 220.0

_COVERING_TITLE_TO_CODE: dict[str, str] = {
    "керамогранит": "porcelain",
    "плитка": "tile",
    "кварцвинил": "quartz_vinyl",
    "кварцвинил замковый": "quartz_vinyl_click",
    "кварцвинил клеевой": "quartz_vinyl_glue",
    "ламинат": "laminate",
    "ковролин": "carpet",
    "инженерная доска": "engineered_wood",
}

_PREPARATION_TITLE_TO_CODE: dict[str, str] = {
    "без подготовки": "none",
    "грунтование": "primer",
    "выравнивание": "leveling",
    "наливной пол": "self_leveling",
    "гидроизоляция": "waterproofing",
    "комплексная подготовка": "complex_preparation",
}

_LAYOUT_TITLE_TO_CODE: dict[str, str] = {
    "прямая": "straight",
    "крупный формат": "large_format_straight",
    "клеевая": "glue",
    "плавающая": "floating",
    "разбежка": "offset",
    "диагональ": "diagonal",
    "ёлка": "herringbone",
    "елка": "herringbone",
    "сложная": "complex",
}


def _normalize_title(title: object) -> str:
    return normalize_text(str(title or "")).casefold()


def _public_number(value: object) -> float | int:
    if isinstance(value, bool):
        return 0
    if isinstance(value, (int, float)):
        if not isinstance(value, bool) and float(value).is_integer():
            return int(value)
        return float(value)
    return 0


def _consumable_price_per_m2(consumption: object, price_per_unit: object) -> float:
    return float(_public_number(consumption)) * float(_public_number(price_per_unit))


def _aggregate_covering_consumables(
    row: Mapping[str, Any],
    *,
    underlay_price_per_m2: float = DEFAULT_PUBLIC_UNDERLAY_PRICE_PER_M2,
) -> dict[str, float | int]:
    """Агрегация CRM consumption-полей в публичные ₽/m² (парити catalog-editor/flooring-mappers.ts).

    Формула:
    - underlayPricePerM2 = 0 если underlay_mode == 'none', иначе underlay_price_per_m2 × underlay_consumption_per_m2
    - adhesive/primer/svp/grout = consumption_per_m2 × price_per_unit
    - toolConsumablesPerM2 = instrument_price_per_m2 + Σ(custom consumption × price)
    """

    underlay_mode = normalize_text(str(row.get("underlay_mode") or "")) or "none"
    underlay_price = 0.0
    if underlay_mode != "none":
        underlay_price = float(underlay_price_per_m2) * float(_public_number(row.get("underlay_consumption_per_m2")))

    custom_total = sum(
        _consumable_price_per_m2(item.get("consumption_per_m2"), item.get("price_per_unit"))
        for item in parse_flooring_custom_consumables(dict(row))
    )

    return {
        "underlayPricePerM2": _public_number(underlay_price),
        "adhesivePricePerM2": _public_number(
            _consumable_price_per_m2(row.get("glue_consumption_per_m2"), row.get("glue_price_per_unit"))
        ),
        "primerPricePerM2": _public_number(
            _consumable_price_per_m2(row.get("primer_consumption_per_m2"), row.get("primer_price_per_unit"))
        ),
        "svpPricePerM2": _public_number(
            _consumable_price_per_m2(row.get("svp_consumption_per_m2"), row.get("svp_price_per_unit"))
        ),
        "groutPricePerM2": _public_number(
            _consumable_price_per_m2(row.get("grout_consumption_per_m2"), row.get("grout_price_per_unit"))
        ),
        "toolConsumablesPerM2": _public_number(
            float(_public_number(row.get("instrument_price_per_m2"))) + custom_total
        ),
    }


def _resolve_public_code(
    title: object,
    *,
    section: str,
    known_titles: Mapping[str, str],
    used_codes: set[str],
) -> str:
    normalized = _normalize_title(title)
    mapped = known_titles.get(normalized)
    if mapped:
        return mapped

    base = slugify(str(title or ""), prefix="custom")
    if base not in used_codes:
        return base

    digest = hashlib.sha256(f"{section}:{normalized}".encode("utf-8")).hexdigest()[:8]
    candidate = f"custom_{digest}"
    suffix = 1
    while candidate in used_codes:
        candidate = f"custom_{digest}_{suffix}"
        suffix += 1
    return candidate


def _map_covering_row(row: Mapping[str, Any], *, used_codes: set[str]) -> dict[str, Any]:
    title = normalize_text(str(row.get("title") or ""))
    code = _resolve_public_code(title, section="coverings", known_titles=_COVERING_TITLE_TO_CODE, used_codes=used_codes)
    used_codes.add(code)
    consumables = _aggregate_covering_consumables(row)
    return {
        "code": code,
        "title": title,
        "materialPricePerM2": _public_number(row.get("material_price_per_m2")),
        "laborPricePerM2": _public_number(row.get("labor_price_per_m2")),
        "baseWastePercent": _public_number(row.get("base_waste_percent")),
        **consumables,
    }


def _map_preparation_row(row: Mapping[str, Any], *, used_codes: set[str]) -> dict[str, Any]:
    title = normalize_text(str(row.get("title") or ""))
    code = _resolve_public_code(
        title,
        section="preparations",
        known_titles=_PREPARATION_TITLE_TO_CODE,
        used_codes=used_codes,
    )
    used_codes.add(code)
    return {
        "code": code,
        "title": title,
        "laborPricePerM2": _public_number(row.get("labor_price_per_m2")),
        "materialPricePerM2": _public_number(row.get("material_price_per_m2")),
    }


def _map_layout_row(row: Mapping[str, Any], *, used_codes: set[str]) -> dict[str, Any]:
    title = normalize_text(str(row.get("title") or ""))
    code = _resolve_public_code(title, section="layouts", known_titles=_LAYOUT_TITLE_TO_CODE, used_codes=used_codes)
    used_codes.add(code)
    labor_multiplier = float(_public_number(row.get("labor_multiplier")))
    return {
        "code": code,
        "title": title,
        "laborFactor": labor_multiplier if labor_multiplier > 0 else 1,
        "additionalWastePercent": _public_number(row.get("extra_waste_percent")),
    }


def _catalog_covers_required_codes(
    mapped_items: Sequence[Mapping[str, Any]],
    required_codes: frozenset[str],
) -> bool:
    mapped_codes = {str(item["code"]) for item in mapped_items}
    return required_codes.issubset(mapped_codes)


def _custom_section_extras(
    mapped_items: Sequence[Mapping[str, Any]],
    *,
    expected_codes: frozenset[str],
    known_seed_codes: set[str],
) -> list[dict[str, Any]]:
    extras: list[dict[str, Any]] = []
    for item in mapped_items:
        code = str(item["code"])
        if code in expected_codes or code in known_seed_codes:
            continue
        extras.append(dict(item))
    return extras


def _is_f1_complete_catalog(
    mapped_coverings: Sequence[Mapping[str, Any]],
    mapped_preparations: Sequence[Mapping[str, Any]],
    mapped_layouts: Sequence[Mapping[str, Any]],
) -> bool:
    return (
        _catalog_covers_required_codes(mapped_coverings, EXPECTED_COVERING_CODES)
        and _catalog_covers_required_codes(mapped_preparations, EXPECTED_PREPARATION_CODES)
        and _catalog_covers_required_codes(mapped_layouts, EXPECTED_LAYOUT_CODES)
    )


def _merge_section_with_defaults(
    db_items: Sequence[Mapping[str, Any]],
    default_items: Sequence[Mapping[str, Any]],
    *,
    required_codes: frozenset[str],
) -> list[dict[str, Any]]:
    db_by_code = {str(item["code"]): dict(item) for item in db_items}
    merged: dict[str, dict[str, Any]] = {
        str(item["code"]): dict(item) for item in default_items if str(item["code"]) in required_codes
    }
    merged.update(db_by_code)

    ordered: list[dict[str, Any]] = []
    seen: set[str] = set()
    for item in default_items:
        code = str(item["code"])
        if code in merged:
            ordered.append(merged[code])
            seen.add(code)
    for code, item in db_by_code.items():
        if code not in seen:
            ordered.append(item)
            seen.add(code)
    return ordered


def build_public_flooring_snapshot_from_catalog(
    coverings: Sequence[Mapping[str, Any]],
    preparations: Sequence[Mapping[str, Any]],
    layouts: Sequence[Mapping[str, Any]],
) -> dict[str, Any]:
    if not coverings and not preparations and not layouts:
        return build_public_flooring_snapshot()

    used_covering_codes: set[str] = set()
    used_preparation_codes: set[str] = set()
    used_layout_codes: set[str] = set()

    mapped_coverings = [_map_covering_row(row, used_codes=used_covering_codes) for row in coverings]
    mapped_preparations = [_map_preparation_row(row, used_codes=used_preparation_codes) for row in preparations]
    mapped_layouts = [_map_layout_row(row, used_codes=used_layout_codes) for row in layouts]

    if not _is_f1_complete_catalog(mapped_coverings, mapped_preparations, mapped_layouts):
        result = build_public_flooring_snapshot()
        result["coverings"] = [
            *result["coverings"],
            *_custom_section_extras(
                mapped_coverings,
                expected_codes=EXPECTED_COVERING_CODES,
                known_seed_codes=set(_COVERING_TITLE_TO_CODE.values()),
            ),
        ]
        result["preparations"] = [
            *result["preparations"],
            *_custom_section_extras(
                mapped_preparations,
                expected_codes=EXPECTED_PREPARATION_CODES,
                known_seed_codes=set(_PREPARATION_TITLE_TO_CODE.values()),
            ),
        ]
        result["layouts"] = [
            *result["layouts"],
            *_custom_section_extras(
                mapped_layouts,
                expected_codes=EXPECTED_LAYOUT_CODES,
                known_seed_codes=set(_LAYOUT_TITLE_TO_CODE.values()),
            ),
        ]
        return result

    return {
        "version": DEFAULT_PUBLIC_FLOORING_SNAPSHOT["version"],
        "coverings": _merge_section_with_defaults(
            mapped_coverings,
            DEFAULT_PUBLIC_FLOORING_SNAPSHOT["coverings"],
            required_codes=EXPECTED_COVERING_CODES,
        ),
        "preparations": _merge_section_with_defaults(
            mapped_preparations,
            DEFAULT_PUBLIC_FLOORING_SNAPSHOT["preparations"],
            required_codes=EXPECTED_PREPARATION_CODES,
        ),
        "layouts": _merge_section_with_defaults(
            mapped_layouts,
            DEFAULT_PUBLIC_FLOORING_SNAPSHOT["layouts"],
            required_codes=EXPECTED_LAYOUT_CODES,
        ),
        "plinthTypes": [dict(item) for item in DEFAULT_PUBLIC_FLOORING_SNAPSHOT["plinthTypes"]],
        "globalAddons": dict(DEFAULT_PUBLIC_FLOORING_SNAPSHOT["globalAddons"]),
    }


def build_public_flooring_snapshot() -> dict[str, Any]:
    return {
        "version": DEFAULT_PUBLIC_FLOORING_SNAPSHOT["version"],
        "coverings": [dict(item) for item in DEFAULT_PUBLIC_FLOORING_SNAPSHOT["coverings"]],
        "preparations": [dict(item) for item in DEFAULT_PUBLIC_FLOORING_SNAPSHOT["preparations"]],
        "layouts": [dict(item) for item in DEFAULT_PUBLIC_FLOORING_SNAPSHOT["layouts"]],
        "plinthTypes": [dict(item) for item in DEFAULT_PUBLIC_FLOORING_SNAPSHOT["plinthTypes"]],
        "globalAddons": dict(DEFAULT_PUBLIC_FLOORING_SNAPSHOT["globalAddons"]),
    }


class FlooringSnapshotStorage(Protocol):
    async def list_estimate_flooring_coverings(self) -> list[dict[str, Any]]: ...

    async def list_estimate_flooring_preparations(self) -> list[dict[str, Any]]: ...

    async def list_estimate_flooring_layouts(self) -> list[dict[str, Any]]: ...


class BuildFlooringSnapshotUseCase:
    def __init__(self, storage: FlooringSnapshotStorage | None = None) -> None:
        self._storage = storage

    async def build_public(self) -> dict[str, Any]:
        if self._storage is None:
            return build_public_flooring_snapshot()

        coverings = _filter_global_catalog_rows(await self._storage.list_estimate_flooring_coverings())
        preparations = _filter_global_catalog_rows(await self._storage.list_estimate_flooring_preparations())
        layouts = _filter_global_catalog_rows(await self._storage.list_estimate_flooring_layouts())
        return build_public_flooring_snapshot_from_catalog(coverings, preparations, layouts)

    async def build_internal(self) -> dict[str, Any]:
        return await self.build_public()


def _filter_global_catalog_rows(rows: Sequence[Mapping[str, Any]]) -> list[dict[str, Any]]:
    """Публичный снапшот — только глобальный каталог (owner_user_id IS NULL)."""

    filtered: list[dict[str, Any]] = []
    for row in rows:
        owner_user_id = row.get("owner_user_id")
        if owner_user_id is not None:
            continue
        filtered.append(dict(row))
    return filtered


__all__ = [
    "BuildFlooringSnapshotUseCase",
    "DEFAULT_PUBLIC_FLOORING_SNAPSHOT",
    "DEFAULT_PUBLIC_UNDERLAY_PRICE_PER_M2",
    "EXPECTED_COVERING_CODES",
    "EXPECTED_LAYOUT_CODES",
    "EXPECTED_PLINTH_CODES",
    "EXPECTED_PREPARATION_CODES",
    "PUBLIC_FLOORING_FORBIDDEN_KEYS",
    "_aggregate_covering_consumables",
    "_resolve_public_code",
    "build_public_flooring_snapshot",
    "build_public_flooring_snapshot_from_catalog",
]
