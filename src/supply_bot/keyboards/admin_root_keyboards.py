from __future__ import annotations

from aiogram.types import InlineKeyboardMarkup
from aiogram.utils.keyboard import InlineKeyboardBuilder


def admin_root_keyboard() -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(text="Каталог", callback_data="adm:catalog")
    builder.button(text="Неизвестные", callback_data="adm:unknown")
    builder.button(text="Поиск", callback_data="adm:search")
    builder.button(text="Настройки", callback_data="adm:settings")
    builder.adjust(2, 2)
    return builder.as_markup()


def settings_keyboard() -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(text="Часы доставки", callback_data="set:hours")
    builder.button(text="Админы", callback_data="set:admins")
    builder.button(text="Назад", callback_data="adm:root")
    builder.adjust(1)
    return builder.as_markup()


def delivery_hours_keyboard() -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(text="Начало окна", callback_data="set:hours:start")
    builder.button(text="Конец окна", callback_data="set:hours:end")
    builder.button(text="Слот по умолчанию", callback_data="set:hours:fallback")
    builder.button(text="Назад", callback_data="adm:settings")
    builder.adjust(1)
    return builder.as_markup()
