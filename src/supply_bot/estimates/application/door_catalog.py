from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

from supply_bot.estimates.application.shared import (
    normalize_optional_text,
    normalize_required_text,
    require_positive_number,
)
from supply_bot.utils import normalize_text


@dataclass(frozen=True)
class CreateDoorCatalogItemCommand:
    title: str | None
    width_mm: float | int | None
    height_mm: float | int | None
    thickness_mm: float | int | None
    purchase_price: float | int | None
    sale_price: float | int | None
    install_price: float | int | None
    note: str | None


@dataclass(frozen=True)
class CreateDoorComponentCatalogItemCommand:
    category_code: str | None
    title: str | None
    unit: str | None
    purchase_price: float | int | None
    sale_price: float | int | None
    note: str | None


class DoorCatalogStorage(Protocol):
    async def list_estimate_door_catalog(self) -> list[dict[str, Any]]: ...

    async def create_estimate_door_catalog_item(
        self,
        *,
        title: str,
        width_mm: float,
        height_mm: float,
        thickness_mm: float | int | None,
        purchase_price: float | int | None,
        sale_price: float | int | None,
        install_price: float | int | None,
        note: str | None,
    ) -> int: ...

    async def list_estimate_door_component_catalog(self) -> list[dict[str, Any]]: ...

    async def create_estimate_door_component_catalog_item(
        self,
        *,
        category_code: str,
        title: str,
        unit: str,
        purchase_price: float | int | None,
        sale_price: float | int | None,
        note: str | None,
    ) -> int: ...


class ListDoorCatalogUseCase:
    """Сценарий чтения справочника дверей без привязки к HTTP-слою."""

    def __init__(self, storage: DoorCatalogStorage) -> None:
        self._storage = storage

    async def execute(self) -> list[dict[str, Any]]:
        return await self._storage.list_estimate_door_catalog()


class CreateDoorCatalogItemUseCase:
    """Сценарий создания справочной двери без привязки к HTTP-слою."""

    def __init__(self, storage: DoorCatalogStorage) -> None:
        self._storage = storage

    async def execute(self, command: CreateDoorCatalogItemCommand) -> int:
        return await self._storage.create_estimate_door_catalog_item(
            title=normalize_required_text(command.title, error_message="Door title is required"),
            width_mm=require_positive_number(command.width_mm, error_message="Door width and height must be positive"),
            height_mm=require_positive_number(
                command.height_mm,
                error_message="Door width and height must be positive",
            ),
            thickness_mm=command.thickness_mm,
            purchase_price=command.purchase_price,
            sale_price=command.sale_price,
            install_price=command.install_price,
            note=normalize_optional_text(command.note),
        )


class ListDoorComponentCatalogUseCase:
    """Сценарий чтения справочника комплектующих дверей без привязки к HTTP-слою."""

    def __init__(self, storage: DoorCatalogStorage) -> None:
        self._storage = storage

    async def execute(self) -> list[dict[str, Any]]:
        return await self._storage.list_estimate_door_component_catalog()


class CreateDoorComponentCatalogItemUseCase:
    """Сценарий создания справочной комплектующей двери без привязки к HTTP-слою."""

    def __init__(self, storage: DoorCatalogStorage) -> None:
        self._storage = storage

    async def execute(self, command: CreateDoorComponentCatalogItemCommand) -> int:
        return await self._storage.create_estimate_door_component_catalog_item(
            category_code=normalize_text(command.category_code or "") or "misc",
            title=normalize_required_text(command.title, error_message="Door component title is required"),
            unit=(command.unit or "").strip() or "шт",
            purchase_price=command.purchase_price,
            sale_price=command.sale_price,
            note=normalize_optional_text(command.note),
        )
