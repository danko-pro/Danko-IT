from __future__ import annotations

from typing import Any, Mapping

DEFAULT_PROJECT_NAME = "Новый объект"
DEFAULT_PROJECT_STAGE_LABEL = "Черновик"
DEFAULT_PROJECT_STAGE_TONE = "neutral"
DEFAULT_PROJECT_ESTIMATE_SOURCE = "Смета калькулятора + ручной учет"
ALLOWED_PROJECT_STAGE_TONES = {"ok", "warn", "neutral", "active", "error"}
ALLOWED_PROJECT_ADVANCE_STATUSES = {"paid", "planned"}
ALLOWED_PROJECT_LEDGER_STATUSES = {"planned", "invoice", "waiting-payment", "paid", "completed"}
ALLOWED_PROJECT_CONTRACT_EXTRACTION_STATUSES = {"review", "verified"}
ALLOWED_PROJECT_CONTRACT_MILESTONE_KINDS = {"invoice", "payment", "deadline"}
ALLOWED_PROJECT_CONTRACT_MILESTONE_STATUSES = {"upcoming", "due", "completed"}


def build_default_project_code(sequence: int) -> str:
    safe_sequence = max(1, sequence)
    return f"НОВ / {safe_sequence:02d}"


def normalize_project_name(value: str | None) -> str:
    normalized = (value or "").strip()
    return normalized or DEFAULT_PROJECT_NAME


def normalize_project_stage_label(value: str | None) -> str:
    normalized = (value or "").strip()
    return normalized or DEFAULT_PROJECT_STAGE_LABEL


def normalize_project_stage_tone(value: str | None) -> str:
    normalized = (value or "").strip().lower()
    if normalized in ALLOWED_PROJECT_STAGE_TONES:
        return normalized
    return DEFAULT_PROJECT_STAGE_TONE


def normalize_project_text(value: str | None, *, default: str = "") -> str:
    normalized = (value or "").strip()
    return normalized or default


def build_project_payload(project: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "id": int(project["id"]),
        "code": str(project["code"]),
        "name": str(project["name"]),
        "stage_label": str(project["stage_label"]),
        "stage_tone": str(project["stage_tone"]),
        "estimate_project_id": int(project["estimate_project_id"]) if project["estimate_project_id"] is not None else None,
        "estimate_project_name": (
            str(project["estimate_project_name"]) if project.get("estimate_project_name") is not None else None
        ),
        "estimate_source": str(project["estimate_source"] or ""),
        "area_m2": float(project["area_m2"] or 0),
        "received_total": float(project["received_total"] or 0),
        "remaining_total": float(project["remaining_total"] or 0),
        "deferred_total": float(project["deferred_total"] or 0),
        "planned_total": float(project["planned_total"] or 0),
        "actual_total": float(project["actual_total"] or 0),
        "work_per_m2": float(project["work_per_m2"] or 0),
        "materials_per_m2": float(project["materials_per_m2"] or 0),
        "planned_margin_percent": float(project["planned_margin_percent"] or 0),
        "next_delivery_label": str(project["next_delivery_label"] or ""),
        "created_at": str(project["created_at"]),
        "updated_at": str(project["updated_at"]),
    }


def normalize_project_advance_status(value: str | None) -> str:
    normalized = (value or "").strip().lower()
    if normalized in ALLOWED_PROJECT_ADVANCE_STATUSES:
        return normalized
    return "paid"


def build_project_advance_payload(advance: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "id": int(advance["id"]),
        "project_id": int(advance["project_id"]),
        "title": str(advance["title"]),
        "amount": float(advance["amount"] or 0),
        "date": str(advance["date"]),
        "status": str(advance["status"]),
        "created_at": str(advance["created_at"]),
        "updated_at": str(advance["updated_at"]),
    }


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


def normalize_project_contract_extraction_status(value: str | None) -> str:
    normalized = (value or "").strip().lower()
    if normalized in ALLOWED_PROJECT_CONTRACT_EXTRACTION_STATUSES:
        return normalized
    return "review"


def normalize_project_contract_milestone_kind(value: str | None) -> str:
    normalized = (value or "").strip().lower()
    if normalized in ALLOWED_PROJECT_CONTRACT_MILESTONE_KINDS:
        return normalized
    return "deadline"


def normalize_project_contract_milestone_status(value: str | None) -> str:
    normalized = (value or "").strip().lower()
    if normalized in ALLOWED_PROJECT_CONTRACT_MILESTONE_STATUSES:
        return normalized
    return "upcoming"


def build_project_contract_milestone_payload(milestone: Mapping[str, Any]) -> dict[str, Any]:
    amount_value = milestone["amount"]
    return {
        "id": int(milestone["id"]),
        "contract_id": int(milestone["contract_id"]),
        "kind": str(milestone["kind"]),
        "title": str(milestone["title"] or ""),
        "planned_date": str(milestone["planned_date"] or ""),
        "amount": float(amount_value) if amount_value is not None else None,
        "note": str(milestone["note"] or ""),
        "status": str(milestone["status"] or "upcoming"),
        "sort_order": int(milestone["sort_order"] or 0),
        "created_at": str(milestone["created_at"]),
        "updated_at": str(milestone["updated_at"]),
    }


def normalize_project_ledger_status(value: str | None) -> str:
    normalized = (value or "").strip().lower()
    if normalized in ALLOWED_PROJECT_LEDGER_STATUSES:
        return normalized
    return "planned"


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
