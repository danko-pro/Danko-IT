"""Поддержка извлечения данных из ledger-документов.

Модуль хранит схему ответа, системный prompt и нормализацию результата AI.
Он не обращается к внешним API и не пишет данные в storage.
"""

from __future__ import annotations

from typing import Any

from supply_bot.projects.domain.common import document_title_for_kind, normalize_project_date, normalize_project_text

LEDGER_DOCUMENT_EXTRACTION_SCHEMA = {
    "title": "string",
    "date": "YYYY-MM-DD or empty string",
    "amount": "number",
}

LEDGER_DOCUMENT_EXTRACTION_SYSTEM_PROMPT = (
    "You extract structured data from construction project accounting documents. "
    "The document can be an invoice, a closing act, or a payment-related document. "
    "Return only valid JSON. Do not invent facts. "
    "Use concise Russian title text. If a date or amount is missing, return an empty string or 0."
)


def normalize_ledger_document_payload(payload: dict[str, Any] | None, *, kind: str) -> dict[str, Any] | None:
    """Приводит ответ AI к безопасному payload для обновления invoice/act документа."""
    if not isinstance(payload, dict):
        return None

    try:
        amount = float(payload.get("amount") or 0)
    except (TypeError, ValueError):
        amount = 0.0

    return {
        "title": normalize_project_text(payload.get("title"), default=document_title_for_kind(kind)),
        "date": normalize_project_date(payload.get("date"), field="Document date") if payload.get("date") else "",
        "amount": amount,
    }
