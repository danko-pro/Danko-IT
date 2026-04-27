from __future__ import annotations

from aiogram import Router

from supply_bot.handlers.admin_catalog_family_routes import register_admin_catalog_family_routes
from supply_bot.handlers.admin_catalog_variant_routes import register_admin_catalog_variant_routes


def register_admin_catalog_routes(
    router: Router,
    *,
    storage,
    reject_non_admin,
    render,
    render_family_view_by_id,
    render_variant_view_by_id,
    sort_dialog_fields,
    back_only_keyboard_fn,
) -> None:
    register_admin_catalog_family_routes(
        router,
        storage=storage,
        reject_non_admin=reject_non_admin,
        render=render,
        render_family_view_by_id=render_family_view_by_id,
        sort_dialog_fields=sort_dialog_fields,
        back_only_keyboard_fn=back_only_keyboard_fn,
    )
    register_admin_catalog_variant_routes(
        router,
        storage=storage,
        reject_non_admin=reject_non_admin,
        render=render,
        render_variant_view_by_id=render_variant_view_by_id,
        back_only_keyboard_fn=back_only_keyboard_fn,
    )
