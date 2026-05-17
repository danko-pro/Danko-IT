from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping, Protocol

from supply_bot.application.errors import NotFoundError, OperationFailedError, ValidationError
from supply_bot.projects.application.read_models import build_project_ledger_entry_response_payload
from supply_bot.projects.domain.common import ProjectValidationError
from supply_bot.projects.domain.ledger import build_project_ledger_update_values


@dataclass(frozen=True)
class UpdateProjectLedgerEntryCommand:
    project_id: int
    entry_id: int
    payload_data: Mapping[str, Any]
    counterparty_details: Any | None = None


class ProjectLedgerEntryUpdateStorage(Protocol):
    async def get_project(self, project_id: int) -> Mapping[str, Any] | None: ...

    async def get_project_ledger_entry(self, entry_id: int) -> Mapping[str, Any] | None: ...

    async def update_project_ledger_entry(self, entry_id: int, **updates: Any) -> object: ...

    async def get_project_ledger_document(
        self,
        *,
        ledger_entry_id: int,
        kind: str,
    ) -> Mapping[str, Any] | None: ...


class UpdateProjectLedgerEntryUseCase:
    def __init__(self, storage: ProjectLedgerEntryUpdateStorage) -> None:
        self._storage = storage

    async def execute(self, command: UpdateProjectLedgerEntryCommand) -> dict[str, Any]:
        project = await self._storage.get_project(command.project_id)
        if not project:
            raise NotFoundError("Project not found")

        entry = await self._storage.get_project_ledger_entry(command.entry_id)
        if not entry or int(entry["project_id"]) != command.project_id:
            raise NotFoundError("Project ledger entry not found")

        payload_data = dict(command.payload_data)
        if not payload_data:
            return build_project_ledger_entry_response_payload(entry=entry, project=project)

        try:
            updates = build_project_ledger_update_values(
                payload_data,
                counterparty_details=command.counterparty_details,
            )
        except ProjectValidationError as exc:
            raise ValidationError(str(exc)) from exc

        await self._storage.update_project_ledger_entry(command.entry_id, **updates)

        updated_entry = await self._storage.get_project_ledger_entry(command.entry_id)
        if not updated_entry or int(updated_entry["project_id"]) != command.project_id:
            raise OperationFailedError("Project ledger entry update failed")

        project = await self._storage.get_project(command.project_id)
        if not project:
            raise OperationFailedError("Project ledger entry update failed")

        invoice_document = await self._storage.get_project_ledger_document(
            ledger_entry_id=command.entry_id,
            kind="invoice",
        )
        act_document = await self._storage.get_project_ledger_document(
            ledger_entry_id=command.entry_id,
            kind="act",
        )
        return build_project_ledger_entry_response_payload(
            entry=updated_entry,
            project=project,
            invoice_document=invoice_document,
            act_document=act_document,
        )
