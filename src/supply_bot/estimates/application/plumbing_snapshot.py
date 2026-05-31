from __future__ import annotations

import math
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Protocol


def _js_round(value: float) -> int:
    """Округление как Math.round в браузере (половина — вверх, к +∞).

    Нужно для побитовой парити с клиентским расчётом (`public-estimate-plumbing-zones.ts`),
    где Python `round` (банковское округление) дал бы расхождение на 1 ₽.
    """

    return int(math.floor(float(value) + 0.5))


def catalog_item_unit_price(item: Mapping[str, Any]) -> int:
    """Публичная цена атома: Σ(работа+материал+оборудование+расходники) × coefficient.

    Эталон — `catalogItemUnitPrice` из plumbing-seed.ts (сумма округляется один раз).
    """

    base = (
        float(item.get("work_price") or 0.0)
        + float(item.get("material_price") or 0.0)
        + float(item.get("equipment_price") or 0.0)
        + float(item.get("consumables_price") or 0.0)
    )
    coefficient = float(item.get("coefficient") if item.get("coefficient") is not None else 1.0)
    return _js_round(base * coefficient)


@dataclass(frozen=True)
class _ResolvedItem:
    code: str
    title: str
    unit: str
    category: str
    unit_price: int


@dataclass(frozen=True)
class _ComputedLine:
    code: str
    title: str
    unit: str
    category: str
    quantity: float
    unit_price: int
    total: int


@dataclass(frozen=True)
class _ComputedPackage:
    code: str
    label: str | None
    lines: tuple[_ComputedLine, ...]
    subtotal: int
    risk_amount: int
    total: int


@dataclass(frozen=True)
class _ComputedZone:
    code: str
    subgroup: str
    title: str
    disclaimer: str | None
    risk_percent: float
    active_package: str | None
    base_lines: tuple[_ComputedLine, ...]
    base_total: int
    packages: tuple[_ComputedPackage, ...]
    total: int


# Поля, запрещённые в публичном снапшоте (Q3 §1.1, Раздел 7). Используется whitelist-тестом.
PUBLIC_FORBIDDEN_KEYS = frozenset(
    {
        "risk_percent",
        "riskPercent",
        "risk_amount",
        "riskAmount",
        "subtotal",
        "technical_title",
        "technicalTitle",
        "work_price",
        "material_price",
        "equipment_price",
        "consumables_price",
        "price_factor",
        "coefficient",
        "source",
        "note",
        "owner_user_id",
    }
)


@dataclass(frozen=True)
class ComputedPlumbingSnapshot:
    """Промежуточная модель снапшота. Сериализуется в публичный (whitelist) и внутренний payload."""

    version: str
    items: tuple[_ResolvedItem, ...]
    zones: tuple[_ComputedZone, ...]

    def public_payload(self) -> dict[str, Any]:
        """Публичный whitelist-payload: только итоги (резерв запечён), без internal-полей."""

        return {
            "version": self.version,
            "items": [
                {
                    "code": item.code,
                    "title": item.title,
                    "unit": item.unit,
                    "category": item.category,
                    "unitPrice": item.unit_price,
                }
                for item in self.items
            ],
            "zones": [
                {
                    "code": zone.code,
                    "subgroup": zone.subgroup,
                    "title": zone.title,
                    "disclaimer": zone.disclaimer,
                    "activePackage": zone.active_package,
                    "total": zone.total,
                    "base": [_public_line(line) for line in zone.base_lines],
                    "packages": [
                        {
                            "code": package.code,
                            "label": package.label,
                            "total": package.total,
                            "items": [_public_line(line) for line in package.lines],
                        }
                        for package in zone.packages
                    ],
                }
                for zone in self.zones
            ],
        }

    def internal_payload(self) -> dict[str, Any]:
        """Внутренний payload (админка/preview): полная разбивка, резерв и проценты видны."""

        return {
            "version": self.version,
            "items": [
                {
                    "code": item.code,
                    "title": item.title,
                    "unit": item.unit,
                    "category": item.category,
                    "unitPrice": item.unit_price,
                }
                for item in self.items
            ],
            "zones": [
                {
                    "code": zone.code,
                    "subgroup": zone.subgroup,
                    "title": zone.title,
                    "disclaimer": zone.disclaimer,
                    "riskPercent": zone.risk_percent,
                    "activePackage": zone.active_package,
                    "baseTotal": zone.base_total,
                    "total": zone.total,
                    "base": [_internal_line(line) for line in zone.base_lines],
                    "packages": [
                        {
                            "code": package.code,
                            "label": package.label,
                            "subtotal": package.subtotal,
                            "riskAmount": package.risk_amount,
                            "total": package.total,
                            "items": [_internal_line(line) for line in package.lines],
                        }
                        for package in zone.packages
                    ],
                }
                for zone in self.zones
            ],
        }


def _public_line(line: _ComputedLine) -> dict[str, Any]:
    # coefficient свёрнут в quantity (эффективное количество) — поле coefficient в публичный payload не уходит.
    return {"itemCode": line.code, "quantity": line.quantity}


def _internal_line(line: _ComputedLine) -> dict[str, Any]:
    return {
        "itemCode": line.code,
        "title": line.title,
        "unit": line.unit,
        "category": line.category,
        "quantity": line.quantity,
        "unitPrice": line.unit_price,
        "total": line.total,
    }


def _resolve_line(
    row: Mapping[str, Any],
    by_id: Mapping[int, _ResolvedItem],
    by_code: Mapping[str, _ResolvedItem],
) -> _ComputedLine:
    resolved: _ResolvedItem | None = None
    atomic_item_id = row.get("atomic_item_id")
    if atomic_item_id is not None:
        resolved = by_id.get(int(atomic_item_id))
    if resolved is None:
        resolved = by_code.get(str(row.get("atomic_source_code") or ""))

    quantity = float(row.get("quantity") or 0.0)
    coefficient = float(row.get("coefficient") if row.get("coefficient") is not None else 1.0)
    effective_quantity = quantity * coefficient

    code = resolved.code if resolved else str(row.get("atomic_source_code") or "")
    unit_price = resolved.unit_price if resolved else 0
    total = _js_round(unit_price * effective_quantity)

    return _ComputedLine(
        code=code,
        title=resolved.title if resolved else code,
        unit=resolved.unit if resolved else "",
        category=resolved.category if resolved else "",
        quantity=effective_quantity,
        unit_price=unit_price,
        total=total,
    )


def _lines_total(lines: Sequence[_ComputedLine]) -> int:
    return sum(line.total for line in lines)


def _compute_zone(
    zone: Mapping[str, Any],
    by_id: Mapping[int, _ResolvedItem],
    by_code: Mapping[str, _ResolvedItem],
) -> _ComputedZone:
    risk_percent = float(zone.get("risk_percent") if zone.get("risk_percent") is not None else 0.0)

    base_lines = tuple(_resolve_line(row, by_id, by_code) for row in zone.get("base", []))
    base_total = _lines_total(base_lines)

    packages: list[_ComputedPackage] = []
    for package in zone.get("packages", []):
        package_lines = tuple(_resolve_line(row, by_id, by_code) for row in package.get("items", []))
        package_total = _lines_total(package_lines)
        subtotal = base_total + package_total
        risk_amount = _js_round(subtotal * risk_percent / 100)
        packages.append(
            _ComputedPackage(
                code=str(package.get("package_code") or ""),
                label=package.get("label"),
                lines=package_lines,
                subtotal=subtotal,
                risk_amount=risk_amount,
                total=subtotal + risk_amount,
            )
        )

    active_package = zone.get("active_package_code")
    zone_total = _select_zone_total(packages, active_package, base_total, risk_percent)

    return _ComputedZone(
        code=str(zone.get("zone_code") or ""),
        subgroup=str(zone.get("subgroup") or ""),
        title=str(zone.get("title") or ""),
        disclaimer=zone.get("disclaimer"),
        risk_percent=risk_percent,
        active_package=active_package,
        base_lines=base_lines,
        base_total=base_total,
        packages=tuple(packages),
        total=zone_total,
    )


def _select_zone_total(
    packages: Sequence[_ComputedPackage],
    active_package: str | None,
    base_total: int,
    risk_percent: float,
) -> int:
    if packages:
        selected = next((package for package in packages if package.code == active_package), packages[0])
        return selected.total
    risk_amount = _js_round(base_total * risk_percent / 100)
    return base_total + risk_amount


def compute_plumbing_snapshot(
    items: Sequence[Mapping[str, Any]],
    zones: Sequence[Mapping[str, Any]],
    *,
    version: str,
) -> ComputedPlumbingSnapshot:
    """Чистая сборка снапшота из данных репозитория (атомы + зоны с составом и пакетами)."""

    by_id: dict[int, _ResolvedItem] = {}
    by_code: dict[str, _ResolvedItem] = {}
    resolved_items: list[_ResolvedItem] = []
    for item in items:
        resolved = _ResolvedItem(
            code=str(item.get("source_code") or ""),
            title=str(item.get("public_title") or item.get("source_code") or ""),
            unit=str(item.get("unit") or ""),
            category=str(item.get("category") or ""),
            unit_price=catalog_item_unit_price(item),
        )
        if item.get("id") is not None:
            by_id[int(item["id"])] = resolved
        by_code[resolved.code] = resolved
        resolved_items.append(resolved)

    computed_zones = tuple(_compute_zone(zone, by_id, by_code) for zone in zones)
    return ComputedPlumbingSnapshot(version=version, items=tuple(resolved_items), zones=computed_zones)


class PlumbingSnapshotStorage(Protocol):
    async def list_plumbing_catalog_items(self, *, include_inactive: bool = False) -> list[dict[str, Any]]: ...

    async def list_plumbing_zones(self, *, include_inactive: bool = False) -> list[dict[str, Any]]: ...

    async def list_plumbing_zone_items(self, zone_id: int) -> list[dict[str, Any]]: ...

    async def list_plumbing_zone_packages(self, zone_id: int) -> list[dict[str, Any]]: ...


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class BuildPlumbingSnapshotUseCase:
    """Собирает публичный/внутренний снапшот сантехники из репозитория (Q3 §1.1, Приложение B.4)."""

    def __init__(self, storage: PlumbingSnapshotStorage, *, version: str | None = None) -> None:
        self._storage = storage
        self._version = version

    async def build(self) -> ComputedPlumbingSnapshot:
        items = await self._storage.list_plumbing_catalog_items()
        zones = await self._storage.list_plumbing_zones()
        enriched: list[dict[str, Any]] = []
        for zone in zones:
            zone_id = int(zone["id"])
            base = await self._storage.list_plumbing_zone_items(zone_id)
            packages = await self._storage.list_plumbing_zone_packages(zone_id)
            enriched.append({**zone, "base": base, "packages": packages})
        version = self._version or _utc_now_iso()
        return compute_plumbing_snapshot(items, enriched, version=version)

    async def build_public(self) -> dict[str, Any]:
        return (await self.build()).public_payload()

    async def build_internal(self) -> dict[str, Any]:
        return (await self.build()).internal_payload()
