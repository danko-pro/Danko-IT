from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping, Protocol

from supply_bot.application.errors import NotFoundError
from supply_bot.projects.application.read_models import build_project_ledger_entries_read_payloads


@dataclass(frozen=True)
class ListProjectLedgerEntriesCommand:
    project_id: int


class ProjectLedgerEntriesListStorage(Protocol):
    async def get_project(self, project_id: int) -> Mapping[str, Any] | None: ...

    async def list_project_ledger_entries(self, project_id: int) -> list[Mapping[str, Any]]: ...

    async def list_project_ledger_documents(self, project_id: int) -> list[Mapping[str, Any]]: ...


class ListProjectLedgerEntriesUseCase:
    def __init__(self, storage: ProjectLedgerEntriesListStorage) -> None:
        self._storage = storage

    async def execute(self, command: ListProjectLedgerEntriesCommand) -> list[dict[str, Any]]:
        project = await self._storage.get_project(command.project_id)
        if not project:
            raise NotFoundError("Project not found")

        entries = await self._storage.list_project_ledger_entries(command.project_id)
        documents = await self._storage.list_project_ledger_documents(command.project_id)
        return build_project_ledger_entries_read_payloads(entries=entries, documents=documents)
