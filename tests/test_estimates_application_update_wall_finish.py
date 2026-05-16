from __future__ import annotations

import unittest
from typing import Any

from supply_bot.application.errors import ValidationError
from supply_bot.estimates.application.update_wall_finish import (
    UpdateWallFinishCommand,
    UpdateWallFinishRoomCommand,
    UpdateWallFinishRoomZoneCommand,
    UpdateWallFinishUseCase,
)


class FakeWallFinishStorage:
    def __init__(
        self,
        *,
        coverings: list[dict[str, Any]] | None = None,
        preparations: list[dict[str, Any]] | None = None,
        layouts: list[dict[str, Any]] | None = None,
    ) -> None:
        self.coverings = coverings or [{"id": 100}, {"id": 101}]
        self.preparations = preparations or [{"id": 200}, {"id": 201}]
        self.layouts = layouts or [{"id": 300}, {"id": 301}]
        self.config_calls: list[dict[str, object]] = []
        self.room_replace_calls: list[tuple[int, list[dict[str, object]]]] = []
        self.zone_replace_calls: list[tuple[int, list[dict[str, object]]]] = []

    async def list_estimate_wall_finish_coverings(self) -> list[dict[str, Any]]:
        return self.coverings

    async def list_estimate_wall_finish_preparations(self) -> list[dict[str, Any]]:
        return self.preparations

    async def list_estimate_wall_finish_layouts(self) -> list[dict[str, Any]]:
        return self.layouts

    async def update_estimate_wall_finish_config(self, project_id: int, **kwargs: object) -> None:
        self.config_calls.append({"project_id": project_id, **kwargs})

    async def replace_estimate_wall_finish_rooms(
        self,
        project_id: int,
        rows: list[dict[str, object]],
    ) -> None:
        self.room_replace_calls.append((project_id, rows))

    async def replace_estimate_wall_finish_room_zones(
        self,
        project_id: int,
        rows: list[dict[str, object]],
    ) -> None:
        self.zone_replace_calls.append((project_id, rows))

    def assert_no_writes(self, test_case: unittest.TestCase) -> None:
        test_case.assertEqual(self.config_calls, [])
        test_case.assertEqual(self.room_replace_calls, [])
        test_case.assertEqual(self.zone_replace_calls, [])


def _zone(
    *,
    covering_id: int | None = 100,
    preparation_id: int | None = 200,
    layout_id: int | None = 300,
    area_m2: float | int | None = 5,
    note: str | None = " Zone note ",
) -> UpdateWallFinishRoomZoneCommand:
    return UpdateWallFinishRoomZoneCommand(
        covering_id=covering_id,
        preparation_id=preparation_id,
        layout_id=layout_id,
        area_m2=area_m2,
        note=note,
    )


def _room(
    *,
    room_id: int = 1,
    selected: bool = True,
    covering_id: int | None = 100,
    preparation_id: int | None = 200,
    layout_id: int | None = 300,
    area_m2_override: float | int | None = None,
    note: str | None = " Room note ",
    zones: list[UpdateWallFinishRoomZoneCommand] | None = None,
) -> UpdateWallFinishRoomCommand:
    return UpdateWallFinishRoomCommand(
        room_id=room_id,
        selected=selected,
        covering_id=covering_id,
        preparation_id=preparation_id,
        layout_id=layout_id,
        area_m2_override=area_m2_override,
        note=note,
        zones=[] if zones is None else zones,
    )


def _command(**overrides: object) -> UpdateWallFinishCommand:
    values: dict[str, object] = {
        "project_id": 10,
        "rooms_snapshot": [
            {"id": 1, "wall_area_net_m2": 12},
            {"id": 2, "wall_area_net_m2": 8},
            {"id": 3, "wall_area_net_m2": 4},
        ],
        "include_preparation": True,
        "include_demolition": False,
        "demolition_price_per_m2": 150,
        "rooms": [_room(zones=[_zone(area_m2=6)])],
    }
    values.update(overrides)
    return UpdateWallFinishCommand(**values)


class UpdateWallFinishUseCaseTests(unittest.IsolatedAsyncioTestCase):
    async def test_execute_updates_config_rooms_and_zones(self) -> None:
        storage = FakeWallFinishStorage()
        command = _command(
            demolition_price_per_m2=-10,
            rooms=[
                _room(
                    room_id=1,
                    area_m2_override=9,
                    note=" Room one ",
                    zones=[_zone(area_m2=4, note=" Zone one ")],
                )
            ],
        )

        project_id = await UpdateWallFinishUseCase(storage).execute(command)

        self.assertEqual(project_id, 10)
        self.assertEqual(
            storage.config_calls,
            [
                {
                    "project_id": 10,
                    "include_preparation": True,
                    "include_demolition": False,
                    "demolition_price_per_m2": 0.0,
                }
            ],
        )
        self.assertEqual(
            storage.room_replace_calls,
            [
                (
                    10,
                    [
                        {
                            "room_id": 1,
                            "covering_id": 100,
                            "preparation_id": 200,
                            "layout_id": 300,
                            "area_m2_override": 9,
                            "note": "Room one",
                            "sort_order": 10,
                        }
                    ],
                )
            ],
        )
        self.assertEqual(
            storage.zone_replace_calls,
            [
                (
                    10,
                    [
                        {
                            "room_id": 1,
                            "covering_id": 100,
                            "preparation_id": 200,
                            "layout_id": 300,
                            "area_m2": 4,
                            "note": "Zone one",
                        }
                    ],
                )
            ],
        )

    async def test_execute_rejects_unknown_room_level_catalog_ids(self) -> None:
        cases = [
            (_room(covering_id=999, preparation_id=200, layout_id=300), "Unknown wall finish selected"),
            (_room(covering_id=100, preparation_id=999, layout_id=300), "Unknown wall preparation selected"),
            (_room(covering_id=100, preparation_id=200, layout_id=999), "Unknown wall layout selected"),
        ]
        for room, message in cases:
            storage = FakeWallFinishStorage()
            with self.subTest(message=message):
                with self.assertRaisesRegex(ValidationError, message):
                    await UpdateWallFinishUseCase(storage).execute(_command(rooms=[room]))
                storage.assert_no_writes(self)

    async def test_execute_rejects_negative_override(self) -> None:
        storage = FakeWallFinishStorage()

        with self.assertRaisesRegex(ValidationError, "Wall finish override cannot be negative"):
            await UpdateWallFinishUseCase(storage).execute(_command(rooms=[_room(area_m2_override=-1)]))

        storage.assert_no_writes(self)

    async def test_execute_creates_fallback_zone_when_room_catalogs_are_selected(self) -> None:
        storage = FakeWallFinishStorage()

        await UpdateWallFinishUseCase(storage).execute(_command(rooms=[_room(room_id=1, note=" Fallback ", zones=[])]))

        self.assertEqual(
            storage.zone_replace_calls[0][1],
            [
                {
                    "room_id": 1,
                    "covering_id": 100,
                    "preparation_id": 200,
                    "layout_id": 300,
                    "area_m2": None,
                    "note": "Fallback",
                }
            ],
        )

    async def test_execute_rejects_unknown_zone_catalog_ids(self) -> None:
        cases = [
            (_zone(covering_id=999, preparation_id=200, layout_id=300), "Unknown wall finish selected"),
            (_zone(covering_id=100, preparation_id=999, layout_id=300), "Unknown wall preparation selected"),
            (_zone(covering_id=100, preparation_id=200, layout_id=999), "Unknown wall layout selected"),
        ]
        for zone, message in cases:
            storage = FakeWallFinishStorage()
            with self.subTest(message=message):
                with self.assertRaisesRegex(ValidationError, message):
                    await UpdateWallFinishUseCase(storage).execute(_command(rooms=[_room(zones=[zone])]))
                storage.assert_no_writes(self)

    async def test_execute_rejects_negative_zone_area(self) -> None:
        storage = FakeWallFinishStorage()

        with self.assertRaisesRegex(ValidationError, "Wall finish zone area cannot be negative"):
            await UpdateWallFinishUseCase(storage).execute(_command(rooms=[_room(zones=[_zone(area_m2=-1)])]))

        storage.assert_no_writes(self)

    async def test_execute_rejects_zones_exceeding_room_area(self) -> None:
        storage = FakeWallFinishStorage()

        with self.assertRaisesRegex(ValidationError, "Wall finish zones cannot exceed room area"):
            await UpdateWallFinishUseCase(storage).execute(_command(rooms=[_room(zones=[_zone(area_m2=13)])]))

        storage.assert_no_writes(self)

    async def test_execute_filters_selected_rooms_like_route(self) -> None:
        storage = FakeWallFinishStorage()
        command = _command(
            rooms=[
                _room(room_id=1, note="   ", zones=[_zone(area_m2=2, note="   ")]),
                _room(room_id=1, note="duplicate"),
                _room(room_id=999, note="unknown"),
                _room(room_id=2, selected=False, note="disabled"),
                _room(room_id=3, note=" Room three ", zones=[]),
            ]
        )

        await UpdateWallFinishUseCase(storage).execute(command)

        self.assertEqual(
            storage.room_replace_calls[0][1],
            [
                {
                    "room_id": 1,
                    "covering_id": 100,
                    "preparation_id": 200,
                    "layout_id": 300,
                    "area_m2_override": None,
                    "note": None,
                    "sort_order": 10,
                },
                {
                    "room_id": 3,
                    "covering_id": 100,
                    "preparation_id": 200,
                    "layout_id": 300,
                    "area_m2_override": None,
                    "note": "Room three",
                    "sort_order": 50,
                },
            ],
        )
        self.assertEqual(
            storage.zone_replace_calls[0][1],
            [
                {
                    "room_id": 1,
                    "covering_id": 100,
                    "preparation_id": 200,
                    "layout_id": 300,
                    "area_m2": 2,
                    "note": None,
                },
                {
                    "room_id": 3,
                    "covering_id": 100,
                    "preparation_id": 200,
                    "layout_id": 300,
                    "area_m2": None,
                    "note": "Room three",
                },
            ],
        )
