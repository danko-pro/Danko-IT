from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping, Protocol

from supply_bot.application.errors import NotFoundError, OperationFailedError
from supply_bot.projects.application.read_models import build_project_ledger_entry_delete_response_payload


@dataclass(frozen=True)
class DeleteProjectLedgerEntryCommand:
    project_id: int
    entry_id: int


class ProjectLedgerEntryDeleteStorage(Protocol):
    async def get_project(self, project_id: int) -> Mapping[str, Any] | None: ...

    async def get_project_ledger_entry(self, entry_id: int) -> Mapping[str, Any] | None: ...

    async def delete_project_ledger_entry(self, entry_id: int) -> object: ...


class DeleteProjectLedgerEntryUseCase:
    def __init__(self, storage: ProjectLedgerEntryDeleteStorage) -> None:
        self._storage = storage

    async def execute(self, command: DeleteProjectLedgerEntryCommand) -> dict[str, Any]:
        project = await self._storage.get_project(command.project_id)
        if not project:
            raise NotFoundError("Project not found")

        entry = await self._storage.get_project_ledger_entry(command.entry_id)
        if not entry or int(entry["project_id"]) != command.project_id:
            raise NotFoundError("Project ledger entry not found")

        deleted_entry = await self._storage.delete_project_ledger_entry(command.entry_id)
        if not deleted_entry:
            raise OperationFailedError("Project ledger entry deletion failed")

        project = await self._storage.get_project(command.project_id)
        if not project:
            raise OperationFailedError("Project ledger entry deletion failed")

        return build_project_ledger_entry_delete_response_payload(
            entry_id=command.entry_id,
            project=project,
        )
