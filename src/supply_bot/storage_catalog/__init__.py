"""
Пакет persistence для material catalog.
Снаружи сохраняет старый контракт `CatalogStorageMixin`, а внутри делит ответственность по подзонам.
"""

from supply_bot.storage_catalog.aliases import CatalogAliasesStorageMixin
from supply_bot.storage_catalog.common import CatalogStorageCommonMixin
from supply_bot.storage_catalog.families import CatalogFamiliesStorageMixin
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
    """Совместимый aggregate mixin для catalog persistence."""


__all__ = ["CatalogStorageMixin"]
