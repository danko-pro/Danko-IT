from __future__ import annotations

import secrets
from datetime import date
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, File, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse

from supply_bot.admin_api.auth import AdminSession
from supply_bot.admin_api.deps import require_admin_session
from supply_bot.config import Settings
from supply_bot.projects.service import (
    DEFAULT_PROJECT_ESTIMATE_SOURCE,
    build_project_advance_payload,
    build_default_project_code,
    build_project_contract_milestone_payload,
    build_project_contract_payload,
    build_project_ledger_document_payload,
    build_project_ledger_entry_payload,
    build_project_payload,
    normalize_project_advance_status,
    normalize_project_contract_extraction_status,
    normalize_project_contract_milestone_kind,
    normalize_project_contract_milestone_status,
    normalize_project_ledger_status,
    normalize_project_name,
    normalize_project_stage_label,
    normalize_project_stage_tone,
    normalize_project_text,
)
from supply_bot.projects.contract_extraction import ProjectContractExtractor, extract_contract_text
from supply_bot.storage import BotStorage


def _validated_metric(value: float | None, *, field: str, allow_none: bool = False) -> float | None:
    if value is None:
        if allow_none:
            return None
        raise HTTPException(status_code=400, detail=f"{field} is required")
    if value < 0:
        raise HTTPException(status_code=400, detail=f"{field} cannot be negative")
    return float(value)


def _document_title_for_kind(kind: str) -> str:
    return "Счёт" if kind == "invoice" else "Акт"


def _document_suffix(file_name: str | None) -> str:
    suffix = Path(file_name or "").suffix.strip().lower()
    return suffix or ".bin"


def _resolve_document_path(settings_obj: Settings, storage_key: str) -> Path:
    root = settings_obj.project_documents_dir.resolve()
    resolved = (root / storage_key).resolve()
    try:
        resolved.relative_to(root)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid project document path") from exc
    return resolved


async def _write_project_document_file(
    request: Request,
    *,
    project_id: int,
    entry_id: int,
    kind: str,
    uploaded_file: UploadFile,
) -> tuple[str, str]:
    settings_obj: Settings = request.app.state.settings
    root = settings_obj.project_documents_dir.resolve()
    target_dir = root / f"project-{project_id}" / "ledger" / f"entry-{entry_id}"
    target_dir.mkdir(parents=True, exist_ok=True)

    storage_name = f"{kind}-{secrets.token_hex(8)}{_document_suffix(uploaded_file.filename)}"
    target_path = (target_dir / storage_name).resolve()
    target_path.relative_to(root)

    file_bytes = await uploaded_file.read()
    target_path.write_bytes(file_bytes)

    relative_path = target_path.relative_to(root).as_posix()
    return relative_path, uploaded_file.content_type or "application/octet-stream"


async def _build_project_ledger_documents_map(
    storage_obj: BotStorage,
    *,
    project_id: int,
) -> dict[int, dict[str, dict[str, Any]]]:
    documents = await storage_obj.list_project_ledger_documents(project_id)
    result: dict[int, dict[str, dict[str, Any]]] = {}
    for document in documents:
        result.setdefault(int(document["ledger_entry_id"]), {})[str(document["kind"])] = document
    return result


async def _build_project_ledger_payloads(
    storage_obj: BotStorage,
    *,
    project_id: int,
    entries: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    documents_by_entry = await _build_project_ledger_documents_map(storage_obj, project_id=project_id)
    return [
        build_project_ledger_entry_payload(
            entry,
            invoice_document=documents_by_entry.get(int(entry["id"]), {}).get("invoice"),
            act_document=documents_by_entry.get(int(entry["id"]), {}).get("act"),
        )
        for entry in entries
    ]


async def _build_project_contract_payload(
    storage_obj: BotStorage,
    *,
    project_id: int,
) -> dict[str, Any] | None:
    contract = await storage_obj.get_project_contract(project_id)
    if not contract:
        return None

    milestones = await storage_obj.list_project_contract_milestones(int(contract["id"]))
    return build_project_contract_payload(
        contract,
        milestones=[build_project_contract_milestone_payload(milestone) for milestone in milestones],
    )


def _normalize_contract_date(value: str | None, *, field: str) -> str:
    normalized = normalize_project_text(value)
    if not normalized:
        return ""
    try:
        return date.fromisoformat(normalized).isoformat()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"{field} must be in YYYY-MM-DD format") from exc


def _default_contract_milestone_status(planned_date: str) -> str:
    try:
        return "due" if date.fromisoformat(planned_date) <= date.today() else "upcoming"
    except ValueError:
        return "upcoming"


async def _apply_extracted_contract_payload(
    request: Request,
    *,
    project_id: int,
    extracted_contract: dict[str, Any],
) -> dict[str, Any]:
    storage_obj: BotStorage = request.app.state.storage
    existing_contract = await storage_obj.get_project_contract(project_id)
    if not existing_contract:
        raise HTTPException(status_code=404, detail="Project contract not found")

    contract_id = await storage_obj.upsert_project_contract(
        project_id=project_id,
        file_name=normalize_project_text(
            extracted_contract.get("file_name"),
            default=str(existing_contract["file_name"] or existing_contract["source_file_name"] or ""),
        ),
        title=normalize_project_text(extracted_contract.get("title"), default=str(existing_contract["title"] or "")),
        number=normalize_project_text(extracted_contract.get("number"), default=str(existing_contract["number"] or "")),
        signed_at=_normalize_contract_date(extracted_contract.get("signed_at"), field="Contract signed_at"),
        start_date=_normalize_contract_date(extracted_contract.get("start_date"), field="Contract start_date"),
        planned_end_date=_normalize_contract_date(
            extracted_contract.get("planned_end_date"),
            field="Contract planned_end_date",
        ),
        amount=_validated_metric(extracted_contract.get("amount"), field="Contract amount") or 0.0,
        advance_terms=normalize_project_text(
            extracted_contract.get("advance_terms"),
            default=str(existing_contract["advance_terms"] or ""),
        ),
        extraction_status="review",
        source_file_name=str(existing_contract["source_file_name"]) if existing_contract["source_file_name"] else None,
        source_mime_type=str(existing_contract["source_mime_type"]) if existing_contract["source_mime_type"] else None,
        source_storage_key=str(existing_contract["source_storage_key"]) if existing_contract["source_storage_key"] else None,
        uploaded_at=str(existing_contract["uploaded_at"]) if existing_contract["uploaded_at"] else None,
    )

    milestones_payload = []
    for index, milestone in enumerate(extracted_contract.get("milestones") or [], start=1):
        if not isinstance(milestone, dict):
            continue
        planned_date = _normalize_contract_date(milestone.get("planned_date"), field="Contract milestone planned_date")
        if not planned_date:
            continue
        raw_status = normalize_project_text(milestone.get("status"))
        milestones_payload.append(
            {
                "kind": normalize_project_contract_milestone_kind(milestone.get("kind")),
                "title": normalize_project_text(milestone.get("title")),
                "planned_date": planned_date,
                "amount": _validated_metric(milestone.get("amount"), field="Contract milestone amount", allow_none=True),
                "note": normalize_project_text(milestone.get("note")),
                "status": (
                    normalize_project_contract_milestone_status(raw_status)
                    if raw_status
                    else _default_contract_milestone_status(planned_date)
                ),
                "sort_order": index * 10,
            }
        )

    await storage_obj.replace_project_contract_milestones(contract_id=contract_id, milestones=milestones_payload)
    contract_payload = await _build_project_contract_payload(storage_obj, project_id=project_id)
    if not contract_payload:
        raise HTTPException(status_code=500, detail="Project contract extraction apply failed")
    return contract_payload


def register_project_routes(
    app: FastAPI,
    *,
    project_create_payload_model,
    project_update_payload_model,
    project_advance_create_payload_model,
    project_ledger_entry_create_payload_model,
    project_ledger_entry_update_payload_model,
    project_ledger_document_update_payload_model,
    project_contract_update_payload_model,
    project_contract_milestone_update_payload_model,
) -> None:
    @app.get("/api/projects")
    async def list_projects(
        request: Request,
        _session: AdminSession = Depends(require_admin_session),
    ) -> list[dict[str, Any]]:
        storage_obj: BotStorage = request.app.state.storage
        rows = await storage_obj.list_projects()
        return [build_project_payload(row) for row in rows]

    async def create_project(
        request: Request,
        payload,
        _session: AdminSession = Depends(require_admin_session),
    ) -> dict[str, Any]:
        storage_obj: BotStorage = request.app.state.storage

        estimate_project = None
        if payload.estimate_project_id is not None:
            estimate_project = await storage_obj.get_estimate_project(payload.estimate_project_id)
            if not estimate_project:
                raise HTTPException(status_code=404, detail="Linked calculator project not found")

        project_count = await storage_obj.count_projects()
        code = normalize_project_text(payload.code, default=build_default_project_code(project_count + 1))
        name = normalize_project_name(payload.name or (estimate_project["name"] if estimate_project else None))

        project_id = await storage_obj.create_project(
            code=code,
            name=name,
            stage_label=normalize_project_stage_label(payload.stage_label),
            stage_tone=normalize_project_stage_tone(payload.stage_tone),
            estimate_project_id=payload.estimate_project_id,
            estimate_source=normalize_project_text(payload.estimate_source, default=DEFAULT_PROJECT_ESTIMATE_SOURCE),
            area_m2=_validated_metric(payload.area_m2, field="Area") or 0.0,
            received_total=_validated_metric(payload.received_total, field="Received total") or 0.0,
            remaining_total=_validated_metric(payload.remaining_total, field="Remaining total") or 0.0,
            deferred_total=_validated_metric(payload.deferred_total, field="Deferred total") or 0.0,
            planned_total=_validated_metric(payload.planned_total, field="Planned total") or 0.0,
            actual_total=_validated_metric(payload.actual_total, field="Actual total") or 0.0,
            work_per_m2=_validated_metric(payload.work_per_m2, field="Work per m2") or 0.0,
            materials_per_m2=_validated_metric(payload.materials_per_m2, field="Materials per m2") or 0.0,
            planned_margin_percent=float(payload.planned_margin_percent or 0),
            next_delivery_label=normalize_project_text(payload.next_delivery_label),
        )
        project = await storage_obj.get_project(project_id)
        if not project:
            raise HTTPException(status_code=500, detail="Project was not created")
        return build_project_payload(project)

    create_project.__annotations__["payload"] = project_create_payload_model
    app.post("/api/projects")(create_project)

    @app.get("/api/projects/{project_id}")
    async def project_detail(
        request: Request,
        project_id: int,
        _session: AdminSession = Depends(require_admin_session),
    ) -> dict[str, Any]:
        storage_obj: BotStorage = request.app.state.storage
        project = await storage_obj.get_project(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        return build_project_payload(project)

    async def update_project(
        request: Request,
        project_id: int,
        payload,
        _session: AdminSession = Depends(require_admin_session),
    ) -> dict[str, Any]:
        storage_obj: BotStorage = request.app.state.storage
        current = await storage_obj.get_project(project_id)
        if not current:
            raise HTTPException(status_code=404, detail="Project not found")

        payload_data = payload.model_dump(exclude_unset=True)
        if not payload_data:
            return build_project_payload(current)

        if "estimate_project_id" in payload_data and payload_data["estimate_project_id"] is not None:
            estimate_project = await storage_obj.get_estimate_project(int(payload_data["estimate_project_id"]))
            if not estimate_project:
                raise HTTPException(status_code=404, detail="Linked calculator project not found")

        updates: dict[str, Any] = {}
        if "code" in payload_data:
            normalized_code = normalize_project_text(payload_data["code"])
            if not normalized_code:
                raise HTTPException(status_code=400, detail="Project code is required")
            updates["code"] = normalized_code
        if "name" in payload_data:
            updates["name"] = normalize_project_name(payload_data["name"])
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
            updates["area_m2"] = _validated_metric(payload_data["area_m2"], field="Area")
        if "received_total" in payload_data:
            updates["received_total"] = _validated_metric(payload_data["received_total"], field="Received total")
        if "remaining_total" in payload_data:
            updates["remaining_total"] = _validated_metric(payload_data["remaining_total"], field="Remaining total")
        if "deferred_total" in payload_data:
            updates["deferred_total"] = _validated_metric(payload_data["deferred_total"], field="Deferred total")
        if "planned_total" in payload_data:
            updates["planned_total"] = _validated_metric(payload_data["planned_total"], field="Planned total")
        if "actual_total" in payload_data:
            updates["actual_total"] = _validated_metric(payload_data["actual_total"], field="Actual total")
        if "work_per_m2" in payload_data:
            updates["work_per_m2"] = _validated_metric(payload_data["work_per_m2"], field="Work per m2")
        if "materials_per_m2" in payload_data:
            updates["materials_per_m2"] = _validated_metric(payload_data["materials_per_m2"], field="Materials per m2")
        if "planned_margin_percent" in payload_data:
            updates["planned_margin_percent"] = float(payload_data["planned_margin_percent"] or 0)
        if "next_delivery_label" in payload_data:
            updates["next_delivery_label"] = normalize_project_text(payload_data["next_delivery_label"])

        await storage_obj.update_project(project_id, **updates)
        project = await storage_obj.get_project(project_id)
        if not project:
            raise HTTPException(status_code=500, detail="Project update failed")
        return build_project_payload(project)

    update_project.__annotations__["payload"] = project_update_payload_model
    app.patch("/api/projects/{project_id}")(update_project)

    @app.delete("/api/projects/{project_id}")
    async def delete_project(
        request: Request,
        project_id: int,
        _session: AdminSession = Depends(require_admin_session),
    ) -> dict[str, Any]:
        storage_obj: BotStorage = request.app.state.storage
        project = await storage_obj.get_project(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        await storage_obj.delete_project(project_id)
        return {"deleted": True, "project_id": project_id}

    @app.get("/api/projects/{project_id}/advances")
    async def list_project_advances(
        request: Request,
        project_id: int,
        _session: AdminSession = Depends(require_admin_session),
    ) -> list[dict[str, Any]]:
        storage_obj: BotStorage = request.app.state.storage
        project = await storage_obj.get_project(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        advances = await storage_obj.list_project_advances(project_id)
        return [build_project_advance_payload(advance) for advance in advances]

    async def create_project_advance(
        request: Request,
        project_id: int,
        payload,
        sync_totals: bool = True,
        _session: AdminSession = Depends(require_admin_session),
    ) -> dict[str, Any]:
        storage_obj: BotStorage = request.app.state.storage
        project = await storage_obj.get_project(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        title = normalize_project_text(payload.title, default="Аванс")
        amount = _validated_metric(payload.amount, field="Advance amount")
        assert amount is not None
        if amount <= 0:
            raise HTTPException(status_code=400, detail="Advance amount must be greater than zero")

        date_value = normalize_project_text(payload.date)
        if not date_value:
            raise HTTPException(status_code=400, detail="Advance date is required")
        try:
            normalized_date = date.fromisoformat(date_value).isoformat()
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="Advance date must be in YYYY-MM-DD format") from exc

        advance_id = await storage_obj.create_project_advance(
            project_id=project_id,
            title=title,
            amount=amount,
            date=normalized_date,
            status=normalize_project_advance_status(payload.status),
            sync_totals=sync_totals,
        )
        advance = await storage_obj.get_project_advance(advance_id)
        updated_project = await storage_obj.get_project(project_id)
        if not advance or not updated_project:
            raise HTTPException(status_code=500, detail="Project advance was not created")
        return {
            "advance": build_project_advance_payload(advance),
            "project": build_project_payload(updated_project),
        }

    create_project_advance.__annotations__["payload"] = project_advance_create_payload_model
    app.post("/api/projects/{project_id}/advances")(create_project_advance)

    @app.delete("/api/projects/{project_id}/advances/{advance_id}")
    async def delete_project_advance(
        request: Request,
        project_id: int,
        advance_id: int,
        _session: AdminSession = Depends(require_admin_session),
    ) -> dict[str, Any]:
        storage_obj: BotStorage = request.app.state.storage
        project = await storage_obj.get_project(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        advance = await storage_obj.get_project_advance(advance_id)
        if not advance or int(advance["project_id"]) != project_id:
            raise HTTPException(status_code=404, detail="Project advance not found")

        deleted_advance = await storage_obj.delete_project_advance(advance_id)
        updated_project = await storage_obj.get_project(project_id)
        if not deleted_advance or not updated_project:
            raise HTTPException(status_code=500, detail="Project advance deletion failed")
        return {
            "deleted": True,
            "advance_id": advance_id,
            "project": build_project_payload(updated_project),
        }

    @app.get("/api/projects/{project_id}/ledger")
    async def list_project_ledger_entries(
        request: Request,
        project_id: int,
        _session: AdminSession = Depends(require_admin_session),
    ) -> list[dict[str, Any]]:
        storage_obj: BotStorage = request.app.state.storage
        project = await storage_obj.get_project(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        entries = await storage_obj.list_project_ledger_entries(project_id)
        return await _build_project_ledger_payloads(storage_obj, project_id=project_id, entries=entries)

    async def create_project_ledger_entry(
        request: Request,
        project_id: int,
        payload,
        sync_summary: bool = True,
        _session: AdminSession = Depends(require_admin_session),
    ) -> dict[str, Any]:
        storage_obj: BotStorage = request.app.state.storage
        project = await storage_obj.get_project(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        counterparty_details = payload.counterparty_details
        entry_id = await storage_obj.create_project_ledger_entry(
            project_id=project_id,
            category=normalize_project_text(payload.category, default="Работы"),
            item=normalize_project_text(payload.item),
            owner=normalize_project_text(payload.owner),
            counterparty=normalize_project_text(payload.counterparty),
            counterparty_inn=normalize_project_text(counterparty_details.inn) if counterparty_details else None,
            counterparty_legal_name=(
                normalize_project_text(counterparty_details.legalName) if counterparty_details else None
            ),
            counterparty_manager_name=(
                normalize_project_text(counterparty_details.managerName) if counterparty_details else None
            ),
            counterparty_email=normalize_project_text(counterparty_details.email) if counterparty_details else None,
            counterparty_phone=normalize_project_text(counterparty_details.phone) if counterparty_details else None,
            counterparty_messenger=(
                normalize_project_text(counterparty_details.messenger) if counterparty_details else None
            ),
            status=normalize_project_ledger_status(payload.status),
            plan_amount=_validated_metric(payload.plan_amount, field="Plan amount") or 0.0,
            actual_amount=_validated_metric(payload.actual_amount, field="Actual amount") or 0.0,
            control_date=normalize_project_text(payload.control_date),
            sync_summary=sync_summary,
        )
        entry = await storage_obj.get_project_ledger_entry(entry_id)
        updated_project = await storage_obj.get_project(project_id)
        if not entry or not updated_project:
            raise HTTPException(status_code=500, detail="Project ledger entry was not created")
        return {
            "entry": build_project_ledger_entry_payload(entry),
            "project": build_project_payload(updated_project),
        }

    create_project_ledger_entry.__annotations__["payload"] = project_ledger_entry_create_payload_model
    app.post("/api/projects/{project_id}/ledger")(create_project_ledger_entry)

    async def update_project_ledger_entry(
        request: Request,
        project_id: int,
        entry_id: int,
        payload,
        _session: AdminSession = Depends(require_admin_session),
    ) -> dict[str, Any]:
        storage_obj: BotStorage = request.app.state.storage
        project = await storage_obj.get_project(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        entry = await storage_obj.get_project_ledger_entry(entry_id)
        if not entry or int(entry["project_id"]) != project_id:
            raise HTTPException(status_code=404, detail="Project ledger entry not found")

        payload_data = payload.model_dump(exclude_unset=True)
        if not payload_data:
            return {
                "entry": build_project_ledger_entry_payload(entry),
                "project": build_project_payload(project),
            }

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
            details = payload.counterparty_details
            updates["counterparty_inn"] = normalize_project_text(details.inn) if details else None
            updates["counterparty_legal_name"] = normalize_project_text(details.legalName) if details else None
            updates["counterparty_manager_name"] = normalize_project_text(details.managerName) if details else None
            updates["counterparty_email"] = normalize_project_text(details.email) if details else None
            updates["counterparty_phone"] = normalize_project_text(details.phone) if details else None
            updates["counterparty_messenger"] = normalize_project_text(details.messenger) if details else None
        if "status" in payload_data:
            updates["status"] = normalize_project_ledger_status(payload_data["status"])
        if "plan_amount" in payload_data:
            updates["plan_amount"] = _validated_metric(payload_data["plan_amount"], field="Plan amount")
        if "actual_amount" in payload_data:
            updates["actual_amount"] = _validated_metric(payload_data["actual_amount"], field="Actual amount")
        if "control_date" in payload_data:
            updates["control_date"] = normalize_project_text(payload_data["control_date"])

        await storage_obj.update_project_ledger_entry(entry_id, **updates)
        updated_entry = await storage_obj.get_project_ledger_entry(entry_id)
        updated_project = await storage_obj.get_project(project_id)
        if not updated_entry or not updated_project:
            raise HTTPException(status_code=500, detail="Project ledger entry update failed")
        invoice_document = await storage_obj.get_project_ledger_document(ledger_entry_id=entry_id, kind="invoice")
        act_document = await storage_obj.get_project_ledger_document(ledger_entry_id=entry_id, kind="act")
        return {
            "entry": build_project_ledger_entry_payload(
                updated_entry,
                invoice_document=invoice_document,
                act_document=act_document,
            ),
            "project": build_project_payload(updated_project),
        }

    update_project_ledger_entry.__annotations__["payload"] = project_ledger_entry_update_payload_model
    app.patch("/api/projects/{project_id}/ledger/{entry_id}")(update_project_ledger_entry)

    @app.delete("/api/projects/{project_id}/ledger/{entry_id}")
    async def delete_project_ledger_entry(
        request: Request,
        project_id: int,
        entry_id: int,
        _session: AdminSession = Depends(require_admin_session),
    ) -> dict[str, Any]:
        storage_obj: BotStorage = request.app.state.storage
        project = await storage_obj.get_project(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        entry = await storage_obj.get_project_ledger_entry(entry_id)
        if not entry or int(entry["project_id"]) != project_id:
            raise HTTPException(status_code=404, detail="Project ledger entry not found")

        deleted_entry = await storage_obj.delete_project_ledger_entry(entry_id)
        updated_project = await storage_obj.get_project(project_id)
        if not deleted_entry or not updated_project:
            raise HTTPException(status_code=500, detail="Project ledger entry deletion failed")
        return {
            "deleted": True,
            "entry_id": entry_id,
            "project": build_project_payload(updated_project),
        }

    @app.get("/api/projects/{project_id}/contract")
    async def get_project_contract(
        request: Request,
        project_id: int,
        _session: AdminSession = Depends(require_admin_session),
    ) -> dict[str, Any] | None:
        storage_obj: BotStorage = request.app.state.storage
        project = await storage_obj.get_project(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        return await _build_project_contract_payload(storage_obj, project_id=project_id)

    async def upsert_project_contract(
        request: Request,
        project_id: int,
        payload,
        _session: AdminSession = Depends(require_admin_session),
    ) -> dict[str, Any]:
        storage_obj: BotStorage = request.app.state.storage
        project = await storage_obj.get_project(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        existing_contract = await storage_obj.get_project_contract(project_id)
        payload_data = payload.model_dump()

        contract_id = await storage_obj.upsert_project_contract(
            project_id=project_id,
            file_name=normalize_project_text(
                payload_data["file_name"],
                default=str(existing_contract["file_name"]) if existing_contract else "",
            ),
            title=normalize_project_text(
                payload_data["title"],
                default=str(existing_contract["title"]) if existing_contract else "",
            ),
            number=normalize_project_text(
                payload_data["number"],
                default=str(existing_contract["number"]) if existing_contract else "",
            ),
            signed_at=normalize_project_text(
                payload_data["signed_at"],
                default=str(existing_contract["signed_at"]) if existing_contract else "",
            ),
            start_date=normalize_project_text(
                payload_data["start_date"],
                default=str(existing_contract["start_date"]) if existing_contract else "",
            ),
            planned_end_date=normalize_project_text(
                payload_data["planned_end_date"],
                default=str(existing_contract["planned_end_date"]) if existing_contract else "",
            ),
            amount=_validated_metric(payload_data["amount"], field="Contract amount") or 0.0,
            advance_terms=normalize_project_text(
                payload_data["advance_terms"],
                default=str(existing_contract["advance_terms"]) if existing_contract else "",
            ),
            extraction_status=normalize_project_contract_extraction_status(payload_data["extraction_status"]),
            source_file_name=str(existing_contract["source_file_name"]) if existing_contract else None,
            source_mime_type=str(existing_contract["source_mime_type"]) if existing_contract else None,
            source_storage_key=str(existing_contract["source_storage_key"]) if existing_contract else None,
            uploaded_at=str(existing_contract["uploaded_at"]) if existing_contract and existing_contract["uploaded_at"] else None,
        )

        milestones_payload = []
        for index, milestone in enumerate(payload.milestones, start=1):
            planned_date = normalize_project_text(milestone.planned_date)
            if not planned_date:
                raise HTTPException(status_code=400, detail="Contract milestone planned_date is required")
            try:
                normalized_planned_date = date.fromisoformat(planned_date).isoformat()
            except ValueError as exc:
                raise HTTPException(status_code=400, detail="Contract milestone date must be in YYYY-MM-DD format") from exc

            milestones_payload.append(
                {
                    "kind": normalize_project_contract_milestone_kind(milestone.kind),
                    "title": normalize_project_text(milestone.title),
                    "planned_date": normalized_planned_date,
                    "amount": _validated_metric(milestone.amount, field="Contract milestone amount", allow_none=True),
                    "note": normalize_project_text(milestone.note),
                    "status": normalize_project_contract_milestone_status(milestone.status),
                    "sort_order": milestone.sort_order if milestone.sort_order is not None else index * 10,
                }
            )

        await storage_obj.replace_project_contract_milestones(contract_id=contract_id, milestones=milestones_payload)
        contract_payload = await _build_project_contract_payload(storage_obj, project_id=project_id)
        if not contract_payload:
            raise HTTPException(status_code=500, detail="Project contract update failed")
        return contract_payload

    upsert_project_contract.__annotations__["payload"] = project_contract_update_payload_model
    app.put("/api/projects/{project_id}/contract")(upsert_project_contract)

    async def upload_project_contract_file(
        request: Request,
        project_id: int,
        file: UploadFile = File(...),
        _session: AdminSession = Depends(require_admin_session),
    ) -> dict[str, Any]:
        storage_obj: BotStorage = request.app.state.storage
        project = await storage_obj.get_project(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        if not file.filename:
            raise HTTPException(status_code=400, detail="Contract file is required")

        settings_obj: Settings = request.app.state.settings
        root = settings_obj.project_documents_dir.resolve()
        target_dir = root / f"project-{project_id}" / "contract"
        target_dir.mkdir(parents=True, exist_ok=True)
        storage_name = f"contract-{secrets.token_hex(8)}{_document_suffix(file.filename)}"
        target_path = (target_dir / storage_name).resolve()
        target_path.relative_to(root)
        target_path.write_bytes(await file.read())
        storage_key = target_path.relative_to(root).as_posix()

        existing_contract = await storage_obj.get_project_contract(project_id)
        previous_storage_key = str(existing_contract["source_storage_key"]) if existing_contract and existing_contract["source_storage_key"] else None

        await storage_obj.upsert_project_contract(
            project_id=project_id,
            file_name=str(existing_contract["file_name"]) if existing_contract and existing_contract["file_name"] else file.filename,
            title=str(existing_contract["title"]) if existing_contract else "",
            number=str(existing_contract["number"]) if existing_contract else "",
            signed_at=str(existing_contract["signed_at"]) if existing_contract else "",
            start_date=str(existing_contract["start_date"]) if existing_contract else "",
            planned_end_date=str(existing_contract["planned_end_date"]) if existing_contract else "",
            amount=float(existing_contract["amount"]) if existing_contract else 0.0,
            advance_terms=str(existing_contract["advance_terms"]) if existing_contract else "",
            extraction_status=(
                normalize_project_contract_extraction_status(str(existing_contract["extraction_status"]))
                if existing_contract
                else "review"
            ),
            source_file_name=file.filename,
            source_mime_type=file.content_type or "application/octet-stream",
            source_storage_key=storage_key,
            uploaded_at=date.today().isoformat(),
        )

        if previous_storage_key and previous_storage_key != storage_key:
            old_path = _resolve_document_path(settings_obj, previous_storage_key)
            if old_path.exists():
                old_path.unlink()

        contract_payload = await _build_project_contract_payload(storage_obj, project_id=project_id)
        if not contract_payload:
            raise HTTPException(status_code=500, detail="Project contract upload failed")
        return contract_payload

    app.post("/api/projects/{project_id}/contract/upload")(upload_project_contract_file)

    @app.delete("/api/projects/{project_id}/contract")
    async def delete_project_contract(
        request: Request,
        project_id: int,
        _session: AdminSession = Depends(require_admin_session),
    ) -> dict[str, Any]:
        storage_obj: BotStorage = request.app.state.storage
        project = await storage_obj.get_project(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        deleted_contract = await storage_obj.delete_project_contract(project_id)
        if not deleted_contract:
            raise HTTPException(status_code=404, detail="Project contract not found")

        settings_obj: Settings = request.app.state.settings
        storage_key = str(deleted_contract["source_storage_key"] or "").strip()
        if storage_key:
            file_path = _resolve_document_path(settings_obj, storage_key)
            if file_path.exists():
                file_path.unlink()

        return {"deleted": True, "project_id": project_id}

    @app.post("/api/projects/{project_id}/contract/extract")
    async def extract_project_contract(
        request: Request,
        project_id: int,
        _session: AdminSession = Depends(require_admin_session),
    ) -> dict[str, Any]:
        settings_obj: Settings = request.app.state.settings
        if not settings_obj.llm_enabled:
            raise HTTPException(status_code=503, detail="LLM extraction is not configured")

        storage_obj: BotStorage = request.app.state.storage
        project = await storage_obj.get_project(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        contract = await storage_obj.get_project_contract(project_id)
        if not contract or not contract["source_storage_key"]:
            raise HTTPException(status_code=404, detail="Project contract file not found")

        file_path = _resolve_document_path(settings_obj, str(contract["source_storage_key"]))
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Project contract file not found")

        try:
            contract_text = extract_contract_text(file_path, mime_type=str(contract["source_mime_type"] or ""))
        except Exception as exc:
            raise HTTPException(status_code=422, detail="Failed to extract contract text") from exc

        if not contract_text.strip():
            raise HTTPException(status_code=422, detail="Contract text is empty after extraction")

        extractor = ProjectContractExtractor(settings_obj)
        extracted_contract = await extractor.extract_contract(
            file_name=str(contract["source_file_name"] or contract["file_name"] or file_path.name),
            contract_text=contract_text,
        )
        if not extracted_contract:
            raise HTTPException(status_code=502, detail="LLM did not return contract extraction result")

        return await _apply_extracted_contract_payload(
            request,
            project_id=project_id,
            extracted_contract=extracted_contract,
        )

    async def update_project_contract_milestone(
        request: Request,
        project_id: int,
        milestone_id: int,
        payload,
        _session: AdminSession = Depends(require_admin_session),
    ) -> dict[str, Any]:
        storage_obj: BotStorage = request.app.state.storage
        project = await storage_obj.get_project(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        contract = await storage_obj.get_project_contract(project_id)
        if not contract:
            raise HTTPException(status_code=404, detail="Project contract not found")

        milestone = await storage_obj.get_project_contract_milestone(milestone_id)
        if not milestone or int(milestone["contract_id"]) != int(contract["id"]):
            raise HTTPException(status_code=404, detail="Project contract milestone not found")

        payload_data = payload.model_dump(exclude_unset=True)
        if not payload_data:
            contract_payload = await _build_project_contract_payload(storage_obj, project_id=project_id)
            if not contract_payload:
                raise HTTPException(status_code=500, detail="Project contract lookup failed")
            return contract_payload

        updates: dict[str, Any] = {}
        if "title" in payload_data:
            updates["title"] = normalize_project_text(payload_data["title"])
        if "planned_date" in payload_data:
            raw_planned_date = normalize_project_text(payload_data["planned_date"])
            if raw_planned_date:
                try:
                    updates["planned_date"] = date.fromisoformat(raw_planned_date).isoformat()
                except ValueError as exc:
                    raise HTTPException(status_code=400, detail="Contract milestone date must be in YYYY-MM-DD format") from exc
            else:
                raise HTTPException(status_code=400, detail="Contract milestone planned_date is required")
        if "amount" in payload_data:
            updates["amount"] = _validated_metric(payload_data["amount"], field="Contract milestone amount", allow_none=True)
        if "note" in payload_data:
            updates["note"] = normalize_project_text(payload_data["note"])
        if "status" in payload_data:
            updates["status"] = normalize_project_contract_milestone_status(payload_data["status"])

        await storage_obj.update_project_contract_milestone(milestone_id, **updates)
        contract_payload = await _build_project_contract_payload(storage_obj, project_id=project_id)
        if not contract_payload:
            raise HTTPException(status_code=500, detail="Project contract milestone update failed")
        return contract_payload

    update_project_contract_milestone.__annotations__["payload"] = project_contract_milestone_update_payload_model
    app.patch("/api/projects/{project_id}/contract/milestones/{milestone_id}")(update_project_contract_milestone)

    @app.get("/api/projects/{project_id}/contract/download")
    async def download_project_contract(
        request: Request,
        project_id: int,
        _session: AdminSession = Depends(require_admin_session),
    ) -> FileResponse:
        storage_obj: BotStorage = request.app.state.storage
        project = await storage_obj.get_project(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        contract = await storage_obj.get_project_contract(project_id)
        if not contract or not contract["source_storage_key"]:
            raise HTTPException(status_code=404, detail="Project contract file not found")

        file_path = _resolve_document_path(request.app.state.settings, str(contract["source_storage_key"]))
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Project contract file not found")

        return FileResponse(
            path=file_path,
            media_type=str(contract["source_mime_type"] or "application/octet-stream"),
            filename=str(contract["source_file_name"] or contract["file_name"] or "contract"),
        )

    async def upload_project_ledger_document(
        request: Request,
        project_id: int,
        entry_id: int,
        kind: str,
        file: UploadFile = File(...),
        _session: AdminSession = Depends(require_admin_session),
    ) -> dict[str, Any]:
        if kind not in {"invoice", "act"}:
            raise HTTPException(status_code=404, detail="Unsupported document kind")

        storage_obj: BotStorage = request.app.state.storage
        project = await storage_obj.get_project(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        entry = await storage_obj.get_project_ledger_entry(entry_id)
        if not entry or int(entry["project_id"]) != project_id:
            raise HTTPException(status_code=404, detail="Project ledger entry not found")

        if not file.filename:
            raise HTTPException(status_code=400, detail="Document file is required")

        existing_document = await storage_obj.get_project_ledger_document(ledger_entry_id=entry_id, kind=kind)
        previous_storage_key = str(existing_document["source_storage_key"]) if existing_document else None
        storage_key, mime_type = await _write_project_document_file(
            request,
            project_id=project_id,
            entry_id=entry_id,
            kind=kind,
            uploaded_file=file,
        )

        default_amount = float(entry["plan_amount"] if kind == "invoice" else (entry["actual_amount"] or entry["plan_amount"]) or 0)
        default_date = str(entry["control_date"] or date.today().isoformat())

        document_id = await storage_obj.upsert_project_ledger_document(
            project_id=project_id,
            ledger_entry_id=entry_id,
            kind=kind,
            title=str(existing_document["title"]) if existing_document else _document_title_for_kind(kind),
            date=str(existing_document["date"]) if existing_document and existing_document["date"] else default_date,
            amount=float(existing_document["amount"]) if existing_document else default_amount,
            source_file_name=file.filename,
            source_mime_type=mime_type,
            source_storage_key=storage_key,
            extracted_by_ai=bool(existing_document["extracted_by_ai"]) if existing_document else False,
            verified_by_user=bool(existing_document["verified_by_user"]) if existing_document else False,
        )
        document = await storage_obj.get_project_ledger_document(ledger_entry_id=entry_id, kind=kind)
        if not document:
            raise HTTPException(status_code=500, detail="Project document upload failed")

        if previous_storage_key and previous_storage_key != storage_key:
            old_path = _resolve_document_path(request.app.state.settings, previous_storage_key)
            if old_path.exists():
                old_path.unlink()

        invoice_document = document if kind == "invoice" else await storage_obj.get_project_ledger_document(ledger_entry_id=entry_id, kind="invoice")
        act_document = document if kind == "act" else await storage_obj.get_project_ledger_document(ledger_entry_id=entry_id, kind="act")
        return {
            "document": build_project_ledger_document_payload(document),
            "entry": build_project_ledger_entry_payload(
                entry,
                invoice_document=invoice_document,
                act_document=act_document,
            ),
            "document_id": document_id,
        }

    app.post("/api/projects/{project_id}/ledger/{entry_id}/documents/{kind}/upload")(upload_project_ledger_document)

    async def update_project_ledger_document(
        request: Request,
        project_id: int,
        entry_id: int,
        kind: str,
        payload,
        _session: AdminSession = Depends(require_admin_session),
    ) -> dict[str, Any]:
        if kind not in {"invoice", "act"}:
            raise HTTPException(status_code=404, detail="Unsupported document kind")

        storage_obj: BotStorage = request.app.state.storage
        project = await storage_obj.get_project(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        entry = await storage_obj.get_project_ledger_entry(entry_id)
        if not entry or int(entry["project_id"]) != project_id:
            raise HTTPException(status_code=404, detail="Project ledger entry not found")

        document = await storage_obj.get_project_ledger_document(ledger_entry_id=entry_id, kind=kind)
        if not document:
            raise HTTPException(status_code=404, detail="Project document not found")

        payload_data = payload.model_dump(exclude_unset=True)
        if not payload_data:
            return {
                "document": build_project_ledger_document_payload(document),
                "entry": build_project_ledger_entry_payload(
                    entry,
                    invoice_document=document if kind == "invoice" else await storage_obj.get_project_ledger_document(ledger_entry_id=entry_id, kind="invoice"),
                    act_document=document if kind == "act" else await storage_obj.get_project_ledger_document(ledger_entry_id=entry_id, kind="act"),
                ),
            }

        updates: dict[str, Any] = {}
        if "title" in payload_data:
            updates["title"] = normalize_project_text(payload_data["title"], default=_document_title_for_kind(kind))
        if "date" in payload_data:
            raw_date = normalize_project_text(payload_data["date"])
            if raw_date:
                try:
                    updates["date"] = date.fromisoformat(raw_date).isoformat()
                except ValueError as exc:
                    raise HTTPException(status_code=400, detail="Document date must be in YYYY-MM-DD format") from exc
            else:
                updates["date"] = ""
        if "amount" in payload_data:
            updates["amount"] = _validated_metric(payload_data["amount"], field="Document amount")
        if "extracted_by_ai" in payload_data:
            updates["extracted_by_ai"] = 1 if bool(payload_data["extracted_by_ai"]) else 0
        if "verified_by_user" in payload_data:
            updates["verified_by_user"] = 1 if bool(payload_data["verified_by_user"]) else 0

        await storage_obj.update_project_ledger_document(ledger_entry_id=entry_id, kind=kind, **updates)
        updated_document = await storage_obj.get_project_ledger_document(ledger_entry_id=entry_id, kind=kind)
        if not updated_document:
            raise HTTPException(status_code=500, detail="Project document update failed")

        invoice_document = updated_document if kind == "invoice" else await storage_obj.get_project_ledger_document(ledger_entry_id=entry_id, kind="invoice")
        act_document = updated_document if kind == "act" else await storage_obj.get_project_ledger_document(ledger_entry_id=entry_id, kind="act")
        return {
            "document": build_project_ledger_document_payload(updated_document),
            "entry": build_project_ledger_entry_payload(
                entry,
                invoice_document=invoice_document,
                act_document=act_document,
            ),
        }

    update_project_ledger_document.__annotations__["payload"] = project_ledger_document_update_payload_model
    app.patch("/api/projects/{project_id}/ledger/{entry_id}/documents/{kind}")(update_project_ledger_document)

    @app.get("/api/projects/{project_id}/ledger/{entry_id}/documents/{kind}/download")
    async def download_project_ledger_document(
        request: Request,
        project_id: int,
        entry_id: int,
        kind: str,
        _session: AdminSession = Depends(require_admin_session),
    ) -> FileResponse:
        if kind not in {"invoice", "act"}:
            raise HTTPException(status_code=404, detail="Unsupported document kind")

        storage_obj: BotStorage = request.app.state.storage
        project = await storage_obj.get_project(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        entry = await storage_obj.get_project_ledger_entry(entry_id)
        if not entry or int(entry["project_id"]) != project_id:
            raise HTTPException(status_code=404, detail="Project ledger entry not found")

        document = await storage_obj.get_project_ledger_document(ledger_entry_id=entry_id, kind=kind)
        if not document:
            raise HTTPException(status_code=404, detail="Project document not found")

        file_path = _resolve_document_path(request.app.state.settings, str(document["source_storage_key"]))
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Project document file not found")

        return FileResponse(
            path=file_path,
            media_type=str(document["source_mime_type"] or "application/octet-stream"),
            filename=str(document["source_file_name"]),
        )
