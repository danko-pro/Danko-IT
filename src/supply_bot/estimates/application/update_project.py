from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

from supply_bot.estimates.application.shared import normalize_optional_text, normalize_required_text


@dataclass(frozen=True)
class UpdateEstimateProjectCommand:
    project_id: int
    name: str | None
    residential_complex: str | None
    address: str | None
    entrance_section: str | None
    apartment: str | None
    floor: str | None
    lift_type: str | None
    site_access: str | None
    intercom_code: str | None
    loading_zone: str | None
    responsible_person: str | None
    note: str | None


class EstimateProjectUpdateStorage(Protocol):
    async def get_estimate_project(self, project_id: int) -> dict[str, Any] | None: ...

    async def update_estimate_project(
        self,
        project_id: int,
        *,
        name: str,
        residential_complex: str,
        address: str,
        entrance_section: str,
        apartment: str,
        floor: str,
        has_elevator: int,
        lift_type: str,
        site_access: str,
        intercom_code: str,
        loading_zone: str,
        responsible_person: str,
        note: str | None,
    ) -> None: ...


class UpdateEstimateProjectUseCase:
    """Сценарий обновления проекта расчета без привязки к HTTP-слою."""

    def __init__(self, storage: EstimateProjectUpdateStorage) -> None:
        self._storage = storage

    async def execute(self, command: UpdateEstimateProjectCommand) -> int:
        project = await self._storage.get_estimate_project(command.project_id)
        if not project:
            raise ValueError("Calculator project not found")

        name = normalize_required_text(command.name, error_message="Project name is required")
        lift_type = normalize_optional_text(command.lift_type) or ""
        has_elevator = 0 if lift_type in {"", "none"} else 1

        await self._storage.update_estimate_project(
            command.project_id,
            name=name,
            residential_complex=normalize_optional_text(command.residential_complex) or "",
            address=normalize_optional_text(command.address) or "",
            entrance_section=normalize_optional_text(command.entrance_section) or "",
            apartment=normalize_optional_text(command.apartment) or "",
            floor=normalize_optional_text(command.floor) or "",
            has_elevator=has_elevator,
            lift_type=lift_type,
            site_access=normalize_optional_text(command.site_access) or "",
            intercom_code=normalize_optional_text(command.intercom_code) or "",
            loading_zone=normalize_optional_text(command.loading_zone) or "",
            responsible_person=normalize_optional_text(command.responsible_person) or "",
            note=normalize_optional_text(command.note),
        )
        return command.project_id
