from __future__ import annotations

import unittest
from typing import Any

from supply_bot.application.errors import NotFoundError, ValidationError
from supply_bot.estimates.application.update_room import (
    UpdateEstimateRoomCommand,
    UpdateEstimateRoomFloorSectionCommand,
    UpdateEstimateRoomOpeningCommand,
    UpdateEstimateRoomUseCase,
)


class FakeEstimateRoomUpdateStorage:
    def __init__(self, *, room: dict[str, Any] | None = None) -> None:
        self.room = room
        self.update_calls: list[dict[str, object]] = []
        self.walls_calls: list[list[float]] = []
        self.floor_sections_calls: list[list[dict[str, float]]] = []
        self.openings_calls: list[list[dict[str, object]]] = []

    async def get_estimate_room(self, room_id: int) -> dict[str, Any] | None:
        return self.room

    async def update_estimate_room(
        self,
        room_id: int,
        *,
        name: str,
        ceiling_height_m: float,
        manual_floor_area_m2: float | int | None,
        auto_perimeter_calc: bool,
        perimeter_factor: float,
        note: str | None,
    ) -> None:
        self.update_calls.append(
            {
                "room_id": room_id,
                "name": name,
                "ceiling_height_m": ceiling_height_m,
                "manual_floor_area_m2": manual_floor_area_m2,
                "auto_perimeter_calc": auto_perimeter_calc,
                "perimeter_factor": perimeter_factor,
                "note": note,
            }
        )

    async def replace_estimate_room_walls(self, room_id: int, walls_m: list[float]) -> None:
        self.walls_calls.append(walls_m)

    async def replace_estimate_room_floor_sections(
        self,
        room_id: int,
        sections: list[dict[str, float]],
    ) -> None:
        self.floor_sections_calls.append(sections)

    async def replace_estimate_room_openings(
        self,
        room_id: int,
        openings: list[dict[str, object]],
    ) -> None:
        self.openings_calls.append(openings)

    def assert_no_writes(self, test_case: unittest.TestCase) -> None:
        test_case.assertEqual(self.update_calls, [])
        test_case.assertEqual(self.walls_calls, [])
        test_case.assertEqual(self.floor_sections_calls, [])
        test_case.assertEqual(self.openings_calls, [])


def _valid_command(**overrides: object) -> UpdateEstimateRoomCommand:
    values: dict[str, object] = {
        "room_id": 55,
        "name": "Room",
        "ceiling_height_m": 2.7,
        "manual_floor_area_m2": 10.0,
        "auto_perimeter_calc": True,
        "perimeter_factor": 1.15,
        "note": "Note",
        "walls_m": [3.0, 4.0],
        "floor_sections": [],
        "openings": [],
    }
    values.update(overrides)
    return UpdateEstimateRoomCommand(**values)


class UpdateEstimateRoomUseCaseTests(unittest.IsolatedAsyncioTestCase):
    async def test_execute_normalizes_room_update_and_replaces_geometry(self) -> None:
        storage = FakeEstimateRoomUpdateStorage(room={"id": 55})
        command = _valid_command(
            name="  Kitchen  ",
            ceiling_height_m=0,
            manual_floor_area_m2=12,
            perimeter_factor=0,
            note="  Main room  ",
            walls_m=[4, 0, None, -2, 5.5],
            floor_sections=[
                UpdateEstimateRoomFloorSectionCommand(length_m=2, width_m=3),
                UpdateEstimateRoomFloorSectionCommand(length_m=-4, width_m=None),
            ],
            openings=[
                UpdateEstimateRoomOpeningCommand(
                    opening_type="window",
                    width_m=1,
                    height_m=-2,
                    quantity=None,
                    area_m2=-5,
                    note="raw note",
                )
            ],
        )

        room_id = await UpdateEstimateRoomUseCase(storage).execute(command)

        self.assertEqual(room_id, 55)
        self.assertEqual(
            storage.update_calls,
            [
                {
                    "room_id": 55,
                    "name": "Kitchen",
                    "ceiling_height_m": 0.1,
                    "manual_floor_area_m2": 12,
                    "auto_perimeter_calc": True,
                    "perimeter_factor": 1.0,
                    "note": "Main room",
                }
            ],
        )
        self.assertEqual(storage.walls_calls, [[4.0, 5.5]])
        self.assertEqual(
            storage.floor_sections_calls,
            [[{"length_m": 2.0, "width_m": 3.0}, {"length_m": 0.0, "width_m": 0.0}]],
        )
        self.assertEqual(
            storage.openings_calls,
            [
                [
                    {
                        "opening_type": "window",
                        "width_m": 1.0,
                        "height_m": 0.0,
                        "quantity": None,
                        "area_m2": 0.0,
                        "note": "raw note",
                    }
                ]
            ],
        )

    async def test_execute_rejects_missing_room(self) -> None:
        storage = FakeEstimateRoomUpdateStorage(room=None)

        with self.assertRaisesRegex(NotFoundError, "Calculator room not found"):
            await UpdateEstimateRoomUseCase(storage).execute(_valid_command())

        storage.assert_no_writes(self)

    async def test_execute_rejects_empty_name(self) -> None:
        storage = FakeEstimateRoomUpdateStorage(room={"id": 55})

        with self.assertRaisesRegex(ValidationError, "Room name is required"):
            await UpdateEstimateRoomUseCase(storage).execute(_valid_command(name="   "))

        storage.assert_no_writes(self)

    async def test_execute_rejects_negative_manual_floor_area(self) -> None:
        storage = FakeEstimateRoomUpdateStorage(room={"id": 55})

        with self.assertRaisesRegex(ValidationError, "Floor area cannot be negative"):
            await UpdateEstimateRoomUseCase(storage).execute(_valid_command(manual_floor_area_m2=-1))

        storage.assert_no_writes(self)

    async def test_execute_converts_empty_note_to_none(self) -> None:
        storage = FakeEstimateRoomUpdateStorage(room={"id": 55})

        await UpdateEstimateRoomUseCase(storage).execute(_valid_command(note="   "))

        self.assertEqual(storage.update_calls[0]["note"], None)
