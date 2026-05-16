from __future__ import annotations

import unittest
from typing import Any

from supply_bot.estimates.application.replace_ceiling_rooms import (
    ReplaceCeilingRoomCommand,
    ReplaceCeilingRoomsCommand,
    ReplaceCeilingRoomsUseCase,
)


class FakeCeilingRoomsStorage:
    def __init__(
        self,
        *,
        project: dict[str, Any] | None = None,
        rooms: list[dict[str, Any]] | None = None,
        catalog_items: list[dict[str, Any]] | None = None,
    ) -> None:
        self.project = project
        self.rooms = rooms or [{"id": 1}, {"id": 2}]
        self.catalog_items = catalog_items or [{"id": 100}]
        self.replace_calls: list[tuple[int, list[dict[str, object]]]] = []

    async def get_estimate_project(self, project_id: int) -> dict[str, Any] | None:
        return self.project

    async def list_estimate_rooms(self, project_id: int) -> list[dict[str, Any]]:
        return self.rooms

    async def list_estimate_ceiling_catalog_items(self) -> list[dict[str, Any]]:
        return self.catalog_items

    async def replace_estimate_ceiling_rooms(self, project_id: int, rows: list[dict[str, object]]) -> None:
        self.replace_calls.append((project_id, rows))


def _room_command(**overrides: object) -> ReplaceCeilingRoomCommand:
    values: dict[str, object] = {
        "room_id": 1,
        "default_catalog_item_id": 100,
        "is_enabled": True,
        "ceiling_area_m2": -5,
        "area_source": "   ",
        "perimeter_m": "",
        "perimeter_source": None,
        "package_code_snapshot": " MID ",
        "note": " Note ",
        "sort_order": None,
    }
    values.update(overrides)
    return ReplaceCeilingRoomCommand(**values)


class ReplaceCeilingRoomsUseCaseTests(unittest.IsolatedAsyncioTestCase):
    async def test_happy_path_normalizes_rows(self) -> None:
        storage = FakeCeilingRoomsStorage(project={"id": 10})

        project_id = await ReplaceCeilingRoomsUseCase(storage).execute(
            ReplaceCeilingRoomsCommand(project_id=10, rooms=[_room_command()])
        )

        self.assertEqual(project_id, 10)
        self.assertEqual(
            storage.replace_calls,
            [
                (
                    10,
                    [
                        {
                            "room_id": 1,
                            "default_catalog_item_id": 100,
                            "is_enabled": True,
                            "ceiling_area_m2": 0.0,
                            "area_source": "room_area",
                            "perimeter_m": None,
                            "perimeter_source": "room_perimeter",
                            "package_code_snapshot": "MID",
                            "note": "Note",
                            "sort_order": 10,
                        }
                    ],
                )
            ],
        )

    async def test_missing_project_rejects_without_write(self) -> None:
        storage = FakeCeilingRoomsStorage(project=None)

        with self.assertRaisesRegex(ValueError, "Calculator project not found"):
            await ReplaceCeilingRoomsUseCase(storage).execute(
                ReplaceCeilingRoomsCommand(project_id=10, rooms=[_room_command()])
            )

        self.assertEqual(storage.replace_calls, [])

    async def test_unknown_room_rejects_without_write(self) -> None:
        storage = FakeCeilingRoomsStorage(project={"id": 10})

        with self.assertRaisesRegex(ValueError, "Unknown ceiling room selected"):
            await ReplaceCeilingRoomsUseCase(storage).execute(
                ReplaceCeilingRoomsCommand(project_id=10, rooms=[_room_command(room_id=999)])
            )

        self.assertEqual(storage.replace_calls, [])

    async def test_unknown_catalog_rejects_without_write(self) -> None:
        storage = FakeCeilingRoomsStorage(project={"id": 10})

        with self.assertRaisesRegex(ValueError, "Unknown ceiling catalog item selected"):
            await ReplaceCeilingRoomsUseCase(storage).execute(
                ReplaceCeilingRoomsCommand(project_id=10, rooms=[_room_command(default_catalog_item_id=999)])
            )

        self.assertEqual(storage.replace_calls, [])

    async def test_optional_non_negative_and_sort_order_defaults(self) -> None:
        storage = FakeCeilingRoomsStorage(project={"id": 10})

        await ReplaceCeilingRoomsUseCase(storage).execute(
            ReplaceCeilingRoomsCommand(
                project_id=10,
                rooms=[
                    _room_command(room_id=1, default_catalog_item_id=None, ceiling_area_m2="", sort_order=50),
                    _room_command(room_id=2, default_catalog_item_id=None, perimeter_m=-7, sort_order=None),
                ],
            )
        )

        rows = storage.replace_calls[0][1]
        self.assertIsNone(rows[0]["ceiling_area_m2"])
        self.assertEqual(rows[0]["sort_order"], 50)
        self.assertEqual(rows[1]["perimeter_m"], 0.0)
        self.assertEqual(rows[1]["sort_order"], 20)
