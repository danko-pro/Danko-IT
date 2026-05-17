from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping, Protocol

from supply_bot.application.errors import NotFoundError, ValidationError
from supply_bot.estimates.application.shared import (
    normalize_optional_text,
    normalize_required_text,
    require_positive_number,
)


@dataclass(frozen=True)
class ProjectDoorValuesCommand:
    door_catalog_id: int | None
    title: str | None
    opening_kind: str
    width_mm: float | int | None
    height_mm: float | int | None
    thickness_mm: float | int | None
    purchase_price: float | int | None
    sale_price: float | int | None
    install_price: float | int | None
    room_a_id: int | None
    room_b_id: int | None
    note: str | None


@dataclass(frozen=True)
class CreateProjectDoorCommand:
    project_id: int
    door: ProjectDoorValuesCommand


@dataclass(frozen=True)
class UpdateProjectDoorCommand:
    door_id: int
    door: ProjectDoorValuesCommand


@dataclass(frozen=True)
class DeleteProjectDoorCommand:
    door_id: int


class ProjectDoorStorage(Protocol):
    async def get_estimate_project(self, project_id: int) -> dict[str, Any] | None: ...

    async def list_estimate_door_catalog(self) -> list[dict[str, Any]]: ...

    async def create_estimate_project_door(self, *, project_id: int, **kwargs: object) -> int | None: ...

    async def update_estimate_project_door(self, door_id: int, **kwargs: object) -> int | None: ...

    async def delete_estimate_project_door(self, door_id: int) -> int | None: ...


class CreateProjectDoorUseCase:
    """Сценарий создания двери проекта без привязки к HTTP-слою."""

    def __init__(self, storage: ProjectDoorStorage) -> None:
        self._storage = storage

    async def execute(self, command: CreateProjectDoorCommand) -> int:
        project = await self._storage.get_estimate_project(command.project_id)
        if not project:
            raise NotFoundError("Calculator project not found")
        door_values = await _resolve_project_door_values(self._storage, command.door)
        await self._storage.create_estimate_project_door(project_id=command.project_id, **door_values)
        return command.project_id


class UpdateProjectDoorUseCase:
    """Сценарий обновления двери проекта без привязки к HTTP-слою."""

    def __init__(self, storage: ProjectDoorStorage) -> None:
        self._storage = storage

    async def execute(self, command: UpdateProjectDoorCommand) -> int:
        door_values = await _resolve_project_door_values(self._storage, command.door)
        project_id = await self._storage.update_estimate_project_door(command.door_id, **door_values)
        if project_id is None:
            raise NotFoundError("Project door not found")
        return int(project_id)


class DeleteProjectDoorUseCase:
    """Сценарий удаления двери проекта без привязки к HTTP-слою."""

    def __init__(self, storage: ProjectDoorStorage) -> None:
        self._storage = storage

    async def execute(self, command: DeleteProjectDoorCommand) -> int:
        project_id = await self._storage.delete_estimate_project_door(command.door_id)
        if project_id is None:
            raise NotFoundError("Project door not found")
        return int(project_id)


async def _resolve_project_door_values(
    storage: ProjectDoorStorage,
    command: ProjectDoorValuesCommand,
) -> dict[str, object]:
    catalog_item = await _resolve_door_catalog_item(storage, command.door_catalog_id)
    title = normalize_optional_text(command.title)
    width_mm = command.width_mm
    height_mm = command.height_mm
    thickness_mm = command.thickness_mm
    purchase_price = command.purchase_price
    sale_price = command.sale_price
    install_price = command.install_price

    if catalog_item is not None:
        title = title or str(catalog_item["title"])
        width_mm = float(catalog_item["width_mm"])
        height_mm = float(catalog_item["height_mm"])
        thickness_mm = catalog_item["thickness_mm"]

    if command.room_a_id is None and command.room_b_id is None:
        raise ValidationError("At least one room must be selected")

    return {
        "door_catalog_id": command.door_catalog_id,
        "title": _normalize_required_text(title, error_message="Door title is required"),
        "opening_kind": command.opening_kind.strip() or "door",
        "width_mm": _require_positive_number(width_mm, error_message="Door width and height must be positive"),
        "height_mm": _require_positive_number(height_mm, error_message="Door width and height must be positive"),
        "thickness_mm": float(thickness_mm) if thickness_mm is not None else None,
        "purchase_price": float(purchase_price) if purchase_price is not None else None,
        "sale_price": float(sale_price) if sale_price is not None else None,
        "install_price": float(install_price) if install_price is not None else None,
        "room_a_id": command.room_a_id,
        "room_b_id": command.room_b_id,
        "note": normalize_optional_text(command.note),
    }


async def _resolve_door_catalog_item(
    storage: ProjectDoorStorage,
    door_catalog_id: int | None,
) -> Mapping[str, Any] | None:
    if door_catalog_id is None:
        return None
    catalog = await storage.list_estimate_door_catalog()
    for item in catalog:
        if int(item["id"]) == int(door_catalog_id):
            return item
    raise NotFoundError("Door catalog item not found")


def _normalize_required_text(value: str | None, *, error_message: str) -> str:
    try:
        return normalize_required_text(value, error_message=error_message)
    except ValueError as exc:
        raise ValidationError(str(exc)) from exc


def _require_positive_number(value: float | int | None, *, error_message: str) -> float:
    try:
        return require_positive_number(value, error_message=error_message)
    except ValueError as exc:
        raise ValidationError(str(exc)) from exc
