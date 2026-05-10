from __future__ import annotations

from pathlib import Path
from tempfile import TemporaryDirectory

import pytest

from supply_bot.projects.access.contract_extraction_support import (
    ProjectDocumentTextExtractionError,
    extract_contract_text,
)


def test_extract_contract_text_reads_plain_text_document() -> None:
    with TemporaryDirectory() as tmp_dir:
        file_path = Path(tmp_dir) / "contract.txt"
        file_path.write_text("Contract text", encoding="utf-8")

        assert extract_contract_text(file_path, mime_type="text/plain") == "Contract text"


def test_extract_contract_text_rejects_image_until_ocr_is_configured() -> None:
    with TemporaryDirectory() as tmp_dir:
        file_path = Path(tmp_dir) / "contract.jpg"
        file_path.write_bytes(b"\xff\xd8\xff")

        with pytest.raises(ProjectDocumentTextExtractionError, match="OCR is required"):
            extract_contract_text(file_path, mime_type="image/jpeg")


def test_extract_contract_text_rejects_unknown_binary_document_type() -> None:
    with TemporaryDirectory() as tmp_dir:
        file_path = Path(tmp_dir) / "contract.bin"
        file_path.write_bytes(b"\x00\x01\x02")

        with pytest.raises(ProjectDocumentTextExtractionError, match="Unsupported"):
            extract_contract_text(file_path, mime_type="application/octet-stream")
