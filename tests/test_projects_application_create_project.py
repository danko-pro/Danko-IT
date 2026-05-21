from __future__ import annotations

import unittest
from dataclasses import dataclass
from typing import Any, Mapping

from supply_bot.application.errors import NotFoundError, OperationFailedError, ValidationError
from supply_bot.projects.application.create_project import CreateProjectCommand, CreateProjectUseCase
from supply_bot.projects.domain.common import build_default_project_code
from tests.test_projects_application_list_projects import _project_row


@dataclass
class ProjectCreatePayload:
    code: str | None = None
    name: str | None = "Project A"
    address: str | None = ""
    entrance_section: str | None = ""
    apartment: str | None = ""
    floor: str | None = ""
    room_count: int | float | None = 0
    has_elevator: bool = False
    site_access: str | None = ""
    access_hours: str | None = ""
    intercom_code: str | None = ""
    responsible_person: str | None = ""
    comment: str | None = ""
    stage_label: str | None = None
    stage_tone: str | None = None
    estimate_project_id: int | None = None
    estimate_source: str | None = None
    area_m2: float | int | None = 0
    ceiling_height_m: float | int | None = 0
    received_total: float | int | None = 0
    remaining_total: float | int | None = 0
    deferred_total: float | int | None = 0
    planned_total: float | int | None = 0
    actual_total: float | int | None = 0
    work_per_m2: float | int | None = 0
    materials_per_m2: float | int | None = 0
    planned_margin_percent: float | int | None = 0
    tax_rate_percent: float | int | None = 0
    tax_base_mode: str | None = "received_total"
    next_delivery_label: str | None = ""


class FakeProjectCreateStorage:
    def __init__(
        self,
        *,
        project_count: int = 0,
        estimate_project: Mapping[str, Any] | None = None,
        created_project: Mapping[str, Any] | None = None,
        created_project_id: int = 10,
    ) -> None:
        self.project_count = project_count
        self.estimate_project = estimate_project
        self.created_project = created_project
        self.created_project_id = created_project_id
        self.estimate_project_id: int | None = None
        self.count_called = False
        self.created_values: dict[str, Any] | None = None
        self.loaded_project_id: int | None = None

    async def get_estimate_project(self, estimate_project_id: int) -> Mapping[str, Any] | None:
        self.estimate_project_id = estimate_project_id
        return self.estimate_project

    async def count_projects(self) -> int:
        self.count_called = True
        return self.project_count

    async def create_project(self, **data: Any) -> int:
        self.created_values = data
        return self.created_project_id

    async def get_project(self, project_id: int) -> Mapping[str, Any] | None:
        self.loaded_project_id = project_id
        return self.created_project


class CreateProjectUseCaseTests(unittest.IsolatedAsyncioTestCase):
    async def test_create_without_estimate_project_returns_existing_project_payload_shape(self) -> None:
        expected_code = build_default_project_code(6)
        storage = FakeProjectCreateStorage(
            project_count=5,
            created_project=_project_row(id=15, code=expected_code, name="Project A"),
            created_project_id=15,
        )

        result = await CreateProjectUseCase(storage).execute(
            CreateProjectCommand(payload=ProjectCreatePayload(name="  Project A  "))
        )

        self.assertTrue(storage.count_called)
        self.assertEqual(storage.created_values["code"], expected_code)
        self.assertEqual(storage.created_values["name"], "Project A")
        self.assertEqual(storage.created_values["tax_rate_percent"], 0.0)
        self.assertEqual(storage.created_values["tax_base_mode"], "received_total")
        self.assertEqual(storage.loaded_project_id, 15)
        self.assertEqual(result["id"], 15)
        self.assertEqual(result["code"], expected_code)
        self.assertEqual(set(result), set(_expected_project_payload_keys()))

    async def test_create_with_estimate_project_uses_estimate_name_as_default_name(self) -> None:
        storage = FakeProjectCreateStorage(
            estimate_project={"id": 77, "name": "  Estimate Project  "},
            created_project=_project_row(
                id=16,
                name="Estimate Project",
                estimate_project_id=77,
                estimate_project_name="Estimate Project",
            ),
            created_project_id=16,
        )

        result = await CreateProjectUseCase(storage).execute(
            CreateProjectCommand(payload=ProjectCreatePayload(name=None, estimate_project_id=77))
        )

        self.assertEqual(storage.estimate_project_id, 77)
        self.assertEqual(storage.created_values["name"], "Estimate Project")
        self.assertEqual(storage.created_values["estimate_project_id"], 77)
        self.assertEqual(result["estimate_project_id"], 77)
        self.assertEqual(result["estimate_project_name"], "Estimate Project")

    async def test_missing_linked_estimate_project_raises_not_found(self) -> None:
        storage = FakeProjectCreateStorage(estimate_project=None)

        with self.assertRaisesRegex(NotFoundError, "Linked calculator project not found"):
            await CreateProjectUseCase(storage).execute(
                CreateProjectCommand(payload=ProjectCreatePayload(estimate_project_id=404))
            )

        self.assertIsNone(storage.created_values)

    async def test_domain_validation_error_becomes_application_validation_error(self) -> None:
        storage = FakeProjectCreateStorage()

        with self.assertRaisesRegex(ValidationError, "Area cannot be negative"):
            await CreateProjectUseCase(storage).execute(
                CreateProjectCommand(payload=ProjectCreatePayload(area_m2=-1))
            )

        self.assertIsNone(storage.created_values)

    async def test_read_after_write_failure_raises_operation_failed(self) -> None:
        storage = FakeProjectCreateStorage(created_project=None, created_project_id=20)

        with self.assertRaisesRegex(OperationFailedError, "Project was not created"):
            await CreateProjectUseCase(storage).execute(CreateProjectCommand(payload=ProjectCreatePayload()))

        self.assertEqual(storage.loaded_project_id, 20)


def _expected_project_payload_keys() -> dict[str, object]:
    return {
        "id": None,
        "code": None,
        "name": None,
        "address": None,
        "entrance_section": None,
        "apartment": None,
        "floor": None,
        "room_count": None,
        "has_elevator": None,
        "site_access": None,
        "access_hours": None,
        "intercom_code": None,
        "responsible_person": None,
        "comment": None,
        "stage_label": None,
        "stage_tone": None,
        "estimate_project_id": None,
        "estimate_project_name": None,
        "estimate_source": None,
        "area_m2": None,
        "ceiling_height_m": None,
        "received_total": None,
        "remaining_total": None,
        "deferred_total": None,
        "planned_total": None,
        "actual_total": None,
        "work_per_m2": None,
        "materials_per_m2": None,
        "planned_margin_percent": None,
        "tax_rate_percent": None,
        "tax_base_mode": None,
        "next_delivery_label": None,
        "created_at": None,
        "updated_at": None,
    }
