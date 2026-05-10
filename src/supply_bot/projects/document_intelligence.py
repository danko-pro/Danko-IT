"""Интеллектуальная обработка проектных документов.

Модуль объединяет извлечение текста из файлов и доменное извлечение данных.
Routes используют этот слой, чтобы не знать деталей PDF, OCR и AI-провайдеров.
"""

from __future__ import annotations

import inspect
import json
from pathlib import Path
from typing import Any, Callable

from supply_bot.config import Settings
from supply_bot.projects.access.contract_extraction_support import (
    ProjectDocumentTextExtractionError,
    extract_contract_text,
    is_image_document,
)
from supply_bot.projects.access.ledger_document_extraction_support import (
    LEDGER_DOCUMENT_EXTRACTION_SCHEMA,
    LEDGER_DOCUMENT_EXTRACTION_SYSTEM_PROMPT,
    normalize_ledger_document_payload,
)
from supply_bot.services.llm_client import LlmProviderClient

DOCUMENT_OCR_PROMPT = (
    "Read the document image and return only the visible text. "
    "Keep original numbers, dates, organization names, line breaks, and Russian text. "
    "Do not summarize and do not add facts."
)


async def read_project_document_text(
    settings_obj: Settings,
    file_path: Path,
    *,
    mime_type: str | None,
    text_reader: Callable[..., Any] = extract_contract_text,
) -> str:
    """Возвращает текст документа из PDF/text или запускает OCR для изображения."""
    try:
        # text_reader оставлен внедряемым, чтобы route-тесты могли подменять старую точку patch.
        text_result = text_reader(file_path, mime_type=mime_type)
        if inspect.isawaitable(text_result):
            text_result = await text_result
        return str(text_result or "")
    except ProjectDocumentTextExtractionError:
        # Неизвестные бинарные форматы не отправляем в OCR, если они не распознаны как изображения.
        if not is_image_document(file_path, mime_type=mime_type):
            raise

    client = LlmProviderClient(settings_obj)
    ocr_text = await client.extract_text_from_image_bytes(
        file_path.read_bytes(),
        mime_type=mime_type or "application/octet-stream",
        prompt=DOCUMENT_OCR_PROMPT,
    )
    if not ocr_text:
        raise ProjectDocumentTextExtractionError("OCR extraction is not configured or returned empty text")
    return ocr_text


class ProjectLedgerDocumentExtractor:
    """Извлекает учетные поля из счета или закрывающего акта."""

    def __init__(self, settings: Settings) -> None:
        """Создает AI-клиент для JSON extraction."""
        self.client = LlmProviderClient(settings)

    async def extract_document(
        self,
        *,
        kind: str,
        file_name: str,
        document_text: str,
    ) -> dict[str, Any] | None:
        """Преобразует текст ledger-документа в нормализованные поля title/date/amount."""
        if not self.client.enabled:
            return None

        trimmed_text = document_text.strip()
        if not trimmed_text:
            return None

        user_prompt = (
            "File name:\n"
            f"{file_name}\n\n"
            "Document kind:\n"
            f"{kind}\n\n"
            "Document text:\n"
            f"{trimmed_text[:16000]}\n\n"
            "Return only JSON with this schema:\n"
            f"{json.dumps(LEDGER_DOCUMENT_EXTRACTION_SCHEMA, ensure_ascii=False)}"
        )
        messages = [
            {"role": "system", "content": LEDGER_DOCUMENT_EXTRACTION_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ]

        for provider in self.client.provider_candidates():
            try:
                # Любой провайдер может дать невалидный JSON; следующий provider остается fallback.
                result = await self.client.complete_json(messages, provider=provider)
                normalized = normalize_ledger_document_payload(result, kind=kind)
                if normalized:
                    return normalized
            except Exception:
                continue

        return None
