from __future__ import annotations

from typing import Any, Mapping

from supply_bot.projects.domain.ledger import build_project_ledger_entry_payload
from supply_bot.projects.domain.project import build_project_advance_payload, build_project_payload


def build_project_read_payload(project: Mapping[str, Any]) -> dict[str, Any]:
    return build_project_payload(project)


def build_project_advance_read_payload(advance: Mapping[str, Any]) -> dict[str, Any]:
    return build_project_advance_payload(advance)


def build_project_advance_response_payload(
    *,
    advance: Mapping[str, Any],
    project: Mapping[str, Any],
) -> dict[str, Any]:
    return {
        "advance": build_project_advance_read_payload(advance),
        "project": build_project_read_payload(project),
    }


def build_project_advance_delete_response_payload(
    *,
    advance_id: int,
    project: Mapping[str, Any],
) -> dict[str, Any]:
    return {
        "deleted": True,
        "advance_id": advance_id,
        "project": build_project_read_payload(project),
    }


def build_project_ledger_entry_read_payload(
    entry: Mapping[str, Any],
    *,
    invoice_document: Mapping[str, Any] | None = None,
    act_document: Mapping[str, Any] | None = None,
) -> dict[str, Any]:
    return build_project_ledger_entry_payload(
        entry,
        invoice_document=invoice_document,
        act_document=act_document,
    )


def build_project_ledger_entries_read_payloads(
    *,
    entries: list[Mapping[str, Any]],
    documents: list[Mapping[str, Any]],
) -> list[dict[str, Any]]:
    documents_by_entry: dict[int, dict[str, Mapping[str, Any]]] = {}
    for document in documents:
        documents_by_entry.setdefault(int(document["ledger_entry_id"]), {})[str(document["kind"])] = document

    return [
        build_project_ledger_entry_read_payload(
            entry,
            invoice_document=documents_by_entry.get(int(entry["id"]), {}).get("invoice"),
            act_document=documents_by_entry.get(int(entry["id"]), {}).get("act"),
        )
        for entry in entries
    ]


def build_project_ledger_entry_response_payload(
    *,
    entry: Mapping[str, Any],
    project: Mapping[str, Any],
    invoice_document: Mapping[str, Any] | None = None,
    act_document: Mapping[str, Any] | None = None,
) -> dict[str, Any]:
    return {
        "entry": build_project_ledger_entry_read_payload(
            entry,
            invoice_document=invoice_document,
            act_document=act_document,
        ),
        "project": build_project_read_payload(project),
    }


def build_project_ledger_entry_delete_response_payload(
    *,
    entry_id: int,
    project: Mapping[str, Any],
) -> dict[str, Any]:
    return {
        "deleted": True,
        "entry_id": entry_id,
        "project": build_project_read_payload(project),
    }
