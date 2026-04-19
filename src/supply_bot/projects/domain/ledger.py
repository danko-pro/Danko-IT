"""Доменные builders для project ledger и связанных документов.

Модуль знает, как:
- нормализовать и валидировать ledger entry;
- собрать payload документа и самой ledger-записи;
- подготовить values для загрузки и обновления документов.
"""

from __future__ import annotations

from datetime import date
from typing import Any, Mapping

from supply_bot.projects.domain.common import (
    ALLOWED_PROJECT_LEDGER_STATUSES,
    document_title_for_kind,
    normalize_project_date,
    normalize_project_text,
    validate_project_metric,
)


# Нормализация и сборка данных ledger entry.
def normalize_project_ledger_status(value: str | None) -> str:
    normalized = (value or "").strip().lower()
    if normalized in ALLOWED_PROJECT_LEDGER_STATUSES:
        return normalized
    return "planned"


def _build_counterparty_values(details: Any | None) -> dict[str, Any]:
    return {
        "counterparty_inn": normalize_project_text(details.inn) if details else None,
        "counterparty_legal_name": normalize_project_text(details.legalName) if details else None,
        "counterparty_manager_name": normalize_project_text(details.managerName) if details else None,
        "counterparty_email": normalize_project_text(details.email) if details else None,
        "counterparty_phone": normalize_project_text(details.phone) if details else None,
        "counterparty_messenger": normalize_project_text(details.messenger) if details else None,
    }


def build_project_ledger_create_values(payload: Any) -> dict[str, Any]:
    return {
        "category": normalize_project_text(payload.category, default="Работы"),
        "item": normalize_project_text(payload.item),
        "owner": normalize_project_text(payload.owner),
        "counterparty": normalize_project_text(payload.counterparty),
        **_build_counterparty_values(payload.counterparty_details),
        "status": normalize_project_ledger_status(payload.status),
        "plan_amount": validate_project_metric(payload.plan_amount, field="Plan amount") or 0.0,
        "actual_amount": validate_project_metric(payload.actual_amount, field="Actual amount") or 0.0,
        "control_date": normalize_project_text(payload.control_date),
    }


def build_project_ledger_update_values(
    payload_data: Mapping[str, Any],
    *,
    counterparty_details: Any | None = None,
) -> dict[str, Any]:
    updates: dict[str, Any] = {}
    if "category" in payload_data:
        updates["category"] = normalize_project_text(payload_data["category"], default="Работы")
    if "item" in payload_data:
        updates["item"] = normalize_project_text(payload_data["item"])
    if "owner" in payload_data:
        updates["owner"] = normalize_project_text(payload_data["owner"])
    if "counterparty" in payload_data:
        updates["counterparty"] = normalize_project_text(payload_data["counterparty"])
    if "counterparty_details" in payload_data:
        updates.update(_build_counterparty_values(counterparty_details))
    if "status" in payload_data:
        updates["status"] = normalize_project_ledger_status(payload_data["status"])
    if "plan_amount" in payload_data:
        updates["plan_amount"] = validate_project_metric(payload_data["plan_amount"], field="Plan amount")
    if "actual_amount" in payload_data:
        updates["actual_amount"] = validate_project_metric(payload_data["actual_amount"], field="Actual amount")
    if "control_date" in payload_data:
        updates["control_date"] = normalize_project_text(payload_data["control_date"])
    return updates


# Блок helpers для документов ledger.
def build_project_ledger_document_payload(document: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "id": int(document["id"]),
        "project_id": int(document["project_id"]),
        "ledger_entry_id": int(document["ledger_entry_id"]),
        "kind": str(document["kind"]),
        "title": str(document["title"] or ""),
        "date": str(document["date"] or ""),
        "amount": float(document["amount"] or 0),
        "source_file": {
            "id": f"source-{int(document['id'])}",
            "file_name": str(document["source_file_name"]),
            "mime_type": str(document["source_mime_type"] or "application/octet-stream"),
            "uploaded_at": str(document["uploaded_at"]),
        },
        "download_url": (
            f"/api/projects/{int(document['project_id'])}/ledger/{int(document['ledger_entry_id'])}/documents/{str(document['kind'])}/download"
        ),
        "extracted_by_ai": bool(document["extracted_by_ai"]),
        "verified_by_user": bool(document["verified_by_user"]),
        "created_at": str(document["created_at"]),
        "updated_at": str(document["updated_at"]),
    }


def build_project_document_update_values(payload_data: Mapping[str, Any], *, kind: str) -> dict[str, Any]:
    updates: dict[str, Any] = {}
    if "title" in payload_data:
        updates["title"] = normalize_project_text(payload_data["title"], default=document_title_for_kind(kind))
    if "date" in payload_data:
        updates["date"] = normalize_project_date(payload_data["date"], field="Document date")
    if "amount" in payload_data:
        updates["amount"] = validate_project_metric(payload_data["amount"], field="Document amount")
    if "extracted_by_ai" in payload_data:
        updates["extracted_by_ai"] = 1 if bool(payload_data["extracted_by_ai"]) else 0
    if "verified_by_user" in payload_data:
        updates["verified_by_user"] = 1 if bool(payload_data["verified_by_user"]) else 0
    return updates


def build_project_ledger_document_create_values(
    *,
    kind: str,
    entry: Mapping[str, Any],
    existing_document: Mapping[str, Any] | None,
    source_file_name: str,
    source_mime_type: str,
    source_storage_key: str,
) -> dict[str, Any]:
    default_amount = float(
        entry["plan_amount"] if kind == "invoice" else (entry["actual_amount"] or entry["plan_amount"]) or 0
    )
    default_date = str(entry["control_date"] or date.today().isoformat())
    return {
        "title": str(existing_document["title"]) if existing_document else document_title_for_kind(kind),
        "date": str(existing_document["date"]) if existing_document and existing_document["date"] else default_date,
        "amount": float(existing_document["amount"]) if existing_document else default_amount,
        "source_file_name": source_file_name,
        "source_mime_type": source_mime_type,
        "source_storage_key": source_storage_key,
        "extracted_by_ai": bool(existing_document["extracted_by_ai"]) if existing_document else False,
        "verified_by_user": bool(existing_document["verified_by_user"]) if existing_document else False,
    }


def build_project_ledger_entry_payload(
    entry: Mapping[str, Any],
    *,
    invoice_document: Mapping[str, Any] | None = None,
    act_document: Mapping[str, Any] | None = None,
) -> dict[str, Any]:
    counterparty_legal_name = str(entry["counterparty_legal_name"] or "").strip()
    counterparty_details = None
    if (
        str(entry["counterparty_inn"] or "").strip()
        or counterparty_legal_name
        or str(entry["counterparty_manager_name"] or "").strip()
        or str(entry["counterparty_email"] or "").strip()
        or str(entry["counterparty_phone"] or "").strip()
        or str(entry["counterparty_messenger"] or "").strip()
    ):
        counterparty_details = {
            "inn": str(entry["counterparty_inn"] or ""),
            "legalName": counterparty_legal_name,
            "managerName": str(entry["counterparty_manager_name"] or ""),
            "email": str(entry["counterparty_email"] or ""),
            "phone": str(entry["counterparty_phone"] or ""),
            "messenger": str(entry["counterparty_messenger"] or ""),
        }

    return {
        "id": int(entry["id"]),
        "project_id": int(entry["project_id"]),
        "category": str(entry["category"]),
        "item": str(entry["item"]),
        "owner": str(entry["owner"] or ""),
        "counterparty": str(entry["counterparty"] or ""),
        "counterparty_details": counterparty_details,
        "status": str(entry["status"]),
        "invoice_document": build_project_ledger_document_payload(invoice_document) if invoice_document else None,
        "act_document": build_project_ledger_document_payload(act_document) if act_document else None,
        "plan_amount": float(entry["plan_amount"] or 0),
        "actual_amount": float(entry["actual_amount"] or 0),
        "control_date": str(entry["control_date"] or ""),
        "sort_order": int(entry["sort_order"] or 0),
        "created_at": str(entry["created_at"]),
        "updated_at": str(entry["updated_at"]),
    }
