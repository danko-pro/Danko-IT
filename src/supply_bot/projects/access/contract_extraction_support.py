from __future__ import annotations

from pathlib import Path
from typing import Any

IMAGE_DOCUMENT_SUFFIXES = {".gif", ".heic", ".jpeg", ".jpg", ".png", ".tif", ".tiff", ".webp"}
TEXT_DOCUMENT_SUFFIXES = {".csv", ".json", ".md", ".rtf", ".txt", ".xml"}
TEXT_DOCUMENT_MIME_TYPES = {"application/json", "application/xml", "text/csv", "text/markdown", "text/plain"}

CONTRACT_EXTRACTION_SCHEMA = {
    "title": "string",
    "number": "string",
    "signed_at": "YYYY-MM-DD or empty string",
    "start_date": "YYYY-MM-DD or empty string",
    "planned_end_date": "YYYY-MM-DD or empty string",
    "amount": "number",
    "advance_terms": "string",
    "milestones": [
        {
            "kind": "invoice | payment | deadline",
            "title": "string",
            "planned_date": "YYYY-MM-DD",
            "amount": "number | null",
            "note": "string",
        }
    ],
}

CONTRACT_EXTRACTION_SYSTEM_PROMPT = (
    "You extract structured data from a construction contract. "
    "Return only valid JSON. "
    "Do not invent facts that are not present in the document. "
    "If a date or amount is missing, return an empty string or 0/null. "
    "Milestones should include invoice dates, payment dates, and key deadlines if they are explicitly stated. "
    "Output concise Russian strings when the contract is in Russian."
)


class ProjectDocumentTextExtractionError(ValueError):
    pass


def is_image_document(file_path: Path, *, mime_type: str | None) -> bool:
    normalized_mime_type = str(mime_type or "").strip().lower()
    return normalized_mime_type.startswith("image/") or file_path.suffix.lower() in IMAGE_DOCUMENT_SUFFIXES


def _is_text_document(file_path: Path, *, mime_type: str | None) -> bool:
    normalized_mime_type = str(mime_type or "").strip().lower()
    return (
        normalized_mime_type.startswith("text/")
        or normalized_mime_type in TEXT_DOCUMENT_MIME_TYPES
        or file_path.suffix.lower() in TEXT_DOCUMENT_SUFFIXES
    )


def _decode_text_document(raw_bytes: bytes) -> str:
    for encoding in ("utf-8", "cp1251", "latin-1"):
        try:
            return raw_bytes.decode(encoding)
        except UnicodeDecodeError:
            continue
    return raw_bytes.decode("utf-8", errors="ignore")


def extract_contract_text(file_path: Path, *, mime_type: str | None = None) -> str:
    suffix = file_path.suffix.lower()
    if is_image_document(file_path, mime_type=mime_type):
        raise ProjectDocumentTextExtractionError("OCR is required for image document")

    if mime_type == "application/pdf" or suffix == ".pdf":
        from pypdf import PdfReader

        reader = PdfReader(str(file_path))
        parts: list[str] = []
        for page in reader.pages[:50]:
            text = page.extract_text() or ""
            stripped = text.strip()
            if stripped:
                parts.append(stripped)
        return "\n\n".join(parts)

    if not _is_text_document(file_path, mime_type=mime_type):
        raise ProjectDocumentTextExtractionError("Unsupported document text extraction type")

    raw_bytes = file_path.read_bytes()
    return _decode_text_document(raw_bytes)


def normalize_contract_payload(payload: dict[str, Any] | None) -> dict[str, Any] | None:
    if not isinstance(payload, dict):
        return None

    milestones_in = payload.get("milestones")
    milestones_out: list[dict[str, Any]] = []
    if isinstance(milestones_in, list):
        for milestone in milestones_in:
            if not isinstance(milestone, dict):
                continue
            title = str(milestone.get("title") or "").strip()
            planned_date = str(milestone.get("planned_date") or "").strip()
            if not title or not planned_date:
                continue
            amount_raw = milestone.get("amount")
            try:
                amount_value = float(amount_raw) if amount_raw is not None else None
            except (TypeError, ValueError):
                amount_value = None
            milestones_out.append(
                {
                    "kind": str(milestone.get("kind") or "deadline").strip().lower(),
                    "title": title,
                    "planned_date": planned_date,
                    "amount": amount_value,
                    "note": str(milestone.get("note") or "").strip(),
                }
            )

    try:
        amount_value = float(payload.get("amount") or 0)
    except (TypeError, ValueError):
        amount_value = 0.0

    return {
        "title": str(payload.get("title") or "").strip(),
        "number": str(payload.get("number") or "").strip(),
        "signed_at": str(payload.get("signed_at") or "").strip(),
        "start_date": str(payload.get("start_date") or "").strip(),
        "planned_end_date": str(payload.get("planned_end_date") or "").strip(),
        "amount": amount_value,
        "advance_terms": str(payload.get("advance_terms") or "").strip(),
        "milestones": milestones_out,
    }
