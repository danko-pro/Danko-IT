from __future__ import annotations

import unittest

from supply_bot.estimates.application.create_project import (
    CreateEstimateProjectCommand,
    CreateEstimateProjectUseCase,
)


class FakeEstimateProjectStorage:
    def __init__(self) -> None:
        self.calls: list[dict[str, object]] = []

    async def create_estimate_project(
        self,
        *,
        name: str,
        note: str | None,
        group_chat_id: int | None,
    ) -> int:
        self.calls.append(
            {
                "name": name,
                "note": note,
                "group_chat_id": group_chat_id,
            }
        )
        return 42


class CreateEstimateProjectUseCaseTests(unittest.IsolatedAsyncioTestCase):
    async def test_execute_normalizes_name_note_and_returns_project_id(self) -> None:
        storage = FakeEstimateProjectStorage()
        command = CreateEstimateProjectCommand(
            name="  Object A  ",
            note="  Test note  ",
            group_chat_id=123,
        )

        project_id = await CreateEstimateProjectUseCase(storage).execute(command)

        self.assertEqual(project_id, 42)
        self.assertEqual(
            storage.calls,
            [
                {
                    "name": "Object A",
                    "note": "Test note",
                    "group_chat_id": 123,
                }
            ],
        )

    async def test_execute_converts_empty_note_to_none(self) -> None:
        storage = FakeEstimateProjectStorage()
        command = CreateEstimateProjectCommand(
            name="Object B",
            note="   ",
            group_chat_id=None,
        )

        await CreateEstimateProjectUseCase(storage).execute(command)

        self.assertEqual(storage.calls[0]["note"], None)

    async def test_execute_rejects_empty_name(self) -> None:
        storage = FakeEstimateProjectStorage()
        command = CreateEstimateProjectCommand(
            name="   ",
            note=None,
            group_chat_id=None,
        )

        with self.assertRaisesRegex(ValueError, "Project name is required"):
            await CreateEstimateProjectUseCase(storage).execute(command)

        self.assertEqual(storage.calls, [])
