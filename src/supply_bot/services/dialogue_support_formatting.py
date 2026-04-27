from __future__ import annotations

import re
from typing import Any

from supply_bot.utils import normalize_text

NO_COMMENT_SENTINEL = "__no_comment__"

class DialogueSupportFormattingMixin:
    def _quantity_unit_prompt(self, unit: str | None) -> str:
        if unit == "лист":
            return "листов"
        if unit == "мешок":
            return "мешков"
        if unit == "шт":
            return "штук"
        return unit or ""

    def _format_quantity_with_unit(self, quantity: float | int, unit: str | None) -> str:
        if not unit:
            return str(quantity)
        normalized_unit = normalize_text(str(unit))
        if normalized_unit == "шт":
            return f"{quantity} шт"
        if normalized_unit in {"штука", "штуки", "штук"}:
            return f"{quantity} {self._pluralize_ru(quantity, 'штука', 'штуки', 'штук')}"
        if normalized_unit in {"лист", "листа", "листов"}:
            return f"{quantity} {self._pluralize_ru(quantity, 'лист', 'листа', 'листов')}"
        if normalized_unit in {"метр", "метра", "метров"}:
            return f"{quantity} {self._pluralize_ru(quantity, 'метр', 'метра', 'метров')}"
        return f"{quantity} {unit}".strip()

    def _format_item(self, item: dict) -> str:
        if item.get("sku_title"):
            base = item["sku_title"]
        elif item.get("family_name") or item.get("variant_name"):
            base = " ".join(part for part in [item.get("family_name"), item.get("variant_name")] if part)
        elif item.get("normalized_name"):
            base = item["normalized_name"]
        else:
            base_parts = [item.get("family_name"), item.get("variant_name")]
            base = " ".join(part for part in base_parts if part) or item.get("raw_name")

        parts = [base]
        thickness_mm = item.get("thickness_mm")
        length_mm = item.get("length_mm")
        width_mm = item.get("width_mm")
        if thickness_mm and length_mm and not width_mm:
            parts.append(f"{self._format_measurement(thickness_mm)}x{self._format_measurement(length_mm)} мм")
        else:
            if thickness_mm:
                parts.append(f"{self._format_measurement(thickness_mm)} мм")
            if length_mm and width_mm:
                parts.append(f"{self._format_measurement(length_mm)}x{self._format_measurement(width_mm)}")
            elif length_mm and not width_mm:
                parts.append(f"{self._format_measurement(length_mm)} мм")

        if item.get("quantity"):
            quantity = int(item["quantity"]) if float(item["quantity"]).is_integer() else item["quantity"]
            parts.append(self._format_quantity_with_unit(quantity, item.get("unit")))

        note = self._sanitize_item_note(
            item.get("note"),
            quantity=item.get("quantity"),
            unit=item.get("unit"),
        )
        if note and note != NO_COMMENT_SENTINEL:
            normalized_note = normalize_text(str(note))
            normalized_base = normalize_text(str(base))
            if (
                self._should_show_item_note(note, item, base)
                and normalized_note not in normalized_base
                and normalized_base not in normalized_note
            ):
                parts.append(f"комм.: {note}")
        return " | ".join(parts)

    def _format_measurement(self, value: float | int | str) -> str:
        try:
            numeric = float(value)
        except (TypeError, ValueError):
            return str(value)
        if numeric.is_integer():
            return str(int(numeric))
        return str(numeric).rstrip("0").rstrip(".")

    def _sanitize_item_note(
        self,
        note_value: Any,
        *,
        quantity: float | int | None,
        unit: str | None,
    ) -> str | None:
        if note_value is None:
            return None
        note = str(note_value).strip()
        if not note:
            return None
        if note == NO_COMMENT_SENTINEL:
            return note

        note = re.sub(r"^со слов пользователя\s*:\s*", "", note, flags=re.IGNORECASE).strip()
        note = re.sub(r"^по словам пользователя\s*:\s*", "", note, flags=re.IGNORECASE).strip()
        if not note:
            return None

        normalized_note = normalize_text(note)
        if quantity is not None and self._is_redundant_packaging_note(normalized_note, quantity, unit):
            return None
        return note

    def _is_redundant_packaging_note(
        self, normalized_note: str, quantity: float | int | None, unit: str | None
    ) -> bool:
        if quantity is None:
            return False
        packaging_markers = ("упаков", "пачк", "короб", "в пакете", "в пачке")
        if not any(marker in normalized_note for marker in packaging_markers):
            return False

        quantity_text = self._format_measurement(quantity)
        if quantity_text not in normalized_note.replace(",", "."):
            return False

        if unit:
            normalized_unit = normalize_text(str(unit))
            if normalized_unit and normalized_unit not in normalized_note:
                return False
        return True

    def _should_show_item_note(self, note: str, item: dict, base: str) -> bool:
        normalized_note = normalize_text(note)
        if not normalized_note:
            return False
        if normalized_note.startswith("со слов пользователя") or normalized_note.startswith("по словам пользователя"):
            return False
        if self._is_redundant_packaging_note(normalized_note, item.get("quantity"), item.get("unit")):
            return False

        technical_parts: list[str] = [normalize_text(str(base))]
        for field_name in ("thickness_mm", "length_mm", "width_mm", "quantity"):
            value = item.get(field_name)
            if value is not None:
                technical_parts.append(self._format_measurement(value))
        if item.get("unit"):
            technical_parts.append(normalize_text(str(item["unit"])))

        if all(part in normalized_note for part in technical_parts if part):
            return False
        return True

    def _pluralize_ru(self, quantity: float | int, one: str, few: str, many: str) -> str:
        try:
            value = abs(int(quantity))
        except (TypeError, ValueError):
            return many
        if value % 100 in {11, 12, 13, 14}:
            return many
        last = value % 10
        if last == 1:
            return one
        if last in {2, 3, 4}:
            return few
        return many
