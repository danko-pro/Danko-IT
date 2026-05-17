from __future__ import annotations

import unittest
from typing import Any

from supply_bot.application.errors import NotFoundError
from supply_bot.estimates.application.update_ceiling_config import (
    UpdateCeilingConfigCommand,
    UpdateCeilingConfigUseCase,
)


class FakeCeilingConfigStorage:
    def __init__(self, *, project: dict[str, Any] | None = None) -> None:
        self.project = project
        self.update_calls: list[tuple[int, dict[str, object]]] = []

    async def get_estimate_project(self, project_id: int) -> dict[str, Any] | None:
        return self.project

    async def update_estimate_ceiling_config(self, project_id: int, **kwargs: object) -> None:
        self.update_calls.append((project_id, kwargs))


class UpdateCeilingConfigUseCaseTests(unittest.IsolatedAsyncioTestCase):
    async def test_happy_path_normalizes_values_and_updates_config(self) -> None:
        storage = FakeCeilingConfigStorage(project={"id": 10})

        project_id = await UpdateCeilingConfigUseCase(storage).execute(
            UpdateCeilingConfigCommand(
                project_id=10,
                default_package_code="  MID  ",
                price_factor=1.2,
                note="  Note  ",
            )
        )

        self.assertEqual(project_id, 10)
        self.assertEqual(
            storage.update_calls,
            [
                (
                    10,
                    {
                        "default_package_code": "MID",
                        "price_factor": 1.2,
                        "note": "Note",
                    },
                )
            ],
        )

    async def test_price_factor_none_defaults_to_one(self) -> None:
        storage = FakeCeilingConfigStorage(project={"id": 10})

        await UpdateCeilingConfigUseCase(storage).execute(
            UpdateCeilingConfigCommand(project_id=10, default_package_code=None, price_factor=None, note=None)
        )

        self.assertEqual(storage.update_calls[0][1]["price_factor"], 1.0)

    async def test_negative_price_factor_clamps_to_zero(self) -> None:
        storage = FakeCeilingConfigStorage(project={"id": 10})

        await UpdateCeilingConfigUseCase(storage).execute(
            UpdateCeilingConfigCommand(project_id=10, default_package_code=None, price_factor=-5, note=None)
        )

        self.assertEqual(storage.update_calls[0][1]["price_factor"], 0.0)

    async def test_missing_project_rejects_without_write(self) -> None:
        storage = FakeCeilingConfigStorage(project=None)

        with self.assertRaisesRegex(NotFoundError, "Calculator project not found"):
            await UpdateCeilingConfigUseCase(storage).execute(
                UpdateCeilingConfigCommand(project_id=10, default_package_code=None, price_factor=1, note=None)
            )

        self.assertEqual(storage.update_calls, [])
