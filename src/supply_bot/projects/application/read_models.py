from __future__ import annotations

from typing import Any, Mapping

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
