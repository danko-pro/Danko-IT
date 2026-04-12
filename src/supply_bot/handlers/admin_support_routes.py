from __future__ import annotations

from collections.abc import Awaitable, Callable

from aiogram import F, Router
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, InlineKeyboardMarkup, Message

from supply_bot.keyboards.admin import (
    admin_root_keyboard,
    search_results_keyboard,
    settings_keyboard,
    unknown_view_keyboard,
)
from supply_bot.states import DeliverySettingsStates, SearchStates
from supply_bot.utils import parse_time_value

AdminEvent = Message | CallbackQuery
RejectNonAdmin = Callable[[AdminEvent], Awaitable[bool]]
RenderFn = Callable[..., Awaitable[None]]
RenderByIdFn = Callable[[AdminEvent, int], Awaitable[None]]
RenderUnknownListFn = Callable[[AdminEvent], Awaitable[None]]
DeliveryDefaultsFn = Callable[[], Awaitable[dict[str, str]]]
ValidateDeliveryDefaultsFn = Callable[[dict[str, str]], str | None]
RenderDeliveryHoursFn = Callable[[AdminEvent], Awaitable[None]]
FamilyChoiceKeyboardFn = Callable[..., InlineKeyboardMarkup]
BackOnlyKeyboardFn = Callable[[str], InlineKeyboardMarkup]


def register_admin_support_routes(
    router: Router,
    *,
    settings,
    storage,
    reject_non_admin: RejectNonAdmin,
    render: RenderFn,
    render_family_view_by_id: RenderByIdFn,
    render_variant_view_by_id: RenderByIdFn,
    render_sku_view_by_id: RenderByIdFn,
    render_unknown_list: RenderUnknownListFn,
    family_choice_keyboard_fn: FamilyChoiceKeyboardFn,
    back_only_keyboard_fn: BackOnlyKeyboardFn,
    get_delivery_defaults: DeliveryDefaultsFn,
    validate_delivery_defaults: ValidateDeliveryDefaultsFn,
    render_delivery_hours: RenderDeliveryHoursFn,
) -> None:
    # Support routes intentionally stay separate from the catalog wizards.
    @router.callback_query(F.data == "adm:unknown")
    async def unknown_root(callback: CallbackQuery, state: FSMContext) -> None:
        if await reject_non_admin(callback):
            return
        await state.clear()
        await render_unknown_list(callback)

    @router.callback_query(F.data.startswith("unk:view:"))
    async def unknown_view(callback: CallbackQuery, state: FSMContext) -> None:
        if await reject_non_admin(callback):
            return
        await state.clear()
        unknown_id = int(callback.data.split(":")[-1])
        item = await storage.get_unknown_term(unknown_id)
        if item is None:
            await callback.answer("Запись не найдена.", show_alert=True)
            return
        text = f"Термин: {item['raw_term']}\nСообщение: {item['full_message']}\nГруппа: {item['chat_id']}"
        await render(callback, text, reply_markup=unknown_view_keyboard(unknown_id))

    @router.callback_query(F.data.startswith("unk:ignore:"))
    async def unknown_ignore(callback: CallbackQuery) -> None:
        if await reject_non_admin(callback):
            return
        unknown_id = int(callback.data.split(":")[-1])
        await storage.mark_unknown_term(unknown_id, status="ignored")
        await render_unknown_list(callback)

    @router.callback_query(F.data.startswith("unk:bind:"))
    async def unknown_bind_choose_family(callback: CallbackQuery) -> None:
        if await reject_non_admin(callback):
            return
        unknown_id = int(callback.data.split(":")[-1])
        families = await storage.list_families()
        await render(
            callback,
            "Выберите семейство, к которому нужно привязать термин.",
            reply_markup=family_choice_keyboard_fn(
                families,
                f"unk:bindsel:{unknown_id}",
                back_callback=f"unk:view:{unknown_id}",
            ),
        )

    @router.callback_query(F.data.startswith("unk:bindsel:"))
    async def unknown_bind_save(callback: CallbackQuery) -> None:
        if await reject_non_admin(callback):
            return
        _, _, unknown_id_raw, family_id_raw = callback.data.split(":")
        unknown_id = int(unknown_id_raw)
        family_id = int(family_id_raw)
        item = await storage.get_unknown_term(unknown_id)
        if item is None:
            await callback.answer("Запись не найдена.", show_alert=True)
            return
        await storage.create_alias(item["raw_term"], family_id=family_id)
        await storage.mark_unknown_term(unknown_id, status="approved")
        await callback.answer("Термин привязан.")
        await render_unknown_list(callback)

    @router.callback_query(F.data == "adm:search")
    async def search_start(callback: CallbackQuery, state: FSMContext) -> None:
        if await reject_non_admin(callback):
            return
        await state.clear()
        await state.set_state(SearchStates.query)
        await render(callback, "Поиск по каталогу\n\nВведите название, алиас или артикул.")

    @router.message(SearchStates.query)
    async def search_query(message: Message, state: FSMContext) -> None:
        if await reject_non_admin(message):
            return
        results = await storage.search_catalog(message.text.strip())
        await state.clear()
        await render(
            message,
            f"Найдено {len(results)} результатов.",
            reply_markup=search_results_keyboard(results),
        )

    @router.callback_query(F.data.startswith("search:open:"))
    async def search_open(callback: CallbackQuery) -> None:
        if await reject_non_admin(callback):
            return
        _, _, result_type, result_id_raw = callback.data.split(":")
        result_id = int(result_id_raw)
        if result_type == "family":
            await render_family_view_by_id(callback, result_id)
            return
        if result_type == "variant":
            await render_variant_view_by_id(callback, result_id)
            return
        if result_type == "sku":
            await render_sku_view_by_id(callback, result_id)
            return
        await callback.answer("Просмотр алиаса отдельной карточкой пока не нужен.", show_alert=True)

    @router.callback_query(F.data == "adm:settings")
    async def settings_view(callback: CallbackQuery, state: FSMContext) -> None:
        if await reject_non_admin(callback):
            return
        await state.clear()
        defaults = await get_delivery_defaults()
        text = (
            "Настройки\n\n"
            f"Доставка по умолчанию: {defaults['delivery_start']} - {defaults['delivery_end']}\n"
            f"Предлагаемый слот: {defaults['delivery_fallback']}\n"
            f"Админы: {', '.join(str(item) for item in settings.admin_ids) or 'не заданы'}"
        )
        await render(callback, text, reply_markup=settings_keyboard())

    @router.callback_query(F.data == "set:hours")
    async def delivery_hours_view(callback: CallbackQuery, state: FSMContext) -> None:
        if await reject_non_admin(callback):
            return
        await state.clear()
        await render_delivery_hours(callback)

    @router.callback_query(F.data == "set:admins")
    async def admins_settings_stub(callback: CallbackQuery) -> None:
        if await reject_non_admin(callback):
            return
        await callback.answer("Редактирование списка админов пока не реализовано.", show_alert=True)

    @router.callback_query(F.data.startswith("set:hours:"))
    async def delivery_hours_edit_start(callback: CallbackQuery, state: FSMContext) -> None:
        if await reject_non_admin(callback):
            return
        field = callback.data.split(":")[-1]
        labels = {
            "start": "начало окна доставки",
            "end": "конец окна доставки",
            "fallback": "предлагаемый слот",
        }
        if field not in labels:
            await callback.answer("Неизвестная настройка.", show_alert=True)
            return
        await state.clear()
        await state.set_state(DeliverySettingsStates.value)
        await state.update_data(delivery_settings_field=field)
        await render(
            callback,
            f"Введите {labels[field]} в формате ЧЧ:ММ.",
            reply_markup=back_only_keyboard_fn("set:hours"),
        )

    @router.message(DeliverySettingsStates.value)
    async def delivery_hours_save(message: Message, state: FSMContext) -> None:
        if await reject_non_admin(message):
            return
        data = await state.get_data()
        field = data.get("delivery_settings_field")
        mapping = {
            "start": "delivery_start",
            "end": "delivery_end",
            "fallback": "delivery_fallback",
        }
        setting_key = mapping.get(field)
        if setting_key is None:
            await state.clear()
            await render(
                message,
                "Не понял, какую настройку вы редактировали.",
                reply_markup=settings_keyboard(),
            )
            return
        try:
            parsed_time = parse_time_value(message.text.strip(), default=settings.default_delivery_start)
        except ValueError:
            await render(
                message,
                "Не удалось разобрать время. Используйте формат ЧЧ:ММ, например 08:30.",
                reply_markup=back_only_keyboard_fn("set:hours"),
            )
            return
        defaults = await get_delivery_defaults()
        defaults[setting_key] = parsed_time.strftime("%H:%M")
        validation_error = validate_delivery_defaults(defaults)
        if validation_error:
            await render(
                message,
                f"{validation_error}\n\nТекущее значение не изменил. Попробуйте ещё раз.",
                reply_markup=back_only_keyboard_fn("set:hours"),
            )
            return
        await storage.update_delivery_defaults(**{setting_key: defaults[setting_key]})
        await state.clear()
        await render_delivery_hours(message)

    @router.message(F.text)
    async def private_fallback(message: Message, state: FSMContext) -> None:
        if await reject_non_admin(message):
            return
        await state.clear()
        await render(
            message,
            "Панель администратора\n\nЧто хотите сделать?",
            reply_markup=admin_root_keyboard(),
        )
