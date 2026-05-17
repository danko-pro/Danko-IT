from __future__ import annotations

import unittest
from typing import Any

from supply_bot.projects.application.list_projects import ListProjectsUseCase


def _project_row(**overrides: object) -> dict[str, Any]:
    row: dict[str, Any] = {
        "id": 10,
        "code": "PR-10",
        "name": "Project A",
        "address": "Address",
        "entrance_section": "A",
        "apartment": "12",
        "floor": "3",
        "room_count": 2,
        "has_elevator": True,
        "site_access": "Gate",
        "access_hours": "09:00-18:00",
        "intercom_code": "1234",
        "responsible_person": "Manager",
        "comment": "Note",
        "stage_label": "In progress",
        "stage_tone": "active",
        "estimate_project_id": None,
        "estimate_project_name": None,
        "estimate_source": "manual",
        "area_m2": 55.5,
        "ceiling_height_m": 2.8,
        "received_total": 1000,
        "remaining_total": 2000,
        "deferred_total": 300,
        "planned_total": 4000,
        "actual_total": 1500,
        "work_per_m2": 100,
        "materials_per_m2": 200,
        "planned_margin_percent": 15,
        "next_delivery_label": "Tomorrow",
        "created_at": "2026-05-01T10:00:00",
        "updated_at": "2026-05-02T10:00:00",
    }
    row.update(overrides)
    return row


class FakeProjectsListStorage:
    def __init__(self, projects: list[dict[str, Any]]) -> None:
        self.projects = projects
        self.list_called = False

    async def list_projects(self) -> list[dict[str, Any]]:
        self.list_called = True
        return self.projects


class ListProjectsUseCaseTests(unittest.IsolatedAsyncioTestCase):
    async def test_returns_project_payloads_with_existing_response_shape(self) -> None:
        storage = FakeProjectsListStorage([_project_row()])

        result = await ListProjectsUseCase(storage).execute()

        self.assertTrue(storage.list_called)
        self.assertEqual(
            result,
            [
                {
                    "id": 10,
                    "code": "PR-10",
                    "name": "Project A",
                    "address": "Address",
                    "entrance_section": "A",
                    "apartment": "12",
                    "floor": "3",
                    "room_count": 2,
                    "has_elevator": True,
                    "site_access": "Gate",
                    "access_hours": "09:00-18:00",
                    "intercom_code": "1234",
                    "responsible_person": "Manager",
                    "comment": "Note",
                    "stage_label": "In progress",
                    "stage_tone": "active",
                    "estimate_project_id": None,
                    "estimate_project_name": None,
                    "estimate_source": "manual",
                    "area_m2": 55.5,
                    "ceiling_height_m": 2.8,
                    "received_total": 1000.0,
                    "remaining_total": 2000.0,
                    "deferred_total": 300.0,
                    "planned_total": 4000.0,
                    "actual_total": 1500.0,
                    "work_per_m2": 100.0,
                    "materials_per_m2": 200.0,
                    "planned_margin_percent": 15.0,
                    "next_delivery_label": "Tomorrow",
                    "created_at": "2026-05-01T10:00:00",
                    "updated_at": "2026-05-02T10:00:00",
                }
            ],
        )

    async def test_returns_empty_list_as_is(self) -> None:
        storage = FakeProjectsListStorage([])

        result = await ListProjectsUseCase(storage).execute()

        self.assertEqual(result, [])
