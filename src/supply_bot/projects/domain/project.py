"""Доменные builders для самого проекта и его авансов.

Модуль отвечает за:
- подготовку данных проекта к созданию и обновлению;
- сборку API payload проекта;
- нормализацию и сборку данных по авансам.
"""

from __future__ import annotations

from typing import Any, Mapping

from supply_bot.projects.domain.common import (
    ALLOWED_PROJECT_ADVANCE_STATUSES,
    DEFAULT_PROJECT_ESTIMATE_SOURCE,
    ProjectValidationError,
    normalize_project_date,
    normalize_project_name,
    normalize_project_stage_label,
    normalize_project_stage_tone,
    normalize_project_text,
    validate_project_metric,
)


# Нормализация и сборка данных самого проекта.
def normalize_project_advance_status(value: str | None) -> str:
    normalized = (value or "").strip().lower()
    if normalized in ALLOWED_PROJECT_ADVANCE_STATUSES:
        return normalized
    return "paid"


def build_project_create_values(
    payload: Any,
    *,
    default_code: str,
    default_name: str | None = None,
) -> dict[str, Any]:
    return {
        "code": normalize_project_text(payload.code, default=default_code),
        "name": normalize_project_name(payload.name or default_name),
        "address": normalize_project_text(payload.address),
        "apartment": normalize_project_text(payload.apartment),
        "floor": normalize_project_text(payload.floor),
        "has_elevator": bool(payload.has_elevator),
        "site_access": normalize_project_text(payload.site_access),
        "intercom_code": normalize_project_text(payload.intercom_code),
        "responsible_person": normalize_project_text(payload.responsible_person),
        "stage_label": normalize_project_stage_label(payload.stage_label),
        "stage_tone": normalize_project_stage_tone(payload.stage_tone),
        "estimate_project_id": payload.estimate_project_id,
        "estimate_source": normalize_project_text(payload.estimate_source, default=DEFAULT_PROJECT_ESTIMATE_SOURCE),
        "area_m2": validate_project_metric(payload.area_m2, field="Area") or 0.0,
        "received_total": validate_project_metric(payload.received_total, field="Received total") or 0.0,
        "remaining_total": validate_project_metric(payload.remaining_total, field="Remaining total") or 0.0,
        "deferred_total": validate_project_metric(payload.deferred_total, field="Deferred total") or 0.0,
        "planned_total": validate_project_metric(payload.planned_total, field="Planned total") or 0.0,
        "actual_total": validate_project_metric(payload.actual_total, field="Actual total") or 0.0,
        "work_per_m2": validate_project_metric(payload.work_per_m2, field="Work per m2") or 0.0,
        "materials_per_m2": validate_project_metric(payload.materials_per_m2, field="Materials per m2") or 0.0,
        "planned_margin_percent": float(payload.planned_margin_percent or 0),
        "next_delivery_label": normalize_project_text(payload.next_delivery_label),
    }


def build_project_update_values(payload_data: Mapping[str, Any]) -> dict[str, Any]:
    updates: dict[str, Any] = {}
    if "code" in payload_data:
        normalized_code = normalize_project_text(payload_data["code"])
        if not normalized_code:
            raise ProjectValidationError("Project code is required")
        updates["code"] = normalized_code
    if "name" in payload_data:
        updates["name"] = normalize_project_name(payload_data["name"])
    if "address" in payload_data:
        updates["address"] = normalize_project_text(payload_data["address"])
    if "apartment" in payload_data:
        updates["apartment"] = normalize_project_text(payload_data["apartment"])
    if "floor" in payload_data:
        updates["floor"] = normalize_project_text(payload_data["floor"])
    if "has_elevator" in payload_data:
        updates["has_elevator"] = bool(payload_data["has_elevator"])
    if "site_access" in payload_data:
        updates["site_access"] = normalize_project_text(payload_data["site_access"])
    if "intercom_code" in payload_data:
        updates["intercom_code"] = normalize_project_text(payload_data["intercom_code"])
    if "responsible_person" in payload_data:
        updates["responsible_person"] = normalize_project_text(payload_data["responsible_person"])
    if "stage_label" in payload_data:
        updates["stage_label"] = normalize_project_stage_label(payload_data["stage_label"])
    if "stage_tone" in payload_data:
        updates["stage_tone"] = normalize_project_stage_tone(payload_data["stage_tone"])
    if "estimate_project_id" in payload_data:
        updates["estimate_project_id"] = payload_data["estimate_project_id"]
    if "estimate_source" in payload_data:
        updates["estimate_source"] = normalize_project_text(
            payload_data["estimate_source"],
            default=DEFAULT_PROJECT_ESTIMATE_SOURCE,
        )
    if "area_m2" in payload_data:
        updates["area_m2"] = validate_project_metric(payload_data["area_m2"], field="Area")
    if "received_total" in payload_data:
        updates["received_total"] = validate_project_metric(payload_data["received_total"], field="Received total")
    if "remaining_total" in payload_data:
        updates["remaining_total"] = validate_project_metric(payload_data["remaining_total"], field="Remaining total")
    if "deferred_total" in payload_data:
        updates["deferred_total"] = validate_project_metric(payload_data["deferred_total"], field="Deferred total")
    if "planned_total" in payload_data:
        updates["planned_total"] = validate_project_metric(payload_data["planned_total"], field="Planned total")
    if "actual_total" in payload_data:
        updates["actual_total"] = validate_project_metric(payload_data["actual_total"], field="Actual total")
    if "work_per_m2" in payload_data:
        updates["work_per_m2"] = validate_project_metric(payload_data["work_per_m2"], field="Work per m2")
    if "materials_per_m2" in payload_data:
        updates["materials_per_m2"] = validate_project_metric(
            payload_data["materials_per_m2"],
            field="Materials per m2",
        )
    if "planned_margin_percent" in payload_data:
        updates["planned_margin_percent"] = float(payload_data["planned_margin_percent"] or 0)
    if "next_delivery_label" in payload_data:
        updates["next_delivery_label"] = normalize_project_text(payload_data["next_delivery_label"])
    return updates


def build_project_payload(project: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "id": int(project["id"]),
        "code": str(project["code"]),
        "name": str(project["name"]),
        "address": str(project["address"] or ""),
        "apartment": str(project["apartment"] or ""),
        "floor": str(project["floor"] or ""),
        "has_elevator": bool(project["has_elevator"]),
        "site_access": str(project["site_access"] or ""),
        "intercom_code": str(project["intercom_code"] or ""),
        "responsible_person": str(project["responsible_person"] or ""),
        "stage_label": str(project["stage_label"]),
        "stage_tone": str(project["stage_tone"]),
        "estimate_project_id": (
            int(project["estimate_project_id"]) if project["estimate_project_id"] is not None else None
        ),
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


# Отдельный блок для авансов проекта.
def build_project_advance_create_values(payload: Any) -> dict[str, Any]:
    amount = validate_project_metric(payload.amount, field="Advance amount")
    assert amount is not None
    if amount <= 0:
        raise ProjectValidationError("Advance amount must be greater than zero")

    return {
        "title": normalize_project_text(payload.title, default="Аванс"),
        "amount": amount,
        "date": normalize_project_date(payload.date, field="Advance date", required=True),
        "status": normalize_project_advance_status(payload.status),
    }


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
