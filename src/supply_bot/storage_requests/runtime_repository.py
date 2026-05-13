from __future__ import annotations

from supply_bot.storage_requests.history_repository import SqlAlchemyRequestHistoryRepository
from supply_bot.storage_requests.profiles_repository import SqlAlchemyRequestProfilesRepository
from supply_bot.storage_requests.repository import SqlAlchemyRequestRepository


class SqlAlchemyRequestRuntimeRepository(
    SqlAlchemyRequestRepository,
    SqlAlchemyRequestProfilesRepository,
    SqlAlchemyRequestHistoryRepository,
):
    pass
