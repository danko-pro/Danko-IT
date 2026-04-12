from __future__ import annotations

from aiogram import F, Router
from aiogram.enums import ChatType
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message

from supply_bot.config import Settings
from supply_bot.handlers.admin_alias_routes import register_admin_alias_routes
from supply_bot.handlers.admin_catalog_routes import register_admin_catalog_routes
from supply_bot.handlers.admin_router_helpers import build_admin_router_helpers
from supply_bot.handlers.admin_sku_routes import register_admin_sku_routes
from supply_bot.handlers.admin_support_routes import register_admin_support_routes
from supply_bot.keyboards.admin import admin_root_keyboard
from supply_bot.storage import BotStorage
from supply_bot.utils import parse_float


def build_admin_router(settings: Settings, storage: BotStorage) -> Router:
    router = Router(name="admin")
    router.message.filter(F.chat.type == ChatType.PRIVATE)
    router.callback_query.filter(F.message.chat.type == ChatType.PRIVATE)

    # Shared admin helpers are built once and passed into route modules.
    helpers = build_admin_router_helpers(settings, storage)

    register_admin_support_routes(
        router,
        settings=settings,
        storage=storage,
        reject_non_admin=helpers.reject_non_admin,
        render=helpers.render,
        render_family_view_by_id=helpers.render_family_view_by_id,
        render_variant_view_by_id=helpers.render_variant_view_by_id,
        render_sku_view_by_id=helpers.render_sku_view_by_id,
        render_unknown_list=helpers.render_unknown_list,
        family_choice_keyboard_fn=helpers.family_choice_keyboard,
        back_only_keyboard_fn=helpers.back_only_keyboard,
        get_delivery_defaults=helpers.get_delivery_defaults,
        validate_delivery_defaults=helpers.validate_delivery_defaults,
        render_delivery_hours=helpers.render_delivery_hours,
    )
    register_admin_catalog_routes(
        router,
        storage=storage,
        reject_non_admin=helpers.reject_non_admin,
        render=helpers.render,
        render_family_view_by_id=helpers.render_family_view_by_id,
        render_variant_view_by_id=helpers.render_variant_view_by_id,
        sort_dialog_fields=helpers.sort_dialog_fields,
        back_only_keyboard_fn=helpers.back_only_keyboard,
    )
    register_admin_alias_routes(
        router,
        storage=storage,
        reject_non_admin=helpers.reject_non_admin,
        render=helpers.render,
        render_aliases_by_target=helpers.render_aliases_by_target,
    )
    register_admin_sku_routes(
        router,
        storage=storage,
        reject_non_admin=helpers.reject_non_admin,
        render=helpers.render,
        render_sku_view_by_id=helpers.render_sku_view_by_id,
        family_choice_keyboard_fn=helpers.family_choice_keyboard,
        variant_choice_keyboard_fn=helpers.variant_choice_keyboard,
        parse_float_fn=parse_float,
    )

    @router.message(Command("start", "admin"))
    @router.message(F.text.regexp(r"^/(start|admin)(?:@\w+)?$"))
    async def admin_entry(message: Message, state: FSMContext) -> None:
        if await helpers.reject_non_admin(message):
            return
        await state.clear()
        await helpers.render(
            message,
            "Панель администратора\n\nЧто хотите сделать?",
            reply_markup=admin_root_keyboard(),
        )

    @router.callback_query(F.data == "adm:root")
    async def admin_root(callback: CallbackQuery, state: FSMContext) -> None:
        if await helpers.reject_non_admin(callback):
            return
        await state.clear()
        await helpers.render(
            callback,
            "Панель администратора\n\nЧто хотите сделать?",
            reply_markup=admin_root_keyboard(),
        )

    return router
