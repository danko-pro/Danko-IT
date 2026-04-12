from __future__ import annotations

from collections.abc import Awaitable, Callable

from aiogram import F, Router
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, InlineKeyboardMarkup, Message

from supply_bot.keyboards.admin import (
    catalog_keyboard,
    dialog_fields_keyboard,
    families_keyboard,
    family_field_selection_keyboard,
    unit_selection_keyboard,
    variants_keyboard,
    wizard_confirm_keyboard,
)
from supply_bot.states import FamilyCreateStates, VariantCreateStates

AdminEvent = Message | CallbackQuery
RejectNonAdmin = Callable[[AdminEvent], Awaitable[bool]]
RenderFn = Callable[..., Awaitable[None]]
RenderByIdFn = Callable[[AdminEvent, int], Awaitable[None]]
SortDialogFieldsFn = Callable[[list[str]], list[str]]
BackOnlyKeyboardFn = Callable[[str], InlineKeyboardMarkup]


def register_admin_catalog_routes(
    router: Router,
    *,
    storage,
    reject_non_admin: RejectNonAdmin,
    render: RenderFn,
    render_family_view_by_id: RenderByIdFn,
    render_variant_view_by_id: RenderByIdFn,
    sort_dialog_fields: SortDialogFieldsFn,
    back_only_keyboard_fn: BackOnlyKeyboardFn,
) -> None:
    # Catalog, family and variant routes stay separate from SKU and alias flows.
    @router.callback_query(F.data == "adm:catalog")
    async def catalog_root(callback: CallbackQuery, state: FSMContext) -> None:
        if await reject_non_admin(callback):
            return
        await state.clear()
        await render(
            callback,
            "Каталог материалов\n\nЗдесь можно создавать семейства, варианты, SKU и алиасы.",
            reply_markup=catalog_keyboard(),
        )

    @router.callback_query(F.data == "cat:families")
    async def families_list(callback: CallbackQuery, state: FSMContext) -> None:
        if await reject_non_admin(callback):
            return
        await state.clear()
        families = await storage.list_families()
        await render(
            callback,
            "Семейства материалов\n\nВыберите семейство для просмотра и редактирования.",
            reply_markup=families_keyboard(families),
        )

    @router.callback_query(F.data.startswith("fam:view:"))
    async def family_view(callback: CallbackQuery, state: FSMContext) -> None:
        if await reject_non_admin(callback):
            return
        await state.clear()
        family_id = int(callback.data.split(":")[-1])
        await render_family_view_by_id(callback, family_id)

    @router.callback_query(F.data.startswith("fam:toggle:"))
    async def family_toggle(callback: CallbackQuery) -> None:
        if await reject_non_admin(callback):
            return
        family_id = int(callback.data.split(":")[-1])
        family = await storage.get_family(family_id)
        if family is None:
            await callback.answer("Семейство не найдено.", show_alert=True)
            return
        await storage.set_family_active(family_id, is_active=not bool(family["is_active"]))
        await render_family_view_by_id(callback, family_id)

    @router.callback_query(F.data == "cat:add_family")
    async def family_create_start(callback: CallbackQuery, state: FSMContext) -> None:
        if await reject_non_admin(callback):
            return
        await state.clear()
        await state.set_state(FamilyCreateStates.name)
        await render(
            callback,
            "Шаг 1 из 4\n\nВведите название семейства.\nПример: Гипсокартон",
        )

    @router.message(FamilyCreateStates.name)
    async def family_create_name(message: Message, state: FSMContext) -> None:
        if await reject_non_admin(message):
            return
        await state.update_data(name=message.text.strip())
        await state.set_state(FamilyCreateStates.unit)
        await render(
            message,
            "Шаг 2 из 4\n\nВыберите единицу по умолчанию.",
            reply_markup=unit_selection_keyboard("wiz:family:unit"),
        )

    @router.callback_query(F.data.startswith("wiz:family:unit:"), FamilyCreateStates.unit)
    async def family_create_unit(callback: CallbackQuery, state: FSMContext) -> None:
        if await reject_non_admin(callback):
            return
        unit = callback.data.split(":")[-1]
        if unit == "back":
            await state.set_state(FamilyCreateStates.name)
            await render(callback, "Шаг 1 из 4\n\nВведите название семейства.\nПример: Гипсокартон")
            return
        await state.update_data(unit=unit, fields=[])
        await state.set_state(FamilyCreateStates.fields)
        await render(
            callback,
            "Шаг 3 из 4\n\nКакие поля бот должен обязательно уточнять у мастера?",
            reply_markup=family_field_selection_keyboard([]),
        )

    @router.callback_query(F.data.startswith("wiz:family:field:"), FamilyCreateStates.fields)
    async def family_create_fields(callback: CallbackQuery, state: FSMContext) -> None:
        if await reject_non_admin(callback):
            return
        action = callback.data.split(":")[-1]
        data = await state.get_data()
        selected = list(data.get("fields", []))
        if action == "back":
            await state.set_state(FamilyCreateStates.unit)
            await render(
                callback,
                "Шаг 2 из 4\n\nВыберите единицу по умолчанию.",
                reply_markup=unit_selection_keyboard("wiz:family:unit"),
            )
            return
        if action == "done":
            selected = sort_dialog_fields(selected)
            await state.update_data(fields=selected)
            await state.set_state(FamilyCreateStates.confirm)
            summary = (
                "Шаг 4 из 4\n\n"
                f"Название: {data['name']}\n"
                f"Единица: {data['unit']}\n"
                f"Поля диалога: {', '.join(selected) or 'не выбраны'}"
            )
            await render(
                callback,
                summary,
                reply_markup=wizard_confirm_keyboard("wiz:family:save", "wiz:family:confirm:back"),
            )
            return
        if action in selected:
            selected.remove(action)
        else:
            selected.append(action)
        selected = sort_dialog_fields(selected)
        await state.update_data(fields=selected)
        await render(
            callback,
            "Шаг 3 из 4\n\nКакие поля бот должен обязательно уточнять у мастера?",
            reply_markup=family_field_selection_keyboard(selected),
        )

    @router.callback_query(F.data == "wiz:family:confirm:back", FamilyCreateStates.confirm)
    async def family_create_confirm_back(callback: CallbackQuery, state: FSMContext) -> None:
        if await reject_non_admin(callback):
            return
        data = await state.get_data()
        await state.set_state(FamilyCreateStates.fields)
        await render(
            callback,
            "Шаг 3 из 4\n\nКакие поля бот должен обязательно уточнять у мастера?",
            reply_markup=family_field_selection_keyboard(list(data.get("fields", []))),
        )

    @router.callback_query(F.data == "wiz:family:save", FamilyCreateStates.confirm)
    async def family_create_save(callback: CallbackQuery, state: FSMContext) -> None:
        if await reject_non_admin(callback):
            return
        data = await state.get_data()
        family_id = await storage.create_family(
            canonical_name=data["name"],
            default_unit=data["unit"],
            dialog_fields=list(data.get("fields", [])),
        )
        await state.clear()
        await callback.answer("Семейство создано.")
        await render_family_view_by_id(callback, family_id)

    @router.callback_query(F.data.startswith("fam:fields:"))
    async def family_fields(callback: CallbackQuery) -> None:
        if await reject_non_admin(callback):
            return
        family_id = int(callback.data.split(":")[-1])
        family = await storage.get_family(family_id)
        if family is None:
            await callback.answer("Семейство не найдено.", show_alert=True)
            return
        text = (
            f"Поля диалога для семейства '{family['canonical_name']}'\n\n"
            "Выберите обязательные поля для уточнения у мастера."
        )
        await render(
            callback,
            text,
            reply_markup=dialog_fields_keyboard(family_id, list(family["dialog_fields"])),
        )

    @router.callback_query(F.data.startswith("fam:field:"))
    async def family_fields_toggle(callback: CallbackQuery) -> None:
        if await reject_non_admin(callback):
            return
        _, _, family_id_raw, field_code = callback.data.split(":")
        family_id = int(family_id_raw)
        family = await storage.get_family(family_id)
        if family is None:
            await callback.answer("Семейство не найдено.", show_alert=True)
            return
        selected = list(family["dialog_fields"])
        if field_code in selected:
            selected.remove(field_code)
        else:
            selected.append(field_code)
        selected = sort_dialog_fields(selected)
        await storage.update_family_dialog_fields(family_id, selected)
        family = await storage.get_family(family_id)
        await render(
            callback,
            f"Поля диалога для семейства '{family['canonical_name']}'\n\nВыберите обязательные поля.",
            reply_markup=dialog_fields_keyboard(family_id, list(family["dialog_fields"])),
        )

    @router.callback_query(F.data.startswith("fam:fieldsave:"))
    async def family_fields_save(callback: CallbackQuery) -> None:
        if await reject_non_admin(callback):
            return
        family_id = int(callback.data.split(":")[-1])
        await render_family_view_by_id(callback, family_id)

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
