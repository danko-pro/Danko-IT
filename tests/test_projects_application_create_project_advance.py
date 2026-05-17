from __future__ import annotations

import unittest
from types import SimpleNamespace
from typing import Any, Mapping

from supply_bot.application.errors import NotFoundError, OperationFailedError, ValidationError
from supply_bot.projects.application.create_project_advance import (
    CreateProjectAdvanceCommand,
    CreateProjectAdvanceUseCase,
)
from tests.test_projects_application_list_project_advances import _advance_row
from tests.test_projects_application_list_projects import _project_row

_UNSET = object()


def _advance_payload(
    *,
    title: str | None = "Main advance",
    amount: float | int = 1500,
    date: str | None = "2026-05-10",
    status: str | None = "paid",
) -> SimpleNamespace:
    return SimpleNamespace(title=title, amount=amount, date=date, status=status)


class FakeProjectAdvanceCreateStorage:
    def __init__(
        self,
        *,
        initial_project: Mapping[str, Any] | None,
        created_project: Mapping[str, Any] | None | object = _UNSET,
        created_advance: Mapping[str, Any] | None = None,
        advance_id: int = 20,
    ) -> None:
        self.initial_project = initial_project
        self.created_project = initial_project if created_project is _UNSET else created_project
        self.created_advance = created_advance
        self.advance_id = advance_id
        self.get_project_calls: list[int] = []
        self.get_project_advance_calls: list[int] = []
        self.created_project_id: int | None = None
        self.created_sync_totals: bool | None = None
        self.created_values: dict[str, Any] | None = None

    async def get_project(self, project_id: int) -> Mapping[str, Any] | None:
        self.get_project_calls.append(project_id)
        if len(self.get_project_calls) == 1:
            return self.initial_project
        return self.created_project

    async def create_project_advance(self, *, project_id: int, sync_totals: bool, **values: Any) -> int:
        self.created_project_id = project_id
        self.created_sync_totals = sync_totals
        self.created_values = values
        return self.advance_id

    async def get_project_advance(self, advance_id: int) -> Mapping[str, Any] | None:
        self.get_project_advance_calls.append(advance_id)
        return self.created_advance


class CreateProjectAdvanceUseCaseTests(unittest.IsolatedAsyncioTestCase):
    async def test_create_valid_advance_returns_existing_response_shape(self) -> None:
        storage = FakeProjectAdvanceCreateStorage(
            initial_project=_project_row(id=10, received_total=0),
            created_project=_project_row(id=10, received_total=1500),
            created_advance=_advance_row(id=20, project_id=10, title="Main advance"),
        )

        result = await CreateProjectAdvanceUseCase(storage).execute(
            CreateProjectAdvanceCommand(
                project_id=10,
                payload=_advance_payload(title="  Main advance  "),
                sync_totals=False,
            )
        )

        self.assertEqual(storage.get_project_calls, [10, 10])
        self.assertEqual(storage.created_project_id, 10)
        self.assertIs(storage.created_sync_totals, False)
        self.assertEqual(
            storage.created_values,
            {"title": "Main advance", "amount": 1500.0, "date": "2026-05-10", "status": "paid"},
        )
        self.assertEqual(storage.get_project_advance_calls, [20])
        self.assertEqual(set(result), {"advance", "project"})
        self.assertEqual(result["advance"]["title"], "Main advance")
        self.assertEqual(result["project"]["received_total"], 1500.0)

    async def test_missing_project_raises_not_found_without_create(self) -> None:
        storage = FakeProjectAdvanceCreateStorage(initial_project=None, created_advance=_advance_row())

        with self.assertRaisesRegex(NotFoundError, "Project not found"):
            await CreateProjectAdvanceUseCase(storage).execute(
                CreateProjectAdvanceCommand(project_id=404, payload=_advance_payload())
            )

        self.assertEqual(storage.get_project_calls, [404])
        self.assertIsNone(storage.created_values)

    async def test_validation_error_raises_application_validation_error_without_create(self) -> None:
        storage = FakeProjectAdvanceCreateStorage(initial_project=_project_row(id=10), created_advance=_advance_row())

        with self.assertRaisesRegex(ValidationError, "Advance amount must be greater than zero"):
            await CreateProjectAdvanceUseCase(storage).execute(
                CreateProjectAdvanceCommand(project_id=10, payload=_advance_payload(amount=0))
            )

        self.assertIsNone(storage.created_values)

    async def test_missing_created_advance_raises_operation_failed(self) -> None:
        storage = FakeProjectAdvanceCreateStorage(initial_project=_project_row(id=10), created_advance=None)

        with self.assertRaisesRegex(OperationFailedError, "Project advance was not created"):
            await CreateProjectAdvanceUseCase(storage).execute(
                CreateProjectAdvanceCommand(project_id=10, payload=_advance_payload())
            )

        self.assertEqual(storage.get_project_advance_calls, [20])

    async def test_missing_project_after_create_raises_operation_failed(self) -> None:
        storage = FakeProjectAdvanceCreateStorage(
            initial_project=_project_row(id=10),
            created_project=None,
            created_advance=_advance_row(id=20, project_id=10),
        )

        with self.assertRaisesRegex(OperationFailedError, "Project advance was not created"):
            await CreateProjectAdvanceUseCase(storage).execute(
                CreateProjectAdvanceCommand(project_id=10, payload=_advance_payload())
            )

        self.assertEqual(storage.get_project_calls, [10, 10])

    async def test_default_title_status_and_date_behavior_matches_domain_builder(self) -> None:
        storage = FakeProjectAdvanceCreateStorage(
            initial_project=_project_row(id=10),
            created_advance=_advance_row(id=20, project_id=10, title="Аванс", status="paid", date="2026-05-10"),
        )

        await CreateProjectAdvanceUseCase(storage).execute(
            CreateProjectAdvanceCommand(
                project_id=10,
                payload=_advance_payload(title=" ", status="unknown", date="2026-05-10"),
            )
        )

        self.assertEqual(storage.created_values["title"], "Аванс")
        self.assertEqual(storage.created_values["status"], "paid")
        self.assertEqual(storage.created_values["date"], "2026-05-10")
