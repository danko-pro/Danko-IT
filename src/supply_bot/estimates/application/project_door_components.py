from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping, Protocol

from supply_bot.application.errors import NotFoundError, OperationFailedError, ValidationError
from supply_bot.estimates.application.shared import normalize_optional_text, normalize_required_text
from supply_bot.utils import normalize_text


@dataclass(frozen=True)
class ProjectDoorComponentValuesCommand:
    component_catalog_id: int | None
    category_code: str | None
    title: str | None
    unit: str | None
    quantity: float | int
    purchase_price: float | int | None
    sale_price: float | int | None
    note: str | None


@dataclass(frozen=True)
class CreateProjectDoorComponentCommand:
    door_id: int
    component: ProjectDoorComponentValuesCommand


@dataclass(frozen=True)
class UpdateProjectDoorComponentCommand:
    component_id: int
    component: ProjectDoorComponentValuesCommand


@dataclass(frozen=True)
class DeleteProjectDoorComponentCommand:
    component_id: int


class ProjectDoorComponentStorage(Protocol):
    async def list_estimate_door_component_catalog(self) -> list[dict[str, Any]]: ...

    async def create_estimate_project_door_component(
        self,
        *,
        project_door_id: int,
        **kwargs: object,
    ) -> int | None: ...

    async def update_estimate_project_door_component(self, component_id: int, **kwargs: object) -> int | None: ...

    async def delete_estimate_project_door_component(self, component_id: int) -> int | None: ...

    async def get_estimate_project_id_for_project_door(self, door_id: int) -> int | None: ...


class CreateProjectDoorComponentUseCase:
    """Сценарий создания комплектующей двери проекта без привязки к HTTP-слою."""

    def __init__(self, storage: ProjectDoorComponentStorage) -> None:
        self._storage = storage

    async def execute(self, command: CreateProjectDoorComponentCommand) -> int:
        values = await _resolve_project_door_component_values(self._storage, command.component)
        component_id = await self._storage.create_estimate_project_door_component(
            project_door_id=command.door_id,
            **values,
        )
        if component_id is None:
            raise NotFoundError("Project door not found")
        project_id = await self._storage.get_estimate_project_id_for_project_door(command.door_id)
        if project_id is None:
            raise OperationFailedError("Project not found after component creation")
        return int(project_id)


class UpdateProjectDoorComponentUseCase:
    """Сценарий обновления комплектующей двери проекта без привязки к HTTP-слою."""

    def __init__(self, storage: ProjectDoorComponentStorage) -> None:
        self._storage = storage

    async def execute(self, command: UpdateProjectDoorComponentCommand) -> int:
        values = await _resolve_project_door_component_values(self._storage, command.component)
        project_id = await self._storage.update_estimate_project_door_component(command.component_id, **values)
        if project_id is None:
            raise NotFoundError("Door component not found")
        return int(project_id)


class DeleteProjectDoorComponentUseCase:
    """Сценарий удаления комплектующей двери проекта без привязки к HTTP-слою."""

    def __init__(self, storage: ProjectDoorComponentStorage) -> None:
        self._storage = storage

    async def execute(self, command: DeleteProjectDoorComponentCommand) -> int:
        project_id = await self._storage.delete_estimate_project_door_component(command.component_id)
        if project_id is None:
            raise NotFoundError("Door component not found")
        return int(project_id)


async def _resolve_project_door_component_values(
    storage: ProjectDoorComponentStorage,
    command: ProjectDoorComponentValuesCommand,
) -> dict[str, object]:
    catalog_item = await _resolve_component_catalog_item(storage, command.component_catalog_id)
    category_code = normalize_text(command.category_code or "")
    title = normalize_optional_text(command.title)
    unit = normalize_optional_text(command.unit)
    purchase_price = command.purchase_price
    sale_price = command.sale_price

    if catalog_item is not None:
        category_code = category_code or str(catalog_item["category_code"])
        title = title or str(catalog_item["title"])
        unit = unit or str(catalog_item["unit"] or "шт")

    if command.quantity <= 0:
        raise ValidationError("Door component quantity must be positive")

    return {
        "component_catalog_id": command.component_catalog_id,
        "category_code": normalize_text(category_code) or "misc",
        "title": _normalize_required_text(title, error_message="Door component title is required"),
        "unit": unit or "шт",
        "quantity": float(command.quantity),
        "purchase_price": float(purchase_price) if purchase_price is not None else None,
        "sale_price": float(sale_price) if sale_price is not None else None,
        "note": normalize_optional_text(command.note),
    }


async def _resolve_component_catalog_item(
    storage: ProjectDoorComponentStorage,
    component_catalog_id: int | None,
) -> Mapping[str, Any] | None:
    if component_catalog_id is None:
        return None
    catalog = await storage.list_estimate_door_component_catalog()
    for item in catalog:
        if int(item["id"]) == int(component_catalog_id):
            return item
    raise NotFoundError("Door component catalog item not found")


def _normalize_required_text(value: str | None, *, error_message: str) -> str:
    try:
        return normalize_required_text(value, error_message=error_message)
    except ValueError as exc:
        raise ValidationError(str(exc)) from exc
