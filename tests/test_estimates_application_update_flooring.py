from __future__ import annotations

import json
import unittest
from typing import Any

from supply_bot.application.errors import NotFoundError, ValidationError
from supply_bot.estimates.application.update_flooring import (
    UpdateFlooringCommand,
    UpdateFlooringGlobalItemCommand,
    UpdateFlooringRoomCommand,
    UpdateFlooringRoomZoneCommand,
    UpdateFlooringUseCase,
)


class FakeFlooringStorage:
    def __init__(
        self,
        *,
        project: dict[str, Any] | None = None,
        rooms: list[dict[str, Any]] | None = None,
        coverings: list[dict[str, Any]] | None = None,
        preparations: list[dict[str, Any]] | None = None,
        layouts: list[dict[str, Any]] | None = None,
    ) -> None:
        self.project = project
        self.rooms = rooms or []
        self.coverings = coverings or []
        self.preparations = preparations or []
        self.layouts = layouts or []
        self.config_calls: list[dict[str, object]] = []
        self.room_replace_calls: list[tuple[int, list[dict[str, object]]]] = []
        self.zone_replace_calls: list[tuple[int, list[dict[str, object]]]] = []

    async def get_estimate_project(self, project_id: int) -> dict[str, Any] | None:
        return self.project

    async def list_estimate_rooms(self, project_id: int) -> list[dict[str, Any]]:
        return self.rooms

    async def list_estimate_flooring_coverings(self) -> list[dict[str, Any]]:
        return self.coverings

    async def list_estimate_flooring_preparations(self) -> list[dict[str, Any]]:
        return self.preparations

    async def list_estimate_flooring_layouts(self) -> list[dict[str, Any]]:
        return self.layouts

    async def update_estimate_flooring_config(self, project_id: int, **kwargs: object) -> None:
        self.config_calls.append({"project_id": project_id, **kwargs})

    async def replace_estimate_flooring_rooms(
        self,
        project_id: int,
        rows: list[dict[str, object]],
    ) -> None:
        self.room_replace_calls.append((project_id, rows))

    async def replace_estimate_flooring_room_zones(
        self,
        project_id: int,
        rows: list[dict[str, object]],
    ) -> None:
        self.zone_replace_calls.append((project_id, rows))

    def assert_no_writes(self, test_case: unittest.TestCase) -> None:
        test_case.assertEqual(self.config_calls, [])
        test_case.assertEqual(self.room_replace_calls, [])
        test_case.assertEqual(self.zone_replace_calls, [])


def _storage(**overrides: object) -> FakeFlooringStorage:
    values: dict[str, object] = {
        "project": {"id": 10},
        "rooms": [
            {"id": 1, "floor_area_m2": 12},
            {"id": 2, "manual_floor_area_m2": 8},
            {"id": 3, "floor_area_m2": 4},
        ],
        "coverings": [{"id": 100}, {"id": 101}],
        "preparations": [{"id": 200}, {"id": 201}],
        "layouts": [{"id": 300}, {"id": 301}],
    }
    values.update(overrides)
    return FakeFlooringStorage(**values)


def _global_item(
    *,
    title: str = " Доставка ",
    kind: str = "service",
    mode: str = "fixed",
    rate: float | int = 100,
    quantity: float | int = 2,
    enabled: bool = True,
) -> UpdateFlooringGlobalItemCommand:
    return UpdateFlooringGlobalItemCommand(
        kind=kind,
        title=title,
        mode=mode,
        rate=rate,
        quantity=quantity,
        enabled=enabled,
    )


def _zone(
    *,
    covering_id: int | None = 100,
    preparation_id: int | None = 200,
    layout_id: int | None = 300,
    area_m2: float | int | None = 5,
    note: str | None = " Zone note ",
) -> UpdateFlooringRoomZoneCommand:
    return UpdateFlooringRoomZoneCommand(
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
    perimeter_m_override: float | int | None = None,
    plinth_m_override: float | int | None = None,
    note: str | None = " Room note ",
    zones: list[UpdateFlooringRoomZoneCommand] | None = None,
) -> UpdateFlooringRoomCommand:
    return UpdateFlooringRoomCommand(
        room_id=room_id,
        selected=selected,
        covering_id=covering_id,
        preparation_id=preparation_id,
        layout_id=layout_id,
        area_m2_override=area_m2_override,
        perimeter_m_override=perimeter_m_override,
        plinth_m_override=plinth_m_override,
        note=note,
        zones=[] if zones is None else zones,
    )


def _command(**overrides: object) -> UpdateFlooringCommand:
    values: dict[str, object] = {
        "project_id": 10,
        "include_underlay": True,
        "include_plinth": True,
        "include_demolition": False,
        "include_preparation": True,
        "default_preparation_id": 200,
        "demolition_price_per_m2": 10,
        "underlay_price_per_m2": 20,
        "plinth_material_price_per_m": 30,
        "plinth_install_price_per_m": 40,
        "threshold_profile_count": 2,
        "threshold_profile_price": 50,
        "global_items": [_global_item(), _global_item(title="   ", rate=999)],
        "rooms": [_room(zones=[_zone(area_m2=6)])],
    }
    values.update(overrides)
    return UpdateFlooringCommand(**values)


class UpdateFlooringUseCaseTests(unittest.IsolatedAsyncioTestCase):
    async def test_execute_updates_config_rooms_and_zones(self) -> None:
        storage = _storage()
        command = _command(
            demolition_price_per_m2=-10,
            underlay_price_per_m2=-20,
            plinth_material_price_per_m=-30,
            plinth_install_price_per_m=40,
            threshold_profile_count=-2,
            threshold_profile_price=-50,
            global_items=[
                _global_item(title=" Доставка ", rate=-1, quantity=3),
                _global_item(title="   ", rate=999, quantity=999),
            ],
            rooms=[
                _room(
                    room_id=1,
                    area_m2_override=9,
                    perimeter_m_override=11,
                    plinth_m_override=7,
                    note=" Room one ",
                    zones=[_zone(area_m2=4, note=" Zone one ")],
                )
            ],
        )

        project_id = await UpdateFlooringUseCase(storage).execute(command)

        self.assertEqual(project_id, 10)
        self.assertEqual(len(storage.config_calls), 1)
        config = storage.config_calls[0]
        self.assertEqual(config["project_id"], 10)
        self.assertEqual(config["default_preparation_id"], 200)
        self.assertEqual(config["demolition_price_per_m2"], 0.0)
        self.assertEqual(config["underlay_price_per_m2"], 0.0)
        self.assertEqual(config["plinth_material_price_per_m"], 0.0)
        self.assertEqual(config["plinth_install_price_per_m"], 40.0)
        self.assertEqual(config["threshold_profile_count"], 0)
        self.assertEqual(config["threshold_profile_price"], 0.0)
        self.assertEqual(
            json.loads(str(config["global_items_json"])),
            [
                {
                    "kind": "service",
                    "title": "Доставка",
                    "mode": "fixed",
                    "rate": 0.0,
                    "quantity": 3.0,
                    "enabled": True,
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
                            "perimeter_m_override": 11,
                            "plinth_m_override": 7,
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

    async def test_execute_rejects_missing_project(self) -> None:
        storage = _storage(project=None)

        with self.assertRaisesRegex(NotFoundError, "Calculator project not found"):
            await UpdateFlooringUseCase(storage).execute(_command())

        storage.assert_no_writes(self)

    async def test_execute_rejects_unknown_default_preparation(self) -> None:
        storage = _storage()

        with self.assertRaisesRegex(ValidationError, "Unknown floor preparation selected"):
            await UpdateFlooringUseCase(storage).execute(_command(default_preparation_id=999))

        storage.assert_no_writes(self)

    async def test_execute_rejects_unknown_room_level_catalog_ids(self) -> None:
        cases = [
            (
                _room(covering_id=999, preparation_id=200, layout_id=300),
                "Unknown floor covering selected",
            ),
            (
                _room(covering_id=100, preparation_id=999, layout_id=300),
                "Unknown floor preparation selected",
            ),
            (
                _room(covering_id=100, preparation_id=200, layout_id=999),
                "Unknown floor layout selected",
            ),
        ]
        for room, message in cases:
            storage = _storage()
            with self.subTest(message=message):
                with self.assertRaisesRegex(ValidationError, message):
                    await UpdateFlooringUseCase(storage).execute(_command(rooms=[room]))
                storage.assert_no_writes(self)

    async def test_execute_rejects_negative_overrides(self) -> None:
        cases = [
            _room(area_m2_override=-1),
            _room(perimeter_m_override=-1),
            _room(plinth_m_override=-1),
        ]
        for room in cases:
            storage = _storage()
            with self.subTest(room=room):
                with self.assertRaisesRegex(ValidationError, "Flooring overrides cannot be negative"):
                    await UpdateFlooringUseCase(storage).execute(_command(rooms=[room]))
                storage.assert_no_writes(self)

    async def test_execute_creates_fallback_zone_when_room_catalogs_are_selected(self) -> None:
        storage = _storage()

        await UpdateFlooringUseCase(storage).execute(_command(rooms=[_room(room_id=1, note=" Fallback ", zones=[])]))

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
            (_zone(covering_id=999, preparation_id=200, layout_id=300), "Unknown floor covering selected"),
            (_zone(covering_id=100, preparation_id=999, layout_id=300), "Unknown floor preparation selected"),
            (_zone(covering_id=100, preparation_id=200, layout_id=999), "Unknown floor layout selected"),
        ]
        for zone, message in cases:
            storage = _storage()
            with self.subTest(message=message):
                with self.assertRaisesRegex(ValidationError, message):
                    await UpdateFlooringUseCase(storage).execute(_command(rooms=[_room(zones=[zone])]))
                storage.assert_no_writes(self)

    async def test_execute_rejects_negative_zone_area(self) -> None:
        storage = _storage()

        with self.assertRaisesRegex(ValidationError, "Flooring zone area cannot be negative"):
            await UpdateFlooringUseCase(storage).execute(_command(rooms=[_room(zones=[_zone(area_m2=-1)])]))

        storage.assert_no_writes(self)

    async def test_execute_rejects_zones_exceeding_room_area(self) -> None:
        storage = _storage(rooms=[{"id": 1, "floor_area_m2": 5}])

        with self.assertRaisesRegex(ValidationError, "Flooring zones cannot exceed room area"):
            await UpdateFlooringUseCase(storage).execute(_command(rooms=[_room(zones=[_zone(area_m2=6)])]))

        storage.assert_no_writes(self)

    async def test_execute_filters_selected_rooms_like_route(self) -> None:
        storage = _storage()
        command = _command(
            rooms=[
                _room(room_id=1, note="   ", zones=[_zone(area_m2=2, note="   ")]),
                _room(room_id=1, note="duplicate"),
                _room(room_id=999, note="unknown"),
                _room(room_id=2, selected=False, note="disabled"),
                _room(room_id=3, note=" Room three ", zones=[]),
            ]
        )

        await UpdateFlooringUseCase(storage).execute(command)

        self.assertEqual(
            storage.room_replace_calls[0][1],
            [
                {
                    "room_id": 1,
                    "covering_id": 100,
                    "preparation_id": 200,
                    "layout_id": 300,
                    "area_m2_override": None,
                    "perimeter_m_override": None,
                    "plinth_m_override": None,
                    "note": None,
                    "sort_order": 10,
                },
                {
                    "room_id": 3,
                    "covering_id": 100,
                    "preparation_id": 200,
                    "layout_id": 300,
                    "area_m2_override": None,
                    "perimeter_m_override": None,
                    "plinth_m_override": None,
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
