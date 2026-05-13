"""Persistence для каталога материалов."""

from supply_bot.storage_catalog.aliases import CatalogAliasesStorageMixin
from supply_bot.storage_catalog.common import CatalogStorageCommonMixin
from supply_bot.storage_catalog.delegating import CatalogDelegatingStorage
from supply_bot.storage_catalog.families import CatalogFamiliesStorageMixin
from supply_bot.storage_catalog.repository import SqlAlchemyCatalogRepository
from supply_bot.storage_catalog.search import CatalogSearchStorageMixin
from supply_bot.storage_catalog.skus import CatalogSkusStorageMixin
from supply_bot.storage_catalog.unknown_terms import CatalogUnknownTermsStorageMixin


class CatalogStorageMixin(
    CatalogUnknownTermsStorageMixin,
    CatalogSearchStorageMixin,
    CatalogAliasesStorageMixin,
    CatalogSkusStorageMixin,
    CatalogFamiliesStorageMixin,
    CatalogStorageCommonMixin,
):
    """Совместимый aggregate mixin для legacy catalog persistence."""


__all__ = [
    "CatalogDelegatingStorage",
    "CatalogStorageMixin",
    "SqlAlchemyCatalogRepository",
]
