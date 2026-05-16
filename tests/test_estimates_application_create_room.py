from __future__ import annotations

import unittest
from typing import Any

from supply_bot.application.errors import NotFoundError
from supply_bot.estimates.application.create_room import (
    CreateEstimateRoomCommand,
    CreateEstimateRoomUseCase,
)


class FakeEstimateRoomStorage:
    def __init__(
        self,
        *,
        project: dict[str, Any] | None = None,
        existing_rooms: list[dict[str, Any]] | None = None,
    ) -> None:
        self.project = project
        self.existing_rooms = existing_rooms or []
        self.created_rooms: list[dict[str, object]] = []

    async def get_estimate_project(self, project_id: int) -> dict[str, Any] | None:
        return self.project

    async def list_estimate_rooms(self, project_id: int) -> list[dict[str, Any]]:
        return self.existing_rooms

    async def create_estimate_room(
        self,
        *,
        project_id: int,
        name: str,
        ceiling_height_m: float,
        auto_perimeter_calc: bool,
        perimeter_factor: float,
    ) -> int:
        self.created_rooms.append(
            {
                "project_id": project_id,
                "name": name,
                "ceiling_height_m": ceiling_height_m,
                "auto_perimeter_calc": auto_perimeter_calc,
                "perimeter_factor": perimeter_factor,
            }
        )
        return 77


class CreateEstimateRoomUseCaseTests(unittest.IsolatedAsyncioTestCase):
    async def test_execute_normalizes_values_and_returns_room_id(self) -> None:
        storage = FakeEstimateRoomStorage(
            project={"id": 10},
            existing_rooms=[{"id": 1}, {"id": 2}],
        )
        command = CreateEstimateRoomCommand(
            project_id=10,
            name="  Kitchen  ",
            ceiling_height_m=0,
            auto_perimeter_calc=True,
            perimeter_factor=0,
        )

        room_id = await CreateEstimateRoomUseCase(storage).execute(command)

        self.assertEqual(room_id, 77)
        self.assertEqual(
            storage.created_rooms,
            [
                {
                    "project_id": 10,
                    "name": "Kitchen",
                    "ceiling_height_m": 0.1,
                    "auto_perimeter_calc": True,
                    "perimeter_factor": 1.0,
                }
            ],
        )

    async def test_execute_uses_fallback_name_when_name_is_empty(self) -> None:
        storage = FakeEstimateRoomStorage(
            project={"id": 10},
            existing_rooms=[{"id": 1}, {"id": 2}],
        )
        command = CreateEstimateRoomCommand(
            project_id=10,
            name="   ",
            ceiling_height_m=2.7,
            auto_perimeter_calc=False,
            perimeter_factor=1.15,
        )

        await CreateEstimateRoomUseCase(storage).execute(command)

        self.assertEqual(storage.created_rooms[0]["name"], "Помещение 3")

    async def test_execute_rejects_missing_project(self) -> None:
        storage = FakeEstimateRoomStorage(project=None)
        command = CreateEstimateRoomCommand(
            project_id=404,
            name="Room",
            ceiling_height_m=2.7,
            auto_perimeter_calc=True,
            perimeter_factor=1.15,
        )

        with self.assertRaisesRegex(NotFoundError, "Calculator project not found"):
            await CreateEstimateRoomUseCase(storage).execute(command)

        self.assertEqual(storage.created_rooms, [])
