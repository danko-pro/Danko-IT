from __future__ import annotations

from collections.abc import Awaitable, Callable
from dataclasses import dataclass

from aiogram.types import CallbackQuery, InlineKeyboardMarkup, Message
from aiogram.utils.keyboard import InlineKeyboardBuilder

from supply_bot.config import Settings
from supply_bot.constants import FIELD_ORDER
from supply_bot.keyboards.admin import (
    aliases_keyboard,
    delivery_hours_keyboard,
    family_view_keyboard,
    sku_view_keyboard,
    unknowns_keyboard,
    variant_view_keyboard,
)
from supply_bot.storage import BotStorage
from supply_bot.utils import parse_time_value

AdminEvent = Message | CallbackQuery
RejectNonAdmin = Callable[[AdminEvent], Awaitable[bool]]
RenderFn = Callable[..., Awaitable[None]]
RenderByIdFn = Callable[[AdminEvent, int], Awaitable[None]]
RenderAliasesByTargetFn = Callable[[AdminEvent, str, int], Awaitable[None]]
RenderUnknownListFn = Callable[[AdminEvent], Awaitable[None]]
DeliveryDefaultsFn = Callable[[], Awaitable[dict[str, str]]]
ValidateDeliveryDefaultsFn = Callable[[dict[str, str]], str | None]
RenderDeliveryHoursFn = Callable[[AdminEvent], Awaitable[None]]
FamilyChoiceKeyboardFn = Callable[..., InlineKeyboardMarkup]
VariantChoiceKeyboardFn = Callable[..., InlineKeyboardMarkup]
BackOnlyKeyboardFn = Callable[[str], InlineKeyboardMarkup]
SortDialogFieldsFn = Callable[[list[str]], list[str]]


@dataclass(slots=True)
class AdminRouterHelpers:
    reject_non_admin: RejectNonAdmin
    render: RenderFn
    family_choice_keyboard: FamilyChoiceKeyboardFn
    variant_choice_keyboard: VariantChoiceKeyboardFn
    back_only_keyboard: BackOnlyKeyboardFn
    sort_dialog_fields: SortDialogFieldsFn
    render_family_view_by_id: RenderByIdFn
    render_variant_view_by_id: RenderByIdFn
    render_sku_view_by_id: RenderByIdFn
    render_aliases_by_target: RenderAliasesByTargetFn
    render_unknown_list: RenderUnknownListFn
    get_delivery_defaults: DeliveryDefaultsFn
    validate_delivery_defaults: ValidateDeliveryDefaultsFn
    render_delivery_hours: RenderDeliveryHoursFn


def build_admin_router_helpers(settings: Settings, storage: BotStorage) -> AdminRouterHelpers:
    async def reject_non_admin(_: Message | CallbackQuery) -> bool:
        # Current admin policy intentionally allows all private users.
        return False

    async def render(
        target: Message | CallbackQuery,
        text: str,
        *,
        reply_markup: InlineKeyboardMarkup | None = None,
    ) -> None:
        if isinstance(target, CallbackQuery):
            await target.message.edit_text(text, reply_markup=reply_markup)
            await target.answer()
        else:
            await target.answer(text, reply_markup=reply_markup)

    def family_choice_keyboard(families: list[dict], prefix: str, *, back_callback: str) -> InlineKeyboardMarkup:
        builder = InlineKeyboardBuilder()
        for family in families[:20]:
            builder.button(text=family["canonical_name"], callback_data=f"{prefix}:{family['id']}")
        builder.button(text="Назад", callback_data=back_callback)
        builder.adjust(1)
        return builder.as_markup()

    def variant_choice_keyboard(variants: list[dict], prefix: str, *, back_callback: str) -> InlineKeyboardMarkup:
        builder = InlineKeyboardBuilder()
        for variant in variants[:20]:
            builder.button(text=variant["display_name"], callback_data=f"{prefix}:{variant['id']}")
        builder.button(text="Без варианта", callback_data=f"{prefix}:none")
        builder.button(text="Назад", callback_data=back_callback)
        builder.adjust(1)
        return builder.as_markup()

    def back_only_keyboard(callback_data: str) -> InlineKeyboardMarkup:
        builder = InlineKeyboardBuilder()
        builder.button(text="Назад", callback_data=callback_data)
        builder.adjust(1)
        return builder.as_markup()

    def sort_dialog_fields(fields: list[str]) -> list[str]:
        order = {code: index for index, code in enumerate(FIELD_ORDER)}
        return sorted(fields, key=lambda item: order.get(item, 999))

    async def render_family_view_by_id(target: Message | CallbackQuery, family_id: int) -> None:
        family = await storage.get_family(family_id)
        if family is None:
            if isinstance(target, CallbackQuery):
                await target.answer("Семейство не найдено.", show_alert=True)
            else:
                await target.answer("Семейство не найдено.")
            return
        variants = await storage.list_variants(family_id)
        skus = await storage.list_skus(family_id=family_id)
        aliases = await storage.list_aliases(family_id=family_id)
        fields = ", ".join(family["dialog_fields"]) or "не заданы"
        text = (
            f"{family['canonical_name']}\n\n"
            f"Единица по умолчанию: {family['default_unit']}\n"
            f"Активно вариантов: {len(variants)}\n"
            f"Активно SKU: {len(skus)}\n"
            f"Алиасов: {len(aliases)}\n"
            f"Поля диалога: {fields}"
        )
        await render(
            target,
            text,
            reply_markup=family_view_keyboard(family_id, is_active=bool(family["is_active"])),
        )

    async def render_variant_view_by_id(target: Message | CallbackQuery, variant_id: int) -> None:
        variant = await storage.get_variant(variant_id)
        if variant is None:
            if isinstance(target, CallbackQuery):
                await target.answer("Вариант не найден.", show_alert=True)
            else:
                await target.answer("Вариант не найден.")
            return
        skus = await storage.list_skus(variant_id=variant_id)
        aliases = await storage.list_aliases(variant_id=variant_id)
        text = (
            f"{variant['display_name']}\n\n"
            f"Семейство ID: {variant['family_id']}\n"
            f"SKU: {len(skus)}\n"
            f"Алиасы: {len(aliases)}"
        )
        await render(
            target,
            text,
            reply_markup=variant_view_keyboard(variant["family_id"], variant_id, is_active=bool(variant["is_active"])),
        )

    async def render_sku_view_by_id(target: Message | CallbackQuery, sku_id: int) -> None:
        sku = await storage.get_sku(sku_id)
        if sku is None:
            if isinstance(target, CallbackQuery):
                await target.answer("SKU не найден.", show_alert=True)
            else:
                await target.answer("SKU не найден.")
            return
        text = (
            f"{sku['title']}\n\n"
            f"Артикул: {sku.get('supplier_article') or '-'}\n"
            f"Бренд: {sku.get('brand') or '-'}\n"
            f"Единица: {sku['unit']}"
        )
        await render(
            target,
            text,
            reply_markup=sku_view_keyboard(sku["family_id"], sku_id, is_active=bool(sku["is_active"])),
        )

    async def render_aliases_by_target(target: Message | CallbackQuery, target_prefix: str, target_id: int) -> None:
        if target_prefix == "fam":
            aliases = await storage.list_aliases(family_id=target_id)
            back_callback = f"fam:view:{target_id}"
        elif target_prefix == "var":
            aliases = await storage.list_aliases(variant_id=target_id)
            back_callback = f"var:view:{target_id}"
        else:
            aliases = await storage.list_aliases(sku_id=target_id)
            back_callback = f"sku:view:{target_id}"
        await render(
            target,
            "Алиасы\n\nВыберите запись для отключения или добавьте новую.",
            reply_markup=aliases_keyboard(target_prefix, target_id, aliases, back_callback=back_callback),
        )

    async def render_unknown_list(target: Message | CallbackQuery) -> None:
        items = await storage.list_unknown_terms()
        await render(
            target,
            "Неизвестные материалы\n\nВыберите запись для разбора.",
            reply_markup=unknowns_keyboard(items),
        )

    async def get_delivery_defaults() -> dict[str, str]:
        return await storage.get_delivery_defaults(
            {
                "delivery_start": settings.default_delivery_start.strftime("%H:%M"),
                "delivery_end": settings.default_delivery_end.strftime("%H:%M"),
                "delivery_fallback": settings.default_delivery_fallback.strftime("%H:%M"),
            }
        )

    def validate_delivery_defaults(values: dict[str, str]) -> str | None:
        try:
            start = parse_time_value(values["delivery_start"], default=settings.default_delivery_start)
            end = parse_time_value(values["delivery_end"], default=settings.default_delivery_end)
            fallback = parse_time_value(values["delivery_fallback"], default=settings.default_delivery_fallback)
        except ValueError:
            return "Время нужно указывать в формате ЧЧ:ММ, например 08:30."
        if start >= end:
            return "Начало окна доставки должно быть раньше конца."
        if fallback < start or fallback > end:
            return "Предлагаемый слот должен попадать в окно доставки."
        return None

    async def render_delivery_hours(target: Message | CallbackQuery) -> None:
        defaults = await get_delivery_defaults()
        text = (
            "Часы доставки\n\n"
            f"Начало окна: {defaults['delivery_start']}\n"
            f"Конец окна: {defaults['delivery_end']}\n"
            f"Предлагаемый слот: {defaults['delivery_fallback']}\n\n"
            "Выберите, что изменить."
        )
        await render(target, text, reply_markup=delivery_hours_keyboard())

    return AdminRouterHelpers(
        reject_non_admin=reject_non_admin,
        render=render,
        family_choice_keyboard=family_choice_keyboard,
        variant_choice_keyboard=variant_choice_keyboard,
        back_only_keyboard=back_only_keyboard,
        sort_dialog_fields=sort_dialog_fields,
        render_family_view_by_id=render_family_view_by_id,
        render_variant_view_by_id=render_variant_view_by_id,
        render_sku_view_by_id=render_sku_view_by_id,
        render_aliases_by_target=render_aliases_by_target,
        render_unknown_list=render_unknown_list,
        get_delivery_defaults=get_delivery_defaults,
        validate_delivery_defaults=validate_delivery_defaults,
        render_delivery_hours=render_delivery_hours,
    )
