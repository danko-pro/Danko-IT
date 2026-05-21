from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

from supply_bot.application.errors import NotFoundError
from supply_bot.projects.application.finance_read_model import build_project_finance_summary_payload
from supply_bot.projects.application.read_models import build_project_read_payload


@dataclass(frozen=True)
class GetProjectDetailCommand:
    project_id: int


class ProjectDetailStorage(Protocol):
    async def get_project(self, project_id: int) -> dict[str, Any] | None: ...

    async def list_project_ledger_entries(self, project_id: int) -> list[dict[str, Any]]: ...


class GetProjectDetailUseCase:
    def __init__(self, storage: ProjectDetailStorage) -> None:
        self._storage = storage

    async def execute(self, command: GetProjectDetailCommand) -> dict[str, Any]:
        project = await self._storage.get_project(command.project_id)
        if not project:
            raise NotFoundError("Project not found")
        ledger_entries = await self._storage.list_project_ledger_entries(command.project_id)
        payload = build_project_read_payload(project)
        payload["finance_summary"] = build_project_finance_summary_payload(
            project=project,
            ledger_entries=ledger_entries,
        )
        return payload
