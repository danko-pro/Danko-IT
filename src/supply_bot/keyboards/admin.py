from __future__ import annotations

# Compatibility facade: route modules continue importing from one place,
# while the concrete keyboards are split by functional area.
from supply_bot.keyboards.admin_catalog_keyboards import (
    aliases_keyboard,
    catalog_keyboard,
    dialog_fields_keyboard,
    families_keyboard,
    family_view_keyboard,
    sku_view_keyboard,
    skus_keyboard,
    variant_view_keyboard,
    variants_keyboard,
)
from supply_bot.keyboards.admin_root_keyboards import (
    admin_root_keyboard,
    delivery_hours_keyboard,
    request_stale_reset_confirm_keyboard,
    requests_maintenance_keyboard,
    settings_keyboard,
)
from supply_bot.keyboards.admin_support_keyboards import (
    search_results_keyboard,
    unknown_view_keyboard,
    unknowns_keyboard,
)
from supply_bot.keyboards.admin_wizard_keyboards import (
    family_field_selection_keyboard,
    unit_selection_keyboard,
    wizard_confirm_keyboard,
)

__all__ = [
    "admin_root_keyboard",
    "aliases_keyboard",
    "catalog_keyboard",
    "delivery_hours_keyboard",
    "dialog_fields_keyboard",
    "families_keyboard",
    "family_field_selection_keyboard",
    "family_view_keyboard",
    "search_results_keyboard",
    "request_stale_reset_confirm_keyboard",
    "requests_maintenance_keyboard",
    "settings_keyboard",
    "skus_keyboard",
    "sku_view_keyboard",
    "unit_selection_keyboard",
    "unknown_view_keyboard",
    "unknowns_keyboard",
    "variant_view_keyboard",
    "variants_keyboard",
    "wizard_confirm_keyboard",
]
