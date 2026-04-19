from __future__ import annotations

import re
from typing import Any

import aiosqlite

from supply_bot.utils import json_loads, slugify

# Общие helper-методы каталога: нормализация row-структур и генерация кодов.


class CatalogStorageCommonMixin:
    def _family_row(self, row: aiosqlite.Row | None) -> dict[str, Any]:
        if row is None:
            return {}
        data = dict(row)
        data["dialog_fields"] = json_loads(data.pop("dialog_fields_json"), default=[])
        return data

    def _sku_row(self, row: aiosqlite.Row | None) -> dict[str, Any]:
        if row is None:
            return {}
        data = dict(row)
        data["extra"] = json_loads(data.pop("extra_json"), default={})
        return data

    async def _unique_code(
        self,
        table: str,
        title: str,
        *,
        prefix: str,
        family_id: int | None = None,
    ) -> str:
        base = slugify(title, prefix=prefix)
        candidate = base
        index = 2

        while True:
            async with self.connection() as db:
                if table == "material_variants":
                    cursor = await db.execute(
                        "SELECT 1 FROM material_variants WHERE family_id = ? AND code = ?",
                        (family_id, candidate),
                    )
                else:
                    cursor = await db.execute(f"SELECT 1 FROM {table} WHERE code = ?", (candidate,))
                exists = await cursor.fetchone()
            if not exists:
                return candidate
            candidate = f"{base}_{index}"
            index += 1

    def _split_alias_input(self, raw_value: str) -> list[str]:
        parts = [part.strip() for part in re.split(r"[,;\n]+", raw_value) if part.strip()]
        return parts or [raw_value.strip()]
