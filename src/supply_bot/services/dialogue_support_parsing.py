from __future__ import annotations

import re
from datetime import date, datetime, timedelta
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

class DialogueSupportParsingMixin:
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
