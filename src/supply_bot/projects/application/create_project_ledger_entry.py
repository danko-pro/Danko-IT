from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping, Protocol

from supply_bot.application.errors import NotFoundError, OperationFailedError, ValidationError
from supply_bot.projects.application.read_models import build_project_ledger_entry_response_payload
from supply_bot.projects.domain.common import ProjectValidationError
from supply_bot.projects.domain.ledger import build_project_ledger_create_values


@dataclass(frozen=True)
class CreateProjectLedgerEntryCommand:
    project_id: int
    payload: Any
    sync_summary: bool = True


class ProjectLedgerEntryCreateStorage(Protocol):
    async def get_project(self, project_id: int) -> Mapping[str, Any] | None: ...

    async def create_project_ledger_entry(self, *, project_id: int, sync_summary: bool, **values: Any) -> int: ...

    async def get_project_ledger_entry(self, entry_id: int) -> Mapping[str, Any] | None: ...

    async def get_project_ledger_document(
        self,
        *,
        ledger_entry_id: int,
        kind: str,
    ) -> Mapping[str, Any] | None: ...


class CreateProjectLedgerEntryUseCase:
    def __init__(self, storage: ProjectLedgerEntryCreateStorage) -> None:
        self._storage = storage

    async def execute(self, command: CreateProjectLedgerEntryCommand) -> dict[str, Any]:
        project = await self._storage.get_project(command.project_id)
        if not project:
            raise NotFoundError("Project not found")

        try:
            entry_values = build_project_ledger_create_values(command.payload)
        except ProjectValidationError as exc:
            raise ValidationError(str(exc)) from exc

        entry_id = await self._storage.create_project_ledger_entry(
            project_id=command.project_id,
            sync_summary=command.sync_summary,
            **entry_values,
        )
        entry = await self._storage.get_project_ledger_entry(entry_id)
        if not entry:
            raise OperationFailedError("Project ledger entry was not created")

        project = await self._storage.get_project(command.project_id)
        if not project:
            raise OperationFailedError("Project ledger entry was not created")

        invoice_document = await self._storage.get_project_ledger_document(
            ledger_entry_id=entry_id,
            kind="invoice",
        )
        act_document = await self._storage.get_project_ledger_document(
            ledger_entry_id=entry_id,
            kind="act",
        )
        return build_project_ledger_entry_response_payload(
            entry=entry,
            project=project,
            invoice_document=invoice_document,
            act_document=act_document,
        )
