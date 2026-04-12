from __future__ import annotations

import json
import re
from datetime import date, time
from typing import Any

CYRILLIC_TO_LATIN = str.maketrans(
    {
        "а": "a",
        "б": "b",
        "в": "v",
        "г": "g",
        "д": "d",
        "е": "e",
        "ё": "e",
        "ж": "zh",
        "з": "z",
        "и": "i",
        "й": "y",
        "к": "k",
        "л": "l",
        "м": "m",
        "н": "n",
        "о": "o",
        "п": "p",
        "р": "r",
        "с": "s",
        "т": "t",
        "у": "u",
        "ф": "f",
        "х": "h",
        "ц": "c",
        "ч": "ch",
        "ш": "sh",
        "щ": "sch",
        "ъ": "",
        "ы": "y",
        "ь": "",
        "э": "e",
        "ю": "yu",
        "я": "ya",
    }
)


def normalize_text(value: str) -> str:
    text = value.lower().replace("ё", "е").strip()
    text = re.sub(r"[^\w\s./:-]+", " ", text, flags=re.UNICODE)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def slugify(value: str, *, prefix: str = "item") -> str:
    base = normalize_text(value).translate(CYRILLIC_TO_LATIN)
    base = re.sub(r"[^a-z0-9]+", "_", base)
    base = re.sub(r"_+", "_", base).strip("_")
    return base or prefix


def parse_bool(value: str | None, *, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "y", "on"}


def parse_csv_ints(value: str | None) -> tuple[int, ...]:
    if not value:
        return ()
    return tuple(int(chunk.strip()) for chunk in value.split(",") if chunk.strip())


def parse_time_value(value: str | None, *, default: time) -> time:
    if not value:
        return default
    hour, minute = value.strip().replace(".", ":").split(":", maxsplit=1)
    return time(hour=int(hour), minute=int(minute))


def parse_float(value: str | None) -> float | None:
    if value is None:
        return None
    cleaned = value.strip().replace(",", ".")
    if not cleaned:
        return None
    return float(cleaned)


def json_dumps(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False)


def json_loads(value: str | None, *, default: Any) -> Any:
    if not value:
        return default
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return default


def format_date(value: date | str | None) -> str:
    if value is None:
        return "не указано"
    if isinstance(value, str):
        if re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
            parsed = date.fromisoformat(value)
            return parsed.strftime("%d.%m.%Y")
        return value
    return value.strftime("%d.%m.%Y")


def format_time(value: time | str | None) -> str:
    if value is None:
        return "не указано"
    if isinstance(value, str):
        return value
    return value.strftime("%H:%M")
