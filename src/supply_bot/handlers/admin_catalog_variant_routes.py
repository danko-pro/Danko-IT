from __future__ import annotations

from aiogram import F, Router
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message

from supply_bot.keyboards.admin import variants_keyboard, wizard_confirm_keyboard
from supply_bot.states import VariantCreateStates


def register_admin_catalog_variant_routes(
    router: Router,
    *,
    storage,
    reject_non_admin,
    render,
    render_variant_view_by_id,
    back_only_keyboard_fn,
) -> None:
    @router.callback_query(F.data.startswith("fam:variants:"))
    async def variants_list(callback: CallbackQuery, state: FSMContext) -> None:
        if await reject_non_admin(callback):
            return
        await state.clear()
        family_id = int(callback.data.split(":")[-1])
        variants = await storage.list_variants(family_id)
        await render(
            callback,
            "Варианты семейства\n\nВыберите вариант для просмотра или добавьте новый.",
            reply_markup=variants_keyboard(family_id, variants),
        )

    @router.callback_query(F.data.startswith("fam:add_variant:"))
    async def variant_create_start(callback: CallbackQuery, state: FSMContext) -> None:
        if await reject_non_admin(callback):
            return
        family_id = int(callback.data.split(":")[-1])
        await state.clear()
        await state.set_state(VariantCreateStates.name)
        await state.update_data(family_id=family_id)
        await render(
            callback,
            "Введите название варианта.\nПример: Влагостойкий",
            reply_markup=back_only_keyboard_fn(f"fam:variants:{family_id}"),
        )

    @router.message(VariantCreateStates.name)
    async def variant_create_name(message: Message, state: FSMContext) -> None:
        if await reject_non_admin(message):
            return
        await state.update_data(name=message.text.strip())
        await state.set_state(VariantCreateStates.confirm)
        data = await state.get_data()
        await render(
            message,
            f"Проверьте вариант перед сохранением.\n\nНазвание: {data['name']}",
            reply_markup=wizard_confirm_keyboard("wiz:variant:save", "wiz:variant:back"),
        )

    @router.callback_query(F.data == "wiz:variant:back", VariantCreateStates.confirm)
    async def variant_create_back(callback: CallbackQuery, state: FSMContext) -> None:
        if await reject_non_admin(callback):
            return
        await state.set_state(VariantCreateStates.name)
        await render(callback, "Введите название варианта.\nПример: Влагостойкий")

    @router.callback_query(F.data == "wiz:variant:save", VariantCreateStates.confirm)
    async def variant_create_save(callback: CallbackQuery, state: FSMContext) -> None:
        if await reject_non_admin(callback):
            return
        data = await state.get_data()
        variant_id = await storage.create_variant(data["family_id"], data["name"])
        await state.clear()
        await render_variant_view_by_id(callback, variant_id)

    @router.callback_query(F.data.startswith("var:view:"))
    async def variant_view(callback: CallbackQuery, state: FSMContext) -> None:
        if await reject_non_admin(callback):
            return
        await state.clear()
        variant_id = int(callback.data.split(":")[-1])
        await render_variant_view_by_id(callback, variant_id)

    @router.callback_query(F.data.startswith("var:toggle:"))
    async def variant_toggle(callback: CallbackQuery) -> None:
        if await reject_non_admin(callback):
            return
        variant_id = int(callback.data.split(":")[-1])
        variant = await storage.get_variant(variant_id)
        if variant is None:
            await callback.answer("Вариант не найден.", show_alert=True)
            return
        await storage.set_variant_active(variant_id, is_active=not bool(variant["is_active"]))
        await render_variant_view_by_id(callback, variant_id)
