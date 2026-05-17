from __future__ import annotations

from typing import Any, Mapping

from supply_bot.projects.domain.project import build_project_payload


def build_project_read_payload(project: Mapping[str, Any]) -> dict[str, Any]:
    return build_project_payload(project)
