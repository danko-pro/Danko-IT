"""Доменные builders для договоров и milestone-этапов проекта.

Модуль отвечает за:
- нормализацию статусов и типов milestone;
- сборку payload договора;
- подготовку values для upload, upsert и AI extraction.
"""

from __future__ import annotations

from typing import Any, Mapping, Sequence

from supply_bot.projects.domain.common import (
    ALLOWED_PROJECT_CONTRACT_EXTRACTION_STATUSES,
    normalize_project_date,
    normalize_project_text,
    validate_project_metric,
)
from supply_bot.projects.domain.contract_milestones import (
    build_extracted_project_contract_milestones,
    build_project_contract_milestone_payload,
    build_project_contract_milestone_update_values,
    build_project_contract_milestones_values,
    normalize_project_contract_milestone_kind,
    normalize_project_contract_milestone_status,
)


# Нормализация статусов и видов договорных сущностей.
def normalize_project_contract_extraction_status(value: str | None) -> str:
    normalized = (value or "").strip().lower()
    if normalized in ALLOWED_PROJECT_CONTRACT_EXTRACTION_STATUSES:
        return normalized
    return "review"


# Блок сборки payload и values для договора.
def build_project_contract_payload(
    contract: Mapping[str, Any],
    *,
    milestones: list[dict[str, Any]],
) -> dict[str, Any]:
    payload = {
        "id": int(contract["id"]),
        "project_id": int(contract["project_id"]),
        "file_name": str(contract["file_name"] or ""),
        "title": str(contract["title"] or ""),
        "number": str(contract["number"] or ""),
        "signed_at": str(contract["signed_at"] or ""),
        "start_date": str(contract["start_date"] or ""),
        "planned_end_date": str(contract["planned_end_date"] or ""),
        "amount": float(contract["amount"] or 0),
        "advance_terms": str(contract["advance_terms"] or ""),
        "extraction_status": str(contract["extraction_status"] or "review"),
        "source_file": None,
        "download_url": None,
        "milestones": milestones,
        "created_at": str(contract["created_at"]),
        "updated_at": str(contract["updated_at"]),
    }

    storage_key = str(contract["source_storage_key"] or "").strip()
    if storage_key:
        payload["source_file"] = {
            "id": f"contract-source-{int(contract['id'])}",
            "file_name": str(contract["source_file_name"] or contract["file_name"] or ""),
            "mime_type": str(contract["source_mime_type"] or "application/octet-stream"),
            "uploaded_at": str(contract["uploaded_at"] or contract["updated_at"]),
        }
        payload["download_url"] = f"/api/projects/{int(contract['project_id'])}/contract/download"

    return payload


def build_project_contract_upsert_values(
    payload_data: Mapping[str, Any],
    *,
    existing_contract: Mapping[str, Any] | None,
) -> dict[str, Any]:
    return {
        "file_name": normalize_project_text(
            payload_data["file_name"],
            default=str(existing_contract["file_name"]) if existing_contract else "",
        ),
        "title": normalize_project_text(
            payload_data["title"],
            default=str(existing_contract["title"]) if existing_contract else "",
        ),
        "number": normalize_project_text(
            payload_data["number"],
            default=str(existing_contract["number"]) if existing_contract else "",
        ),
        "signed_at": normalize_project_text(
            payload_data["signed_at"],
            default=str(existing_contract["signed_at"]) if existing_contract else "",
        ),
        "start_date": normalize_project_text(
            payload_data["start_date"],
            default=str(existing_contract["start_date"]) if existing_contract else "",
        ),
        "planned_end_date": normalize_project_text(
            payload_data["planned_end_date"],
            default=str(existing_contract["planned_end_date"]) if existing_contract else "",
        ),
        "amount": validate_project_metric(payload_data["amount"], field="Contract amount") or 0.0,
        "advance_terms": normalize_project_text(
            payload_data["advance_terms"],
            default=str(existing_contract["advance_terms"]) if existing_contract else "",
        ),
        "extraction_status": normalize_project_contract_extraction_status(payload_data["extraction_status"]),
        "source_file_name": str(existing_contract["source_file_name"]) if existing_contract else None,
        "source_mime_type": str(existing_contract["source_mime_type"]) if existing_contract else None,
        "source_storage_key": str(existing_contract["source_storage_key"]) if existing_contract else None,
        "uploaded_at": (
            str(existing_contract["uploaded_at"]) if existing_contract and existing_contract["uploaded_at"] else None
        ),
    }


def build_project_contract_upload_values(
    *,
    existing_contract: Mapping[str, Any] | None,
    source_file_name: str,
    source_mime_type: str,
    source_storage_key: str,
    uploaded_at: str,
) -> dict[str, Any]:
    return {
        "file_name": (
            str(existing_contract["file_name"])
            if existing_contract and existing_contract["file_name"]
            else source_file_name
        ),
        "title": str(existing_contract["title"]) if existing_contract else "",
        "number": str(existing_contract["number"]) if existing_contract else "",
        "signed_at": str(existing_contract["signed_at"]) if existing_contract else "",
        "start_date": str(existing_contract["start_date"]) if existing_contract else "",
        "planned_end_date": str(existing_contract["planned_end_date"]) if existing_contract else "",
        "amount": float(existing_contract["amount"]) if existing_contract else 0.0,
        "advance_terms": str(existing_contract["advance_terms"]) if existing_contract else "",
        "extraction_status": (
            normalize_project_contract_extraction_status(str(existing_contract["extraction_status"]))
            if existing_contract
            else "review"
        ),
        "source_file_name": source_file_name,
        "source_mime_type": source_mime_type,
        "source_storage_key": source_storage_key,
        "uploaded_at": uploaded_at,
    }
def build_extracted_project_contract_values(
    extracted_contract: Mapping[str, Any],
    *,
    existing_contract: Mapping[str, Any],
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    contract_values = {
        "file_name": normalize_project_text(
            extracted_contract.get("file_name"),
            default=str(existing_contract["file_name"] or existing_contract["source_file_name"] or ""),
        ),
        "title": normalize_project_text(extracted_contract.get("title"), default=str(existing_contract["title"] or "")),
        "number": normalize_project_text(
            extracted_contract.get("number"),
            default=str(existing_contract["number"] or ""),
        ),
        "signed_at": normalize_project_date(
            extracted_contract.get("signed_at"),
            field="Contract signed_at",
        ),
        "start_date": normalize_project_date(
            extracted_contract.get("start_date"),
            field="Contract start_date",
        ),
        "planned_end_date": normalize_project_date(
            extracted_contract.get("planned_end_date"),
            field="Contract planned_end_date",
        ),
        "amount": validate_project_metric(extracted_contract.get("amount"), field="Contract amount") or 0.0,
        "advance_terms": normalize_project_text(
            extracted_contract.get("advance_terms"),
            default=str(existing_contract["advance_terms"] or ""),
        ),
        "extraction_status": "review",
        "source_file_name": (
            str(existing_contract["source_file_name"]) if existing_contract["source_file_name"] else None
        ),
        "source_mime_type": (
            str(existing_contract["source_mime_type"]) if existing_contract["source_mime_type"] else None
        ),
        "source_storage_key": (
            str(existing_contract["source_storage_key"]) if existing_contract["source_storage_key"] else None
        ),
        "uploaded_at": str(existing_contract["uploaded_at"]) if existing_contract["uploaded_at"] else None,
    }

    return contract_values, build_extracted_project_contract_milestones(extracted_contract)
