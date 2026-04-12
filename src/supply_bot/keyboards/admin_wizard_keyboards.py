from __future__ import annotations

from aiogram.types import InlineKeyboardMarkup
from aiogram.utils.keyboard import InlineKeyboardBuilder

from supply_bot.constants import DIALOG_FIELDS, UNIT_OPTIONS


def unit_selection_keyboard(prefix: str) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    for unit in UNIT_OPTIONS:
        builder.button(text=unit, callback_data=f"{prefix}:{unit}")
    builder.button(text="Назад", callback_data=f"{prefix}:back")
    builder.adjust(2, 2, 2, 1)
    return builder.as_markup()


def family_field_selection_keyboard(selected: list[str]) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    for code, definition in DIALOG_FIELDS.items():
        mark = "✓ " if code in selected else ""
        builder.button(text=f"{mark}{definition.label}", callback_data=f"wiz:family:field:{code}")
    builder.button(text="Готово", callback_data="wiz:family:field:done")
    builder.button(text="Назад", callback_data="wiz:family:field:back")
    builder.adjust(2, 2, 1, 1)
    return builder.as_markup()


def wizard_confirm_keyboard(save_callback: str, back_callback: str) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(text="Сохранить", callback_data=save_callback)
    builder.button(text="Назад", callback_data=back_callback)
    builder.adjust(2)
    return builder.as_markup()
