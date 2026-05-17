from __future__ import annotations

import unittest
from typing import Any

from supply_bot.application.errors import NotFoundError, OperationFailedError, ValidationError
from supply_bot.estimates.application.project_door_components import (
    CreateProjectDoorComponentCommand,
    CreateProjectDoorComponentUseCase,
    DeleteProjectDoorComponentCommand,
    DeleteProjectDoorComponentUseCase,
    ProjectDoorComponentValuesCommand,
    UpdateProjectDoorComponentCommand,
    UpdateProjectDoorComponentUseCase,
)


class FakeProjectDoorComponentStorage:
    def __init__(
        self,
        *,
        component_catalog: list[dict[str, Any]] | None = None,
        created_component_id: int | None = 501,
        project_id_for_door: int | None = 10,
        update_project_id: int | None = 10,
        delete_project_id: int | None = 10,
    ) -> None:
        self.component_catalog = component_catalog or [
            {
                "id": 100,
                "category_code": "hardware",
                "title": "Catalog handle",
                "unit": "компл.",
            }
        ]
        self.created_component_id = created_component_id
        self.project_id_for_door = project_id_for_door
        self.update_project_id = update_project_id
        self.delete_project_id = delete_project_id
        self.create_calls: list[dict[str, object]] = []
        self.update_calls: list[tuple[int, dict[str, object]]] = []
        self.delete_calls: list[int] = []

    async def list_estimate_door_component_catalog(self) -> list[dict[str, Any]]:
        return self.component_catalog

    async def create_estimate_project_door_component(self, *, project_door_id: int, **kwargs: object) -> int | None:
        self.create_calls.append({"project_door_id": project_door_id, **kwargs})
        return self.created_component_id

    async def update_estimate_project_door_component(self, component_id: int, **kwargs: object) -> int | None:
        self.update_calls.append((component_id, kwargs))
        return self.update_project_id

    async def delete_estimate_project_door_component(self, component_id: int) -> int | None:
        self.delete_calls.append(component_id)
        return self.delete_project_id

    async def get_estimate_project_id_for_project_door(self, door_id: int) -> int | None:
        return self.project_id_for_door

    def assert_no_writes(self, test_case: unittest.TestCase) -> None:
        test_case.assertEqual(self.create_calls, [])
        test_case.assertEqual(self.update_calls, [])
        test_case.assertEqual(self.delete_calls, [])


def _component(**overrides: object) -> ProjectDoorComponentValuesCommand:
    values: dict[str, object] = {
        "component_catalog_id": None,
        "category_code": " Handles ",
        "title": " Ручка ",
        "unit": "  ",
        "quantity": 2,
        "purchase_price": 100,
        "sale_price": 150,
        "note": " Note ",
    }
    values.update(overrides)
    return ProjectDoorComponentValuesCommand(**values)


class ProjectDoorComponentUseCaseTests(unittest.IsolatedAsyncioTestCase):
    async def test_create_component_happy_path_without_catalog(self) -> None:
        storage = FakeProjectDoorComponentStorage(project_id_for_door=12)

        project_id = await CreateProjectDoorComponentUseCase(storage).execute(
            CreateProjectDoorComponentCommand(door_id=55, component=_component())
        )

        self.assertEqual(project_id, 12)
        self.assertEqual(
            storage.create_calls,
            [
                {
                    "project_door_id": 55,
                    "component_catalog_id": None,
                    "category_code": "handles",
                    "title": "Ручка",
                    "unit": "шт",
                    "quantity": 2.0,
                    "purchase_price": 100.0,
                    "sale_price": 150.0,
                    "note": "Note",
                }
            ],
        )

    async def test_create_uses_catalog_fallback(self) -> None:
        storage = FakeProjectDoorComponentStorage(project_id_for_door=12)

        await CreateProjectDoorComponentUseCase(storage).execute(
            CreateProjectDoorComponentCommand(
                door_id=55,
                component=_component(
                    component_catalog_id=100,
                    category_code=None,
                    title=None,
                    unit=None,
                ),
            )
        )

        call = storage.create_calls[0]
        self.assertEqual(call["category_code"], "hardware")
        self.assertEqual(call["title"], "Catalog handle")
        self.assertEqual(call["unit"], "компл.")

    async def test_create_rejects_missing_component_catalog(self) -> None:
        storage = FakeProjectDoorComponentStorage()

        with self.assertRaisesRegex(NotFoundError, "Door component catalog item not found"):
            await CreateProjectDoorComponentUseCase(storage).execute(
                CreateProjectDoorComponentCommand(door_id=55, component=_component(component_catalog_id=999))
            )

        storage.assert_no_writes(self)

    async def test_create_rejects_non_positive_quantity(self) -> None:
        storage = FakeProjectDoorComponentStorage()

        with self.assertRaisesRegex(ValidationError, "Door component quantity must be positive"):
            await CreateProjectDoorComponentUseCase(storage).execute(
                CreateProjectDoorComponentCommand(door_id=55, component=_component(quantity=0))
            )

        storage.assert_no_writes(self)

    async def test_create_rejects_empty_title(self) -> None:
        storage = FakeProjectDoorComponentStorage()

        with self.assertRaisesRegex(ValidationError, "Door component title is required"):
            await CreateProjectDoorComponentUseCase(storage).execute(
                CreateProjectDoorComponentCommand(door_id=55, component=_component(title="   "))
            )

        storage.assert_no_writes(self)

    async def test_create_rejects_missing_door(self) -> None:
        storage = FakeProjectDoorComponentStorage(created_component_id=None)

        with self.assertRaisesRegex(NotFoundError, "Project door not found"):
            await CreateProjectDoorComponentUseCase(storage).execute(
                CreateProjectDoorComponentCommand(door_id=55, component=_component())
            )

    async def test_create_rejects_missing_project_after_component_creation(self) -> None:
        storage = FakeProjectDoorComponentStorage(project_id_for_door=None)

        with self.assertRaisesRegex(OperationFailedError, "Project not found after component creation"):
            await CreateProjectDoorComponentUseCase(storage).execute(
                CreateProjectDoorComponentCommand(door_id=55, component=_component())
            )

    async def test_update_returns_project_id(self) -> None:
        storage = FakeProjectDoorComponentStorage(update_project_id=13)

        project_id = await UpdateProjectDoorComponentUseCase(storage).execute(
            UpdateProjectDoorComponentCommand(component_id=66, component=_component())
        )

        self.assertEqual(project_id, 13)
        self.assertEqual(storage.update_calls[0][0], 66)

    async def test_update_rejects_missing_component(self) -> None:
        storage = FakeProjectDoorComponentStorage(update_project_id=None)

        with self.assertRaisesRegex(NotFoundError, "Door component not found"):
            await UpdateProjectDoorComponentUseCase(storage).execute(
                UpdateProjectDoorComponentCommand(component_id=66, component=_component())
            )

    async def test_delete_returns_project_id(self) -> None:
        storage = FakeProjectDoorComponentStorage(delete_project_id=14)

        project_id = await DeleteProjectDoorComponentUseCase(storage).execute(
            DeleteProjectDoorComponentCommand(component_id=66)
        )

        self.assertEqual(project_id, 14)
        self.assertEqual(storage.delete_calls, [66])

    async def test_delete_rejects_missing_component(self) -> None:
        storage = FakeProjectDoorComponentStorage(delete_project_id=None)

        with self.assertRaisesRegex(NotFoundError, "Door component not found"):
            await DeleteProjectDoorComponentUseCase(storage).execute(DeleteProjectDoorComponentCommand(component_id=66))
