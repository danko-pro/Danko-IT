from __future__ import annotations

from typing import Any, Mapping, Sequence

from supply_bot.projects.domain.common import (
    ALLOWED_PROJECT_CONTRACT_MILESTONE_KINDS,
    ALLOWED_PROJECT_CONTRACT_MILESTONE_STATUSES,
    default_project_contract_milestone_status,
    normalize_project_date,
    normalize_project_text,
    validate_project_metric,
)


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


def build_project_contract_milestones_values(milestones: Sequence[Any]) -> list[dict[str, Any]]:
    milestones_payload = []
    for index, milestone in enumerate(milestones, start=1):
        milestones_payload.append(
            {
                "kind": normalize_project_contract_milestone_kind(milestone.kind),
                "title": normalize_project_text(milestone.title),
                "planned_date": normalize_project_date(
                    milestone.planned_date,
                    field="Contract milestone planned_date",
                    required=True,
                ),
                "amount": validate_project_metric(
                    milestone.amount,
                    field="Contract milestone amount",
                    allow_none=True,
                ),
                "note": normalize_project_text(milestone.note),
                "status": normalize_project_contract_milestone_status(milestone.status),
                "sort_order": milestone.sort_order if milestone.sort_order is not None else index * 10,
            }
        )
    return milestones_payload


def build_extracted_project_contract_milestones(extracted_contract: Mapping[str, Any]) -> list[dict[str, Any]]:
    milestones_payload = []
    for index, milestone in enumerate(extracted_contract.get("milestones") or [], start=1):
        if not isinstance(milestone, Mapping):
            continue
        planned_date = normalize_project_date(
            milestone.get("planned_date"),
            field="Contract milestone planned_date",
        )
        if not planned_date:
            continue
        raw_status = normalize_project_text(milestone.get("status"))
        milestones_payload.append(
            {
                "kind": normalize_project_contract_milestone_kind(milestone.get("kind")),
                "title": normalize_project_text(milestone.get("title")),
                "planned_date": planned_date,
                "amount": validate_project_metric(
                    milestone.get("amount"),
                    field="Contract milestone amount",
                    allow_none=True,
                ),
                "note": normalize_project_text(milestone.get("note")),
                "status": (
                    normalize_project_contract_milestone_status(raw_status)
                    if raw_status
                    else default_project_contract_milestone_status(planned_date)
                ),
                "sort_order": index * 10,
            }
        )
    return milestones_payload


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


def build_project_contract_milestone_update_values(payload_data: Mapping[str, Any]) -> dict[str, Any]:
    updates: dict[str, Any] = {}
    if "title" in payload_data:
        updates["title"] = normalize_project_text(payload_data["title"])
    if "planned_date" in payload_data:
        updates["planned_date"] = normalize_project_date(
            payload_data["planned_date"],
            field="Contract milestone planned_date",
            required=True,
        )
    if "amount" in payload_data:
        updates["amount"] = validate_project_metric(
            payload_data["amount"],
            field="Contract milestone amount",
            allow_none=True,
        )
    if "note" in payload_data:
        updates["note"] = normalize_project_text(payload_data["note"])
    if "status" in payload_data:
        updates["status"] = normalize_project_contract_milestone_status(payload_data["status"])
    return updates
