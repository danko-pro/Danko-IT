"""
Пакет persistence для request flow.
Снаружи оставляет старый `GroupRequestsStorageMixin`, а внутри делит хранилище по подзонам.
"""

from supply_bot.storage_requests.drafts import RequestDraftsStorageMixin
from supply_bot.storage_requests.history import RequestHistoryStorageMixin
from supply_bot.storage_requests.items import RequestItemsStorageMixin
from supply_bot.storage_requests.profiles import RequestProfilesStorageMixin


class GroupRequestsStorageMixin(
    RequestItemsStorageMixin,
    RequestDraftsStorageMixin,
    RequestProfilesStorageMixin,
    RequestHistoryStorageMixin,
):
    """Совместимый aggregate mixin для request persistence."""


__all__ = ["GroupRequestsStorageMixin"]
