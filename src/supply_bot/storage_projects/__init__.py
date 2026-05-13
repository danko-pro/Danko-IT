from supply_bot.storage_projects.accounting_repository import SqlAlchemyProjectAccountingRepository
from supply_bot.storage_projects.advances import ProjectAdvancesStorageMixin
from supply_bot.storage_projects.contracts import ProjectContractsStorageMixin
from supply_bot.storage_projects.contracts_repository import SqlAlchemyProjectContractsRepository
from supply_bot.storage_projects.delegating import PROJECT_METHODS
from supply_bot.storage_projects.documents_repository import SqlAlchemyProjectDocumentsRepository
from supply_bot.storage_projects.ledger_documents import ProjectLedgerDocumentsStorageMixin
from supply_bot.storage_projects.ledger_entries import ProjectLedgerEntriesStorageMixin
from supply_bot.storage_projects.projects import ProjectRecordsStorageMixin
from supply_bot.storage_projects.repository import SqlAlchemyProjectRepository, SqlAlchemyProjectWorkspaceRepository
from supply_bot.storage_projects.summary import ProjectSummaryStorageMixin


class ProjectsStorageMixin(
    ProjectRecordsStorageMixin,
    ProjectAdvancesStorageMixin,
    ProjectLedgerEntriesStorageMixin,
    ProjectLedgerDocumentsStorageMixin,
    ProjectContractsStorageMixin,
    ProjectSummaryStorageMixin,
):
    pass


__all__ = [
    "PROJECT_METHODS",
    "ProjectAdvancesStorageMixin",
    "ProjectContractsStorageMixin",
    "ProjectLedgerDocumentsStorageMixin",
    "ProjectLedgerEntriesStorageMixin",
    "ProjectRecordsStorageMixin",
    "ProjectSummaryStorageMixin",
    "ProjectsStorageMixin",
    "SqlAlchemyProjectRepository",
    "SqlAlchemyProjectAccountingRepository",
    "SqlAlchemyProjectDocumentsRepository",
    "SqlAlchemyProjectContractsRepository",
    "SqlAlchemyProjectWorkspaceRepository",
]
