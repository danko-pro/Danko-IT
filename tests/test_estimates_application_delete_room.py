from __future__ import annotations

import unittest
from typing import Any

from supply_bot.application.errors import NotFoundError
from supply_bot.estimates.application.delete_room import (
    DeleteEstimateRoomCommand,
    DeleteEstimateRoomUseCase,
)


class FakeEstimateRoomDeleteStorage:
    def __init__(self, *, room: dict[str, Any] | None = None) -> None:
        self.room = room
        self.deleted_room_ids: list[int] = []

    async def get_estimate_room(self, room_id: int) -> dict[str, Any] | None:
        return self.room

    async def delete_estimate_room(self, room_id: int) -> None:
        self.deleted_room_ids.append(room_id)


class DeleteEstimateRoomUseCaseTests(unittest.IsolatedAsyncioTestCase):
    async def test_execute_deletes_room_and_returns_project_id(self) -> None:
        storage = FakeEstimateRoomDeleteStorage(room={"id": 55, "project_id": 10})
        command = DeleteEstimateRoomCommand(room_id=55)

        project_id = await DeleteEstimateRoomUseCase(storage).execute(command)

        self.assertEqual(project_id, 10)
        self.assertEqual(storage.deleted_room_ids, [55])

    async def test_execute_rejects_missing_room(self) -> None:
        storage = FakeEstimateRoomDeleteStorage(room=None)
        command = DeleteEstimateRoomCommand(room_id=404)

        with self.assertRaisesRegex(NotFoundError, "Calculator room not found"):
            await DeleteEstimateRoomUseCase(storage).execute(command)

        self.assertEqual(storage.deleted_room_ids, [])

    async def test_execute_casts_project_id_to_int(self) -> None:
        numeric_storage = FakeEstimateRoomDeleteStorage(room={"id": 55, "project_id": 10})
        string_storage = FakeEstimateRoomDeleteStorage(room={"id": 56, "project_id": "11"})

        numeric_project_id = await DeleteEstimateRoomUseCase(numeric_storage).execute(
            DeleteEstimateRoomCommand(room_id=55)
        )
        string_project_id = await DeleteEstimateRoomUseCase(string_storage).execute(
            DeleteEstimateRoomCommand(room_id=56)
        )

        self.assertEqual(numeric_project_id, 10)
        self.assertEqual(string_project_id, 11)
