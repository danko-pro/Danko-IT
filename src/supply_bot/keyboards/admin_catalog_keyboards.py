from __future__ import annotations

from aiogram.types import InlineKeyboardMarkup
from aiogram.utils.keyboard import InlineKeyboardBuilder

from supply_bot.constants import DIALOG_FIELDS


def catalog_keyboard() -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(text="Семейства", callback_data="cat:families")
    builder.button(text="Добавить семейство", callback_data="cat:add_family")
    builder.button(text="Добавить SKU", callback_data="cat:add_sku")
    builder.button(text="Назад", callback_data="adm:root")
    builder.adjust(1, 1, 1, 1)
    return builder.as_markup()


def families_keyboard(families: list[dict]) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    for family in families[:20]:
        title = family["canonical_name"]
        if not family["is_active"]:
            title = f"{title} [off]"
        builder.button(text=title, callback_data=f"fam:view:{family['id']}")
    builder.button(text="Добавить семейство", callback_data="cat:add_family")
    builder.button(text="Назад", callback_data="adm:catalog")
    builder.adjust(1)
    return builder.as_markup()


def family_view_keyboard(family_id: int, *, is_active: bool) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(text="Варианты", callback_data=f"fam:variants:{family_id}")
    builder.button(text="Поля диалога", callback_data=f"fam:fields:{family_id}")
    builder.button(text="SKU", callback_data=f"fam:skus:{family_id}")
    builder.button(text="Алиасы", callback_data=f"fam:aliases:{family_id}")
    builder.button(
        text="Отключить" if is_active else "Включить",
        callback_data=f"fam:toggle:{family_id}",
    )
    builder.button(text="Назад", callback_data="cat:families")
    builder.adjust(2, 2, 1, 1)
    return builder.as_markup()


def dialog_fields_keyboard(family_id: int, selected: list[str]) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    for code, definition in DIALOG_FIELDS.items():
        mark = "✓ " if code in selected else ""
        builder.button(text=f"{mark}{definition.label}", callback_data=f"fam:field:{family_id}:{code}")
    builder.button(text="Сохранить", callback_data=f"fam:fieldsave:{family_id}")
    builder.button(text="Назад", callback_data=f"fam:view:{family_id}")
    builder.adjust(2, 2, 1, 1)
    return builder.as_markup()


def variants_keyboard(family_id: int, variants: list[dict]) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    for variant in variants[:20]:
        title = variant["display_name"]
        if not variant["is_active"]:
            title = f"{title} [off]"
        builder.button(text=title, callback_data=f"var:view:{variant['id']}")
    builder.button(text="Добавить вариант", callback_data=f"fam:add_variant:{family_id}")
    builder.button(text="Назад", callback_data=f"fam:view:{family_id}")
    builder.adjust(1)
    return builder.as_markup()


def variant_view_keyboard(family_id: int, variant_id: int, *, is_active: bool) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(text="SKU", callback_data=f"var:skus:{variant_id}")
    builder.button(text="Алиасы", callback_data=f"var:aliases:{variant_id}")
    builder.button(
        text="Отключить" if is_active else "Включить",
        callback_data=f"var:toggle:{variant_id}",
    )
    builder.button(text="Назад", callback_data=f"fam:variants:{family_id}")
    builder.adjust(2, 1, 1)
    return builder.as_markup()


def skus_keyboard(family_id: int, skus: list[dict]) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    for sku in skus[:20]:
        title = sku["title"]
        if not sku["is_active"]:
            title = f"{title} [off]"
        builder.button(text=title[:60], callback_data=f"sku:view:{sku['id']}")
    builder.button(text="Добавить SKU", callback_data=f"fam:add_sku:{family_id}")
    builder.button(text="Назад", callback_data=f"fam:view:{family_id}")
    builder.adjust(1)
    return builder.as_markup()


def sku_view_keyboard(family_id: int, sku_id: int, *, is_active: bool) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(text="Алиасы", callback_data=f"sku:aliases:{sku_id}")
    builder.button(
        text="Отключить" if is_active else "Включить",
        callback_data=f"sku:toggle:{sku_id}",
    )
    builder.button(text="Назад", callback_data=f"fam:skus:{family_id}")
    builder.adjust(2, 1)
    return builder.as_markup()


def aliases_keyboard(
    target_prefix: str, target_id: int, aliases: list[dict], *, back_callback: str
) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    for alias in aliases[:20]:
        title = alias["alias"]
        if not alias["is_active"]:
            title = f"{title} [off]"
        builder.button(text=title, callback_data=f"alias:toggle:{alias['id']}:{target_prefix}:{target_id}")
    builder.button(text="Добавить алиас", callback_data=f"{target_prefix}:add_alias:{target_id}")
    builder.button(text="Назад", callback_data=back_callback)
    builder.adjust(1)
    return builder.as_markup()
