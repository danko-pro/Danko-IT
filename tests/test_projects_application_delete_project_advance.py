from __future__ import annotations

import unittest
from typing import Any, Mapping

from supply_bot.application.errors import NotFoundError, OperationFailedError
from supply_bot.projects.application.delete_project_advance import (
    DeleteProjectAdvanceCommand,
    DeleteProjectAdvanceUseCase,
)
from tests.test_projects_application_list_project_advances import _advance_row
from tests.test_projects_application_list_projects import _project_row
from tests.test_projects_application_update_project import _expected_project_payload_keys

_UNSET = object()


class FakeProjectAdvanceDeleteStorage:
    def __init__(
        self,
        *,
        initial_project: Mapping[str, Any] | None,
        deleted_project: Mapping[str, Any] | None | object = _UNSET,
        advance: Mapping[str, Any] | None = None,
        deleted: object = True,
    ) -> None:
        self.initial_project = initial_project
        self.deleted_project = initial_project if deleted_project is _UNSET else deleted_project
        self.advance = advance
        self.deleted = deleted
        self.get_project_calls: list[int] = []
        self.get_project_advance_calls: list[int] = []
        self.delete_project_advance_calls: list[int] = []

    async def get_project(self, project_id: int) -> Mapping[str, Any] | None:
        self.get_project_calls.append(project_id)
        if len(self.get_project_calls) == 1:
            return self.initial_project
        return self.deleted_project

    async def get_project_advance(self, advance_id: int) -> Mapping[str, Any] | None:
        self.get_project_advance_calls.append(advance_id)
        return self.advance

    async def delete_project_advance(self, advance_id: int) -> object:
        self.delete_project_advance_calls.append(advance_id)
        return self.deleted


class DeleteProjectAdvanceUseCaseTests(unittest.IsolatedAsyncioTestCase):
    async def test_delete_existing_advance_returns_existing_response_shape(self) -> None:
        storage = FakeProjectAdvanceDeleteStorage(
            initial_project=_project_row(id=10, received_total=1500),
            deleted_project=_project_row(id=10, received_total=0),
            advance=_advance_row(id=20, project_id=10),
        )

        result = await DeleteProjectAdvanceUseCase(storage).execute(
            DeleteProjectAdvanceCommand(project_id=10, advance_id=20)
        )

        self.assertEqual(storage.get_project_calls, [10, 10])
        self.assertEqual(storage.get_project_advance_calls, [20])
        self.assertEqual(storage.delete_project_advance_calls, [20])
        self.assertEqual(set(result), {"deleted", "advance_id", "project"})
        self.assertIs(result["deleted"], True)
        self.assertEqual(result["advance_id"], 20)
        self.assertEqual(result["project"]["received_total"], 0.0)
        self.assertEqual(set(result["project"]), set(_expected_project_payload_keys()))

    async def test_missing_project_raises_not_found_without_advance_lookup_or_delete(self) -> None:
        storage = FakeProjectAdvanceDeleteStorage(
            initial_project=None,
            advance=_advance_row(id=20, project_id=10),
        )

        with self.assertRaisesRegex(NotFoundError, "Project not found"):
            await DeleteProjectAdvanceUseCase(storage).execute(
                DeleteProjectAdvanceCommand(project_id=404, advance_id=20)
            )

        self.assertEqual(storage.get_project_calls, [404])
        self.assertEqual(storage.get_project_advance_calls, [])
        self.assertEqual(storage.delete_project_advance_calls, [])

    async def test_missing_advance_raises_not_found_without_delete(self) -> None:
        storage = FakeProjectAdvanceDeleteStorage(initial_project=_project_row(id=10), advance=None)

        with self.assertRaisesRegex(NotFoundError, "Project advance not found"):
            await DeleteProjectAdvanceUseCase(storage).execute(
                DeleteProjectAdvanceCommand(project_id=10, advance_id=404)
            )

        self.assertEqual(storage.get_project_advance_calls, [404])
        self.assertEqual(storage.delete_project_advance_calls, [])

    async def test_advance_from_another_project_raises_not_found_without_delete(self) -> None:
        storage = FakeProjectAdvanceDeleteStorage(
            initial_project=_project_row(id=10),
            advance=_advance_row(id=20, project_id=99),
        )

        with self.assertRaisesRegex(NotFoundError, "Project advance not found"):
            await DeleteProjectAdvanceUseCase(storage).execute(
                DeleteProjectAdvanceCommand(project_id=10, advance_id=20)
            )

        self.assertEqual(storage.get_project_advance_calls, [20])
        self.assertEqual(storage.delete_project_advance_calls, [])

    async def test_delete_operation_failed_raises_operation_failed(self) -> None:
        storage = FakeProjectAdvanceDeleteStorage(
            initial_project=_project_row(id=10),
            advance=_advance_row(id=20, project_id=10),
            deleted=False,
        )

        with self.assertRaisesRegex(OperationFailedError, "Project advance deletion failed"):
            await DeleteProjectAdvanceUseCase(storage).execute(
                DeleteProjectAdvanceCommand(project_id=10, advance_id=20)
            )

        self.assertEqual(storage.delete_project_advance_calls, [20])

    async def test_project_missing_after_delete_raises_operation_failed(self) -> None:
        storage = FakeProjectAdvanceDeleteStorage(
            initial_project=_project_row(id=10),
            deleted_project=None,
            advance=_advance_row(id=20, project_id=10),
        )

        with self.assertRaisesRegex(OperationFailedError, "Project advance deletion failed"):
            await DeleteProjectAdvanceUseCase(storage).execute(
                DeleteProjectAdvanceCommand(project_id=10, advance_id=20)
            )

        self.assertEqual(storage.get_project_calls, [10, 10])

    async def test_response_shape_is_stable(self) -> None:
        storage = FakeProjectAdvanceDeleteStorage(
            initial_project=_project_row(id=10),
            deleted_project=_project_row(id=10),
            advance=_advance_row(id=30, project_id=10),
        )

        result = await DeleteProjectAdvanceUseCase(storage).execute(
            DeleteProjectAdvanceCommand(project_id=10, advance_id=30)
        )

        self.assertEqual(set(result), {"deleted", "advance_id", "project"})
        self.assertIs(result["deleted"], True)
        self.assertEqual(result["advance_id"], 30)
        self.assertEqual(set(result["project"]), set(_expected_project_payload_keys()))
