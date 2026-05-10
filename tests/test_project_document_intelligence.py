"""Тесты интеллектуального чтения проектных документов."""

from __future__ import annotations

import asyncio
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import AsyncMock, patch

from supply_bot.config import load_settings
from supply_bot.projects.document_intelligence import read_project_document_text


def _create_settings_file(root: Path) -> Path:
    """Создает тестовый config с включенным OpenAI OCR-контуром."""
    config_path = root / ".env.test"
    config_path.write_text(
        "\n".join(
            [
                "BOT_TOKEN=test-token",
                "SUPPLY_DIALOGUE_ENABLED=True",
                "OPENAI_API_KEY=test-openai-key",
            ]
        ),
        encoding="utf-8",
    )
    return config_path


def test_read_project_document_text_uses_ocr_for_image_document() -> None:
    """Проверяет, что изображение документа уходит в OCR, а не читается как текст."""
    with TemporaryDirectory() as tmp_dir:
        root = Path(tmp_dir)
        settings = load_settings(_create_settings_file(root))
        image_path = root / "contract.jpg"
        image_path.write_bytes(b"image-bytes")

        with patch(
            "supply_bot.projects.document_intelligence.LlmProviderClient.extract_text_from_image_bytes",
            new=AsyncMock(return_value="OCR text"),
        ) as extract_text_from_image:
            text = asyncio.run(read_project_document_text(settings, image_path, mime_type="image/jpeg"))

        assert text == "OCR text"
        extract_text_from_image.assert_awaited_once()
