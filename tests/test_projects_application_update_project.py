from __future__ import annotations

import unittest
from typing import Any, Mapping

from supply_bot.application.errors import NotFoundError, OperationFailedError, ValidationError
from supply_bot.projects.application.update_project import UpdateProjectCommand, UpdateProjectUseCase
from tests.test_projects_application_list_projects import _project_row

_UNSET = object()


class FakeProjectUpdateStorage:
    def __init__(
        self,
        *,
        current_project: Mapping[str, Any] | None = None,
        updated_project: Mapping[str, Any] | None | object = _UNSET,
        estimate_project: Mapping[str, Any] | None = None,
    ) -> None:
        self.current_project = current_project
        self.updated_project = current_project if updated_project is _UNSET else updated_project
        self.estimate_project = estimate_project
        self.get_project_calls: list[int] = []
        self.estimate_project_id: int | None = None
        self.updated_project_id: int | None = None
        self.updates: dict[str, Any] | None = None

    async def get_project(self, project_id: int) -> Mapping[str, Any] | None:
        self.get_project_calls.append(project_id)
        if len(self.get_project_calls) == 1:
            return self.current_project
        return self.updated_project

    async def get_estimate_project(self, estimate_project_id: int) -> Mapping[str, Any] | None:
        self.estimate_project_id = estimate_project_id
        return self.estimate_project

    async def update_project(self, project_id: int, **updates: Any) -> object:
        self.updated_project_id = project_id
        self.updates = updates
        return True


class UpdateProjectUseCaseTests(unittest.IsolatedAsyncioTestCase):
    async def test_updates_regular_fields_and_returns_existing_project_payload_shape(self) -> None:
        storage = FakeProjectUpdateStorage(
            current_project=_project_row(id=10, name="Old name"),
            updated_project=_project_row(id=10, name="New name", address="New address"),
        )

        result = await UpdateProjectUseCase(storage).execute(
            UpdateProjectCommand(project_id=10, payload_data={"name": "  New name  ", "address": "  New address  "})
        )

        self.assertEqual(storage.get_project_calls, [10, 10])
        self.assertEqual(storage.updated_project_id, 10)
        self.assertEqual(storage.updates, {"name": "New name", "address": "New address"})
        self.assertEqual(result["name"], "New name")
        self.assertEqual(result["address"], "New address")
        self.assertEqual(set(result), set(_expected_project_payload_keys()))

    async def test_empty_patch_returns_current_project_without_update(self) -> None:
        storage = FakeProjectUpdateStorage(current_project=_project_row(id=10, name="Current"))

        result = await UpdateProjectUseCase(storage).execute(UpdateProjectCommand(project_id=10, payload_data={}))

        self.assertEqual(storage.get_project_calls, [10])
        self.assertIsNone(storage.updates)
        self.assertEqual(result["name"], "Current")

    async def test_missing_project_raises_not_found(self) -> None:
        storage = FakeProjectUpdateStorage(current_project=None)

        with self.assertRaisesRegex(NotFoundError, "Project not found"):
            await UpdateProjectUseCase(storage).execute(
                UpdateProjectCommand(project_id=404, payload_data={"name": "A"})
            )

        self.assertIsNone(storage.updates)

    async def test_updates_estimate_project_when_linked_project_exists(self) -> None:
        storage = FakeProjectUpdateStorage(
            current_project=_project_row(id=10),
            updated_project=_project_row(id=10, estimate_project_id=99, estimate_project_name="Calc"),
            estimate_project={"id": 99, "name": "Calc"},
        )

        result = await UpdateProjectUseCase(storage).execute(
            UpdateProjectCommand(project_id=10, payload_data={"estimate_project_id": 99})
        )

        self.assertEqual(storage.estimate_project_id, 99)
        self.assertEqual(storage.updates, {"estimate_project_id": 99})
        self.assertEqual(result["estimate_project_id"], 99)

    async def test_missing_linked_estimate_project_raises_not_found_without_update(self) -> None:
        storage = FakeProjectUpdateStorage(current_project=_project_row(id=10), estimate_project=None)

        with self.assertRaisesRegex(NotFoundError, "Linked calculator project not found"):
            await UpdateProjectUseCase(storage).execute(
                UpdateProjectCommand(project_id=10, payload_data={"estimate_project_id": 404})
            )

        self.assertEqual(storage.estimate_project_id, 404)
        self.assertIsNone(storage.updates)

    async def test_domain_validation_error_becomes_application_validation_error(self) -> None:
        storage = FakeProjectUpdateStorage(current_project=_project_row(id=10))

        with self.assertRaisesRegex(ValidationError, "Area cannot be negative"):
            await UpdateProjectUseCase(storage).execute(
                UpdateProjectCommand(project_id=10, payload_data={"area_m2": -1})
            )

        self.assertIsNone(storage.updates)

    async def test_read_after_write_failure_raises_operation_failed(self) -> None:
        storage = FakeProjectUpdateStorage(current_project=_project_row(id=10), updated_project=None)

        with self.assertRaisesRegex(OperationFailedError, "Project update failed"):
            await UpdateProjectUseCase(storage).execute(UpdateProjectCommand(project_id=10, payload_data={"name": "A"}))

        self.assertEqual(storage.updated_project_id, 10)


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
        "next_delivery_label": None,
        "created_at": None,
        "updated_at": None,
    }
