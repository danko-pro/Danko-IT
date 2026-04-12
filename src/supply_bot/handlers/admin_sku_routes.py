from __future__ import annotations

from collections.abc import Awaitable, Callable

from aiogram import F, Router
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, InlineKeyboardMarkup, Message

from supply_bot.keyboards.admin import (
    sku_view_keyboard,
    skus_keyboard,
    unit_selection_keyboard,
    wizard_confirm_keyboard,
)
from supply_bot.states import SkuCreateStates

AdminEvent = Message | CallbackQuery
RejectNonAdmin = Callable[[AdminEvent], Awaitable[bool]]
RenderFn = Callable[..., Awaitable[None]]
RenderByIdFn = Callable[[AdminEvent, int], Awaitable[None]]
FamilyChoiceKeyboardFn = Callable[..., InlineKeyboardMarkup]
VariantChoiceKeyboardFn = Callable[..., InlineKeyboardMarkup]
ParseFloatFn = Callable[[str], float]


def register_admin_sku_routes(
    router: Router,
    *,
    storage,
    reject_non_admin: RejectNonAdmin,
    render: RenderFn,
    render_sku_view_by_id: RenderByIdFn,
    family_choice_keyboard_fn: FamilyChoiceKeyboardFn,
    variant_choice_keyboard_fn: VariantChoiceKeyboardFn,
    parse_float_fn: ParseFloatFn,
) -> None:
    # SKU wizard stays separate because it is the heaviest step-by-step admin flow.
    @router.callback_query(F.data.startswith("fam:skus:"))
    async def family_skus(callback: CallbackQuery, state: FSMContext) -> None:
        if await reject_non_admin(callback):
            return
        await state.clear()
        family_id = int(callback.data.split(":")[-1])
        skus = await storage.list_skus(family_id=family_id)
        await render(
            callback,
            "SKU семейства\n\nВыберите позицию для просмотра или добавьте новую.",
            reply_markup=skus_keyboard(family_id, skus),
        )

    @router.callback_query(F.data == "cat:add_sku")
    async def sku_create_choose_family(callback: CallbackQuery, state: FSMContext) -> None:
        if await reject_non_admin(callback):
            return
        families = await storage.list_families()
        await state.clear()
        await state.set_state(SkuCreateStates.family)
        await render(
            callback,
            "Шаг 1 из 8\n\nВыберите семейство для новой позиции.",
            reply_markup=family_choice_keyboard_fn(families, "wiz:sku:family", back_callback="adm:catalog"),
        )

    @router.callback_query(F.data.startswith("fam:add_sku:"))
    async def sku_create_from_family(callback: CallbackQuery, state: FSMContext) -> None:
        if await reject_non_admin(callback):
            return
        family_id = int(callback.data.split(":")[-1])
        await state.clear()
        await state.set_state(SkuCreateStates.variant)
        await state.update_data(family_id=family_id)
        variants = await storage.list_variants(family_id)
        await render(
            callback,
            "Шаг 2 из 8\n\nВыберите вариант или пропустите шаг.",
            reply_markup=variant_choice_keyboard_fn(
                variants,
                "wiz:sku:variant",
                back_callback=f"fam:view:{family_id}",
            ),
        )

    @router.callback_query(F.data.startswith("wiz:sku:family:"), SkuCreateStates.family)
    async def sku_create_family(callback: CallbackQuery, state: FSMContext) -> None:
        if await reject_non_admin(callback):
            return
        family_id = int(callback.data.split(":")[-1])
        await state.update_data(family_id=family_id)
        await state.set_state(SkuCreateStates.variant)
        variants = await storage.list_variants(family_id)
        await render(
            callback,
            "Шаг 2 из 8\n\nВыберите вариант или пропустите шаг.",
            reply_markup=variant_choice_keyboard_fn(variants, "wiz:sku:variant", back_callback="adm:catalog"),
        )

    @router.callback_query(F.data.startswith("wiz:sku:variant:"), SkuCreateStates.variant)
    async def sku_create_variant(callback: CallbackQuery, state: FSMContext) -> None:
        if await reject_non_admin(callback):
            return
        variant_token = callback.data.split(":")[-1]
        variant_id = None if variant_token == "none" else int(variant_token)
        await state.update_data(variant_id=variant_id)
        await state.set_state(SkuCreateStates.title)
        await render(
            callback,
            "Шаг 3 из 8\n\nВведите полное название позиции.",
        )

    @router.message(SkuCreateStates.title)
    async def sku_create_title(message: Message, state: FSMContext) -> None:
        if await reject_non_admin(message):
            return
        await state.update_data(title=message.text.strip())
        await state.set_state(SkuCreateStates.article)
        await render(message, "Шаг 4 из 8\n\nВведите артикул поставщика или отправьте '-'.")

    @router.message(SkuCreateStates.article)
    async def sku_create_article(message: Message, state: FSMContext) -> None:
        if await reject_non_admin(message):
            return
        article = message.text.strip()
        await state.update_data(article=None if article == "-" else article)
        await state.set_state(SkuCreateStates.brand)
        await render(message, "Шаг 5 из 8\n\nВведите бренд или отправьте '-'.")

    @router.message(SkuCreateStates.brand)
    async def sku_create_brand(message: Message, state: FSMContext) -> None:
        if await reject_non_admin(message):
            return
        brand = message.text.strip()
        await state.update_data(brand=None if brand == "-" else brand)
        await state.set_state(SkuCreateStates.thickness)
        await render(message, "Шаг 6 из 8\n\nВведите толщину в мм или отправьте '-'.")

    @router.message(SkuCreateStates.thickness)
    async def sku_create_thickness(message: Message, state: FSMContext) -> None:
        if await reject_non_admin(message):
            return
        value = message.text.strip()
        await state.update_data(thickness=None if value == "-" else parse_float_fn(value))
        await state.set_state(SkuCreateStates.length)
        await render(message, "Шаг 7 из 8\n\nВведите длину в мм или отправьте '-'.")

    @router.message(SkuCreateStates.length)
    async def sku_create_length(message: Message, state: FSMContext) -> None:
        if await reject_non_admin(message):
            return
        value = message.text.strip()
        await state.update_data(length=None if value == "-" else parse_float_fn(value))
        await state.set_state(SkuCreateStates.width)
        await render(message, "Шаг 8 из 8\n\nВведите ширину в мм или отправьте '-'.")

    @router.message(SkuCreateStates.width)
    async def sku_create_width(message: Message, state: FSMContext) -> None:
        if await reject_non_admin(message):
            return
        value = message.text.strip()
        await state.update_data(width=None if value == "-" else parse_float_fn(value))
        await state.set_state(SkuCreateStates.unit)
        await render(
            message,
            "Выберите единицу заказа.",
            reply_markup=unit_selection_keyboard("wiz:sku:unit"),
        )

    @router.callback_query(F.data.startswith("wiz:sku:unit:"), SkuCreateStates.unit)
    async def sku_create_unit(callback: CallbackQuery, state: FSMContext) -> None:
        if await reject_non_admin(callback):
            return
        unit = callback.data.split(":")[-1]
        if unit == "back":
            await state.set_state(SkuCreateStates.width)
            await render(callback, "Введите ширину в мм или отправьте '-'.")
            return
        await state.update_data(unit=unit)
        await state.set_state(SkuCreateStates.confirm)
        data = await state.get_data()
        summary = (
            "Проверьте позицию перед сохранением.\n\n"
            f"Название: {data['title']}\n"
            f"Артикул: {data.get('article') or '-'}\n"
            f"Бренд: {data.get('brand') or '-'}\n"
            f"Толщина: {data.get('thickness') or '-'}\n"
            f"Длина: {data.get('length') or '-'}\n"
            f"Ширина: {data.get('width') or '-'}\n"
            f"Единица: {data['unit']}"
        )
        await render(
            callback,
            summary,
            reply_markup=wizard_confirm_keyboard("wiz:sku:save", "wiz:sku:confirm:back"),
        )

    @router.callback_query(F.data == "wiz:sku:confirm:back", SkuCreateStates.confirm)
    async def sku_create_confirm_back(callback: CallbackQuery, state: FSMContext) -> None:
        if await reject_non_admin(callback):
            return
        await state.set_state(SkuCreateStates.unit)
        await render(
            callback,
            "Выберите единицу заказа.",
            reply_markup=unit_selection_keyboard("wiz:sku:unit"),
        )

    @router.callback_query(F.data == "wiz:sku:save", SkuCreateStates.confirm)
    async def sku_create_save(callback: CallbackQuery, state: FSMContext) -> None:
        if await reject_non_admin(callback):
            return
        data = await state.get_data()
        sku_id = await storage.create_sku(
            family_id=data["family_id"],
            variant_id=data.get("variant_id"),
            title=data["title"],
            article=data.get("article"),
            brand=data.get("brand"),
            unit=data["unit"],
            thickness_mm=data.get("thickness"),
            length_mm=data.get("length"),
            width_mm=data.get("width"),
        )
        await state.clear()
        sku = await storage.get_sku(sku_id)
        await render(
            callback,
            f"{sku['title']}\n\nАртикул: {sku.get('supplier_article') or '-'}\nЕдиница: {sku['unit']}",
            reply_markup=sku_view_keyboard(sku["family_id"], sku_id, is_active=bool(sku["is_active"])),
        )

    @router.callback_query(F.data.startswith("sku:view:"))
    async def sku_view(callback: CallbackQuery, state: FSMContext) -> None:
        if await reject_non_admin(callback):
            return
        await state.clear()
        sku_id = int(callback.data.split(":")[-1])
        await render_sku_view_by_id(callback, sku_id)

    @router.callback_query(F.data.startswith("sku:toggle:"))
    async def sku_toggle(callback: CallbackQuery) -> None:
        if await reject_non_admin(callback):
            return
        sku_id = int(callback.data.split(":")[-1])
        sku = await storage.get_sku(sku_id)
        if sku is None:
            await callback.answer("SKU не найден.", show_alert=True)
            return
        await storage.set_sku_active(sku_id, is_active=not bool(sku["is_active"]))
        await render_sku_view_by_id(callback, sku_id)
