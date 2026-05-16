from __future__ import annotations

import json
import unittest
from typing import Any

from supply_bot.application.errors import NotFoundError, ValidationError
from supply_bot.estimates.application.update_warm_floor import (
    UpdateWarmFloorCommand,
    UpdateWarmFloorMaterialItemCommand,
    UpdateWarmFloorRoomCommand,
    UpdateWarmFloorUseCase,
)


class FakeWarmFloorStorage:
    def __init__(
        self,
        *,
        project: dict[str, Any] | None = None,
        rooms: list[dict[str, Any]] | None = None,
    ) -> None:
        self.project = project
        self.rooms = rooms or []
        self.config_calls: list[dict[str, object]] = []
        self.room_replace_calls: list[tuple[int, list[dict[str, object]]]] = []

    async def get_estimate_project(self, project_id: int) -> dict[str, Any] | None:
        return self.project

    async def list_estimate_rooms(self, project_id: int) -> list[dict[str, Any]]:
        return self.rooms

    async def update_estimate_warm_floor_config(self, project_id: int, **kwargs: object) -> None:
        self.config_calls.append({"project_id": project_id, **kwargs})

    async def replace_estimate_warm_floor_rooms(
        self,
        project_id: int,
        rows: list[dict[str, object]],
    ) -> None:
        self.room_replace_calls.append((project_id, rows))

    def assert_no_writes(self, test_case: unittest.TestCase) -> None:
        test_case.assertEqual(self.config_calls, [])
        test_case.assertEqual(self.room_replace_calls, [])


def _material(
    *,
    title: str = " Материал ",
    unit: str = " шт ",
    quantity: float | int = 2,
    amount: float | int = 100,
) -> UpdateWarmFloorMaterialItemCommand:
    return UpdateWarmFloorMaterialItemCommand(
        title=title,
        unit=unit,
        quantity=quantity,
        amount=amount,
    )


def _room(
    *,
    room_id: int = 1,
    selected: bool = True,
    area_m2_override: float | int | None = None,
    note: str | None = " Room note ",
) -> UpdateWarmFloorRoomCommand:
    return UpdateWarmFloorRoomCommand(
        room_id=room_id,
        selected=selected,
        area_m2_override=area_m2_override,
        note=note,
    )


def _command(**overrides: object) -> UpdateWarmFloorCommand:
    values: dict[str, object] = {
        "project_id": 10,
        "work_price_per_m2": 1500,
        "pipe_m_per_m2": 6.2,
        "max_contour_area_m2": 14,
        "small_zone_area_m2": 4,
        "manifold_work_price": 6500,
        "manifold_material_price": 21000,
        "pump_work_price": 8200,
        "pump_material_price": 25500,
        "pipe_price_per_m": 175,
        "pipe_material_title": " Труба тест ",
        "manifold_material_items": [_material(title=" Коллектор ", unit=" компл ", quantity=1, amount=1000)],
        "pump_material_items": [_material(title=" Насос ", unit="", quantity=1, amount=2000)],
        "consumable_material_items": [_material(title=" Расходник ", unit=" м ", quantity=-2, amount=-50)],
        "pump_rooms_threshold": 3,
        "pump_contours_threshold": 4,
        "rooms": [_room(room_id=1, area_m2_override=20), _room(room_id=2, selected=False)],
    }
    values.update(overrides)
    return UpdateWarmFloorCommand(**values)


class UpdateWarmFloorUseCaseTests(unittest.IsolatedAsyncioTestCase):
    async def test_execute_updates_config_and_selected_rooms(self) -> None:
        storage = FakeWarmFloorStorage(project={"id": 10}, rooms=[{"id": 1}, {"id": 2}])

        project_id = await UpdateWarmFloorUseCase(storage).execute(_command())

        self.assertEqual(project_id, 10)
        self.assertEqual(len(storage.config_calls), 1)
        config = storage.config_calls[0]
        self.assertEqual(config["project_id"], 10)
        self.assertEqual(config["work_price_per_m2"], 1500.0)
        self.assertEqual(config["pipe_m_per_m2"], 6.2)
        self.assertEqual(config["max_contour_area_m2"], 14.0)
        self.assertEqual(config["small_zone_area_m2"], 4.0)
        self.assertEqual(config["manifold_work_price"], 6500.0)
        self.assertEqual(config["manifold_material_price"], 1000.0)
        self.assertEqual(config["pump_work_price"], 8200.0)
        self.assertEqual(config["pump_material_price"], 2000.0)
        self.assertEqual(config["pipe_price_per_m"], 175.0)
        self.assertEqual(config["pipe_material_title"], "Труба тест")
        self.assertEqual(config["pump_rooms_threshold"], 3)
        self.assertEqual(config["pump_contours_threshold"], 4)

        manifold_items = json.loads(str(config["manifold_material_items_json"]))
        pump_items = json.loads(str(config["pump_material_items_json"]))
        consumable_items = json.loads(str(config["consumable_material_items_json"]))
        self.assertEqual(manifold_items, [{"title": "Коллектор", "unit": "компл", "quantity": 1.0, "amount": 1000.0}])
        self.assertEqual(pump_items, [{"title": "Насос", "unit": "компл.", "quantity": 1.0, "amount": 2000.0}])
        self.assertEqual(consumable_items, [{"title": "Расходник", "unit": "м", "quantity": 0.0, "amount": 0.0}])
        self.assertEqual(
            storage.room_replace_calls,
            [
                (
                    10,
                    [
                        {
                            "room_id": 1,
                            "area_m2_override": 20,
                            "note": "Room note",
                            "sort_order": 10,
                        }
                    ],
                )
            ],
        )

    async def test_execute_uses_material_totals_when_items_are_present(self) -> None:
        storage = FakeWarmFloorStorage(project={"id": 10}, rooms=[])
        command = _command(
            manifold_material_price=999,
            pump_material_price=888,
            manifold_material_items=[_material(amount=100), _material(amount=-50), _material(amount=250)],
            pump_material_items=[_material(amount=300), _material(amount=-10)],
            rooms=[],
        )

        await UpdateWarmFloorUseCase(storage).execute(command)

        self.assertEqual(storage.config_calls[0]["manifold_material_price"], 350.0)
        self.assertEqual(storage.config_calls[0]["pump_material_price"], 300.0)

    async def test_execute_uses_configured_material_prices_when_item_lists_are_empty(self) -> None:
        storage = FakeWarmFloorStorage(project={"id": 10}, rooms=[])
        command = _command(
            manifold_material_price=999,
            pump_material_price=888,
            manifold_material_items=[],
            pump_material_items=[],
            rooms=[],
        )

        await UpdateWarmFloorUseCase(storage).execute(command)

        self.assertEqual(storage.config_calls[0]["manifold_material_price"], 999.0)
        self.assertEqual(storage.config_calls[0]["pump_material_price"], 888.0)

    async def test_execute_rejects_missing_project(self) -> None:
        storage = FakeWarmFloorStorage(project=None)

        with self.assertRaisesRegex(NotFoundError, "Calculator project not found"):
            await UpdateWarmFloorUseCase(storage).execute(_command())

        storage.assert_no_writes(self)

    async def test_execute_validates_prices_and_consumption(self) -> None:
        storage = FakeWarmFloorStorage(project={"id": 10})

        with self.assertRaisesRegex(ValidationError, "Warm floor prices and consumption must be non-negative"):
            await UpdateWarmFloorUseCase(storage).execute(_command(work_price_per_m2=-1))

        storage.assert_no_writes(self)

    async def test_execute_validates_contour_parameters(self) -> None:
        storage = FakeWarmFloorStorage(project={"id": 10})

        with self.assertRaisesRegex(ValidationError, "Warm floor contour and zone parameters are invalid"):
            await UpdateWarmFloorUseCase(storage).execute(_command(max_contour_area_m2=0))

        storage.assert_no_writes(self)

    async def test_execute_validates_node_prices(self) -> None:
        storage = FakeWarmFloorStorage(project={"id": 10})

        with self.assertRaisesRegex(ValidationError, "Warm floor node prices must be non-negative"):
            await UpdateWarmFloorUseCase(storage).execute(_command(manifold_work_price=-1))

        storage.assert_no_writes(self)

    async def test_execute_validates_pump_thresholds(self) -> None:
        storage = FakeWarmFloorStorage(project={"id": 10})

        with self.assertRaisesRegex(ValidationError, "Pump thresholds must be positive integers"):
            await UpdateWarmFloorUseCase(storage).execute(_command(pump_rooms_threshold=0))

        storage.assert_no_writes(self)

    async def test_execute_validates_selected_area_override(self) -> None:
        storage = FakeWarmFloorStorage(project={"id": 10}, rooms=[{"id": 1}])

        with self.assertRaisesRegex(ValidationError, "Warm floor area override cannot be negative"):
            await UpdateWarmFloorUseCase(storage).execute(_command(rooms=[_room(room_id=1, area_m2_override=-1)]))

        storage.assert_no_writes(self)

    async def test_execute_filters_selected_rooms_like_route(self) -> None:
        storage = FakeWarmFloorStorage(project={"id": 10}, rooms=[{"id": 1}, {"id": 2}])
        command = _command(
            rooms=[
                _room(room_id=1, note="   "),
                _room(room_id=1, note="duplicate"),
                _room(room_id=999, note="unknown"),
                _room(room_id=2, selected=False, note="disabled"),
                _room(room_id=2, note=" Room two "),
            ]
        )

        await UpdateWarmFloorUseCase(storage).execute(command)

        self.assertEqual(
            storage.room_replace_calls[0][1],
            [
                {
                    "room_id": 1,
                    "area_m2_override": None,
                    "note": None,
                    "sort_order": 10,
                },
                {
                    "room_id": 2,
                    "area_m2_override": None,
                    "note": "Room two",
                    "sort_order": 50,
                },
            ],
        )
