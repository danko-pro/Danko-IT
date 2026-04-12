from __future__ import annotations

from aiogram.types import InlineKeyboardMarkup
from aiogram.utils.keyboard import InlineKeyboardBuilder


def unknowns_keyboard(items: list[dict]) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    for item in items[:20]:
        builder.button(text=item["raw_term"][:50], callback_data=f"unk:view:{item['id']}")
    builder.button(text="Назад", callback_data="adm:root")
    builder.adjust(1)
    return builder.as_markup()


def unknown_view_keyboard(unknown_id: int) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(text="Привязать к семейству", callback_data=f"unk:bind:{unknown_id}")
    builder.button(text="Игнорировать", callback_data=f"unk:ignore:{unknown_id}")
    builder.button(text="Назад", callback_data="adm:unknown")
    builder.adjust(1)
    return builder.as_markup()


def search_results_keyboard(results: list[dict]) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    for result in results[:20]:
        builder.button(
            text=f"{result['type']}: {result['title']}"[:60],
            callback_data=f"search:open:{result['type']}:{result['id']}",
        )
    builder.button(text="Назад", callback_data="adm:root")
    builder.adjust(1)
    return builder.as_markup()
