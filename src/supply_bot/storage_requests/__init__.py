"""Persistence для request runtime."""

from supply_bot.storage_requests.drafts import RequestDraftsStorageMixin
from supply_bot.storage_requests.history import RequestHistoryStorageMixin
from supply_bot.storage_requests.history_repository import SqlAlchemyRequestHistoryRepository
from supply_bot.storage_requests.items import RequestItemsStorageMixin
from supply_bot.storage_requests.profiles import RequestProfilesStorageMixin
from supply_bot.storage_requests.profiles_repository import SqlAlchemyRequestProfilesRepository
from supply_bot.storage_requests.repository import SqlAlchemyRequestRepository
from supply_bot.storage_requests.runtime_repository import SqlAlchemyRequestRuntimeRepository


class GroupRequestsStorageMixin(
    RequestItemsStorageMixin,
    RequestDraftsStorageMixin,
    RequestProfilesStorageMixin,
    RequestHistoryStorageMixin,
):
    """Совместимый aggregate mixin для legacy request persistence."""


__all__ = [
    "GroupRequestsStorageMixin",
    "SqlAlchemyRequestHistoryRepository",
    "SqlAlchemyRequestProfilesRepository",
    "SqlAlchemyRequestRepository",
    "SqlAlchemyRequestRuntimeRepository",
]
