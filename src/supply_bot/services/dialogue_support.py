from __future__ import annotations

import re
from datetime import date, datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from supply_bot.utils import normalize_text, parse_float

DATE_PATTERN = re.compile(r"(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?")
TIME_PATTERN = re.compile(r"(\d{1,2})[:.](\d{2})")
SIZE_PATTERN = re.compile(r"(\d{3,4})\s*[xх*]\s*(\d{3,4})", re.IGNORECASE)
THICKNESS_PATTERN = re.compile(r"(\d+(?:[.,]\d+)?)\s*мм", re.IGNORECASE)
QUANTITY_WITH_UNIT_PATTERN = re.compile(
    r"(\d+(?:[.,]\d+)?)\s*(лист(?:ов|а)?|мешк(?:ов|а)?|шт|штук|упак(?:овк[аи])?|м2|м\.п\.)",
    re.IGNORECASE,
)
NO_COMMENT_SENTINEL = "__no_comment__"


class DialogueSupportMixin:
    def _pick_variant(self, text: str, variants: list[dict]) -> dict | None:
        normalized = normalize_text(text)
        for variant in variants:
            if normalize_text(variant["display_name"]) in normalized:
                return variant
        for variant in variants:
            if normalized == normalize_text(variant["display_name"]):
                return variant
        return None

    async def _apply_material_correction(self, item_id: int, family: dict, text: str) -> bool:
        normalized = normalize_text(text)
        variant_hint = self._extract_variant_hint(normalized)
        updates: dict[str, object] = {}

        if variant_hint is not None:
            variants = await self.storage.list_variants(family["id"])
            variant_choice = self._pick_variant_by_hint(variants, variant_hint)
            family_name = family["canonical_name"]

            if variant_choice is not None:
                updates["variant_id"] = variant_choice["id"]
                updates["normalized_name"] = f"{family_name} {variant_choice['display_name']}"
            elif variant_hint == "ordinary":
                updates["variant_id"] = None
                updates["normalized_name"] = f"{family_name} обычный"
            elif variant_hint == "moisture_resistant":
                updates["normalized_name"] = f"{family_name} влагостойкий"

            updates["sku_id"] = None

        if not updates:
            return False

        await self.storage.update_request_item(item_id, **updates)
        return True

    def _extract_variant_hint(self, normalized_text: str) -> str | None:
        if "не влагост" in normalized_text or "обыч" in normalized_text:
            return "ordinary"
        if "влагост" in normalized_text:
            return "moisture_resistant"
        return None

    def _pick_variant_by_hint(self, variants: list[dict], hint: str) -> dict | None:
        if hint == "moisture_resistant":
            for variant in variants:
                if "влаг" in normalize_text(variant["display_name"]):
                    return variant
        if hint == "ordinary":
            for variant in variants:
                normalized_name = normalize_text(variant["display_name"])
                if "обыч" in normalized_name:
                    return variant
            for variant in variants:
                normalized_name = normalize_text(variant["display_name"])
                if "влаг" not in normalized_name:
                    return variant
        return None

    def _variant_prompt_order(self, variant: dict) -> tuple[int, str]:
        normalized_name = normalize_text(variant["display_name"])
        if "обыч" in normalized_name:
            return 0, normalized_name
        if "влаг" in normalized_name:
            return 1, normalized_name
        return 2, normalized_name

    def _extract_item_attributes(self, text: str) -> dict:
        quantity, unit = self._extract_quantity(text)
        thickness = self._extract_thickness(text)
        size = self._extract_size(text)
        return {
            "quantity": quantity,
            "unit": unit,
            "thickness_mm": thickness,
            "length_mm": size[0] if size else None,
            "width_mm": size[1] if size else None,
        }

    def _extract_quantity(self, text: str) -> tuple[float | None, str | None]:
        match = QUANTITY_WITH_UNIT_PATTERN.search(text)
        if match:
            return parse_float(match.group(1)), normalize_text(match.group(2))
        standalone_numbers = re.findall(r"\b\d+(?:[.,]\d+)?\b", text)
        if (
            len(standalone_numbers) == 1
            and SIZE_PATTERN.search(text) is None
            and THICKNESS_PATTERN.search(text) is None
        ):
            return parse_float(standalone_numbers[0]), None
        return None, None

    def _extract_thickness(self, text: str) -> float | None:
        match = THICKNESS_PATTERN.search(text)
        if match:
            return parse_float(match.group(1))
        return None

    def _extract_size(self, text: str) -> tuple[float, float] | None:
        match = SIZE_PATTERN.search(text)
        if match:
            return float(match.group(1)), float(match.group(2))

        raw = text.lower().replace(",", ".").replace("х", "x")
        raw = re.sub(r"\bна\b", " x ", raw, flags=re.IGNORECASE)
        raw = re.sub(r"\s+", " ", raw)
        alt_match = re.search(r"(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)", raw, re.IGNORECASE)
        if not alt_match:
            return None
        first = self._normalize_sheet_dimension(alt_match.group(1))
        second = self._normalize_sheet_dimension(alt_match.group(2))
        if first is None or second is None:
            return None
        return first, second

    def _normalize_sheet_dimension(self, value: str) -> float | None:
        parsed = parse_float(value)
        if parsed is None:
            return None
        if parsed < 20:
            return parsed * 1000
        return parsed

    def _parse_delivery(self, text: str) -> tuple[date | None, datetime.time | None] | None:
        normalized = normalize_text(text)
        parsed_date = self._extract_date(normalized)
        parsed_time = self._extract_time(normalized)
        if parsed_date is None and parsed_time is None:
            return None
        return parsed_date, parsed_time

    def _extract_date(self, text: str) -> date | None:
        today = self._today()
        if "послезавтра" in text:
            return today + timedelta(days=2)
        if "завтра" in text:
            return today + timedelta(days=1)
        if "сегодня" in text:
            return today
        match = DATE_PATTERN.search(text)
        if not match:
            return None
        day = int(match.group(1))
        month = int(match.group(2))
        year = int(match.group(3)) if match.group(3) else today.year
        if year < 100:
            year += 2000
        return date(year, month, day)

    def _today(self) -> date:
        try:
            return datetime.now(ZoneInfo(self.settings.timezone)).date()
        except ZoneInfoNotFoundError:
            return datetime.now().date()

    def _now(self) -> datetime:
        try:
            return datetime.now(ZoneInfo(self.settings.timezone))
        except ZoneInfoNotFoundError:
            return datetime.now()

    def _local_datetime(self, target_date: date, target_time) -> datetime:
        combined = datetime.combine(target_date, target_time)
        try:
            return combined.replace(tzinfo=ZoneInfo(self.settings.timezone))
        except ZoneInfoNotFoundError:
            return combined

    def _extract_time(self, text: str):
        match = TIME_PATTERN.search(text)
        if not match:
            return None
        return datetime.strptime(f"{match.group(1)}:{match.group(2)}", "%H:%M").time()

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
