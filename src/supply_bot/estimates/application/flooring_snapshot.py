from __future__ import annotations

import hashlib
from collections.abc import Mapping, Sequence
from typing import Any, Protocol

from supply_bot.admin_api.calculator_payloads.flooring_custom_consumables import parse_flooring_custom_consumables
from supply_bot.application.errors import ValidationError
from supply_bot.estimates.application.flooring_catalog_assembly import validate_flooring_package_for_publication
from supply_bot.estimates.application.flooring_package_projection import (
    build_flooring_package_projection,
    has_enabled_flooring_assembly_rows,
)
from supply_bot.utils import normalize_text, slugify

# PF3: flat-only rows ниже — справочник для local package seed и defaults plinthTypes/globalAddons.
# В public snapshot coverings/preparations/layouts публикуются только при валидном package (specLines обязательны).
# Явный package-wrapper не добавляем: specLines + derived flat rates — достаточный contract.
DEFAULT_PUBLIC_FLOORING_SNAPSHOT: dict[str, Any] = {
    "version": "flooring-v2",
    "coverings": [
        {
            "code": "porcelain",
            "title": "Керамогранит",
            "materialPricePerM2": 2900,
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
            "laborPricePerM2": 1000,
            "laborFactor": 1.1,
            "additionalWastePercent": 5,
        },
        {
            "code": "large_format_straight",
            "title": "Крупный формат",
            "laborPricePerM2": 2000,
            "laborFactor": 1.2,
            "additionalWastePercent": 10,
        },
        {
            "code": "glue",
            "title": "Клеевая",
            "laborPricePerM2": 800,
            "laborFactor": 1.25,
            "additionalWastePercent": 5,
        },
        {
            "code": "floating",
            "title": "Плавающая",
            "laborPricePerM2": 1000,
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
        "assembly_id",
        "assembly_item_id",
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

# Глобальная цена подложки для агрегации underlayPricePerM2 (как public seed / catalog-editor preview).
DEFAULT_PUBLIC_UNDERLAY_PRICE_PER_M2 = 220.0

_DEFAULT_LAYOUT_LABOR_BY_CODE = {
    str(item["code"]): float(item["laborPricePerM2"])
    for item in DEFAULT_PUBLIC_FLOORING_SNAPSHOT["layouts"]
}

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


def _public_title(title: object) -> str:
    return str(title or "").strip()


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
        "toolConsumablesPerM2": _public_number(float(_public_number(row.get("instrument_price_per_m2"))) + custom_total),
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


def _classify_covering_spec_consumable(title: object) -> str:
    normalized = normalize_text(str(title or ""))
    if "подлож" in normalized or "underlay" in normalized:
        return "underlay"
    if "клей" in normalized or "адгез" in normalized or "glue" in normalized:
        return "adhesive"
    if "грунт" in normalized or "primer" in normalized:
        return "primer"
    if "свп" in normalized or "крест" in normalized or "spacer" in normalized:
        return "svp"
    if "затир" in normalized or "grout" in normalized:
        return "grout"
    return "other"


def covering_spec_lines_are_complete(
    flat_rates: Mapping[str, Any],
    spec_lines: Sequence[Mapping[str, Any]],
) -> bool:
    """Return True when specLines cover every non-zero flat covering bucket.

    Partial assemblies must not publish specLines: the public frontend replaces
    all flat covering rows when specLines are present, which would drop omitted
    consumables from the estimate.
    """

    required_buckets: list[tuple[str, float]] = [
        ("material", float(_public_number(flat_rates.get("materialPricePerM2")))),
        ("underlay", float(_public_number(flat_rates.get("underlayPricePerM2")))),
        ("adhesive", float(_public_number(flat_rates.get("adhesivePricePerM2")))),
        ("primer", float(_public_number(flat_rates.get("primerPricePerM2")))),
        ("svp", float(_public_number(flat_rates.get("svpPricePerM2")))),
        ("grout", float(_public_number(flat_rates.get("groutPricePerM2")))),
        ("tools", float(_public_number(flat_rates.get("toolConsumablesPerM2")))),
    ]

    has_material = False
    has_tools = False
    consumable_buckets: set[str] = set()

    for line in spec_lines:
        category = str(line.get("category") or "")
        if category == "materials":
            has_material = True
        elif category == "tools":
            has_tools = True
        elif category == "consumables":
            consumable_buckets.add(_classify_covering_spec_consumable(line.get("title")))

    for bucket, amount in required_buckets:
        if amount <= 0:
            continue
        if bucket == "material":
            if not has_material:
                return False
        elif bucket == "tools":
            if not has_tools:
                return False
        elif bucket not in consumable_buckets:
            return False

    return True


def _public_spec_lines_for_assembly(
    target_kind: str,
    rows: Sequence[Mapping[str, Any]],
) -> list[dict[str, Any]] | None:
    if not has_enabled_flooring_assembly_rows(rows):
        return None
    projection = build_flooring_package_projection(target_kind, rows)
    return list(projection["specLines"])


def _publish_package_backed_snapshot_row(
    snapshot_row: dict[str, Any],
    *,
    target_kind: str,
    assembly: Mapping[str, Any] | None,
) -> dict[str, Any] | None:
    if assembly is None:
        return None

    assembly_rows = list(assembly.get("rows") or [])
    try:
        validate_flooring_package_for_publication(target_kind, assembly_rows)
    except ValidationError:
        return None

    spec_lines = _public_spec_lines_for_assembly(target_kind, assembly_rows)
    if not spec_lines:
        return None

    if target_kind == "covering" and not covering_spec_lines_are_complete(snapshot_row, spec_lines):
        return None

    return {**snapshot_row, "specLines": spec_lines}


def _attach_spec_lines_to_snapshot_row(
    snapshot_row: dict[str, Any],
    *,
    target_kind: str,
    assembly: Mapping[str, Any] | None,
) -> dict[str, Any]:
    published = _publish_package_backed_snapshot_row(snapshot_row, target_kind=target_kind, assembly=assembly)
    return published if published is not None else snapshot_row


def _map_covering_row(
    row: Mapping[str, Any],
    *,
    used_codes: set[str],
    assembly: Mapping[str, Any] | None = None,
) -> dict[str, Any] | None:
    title = _public_title(row.get("title"))
    code = _resolve_public_code(title, section="coverings", known_titles=_COVERING_TITLE_TO_CODE, used_codes=used_codes)
    used_codes.add(code)
    consumables = _aggregate_covering_consumables(row)
    return _publish_package_backed_snapshot_row(
        {
            "code": code,
            "title": title,
            "materialPricePerM2": _public_number(row.get("material_price_per_m2")),
            "baseWastePercent": _public_number(row.get("base_waste_percent")),
            **consumables,
        },
        target_kind="covering",
        assembly=assembly,
    )


def _map_preparation_row(
    row: Mapping[str, Any],
    *,
    used_codes: set[str],
    assembly: Mapping[str, Any] | None = None,
) -> dict[str, Any] | None:
    title = _public_title(row.get("title"))
    code = _resolve_public_code(
        title,
        section="preparations",
        known_titles=_PREPARATION_TITLE_TO_CODE,
        used_codes=used_codes,
    )
    used_codes.add(code)
    return _publish_package_backed_snapshot_row(
        {
            "code": code,
            "title": title,
            "laborPricePerM2": _public_number(row.get("labor_price_per_m2")),
            "materialPricePerM2": _public_number(row.get("material_price_per_m2")),
        },
        target_kind="preparation",
        assembly=assembly,
    )


def _map_layout_row(
    row: Mapping[str, Any],
    *,
    used_codes: set[str],
    assembly: Mapping[str, Any] | None = None,
) -> dict[str, Any] | None:
    title = _public_title(row.get("title"))
    code = _resolve_public_code(title, section="layouts", known_titles=_LAYOUT_TITLE_TO_CODE, used_codes=used_codes)
    used_codes.add(code)
    labor_multiplier = float(_public_number(row.get("labor_multiplier")))
    labor_price_per_m2 = _public_number(row.get("labor_price_per_m2"))
    if float(labor_price_per_m2) == 0 and code in _DEFAULT_LAYOUT_LABOR_BY_CODE:
        labor_price_per_m2 = _public_number(_DEFAULT_LAYOUT_LABOR_BY_CODE[code])
    return _publish_package_backed_snapshot_row(
        {
            "code": code,
            "title": title,
            "laborPricePerM2": labor_price_per_m2,
            "laborFactor": labor_multiplier if labor_multiplier > 0 else 1,
            "additionalWastePercent": _public_number(row.get("extra_waste_percent")),
        },
        target_kind="layout",
        assembly=assembly,
    )


def _default_plinth_and_addons() -> dict[str, Any]:
    return {
        "plinthTypes": [dict(item) for item in DEFAULT_PUBLIC_FLOORING_SNAPSHOT["plinthTypes"]],
        "globalAddons": dict(DEFAULT_PUBLIC_FLOORING_SNAPSHOT["globalAddons"]),
    }


def _crm_covering_row_from_public_defaults(item: Mapping[str, Any]) -> dict[str, Any]:
    adhesive = float(_public_number(item.get("adhesivePricePerM2")))
    primer = float(_public_number(item.get("primerPricePerM2")))
    svp = float(_public_number(item.get("svpPricePerM2")))
    grout = float(_public_number(item.get("groutPricePerM2")))
    underlay_price = float(_public_number(item.get("underlayPricePerM2")))

    return {
        "title": item["title"],
        "material_price_per_m2": item["materialPricePerM2"],
        "labor_price_per_m2": 0,
        "base_waste_percent": item["baseWastePercent"],
        "underlay_mode": "required" if underlay_price > 0 else "none",
        "underlay_consumption_per_m2": 1 if underlay_price > 0 else 0,
        "glue_consumption_per_m2": adhesive / 300 if adhesive else 0,
        "glue_unit": "kg",
        "glue_price_per_unit": 300 if adhesive else 0,
        "primer_consumption_per_m2": primer / 250 if primer else 0,
        "primer_unit": "l",
        "primer_price_per_unit": 250 if primer else 0,
        "svp_consumption_per_m2": svp / 30 if svp else 0,
        "svp_unit": "pcs",
        "svp_price_per_unit": 30 if svp else 0,
        "grout_consumption_per_m2": grout / 180 if grout else 0,
        "grout_unit": "kg",
        "grout_price_per_unit": 180 if grout else 0,
        "instrument_price_per_m2": item["toolConsumablesPerM2"],
        "custom_consumables_json": "[]",
    }


def _package_first_catalog_item_from_defaults(target_kind: str, item: Mapping[str, Any]) -> dict[str, Any]:
    from supply_bot.estimates.application.flooring_synthetic_assembly import build_synthetic_flooring_catalog_assembly

    if target_kind == "covering":
        payload = build_synthetic_flooring_catalog_assembly("covering", _crm_covering_row_from_public_defaults(item))
    elif target_kind == "preparation":
        payload = build_synthetic_flooring_catalog_assembly(
            "preparation",
            {
                "title": item["title"],
                "labor_price_per_m2": item["laborPricePerM2"],
                "material_price_per_m2": item["materialPricePerM2"],
            },
        )
    else:
        payload = build_synthetic_flooring_catalog_assembly(
            "layout",
            {
                "title": item["title"],
                "labor_price_per_m2": item["laborPricePerM2"],
                "labor_multiplier": item["laborFactor"],
                "extra_waste_percent": item["additionalWastePercent"],
            },
        )

    published = dict(item)
    published["specLines"] = build_flooring_package_projection(target_kind, payload.rows)["specLines"]
    return published


def build_flooring_v2_local_package_seed() -> dict[str, Any]:
    return {
        "version": DEFAULT_PUBLIC_FLOORING_SNAPSHOT["version"],
        "coverings": [
            _package_first_catalog_item_from_defaults("covering", item)
            for item in DEFAULT_PUBLIC_FLOORING_SNAPSHOT["coverings"]
        ],
        "preparations": [
            _package_first_catalog_item_from_defaults("preparation", item)
            for item in DEFAULT_PUBLIC_FLOORING_SNAPSHOT["preparations"]
        ],
        "layouts": [
            _package_first_catalog_item_from_defaults("layout", item)
            for item in DEFAULT_PUBLIC_FLOORING_SNAPSHOT["layouts"]
        ],
        **_default_plinth_and_addons(),
    }


def _package_backed_catalog_rows(rows: Sequence[dict[str, Any]]) -> list[dict[str, Any]]:
    """Bridge-1: runtime snapshot must never leak flat-only catalog rows."""

    return [row for row in rows if row.get("specLines")]


def _assembly_for_row(
    row: Mapping[str, Any],
    assemblies_by_target_id: Mapping[int, Mapping[str, Any]] | None,
) -> Mapping[str, Any] | None:
    if not assemblies_by_target_id:
        return None
    row_id = row.get("id")
    if row_id is None:
        return None
    return assemblies_by_target_id.get(int(row_id))


def build_public_flooring_snapshot_from_catalog(
    coverings: Sequence[Mapping[str, Any]],
    preparations: Sequence[Mapping[str, Any]],
    layouts: Sequence[Mapping[str, Any]],
    *,
    covering_assemblies: Mapping[int, Mapping[str, Any]] | None = None,
    preparation_assemblies: Mapping[int, Mapping[str, Any]] | None = None,
    layout_assemblies: Mapping[int, Mapping[str, Any]] | None = None,
) -> dict[str, Any]:
    used_covering_codes: set[str] = set()
    used_preparation_codes: set[str] = set()
    used_layout_codes: set[str] = set()

    mapped_coverings = [
        mapped
        for row in coverings
        if (
            mapped := _map_covering_row(
                row,
                used_codes=used_covering_codes,
                assembly=_assembly_for_row(row, covering_assemblies),
            )
        )
        is not None
    ]
    mapped_preparations = [
        mapped
        for row in preparations
        if (
            mapped := _map_preparation_row(
                row,
                used_codes=used_preparation_codes,
                assembly=_assembly_for_row(row, preparation_assemblies),
            )
        )
        is not None
    ]
    mapped_layouts = [
        mapped
        for row in layouts
        if (
            mapped := _map_layout_row(
                row,
                used_codes=used_layout_codes,
                assembly=_assembly_for_row(row, layout_assemblies),
            )
        )
        is not None
    ]

    return {
        "version": DEFAULT_PUBLIC_FLOORING_SNAPSHOT["version"],
        "coverings": _package_backed_catalog_rows(mapped_coverings),
        "preparations": _package_backed_catalog_rows(mapped_preparations),
        "layouts": _package_backed_catalog_rows(mapped_layouts),
        **_default_plinth_and_addons(),
    }


def build_public_flooring_snapshot() -> dict[str, Any]:
    return {
        "version": DEFAULT_PUBLIC_FLOORING_SNAPSHOT["version"],
        "coverings": [],
        "preparations": [],
        "layouts": [],
        **_default_plinth_and_addons(),
    }


class FlooringSnapshotStorage(Protocol):
    async def list_estimate_flooring_coverings(self) -> list[dict[str, Any]]: ...

    async def list_estimate_flooring_preparations(self) -> list[dict[str, Any]]: ...

    async def list_estimate_flooring_layouts(self) -> list[dict[str, Any]]: ...

    async def get_estimate_flooring_catalog_assembly(
        self,
        target_kind: str,
        target_id: int,
    ) -> dict[str, Any] | None: ...


async def _load_catalog_assemblies_for_rows(
    storage: FlooringSnapshotStorage,
    target_kind: str,
    rows: Sequence[Mapping[str, Any]],
) -> dict[int, dict[str, Any]]:
    assemblies: dict[int, dict[str, Any]] = {}
    for row in rows:
        row_id = row.get("id")
        if row_id is None:
            continue
        assembly = await storage.get_estimate_flooring_catalog_assembly(target_kind, int(row_id))
        if assembly is not None:
            assemblies[int(row_id)] = assembly
    return assemblies


class BuildFlooringSnapshotUseCase:
    def __init__(self, storage: FlooringSnapshotStorage | None = None) -> None:
        self._storage = storage

    async def build_public(self) -> dict[str, Any]:
        if self._storage is None:
            return build_public_flooring_snapshot()

        coverings = _filter_global_catalog_rows(await self._storage.list_estimate_flooring_coverings())
        preparations = _filter_global_catalog_rows(await self._storage.list_estimate_flooring_preparations())
        layouts = _filter_global_catalog_rows(await self._storage.list_estimate_flooring_layouts())
        covering_assemblies = await _load_catalog_assemblies_for_rows(self._storage, "covering", coverings)
        preparation_assemblies = await _load_catalog_assemblies_for_rows(self._storage, "preparation", preparations)
        layout_assemblies = await _load_catalog_assemblies_for_rows(self._storage, "layout", layouts)
        return build_public_flooring_snapshot_from_catalog(
            coverings,
            preparations,
            layouts,
            covering_assemblies=covering_assemblies,
            preparation_assemblies=preparation_assemblies,
            layout_assemblies=layout_assemblies,
        )

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
    "_attach_spec_lines_to_snapshot_row",
    "_publish_package_backed_snapshot_row",
    "_public_spec_lines_for_assembly",
    "_resolve_public_code",
    "build_flooring_v2_local_package_seed",
    "covering_spec_lines_are_complete",
    "build_public_flooring_snapshot",
    "build_public_flooring_snapshot_from_catalog",
]
