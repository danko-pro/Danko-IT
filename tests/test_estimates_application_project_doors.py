from __future__ import annotations

import unittest
from typing import Any

from supply_bot.application.errors import NotFoundError, ValidationError
from supply_bot.estimates.application.project_doors import (
    CreateProjectDoorCommand,
    CreateProjectDoorUseCase,
    DeleteProjectDoorCommand,
    DeleteProjectDoorUseCase,
    ProjectDoorValuesCommand,
    UpdateProjectDoorCommand,
    UpdateProjectDoorUseCase,
)


class FakeProjectDoorStorage:
    def __init__(
        self,
        *,
        project: dict[str, Any] | None = None,
        door_catalog: list[dict[str, Any]] | None = None,
        update_project_id: int | None = 10,
        delete_project_id: int | None = 10,
    ) -> None:
        self.project = project
        self.door_catalog = door_catalog or [
            {
                "id": 100,
                "title": "Catalog door",
                "width_mm": 900,
                "height_mm": 2100,
                "thickness_mm": 44,
            }
        ]
        self.update_project_id = update_project_id
        self.delete_project_id = delete_project_id
        self.create_calls: list[dict[str, object]] = []
        self.update_calls: list[tuple[int, dict[str, object]]] = []
        self.delete_calls: list[int] = []

    async def get_estimate_project(self, project_id: int) -> dict[str, Any] | None:
        return self.project

    async def list_estimate_door_catalog(self) -> list[dict[str, Any]]:
        return self.door_catalog

    async def create_estimate_project_door(self, *, project_id: int, **kwargs: object) -> int:
        self.create_calls.append({"project_id": project_id, **kwargs})
        return 501

    async def update_estimate_project_door(self, door_id: int, **kwargs: object) -> int | None:
        self.update_calls.append((door_id, kwargs))
        return self.update_project_id

    async def delete_estimate_project_door(self, door_id: int) -> int | None:
        self.delete_calls.append(door_id)
        return self.delete_project_id

    def assert_no_writes(self, test_case: unittest.TestCase) -> None:
        test_case.assertEqual(self.create_calls, [])
        test_case.assertEqual(self.update_calls, [])
        test_case.assertEqual(self.delete_calls, [])


def _door_values(**overrides: object) -> ProjectDoorValuesCommand:
    values: dict[str, object] = {
        "door_catalog_id": None,
        "title": " Door ",
        "opening_kind": "  ",
        "width_mm": 800,
        "height_mm": 2000,
        "thickness_mm": 40,
        "purchase_price": 1000,
        "sale_price": 1500,
        "install_price": 500,
        "room_a_id": 1,
        "room_b_id": None,
        "note": " Note ",
    }
    values.update(overrides)
    return ProjectDoorValuesCommand(**values)


class ProjectDoorUseCaseTests(unittest.IsolatedAsyncioTestCase):
    async def test_create_project_door_happy_path_without_catalog(self) -> None:
        storage = FakeProjectDoorStorage(project={"id": 10})

        project_id = await CreateProjectDoorUseCase(storage).execute(
            CreateProjectDoorCommand(project_id=10, door=_door_values())
        )

        self.assertEqual(project_id, 10)
        self.assertEqual(
            storage.create_calls,
            [
                {
                    "project_id": 10,
                    "door_catalog_id": None,
                    "title": "Door",
                    "opening_kind": "door",
                    "width_mm": 800.0,
                    "height_mm": 2000.0,
                    "thickness_mm": 40.0,
                    "purchase_price": 1000.0,
                    "sale_price": 1500.0,
                    "install_price": 500.0,
                    "room_a_id": 1,
                    "room_b_id": None,
                    "note": "Note",
                }
            ],
        )

    async def test_create_uses_catalog_fallback_values(self) -> None:
        storage = FakeProjectDoorStorage(project={"id": 10})

        await CreateProjectDoorUseCase(storage).execute(
            CreateProjectDoorCommand(
                project_id=10,
                door=_door_values(
                    door_catalog_id=100,
                    title=None,
                    width_mm=None,
                    height_mm=None,
                    thickness_mm=None,
                ),
            )
        )

        call = storage.create_calls[0]
        self.assertEqual(call["title"], "Catalog door")
        self.assertEqual(call["width_mm"], 900.0)
        self.assertEqual(call["height_mm"], 2100.0)
        self.assertEqual(call["thickness_mm"], 44.0)

    async def test_create_rejects_missing_project(self) -> None:
        storage = FakeProjectDoorStorage(project=None)

        with self.assertRaisesRegex(NotFoundError, "Calculator project not found"):
            await CreateProjectDoorUseCase(storage).execute(
                CreateProjectDoorCommand(project_id=10, door=_door_values())
            )

        storage.assert_no_writes(self)

    async def test_create_rejects_missing_catalog(self) -> None:
        storage = FakeProjectDoorStorage(project={"id": 10})

        with self.assertRaisesRegex(NotFoundError, "Door catalog item not found"):
            await CreateProjectDoorUseCase(storage).execute(
                CreateProjectDoorCommand(project_id=10, door=_door_values(door_catalog_id=999))
            )

        storage.assert_no_writes(self)

    async def test_create_rejects_no_room_selected(self) -> None:
        storage = FakeProjectDoorStorage(project={"id": 10})

        with self.assertRaisesRegex(ValidationError, "At least one room must be selected"):
            await CreateProjectDoorUseCase(storage).execute(
                CreateProjectDoorCommand(project_id=10, door=_door_values(room_a_id=None, room_b_id=None))
            )

        storage.assert_no_writes(self)

    async def test_create_rejects_empty_title(self) -> None:
        storage = FakeProjectDoorStorage(project={"id": 10})

        with self.assertRaisesRegex(ValidationError, "Door title is required"):
            await CreateProjectDoorUseCase(storage).execute(
                CreateProjectDoorCommand(project_id=10, door=_door_values(title="   "))
            )

        storage.assert_no_writes(self)

    async def test_create_rejects_invalid_width_or_height(self) -> None:
        cases = [
            _door_values(width_mm=0),
            _door_values(width_mm=None),
            _door_values(height_mm=0),
            _door_values(height_mm=None),
        ]
        for door in cases:
            storage = FakeProjectDoorStorage(project={"id": 10})
            with self.subTest(door=door):
                with self.assertRaisesRegex(ValidationError, "Door width and height must be positive"):
                    await CreateProjectDoorUseCase(storage).execute(CreateProjectDoorCommand(project_id=10, door=door))
                storage.assert_no_writes(self)

    async def test_update_returns_project_id(self) -> None:
        storage = FakeProjectDoorStorage(update_project_id=12)

        project_id = await UpdateProjectDoorUseCase(storage).execute(
            UpdateProjectDoorCommand(door_id=55, door=_door_values())
        )

        self.assertEqual(project_id, 12)
        self.assertEqual(storage.update_calls[0][0], 55)

    async def test_update_rejects_missing_door(self) -> None:
        storage = FakeProjectDoorStorage(update_project_id=None)

        with self.assertRaisesRegex(NotFoundError, "Project door not found"):
            await UpdateProjectDoorUseCase(storage).execute(UpdateProjectDoorCommand(door_id=55, door=_door_values()))

    async def test_delete_returns_project_id(self) -> None:
        storage = FakeProjectDoorStorage(delete_project_id=13)

        project_id = await DeleteProjectDoorUseCase(storage).execute(DeleteProjectDoorCommand(door_id=55))

        self.assertEqual(project_id, 13)
        self.assertEqual(storage.delete_calls, [55])

    async def test_delete_rejects_missing_door(self) -> None:
        storage = FakeProjectDoorStorage(delete_project_id=None)

        with self.assertRaisesRegex(NotFoundError, "Project door not found"):
            await DeleteProjectDoorUseCase(storage).execute(DeleteProjectDoorCommand(door_id=55))
