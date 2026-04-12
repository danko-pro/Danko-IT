from __future__ import annotations

from datetime import datetime
from typing import Any

import aiosqlite
import httpx
from fastapi import HTTPException

from supply_bot.config import Settings
from supply_bot.storage import BotStorage


async def _family_overview(storage: BotStorage, family: dict[str, Any]) -> dict[str, Any]:
    family_id = int(family["id"])
    variants = await storage.list_variants(family_id)
    skus = await storage.list_skus(family_id=family_id)
    aliases = await storage.list_aliases(family_id=family_id)
    return {
        "id": family_id,
        "code": family["code"],
        "canonical_name": family["canonical_name"],
        "default_unit": family["default_unit"],
        "category": family["category"],
        "dialog_fields": family["dialog_fields"],
        "is_active": family["is_active"],
        "variants_count": sum(1 for variant in variants if variant["is_active"]),
        "skus_count": sum(1 for sku in skus if sku["is_active"]),
        "aliases_count": sum(1 for alias in aliases if alias["is_active"]),
    }


async def _request_detail_payload(storage: BotStorage, draft: dict[str, Any]) -> dict[str, Any]:
    items = await storage.list_request_items(int(draft["id"]))
    group_profile = await storage.get_group_profile(int(draft["chat_id"]))
    return {
        "draft": draft,
        "items": items,
        "group_profile": group_profile,
    }


def _parse_hhmm(value: str) -> str:
    text = value.strip()
    try:
        return datetime.strptime(text, "%H:%M").strftime("%H:%M")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid time format: {value}") from exc


def _split_alias_values(raw_value: str) -> list[str]:
    return [part.strip() for part in raw_value.replace(";", ",").split(",") if part.strip()]


def _admin_status_message(status: str) -> str | None:
    messages = {
        "confirmed": "Администратор подтвердил заявку.",
        "in_progress": "Администратор подтвердил заявку. Заявка в работе.",
        "done": "Администратор отметил заявку как выполненную.",
        "cancelled": "Администратор отменил заявку.",
        "collecting": "Администратор вернул заявку в сбор и уточнение.",
    }
    return messages.get(status)


async def _send_group_message(*, settings: Settings, chat_id: int, text: str) -> None:
    timeout = httpx.Timeout(15.0, connect=10.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.post(
            f"https://api.telegram.org/bot{settings.bot_token}/sendMessage",
            json={
                "chat_id": chat_id,
                "text": text,
            },
        )
        response.raise_for_status()
        payload = response.json()
        if not payload.get("ok"):
            raise RuntimeError(payload.get("description") or "Telegram sendMessage failed")


async def _fetch_scalar(
    db: aiosqlite.Connection,
    query: str,
    params: tuple[Any, ...] = (),
) -> int:
    cursor = await db.execute(query, params)
    row = await cursor.fetchone()
    return int(row[0]) if row and row[0] is not None else 0
