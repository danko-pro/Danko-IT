from __future__ import annotations

from collections.abc import Callable
from typing import Any

from supply_bot.storage_catalog.delegating import CATALOG_METHODS
from supply_bot.storage_estimates.delegating import ESTIMATE_METHODS
from supply_bot.storage_notifications.delegating import NOTIFICATION_METHODS
from supply_bot.storage_projects.delegating import PROJECT_METHODS
from supply_bot.storage_requests.delegating import REQUEST_METHODS


class DomainDelegatingStorage:
    def __init__(
        self,
        legacy_storage: Any,
        *,
        catalog_storage: Any,
        request_storage: Any,
        notification_storage: Any,
        project_storage: Any | None = None,
        estimate_storage: Any | None = None,
    ) -> None:
        self._legacy_storage = legacy_storage
        self._catalog_storage = catalog_storage
        self._request_storage = request_storage
        self._notification_storage = notification_storage
        self._project_storage = project_storage
        self._estimate_storage = estimate_storage

    def __getattr__(self, name: str) -> Callable[..., Any]:
        if name in CATALOG_METHODS:
            return getattr(self._catalog_storage, name)
        if name in REQUEST_METHODS:
            return getattr(self._request_storage, name)
        if name in NOTIFICATION_METHODS:
            return getattr(self._notification_storage, name)
        if self._project_storage is not None and name in PROJECT_METHODS:
            return getattr(self._project_storage, name)
        if self._estimate_storage is not None and name in ESTIMATE_METHODS:
            return getattr(self._estimate_storage, name)
        return getattr(self._legacy_storage, name)
