from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

from supply_bot.application.errors import NotFoundError, ValidationError
from supply_bot.estimates.application.shared import (
    clamp_factor,
    clamp_non_negative,
    normalize_optional_text,
    normalize_required_text,
)

DEFAULT_ZONE_RISK_PERCENT = 6.4
ALLOWED_PACKAGE_CODES = ("c", "b", "a")


# --- Атомарные позиции каталога (estimate_plumbing_catalog_items) ---


@dataclass(frozen=True)
class CreatePlumbingCatalogItemCommand:
    source_code: object
    public_title: object
    category: object
    unit: object
    technical_title: object
    work_price: object
    material_price: object
    equipment_price: object
    consumables_price: object
    coefficient: object
    catalog_group: object
    source: object
    note: object
    is_active: object
    sort_order: object


@dataclass(frozen=True)
class UpdatePlumbingCatalogItemCommand:
    item_id: int
    payload: dict[str, object]


class PlumbingCatalogItemStorage(Protocol):
    async def list_plumbing_catalog_items(self, *, include_inactive: bool = False) -> list[dict[str, Any]]: ...

    async def get_plumbing_catalog_item(self, item_id: int) -> dict[str, Any] | None: ...

    async def create_plumbing_catalog_item(self, **kwargs: object) -> int: ...

    async def update_plumbing_catalog_item(self, item_id: int, **updates: object) -> object: ...

    async def delete_plumbing_catalog_item(self, item_id: int) -> object: ...


class ListPlumbingCatalogItemsUseCase:
    def __init__(self, storage: PlumbingCatalogItemStorage) -> None:
        self._storage = storage

    async def execute(self, *, include_inactive: bool = False) -> list[dict[str, Any]]:
        return await self._storage.list_plumbing_catalog_items(include_inactive=include_inactive)


class GetPlumbingCatalogItemUseCase:
    def __init__(self, storage: PlumbingCatalogItemStorage) -> None:
        self._storage = storage

    async def execute(self, item_id: int) -> dict[str, Any]:
        item = await self._storage.get_plumbing_catalog_item(item_id)
        if not item:
            raise NotFoundError("Plumbing catalog item not found")
        return item


class CreatePlumbingCatalogItemUseCase:
    def __init__(self, storage: PlumbingCatalogItemStorage) -> None:
        self._storage = storage

    async def execute(self, command: CreatePlumbingCatalogItemCommand) -> int:
        return await self._storage.create_plumbing_catalog_item(
            source_code=_normalize_required_payload_text(
                command.source_code,
                error_message="Plumbing source code is required",
            ),
            public_title=_normalize_required_payload_text(
                command.public_title,
                error_message="Plumbing public title is required",
            ),
            category=_normalize_required_payload_text(
                command.category,
                error_message="Plumbing category is required",
            ),
            unit=_normalize_required_payload_text(command.unit, error_message="Plumbing unit is required"),
            technical_title=_normalize_optional_payload_text(command.technical_title),
            work_price=_clamp_payload_non_negative(command.work_price),
            material_price=_clamp_payload_non_negative(command.material_price),
            equipment_price=_clamp_payload_non_negative(command.equipment_price),
            consumables_price=_clamp_payload_non_negative(command.consumables_price),
            coefficient=_clamp_payload_factor(command.coefficient),
            catalog_group=_normalize_optional_payload_text(command.catalog_group),
            source=_normalize_optional_payload_text(command.source),
            note=_normalize_optional_payload_text(command.note),
            is_active=bool(command.is_active),
            sort_order=_payload_non_negative_int(command.sort_order, default=100),
        )


class UpdatePlumbingCatalogItemUseCase:
    def __init__(self, storage: PlumbingCatalogItemStorage) -> None:
        self._storage = storage

    async def execute(self, command: UpdatePlumbingCatalogItemCommand) -> dict[str, Any]:
        updates = _catalog_item_updates(command.payload)
        updated = await self._storage.update_plumbing_catalog_item(command.item_id, **updates)
        if not updated:
            raise NotFoundError("Plumbing catalog item not found")
        item = await self._storage.get_plumbing_catalog_item(command.item_id)
        if not item:
            raise NotFoundError("Plumbing catalog item not found")
        return item


class DeletePlumbingCatalogItemUseCase:
    def __init__(self, storage: PlumbingCatalogItemStorage) -> None:
        self._storage = storage

    async def execute(self, item_id: int) -> None:
        deleted = await self._storage.delete_plumbing_catalog_item(item_id)
        if not deleted:
            raise NotFoundError("Plumbing catalog item not found")


# --- Зоны (estimate_plumbing_zones) ---


@dataclass(frozen=True)
class CreatePlumbingZoneCommand:
    zone_code: object
    subgroup: object
    title: object
    description: object
    disclaimer: object
    risk_percent: object
    active_package_code: object
    is_active: object
    sort_order: object


@dataclass(frozen=True)
class UpdatePlumbingZoneCommand:
    zone_id: int
    payload: dict[str, object]


@dataclass(frozen=True)
class ReplacePlumbingZoneItemsCommand:
    zone_id: int
    items: list[dict[str, object]]


@dataclass(frozen=True)
class ReplacePlumbingZonePackagesCommand:
    zone_id: int
    packages: list[dict[str, object]]


class PlumbingZoneStorage(Protocol):
    async def list_plumbing_zones(self, *, include_inactive: bool = False) -> list[dict[str, Any]]: ...

    async def get_plumbing_zone(self, zone_id: int) -> dict[str, Any] | None: ...

    async def create_plumbing_zone(self, **kwargs: object) -> int: ...

    async def update_plumbing_zone(self, zone_id: int, **updates: object) -> object: ...

    async def delete_plumbing_zone(self, zone_id: int) -> object: ...

    async def replace_plumbing_zone_items(self, zone_id: int, items: list[dict[str, Any]]) -> object: ...

    async def replace_plumbing_zone_packages(self, zone_id: int, packages: list[dict[str, Any]]) -> object: ...


class ListPlumbingZonesUseCase:
    def __init__(self, storage: PlumbingZoneStorage) -> None:
        self._storage = storage

    async def execute(self, *, include_inactive: bool = False) -> list[dict[str, Any]]:
        return await self._storage.list_plumbing_zones(include_inactive=include_inactive)


class GetPlumbingZoneUseCase:
    def __init__(self, storage: PlumbingZoneStorage) -> None:
        self._storage = storage

    async def execute(self, zone_id: int) -> dict[str, Any]:
        zone = await self._storage.get_plumbing_zone(zone_id)
        if not zone:
            raise NotFoundError("Plumbing zone not found")
        return zone


class CreatePlumbingZoneUseCase:
    def __init__(self, storage: PlumbingZoneStorage) -> None:
        self._storage = storage

    async def execute(self, command: CreatePlumbingZoneCommand) -> int:
        return await self._storage.create_plumbing_zone(
            zone_code=_normalize_required_payload_text(
                command.zone_code,
                error_message="Plumbing zone code is required",
            ),
            subgroup=_normalize_required_payload_text(
                command.subgroup,
                error_message="Plumbing zone subgroup is required",
            ),
            title=_normalize_required_payload_text(command.title, error_message="Plumbing zone title is required"),
            description=_normalize_optional_payload_text(command.description),
            disclaimer=_normalize_optional_payload_text(command.disclaimer),
            risk_percent=_clamp_payload_risk_percent(command.risk_percent, default=DEFAULT_ZONE_RISK_PERCENT),
            active_package_code=_normalize_payload_package_code(command.active_package_code),
            is_active=bool(command.is_active),
            sort_order=_payload_non_negative_int(command.sort_order, default=100),
        )


class UpdatePlumbingZoneUseCase:
    def __init__(self, storage: PlumbingZoneStorage) -> None:
        self._storage = storage

    async def execute(self, command: UpdatePlumbingZoneCommand) -> dict[str, Any]:
        updates = _zone_updates(command.payload)
        updated = await self._storage.update_plumbing_zone(command.zone_id, **updates)
        if not updated:
            raise NotFoundError("Plumbing zone not found")
        zone = await self._storage.get_plumbing_zone(command.zone_id)
        if not zone:
            raise NotFoundError("Plumbing zone not found")
        return zone


class DeletePlumbingZoneUseCase:
    def __init__(self, storage: PlumbingZoneStorage) -> None:
        self._storage = storage

    async def execute(self, zone_id: int) -> None:
        deleted = await self._storage.delete_plumbing_zone(zone_id)
        if not deleted:
            raise NotFoundError("Plumbing zone not found")


class ReplacePlumbingZoneItemsUseCase:
    def __init__(self, storage: PlumbingZoneStorage) -> None:
        self._storage = storage

    async def execute(self, command: ReplacePlumbingZoneItemsCommand) -> None:
        items = [_composition_row(row) for row in command.items]
        replaced = await self._storage.replace_plumbing_zone_items(command.zone_id, items)
        if not replaced:
            raise NotFoundError("Plumbing zone not found")


class ReplacePlumbingZonePackagesUseCase:
    def __init__(self, storage: PlumbingZoneStorage) -> None:
        self._storage = storage

    async def execute(self, command: ReplacePlumbingZonePackagesCommand) -> None:
        packages = [_package_payload(package) for package in command.packages]
        replaced = await self._storage.replace_plumbing_zone_packages(command.zone_id, packages)
        if not replaced:
            raise NotFoundError("Plumbing zone not found")


# --- Маппинг входных данных ---


def _catalog_item_updates(payload: dict[str, object]) -> dict[str, object]:
    updates: dict[str, object] = {}
    text_fields = {
        "source_code",
        "public_title",
        "category",
        "unit",
    }
    optional_text_fields = {
        "technical_title",
        "catalog_group",
        "source",
        "note",
    }
    price_fields = {
        "work_price",
        "material_price",
        "equipment_price",
        "consumables_price",
    }
    for field in text_fields:
        if field in payload:
            updates[field] = _normalize_required_payload_text(
                payload.get(field),
                error_message=f"Plumbing {field.replace('_', ' ')} is required",
            )
    for field in optional_text_fields:
        if field in payload:
            updates[field] = _normalize_optional_payload_text(payload.get(field))
    for field in price_fields:
        if field in payload:
            updates[field] = _clamp_payload_non_negative(payload.get(field))
    if "coefficient" in payload:
        updates["coefficient"] = _clamp_payload_factor(payload.get("coefficient"))
    if "is_active" in payload:
        updates["is_active"] = bool(payload.get("is_active"))
    if "sort_order" in payload:
        updates["sort_order"] = _payload_non_negative_int(payload.get("sort_order"), default=0)
    return updates


def _zone_updates(payload: dict[str, object]) -> dict[str, object]:
    updates: dict[str, object] = {}
    required_text_fields = {
        "zone_code",
        "subgroup",
        "title",
    }
    optional_text_fields = {
        "description",
        "disclaimer",
    }
    for field in required_text_fields:
        if field in payload:
            updates[field] = _normalize_required_payload_text(
                payload.get(field),
                error_message=f"Plumbing zone {field.replace('_', ' ')} is required",
            )
    for field in optional_text_fields:
        if field in payload:
            updates[field] = _normalize_optional_payload_text(payload.get(field))
    if "risk_percent" in payload:
        updates["risk_percent"] = _clamp_payload_risk_percent(
            payload.get("risk_percent"), default=DEFAULT_ZONE_RISK_PERCENT
        )
    if "active_package_code" in payload:
        updates["active_package_code"] = _normalize_payload_package_code(payload.get("active_package_code"))
    if "is_active" in payload:
        updates["is_active"] = bool(payload.get("is_active"))
    if "sort_order" in payload:
        updates["sort_order"] = _payload_non_negative_int(payload.get("sort_order"), default=0)
    return updates


def _composition_row(row: dict[str, object]) -> dict[str, Any]:
    return {
        "atomic_item_id": _optional_positive_int(row.get("atomic_item_id")),
        "atomic_source_code": _normalize_required_payload_text(
            row.get("atomic_source_code"),
            error_message="Plumbing composition atomic source code is required",
        ),
        "quantity": _clamp_payload_non_negative(row.get("quantity")),
        "coefficient": _clamp_payload_factor(row.get("coefficient")),
        "sort_order": _payload_non_negative_int(row.get("sort_order"), default=0),
    }


def _package_payload(package: dict[str, object]) -> dict[str, Any]:
    items = package.get("items") or []
    if not isinstance(items, list):
        raise ValidationError("Plumbing package items must be a list")
    return {
        "package_code": _normalize_required_payload_package_code(package.get("package_code")),
        "label": _normalize_optional_payload_text(package.get("label")),
        "sort_order": _payload_non_negative_int(package.get("sort_order"), default=0),
        "items": [_composition_row(row) for row in items],
    }


# --- Низкоуровневые помощники с доменными ошибками ---


def _normalize_required_payload_text(value: object, *, error_message: str) -> str:
    try:
        return normalize_required_text(_normalize_optional_payload_text(value), error_message=error_message)
    except ValueError as exc:
        raise ValidationError(str(exc)) from exc


def _normalize_optional_payload_text(value: object) -> str | None:
    return normalize_optional_text(str(value or ""))


def _clamp_payload_non_negative(value: object) -> float:
    try:
        return clamp_non_negative(float(value or 0.0))
    except (TypeError, ValueError) as exc:
        raise ValidationError(str(exc)) from exc


def _clamp_payload_factor(value: object) -> float:
    try:
        return clamp_factor(value)
    except (TypeError, ValueError) as exc:
        raise ValidationError(str(exc)) from exc


def _clamp_payload_risk_percent(value: object, *, default: float) -> float:
    if value in (None, ""):
        return default
    try:
        return clamp_non_negative(float(value))
    except (TypeError, ValueError) as exc:
        raise ValidationError(str(exc)) from exc


def _payload_non_negative_int(value: object, *, default: int = 0) -> int:
    try:
        return max(0, int(value or default))
    except (TypeError, ValueError) as exc:
        raise ValidationError(str(exc)) from exc


def _optional_positive_int(value: object) -> int | None:
    if value in (None, ""):
        return None
    try:
        parsed = int(value)
    except (TypeError, ValueError) as exc:
        raise ValidationError(str(exc)) from exc
    return parsed if parsed > 0 else None


def _normalize_payload_package_code(value: object) -> str | None:
    normalized = _normalize_optional_payload_text(value)
    if normalized is None:
        return None
    code = normalized.lower()
    if code not in ALLOWED_PACKAGE_CODES:
        raise ValidationError(f"Plumbing package code must be one of {ALLOWED_PACKAGE_CODES}")
    return code


def _normalize_required_payload_package_code(value: object) -> str:
    code = _normalize_payload_package_code(value)
    if code is None:
        raise ValidationError("Plumbing package code is required")
    return code
