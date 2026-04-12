from __future__ import annotations

from collections.abc import Awaitable, Callable

from aiogram import F, Router
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message

from supply_bot.keyboards.admin import wizard_confirm_keyboard
from supply_bot.states import AliasCreateStates

AdminEvent = Message | CallbackQuery
RejectNonAdmin = Callable[[AdminEvent], Awaitable[bool]]
RenderFn = Callable[..., Awaitable[None]]
RenderAliasesByTargetFn = Callable[[AdminEvent, str, int], Awaitable[None]]


def register_admin_alias_routes(
    router: Router,
    *,
    storage,
    reject_non_admin: RejectNonAdmin,
    render: RenderFn,
    render_aliases_by_target: RenderAliasesByTargetFn,
) -> None:
    # Alias routes stay separate from the SKU wizard because they are a self-contained flow.
    @router.callback_query(F.data.startswith(("fam:aliases:", "var:aliases:", "sku:aliases:")))
    async def aliases_list(callback: CallbackQuery, state: FSMContext) -> None:
        if await reject_non_admin(callback):
            return
        await state.clear()
        target_prefix, _, target_id_raw = callback.data.split(":")
        target_id = int(target_id_raw)
        await render_aliases_by_target(callback, target_prefix, target_id)

    @router.callback_query(F.data.startswith(("fam:add_alias:", "var:add_alias:", "sku:add_alias:")))
    async def alias_create_start(callback: CallbackQuery, state: FSMContext) -> None:
        if await reject_non_admin(callback):
            return
        parts = callback.data.split(":")
        target_prefix = parts[0]
        target_id_raw = parts[-1]
        await state.clear()
        await state.set_state(AliasCreateStates.value)
        await state.update_data(target_prefix=target_prefix, target_id=int(target_id_raw))
        await render(callback, "Введите алиас, как мастера называют этот материал.")

    @router.message(AliasCreateStates.value)
    async def alias_create_value(message: Message, state: FSMContext) -> None:
        if await reject_non_admin(message):
            return
        await state.update_data(alias=message.text.strip())
        await state.set_state(AliasCreateStates.confirm)
        await render(
            message,
            f"Проверьте алиас перед сохранением.\n\n{message.text.strip()}",
            reply_markup=wizard_confirm_keyboard("wiz:alias:save", "wiz:alias:back"),
        )

    @router.callback_query(F.data == "wiz:alias:back", AliasCreateStates.confirm)
    async def alias_create_back(callback: CallbackQuery, state: FSMContext) -> None:
        if await reject_non_admin(callback):
            return
        await state.set_state(AliasCreateStates.value)
        await render(callback, "Введите алиас, как мастера называют этот материал.")

    @router.callback_query(F.data == "wiz:alias:save", AliasCreateStates.confirm)
    async def alias_create_save(callback: CallbackQuery, state: FSMContext) -> None:
        if await reject_non_admin(callback):
            return
        data = await state.get_data()
        target_prefix = data["target_prefix"]
        target_id = int(data["target_id"])
        alias = data["alias"]
        family_id = variant_id = sku_id = None
        back_callback = "adm:catalog"
        if target_prefix == "fam":
            family_id = target_id
            back_callback = f"fam:aliases:{target_id}"
        elif target_prefix == "var":
            variant = await storage.get_variant(target_id)
            if variant:
                family_id = variant["family_id"]
                variant_id = target_id
                back_callback = f"var:aliases:{target_id}"
        elif target_prefix == "sku":
            sku = await storage.get_sku(target_id)
            if sku:
                family_id = sku["family_id"]
                variant_id = sku.get("variant_id")
                sku_id = target_id
                back_callback = f"sku:aliases:{target_id}"
        await storage.create_alias(alias, family_id=family_id, variant_id=variant_id, sku_id=sku_id)
        await state.clear()
        target_prefix = back_callback.split(":")[0]
        target_id = int(back_callback.split(":")[-1])
        await render_aliases_by_target(callback, target_prefix, target_id)

    @router.callback_query(F.data.startswith("alias:toggle:"))
    async def alias_toggle(callback: CallbackQuery) -> None:
        if await reject_non_admin(callback):
            return
        _, _, alias_id_raw, target_prefix, target_id_raw = callback.data.split(":")
        alias_id = int(alias_id_raw)
        target_id = int(target_id_raw)
        alias_rows = []
        if target_prefix == "fam":
            alias_rows = await storage.list_aliases(family_id=target_id)
        elif target_prefix == "var":
            alias_rows = await storage.list_aliases(variant_id=target_id)
        else:
            alias_rows = await storage.list_aliases(sku_id=target_id)
        current = next((row for row in alias_rows if row["id"] == alias_id), None)
        if current is None:
            await callback.answer("Алиас не найден.", show_alert=True)
            return
        await storage.set_alias_active(alias_id, is_active=not bool(current["is_active"]))
        await render_aliases_by_target(callback, target_prefix, target_id)
