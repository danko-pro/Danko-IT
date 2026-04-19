"""Пакет persistence mixin'ов для project accounting.

Снаружи пакет сохраняет прежний импорт `ProjectsStorageMixin`, но внутри
логика разложена по поддоменам:
- projects;
- advances;
- ledger entries/documents;
- contracts;
- summary sync.
"""

from __future__ import annotations

from supply_bot.storage_projects.advances import ProjectAdvancesStorageMixin
from supply_bot.storage_projects.contracts import ProjectContractsStorageMixin
from supply_bot.storage_projects.ledger_documents import ProjectLedgerDocumentsStorageMixin
from supply_bot.storage_projects.ledger_entries import ProjectLedgerEntriesStorageMixin
from supply_bot.storage_projects.projects import ProjectRecordsStorageMixin
from supply_bot.storage_projects.summary import ProjectSummaryStorageMixin


class ProjectsStorageMixin(
    ProjectContractsStorageMixin,
    ProjectLedgerDocumentsStorageMixin,
    ProjectLedgerEntriesStorageMixin,
    ProjectAdvancesStorageMixin,
    ProjectRecordsStorageMixin,
    ProjectSummaryStorageMixin,
):
    """Совместимый aggregate mixin для BotStorage."""


__all__ = ["ProjectsStorageMixin"]
