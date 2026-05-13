from __future__ import annotations

from collections.abc import Callable
from typing import Any

CATALOG_METHODS = {
    "list_families",
    "get_family",
    "create_family",
    "update_family_dialog_fields",
    "set_family_active",
    "list_variants",
    "get_variant",
    "create_variant",
    "set_variant_active",
    "list_skus",
    "get_sku",
    "create_sku",
    "set_sku_active",
    "list_aliases",
    "create_alias",
    "set_alias_active",
    "find_alias_matches",
    "search_material_targets",
    "search_catalog",
    "list_unknown_terms",
    "get_unknown_term",
    "add_unknown_term",
    "mark_unknown_term",
}


class CatalogDelegatingStorage:
    def __init__(self, legacy_storage: Any, catalog_storage: Any) -> None:
        self._legacy_storage = legacy_storage
        self._catalog_storage = catalog_storage

    def __getattr__(self, name: str) -> Callable[..., Any]:
        if name in CATALOG_METHODS:
            return getattr(self._catalog_storage, name)
        return getattr(self._legacy_storage, name)
