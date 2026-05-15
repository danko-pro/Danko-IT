from __future__ import annotations

import unittest
from typing import Any

from supply_bot.estimates.application.update_project import (
    UpdateEstimateProjectCommand,
    UpdateEstimateProjectUseCase,
)


class FakeEstimateProjectUpdateStorage:
    def __init__(self, *, project: dict[str, Any] | None = None) -> None:
        self.project = project
        self.update_calls: list[dict[str, object]] = []

    async def get_estimate_project(self, project_id: int) -> dict[str, Any] | None:
        return self.project

    async def update_estimate_project(
        self,
        project_id: int,
        *,
        name: str,
        residential_complex: str,
        address: str,
        entrance_section: str,
        apartment: str,
        floor: str,
        has_elevator: int,
        lift_type: str,
        site_access: str,
        intercom_code: str,
        loading_zone: str,
        responsible_person: str,
        note: str | None,
    ) -> None:
        self.update_calls.append(
            {
                "project_id": project_id,
                "name": name,
                "residential_complex": residential_complex,
                "address": address,
                "entrance_section": entrance_section,
                "apartment": apartment,
                "floor": floor,
                "has_elevator": has_elevator,
                "lift_type": lift_type,
                "site_access": site_access,
                "intercom_code": intercom_code,
                "loading_zone": loading_zone,
                "responsible_person": responsible_person,
                "note": note,
            }
        )


def _valid_command(**overrides: object) -> UpdateEstimateProjectCommand:
    values: dict[str, object] = {
        "project_id": 10,
        "name": "Project",
        "residential_complex": "Residential complex",
        "address": "Address",
        "entrance_section": "Entrance",
        "apartment": "Apartment",
        "floor": "Floor",
        "lift_type": "passenger",
        "site_access": "Site access",
        "intercom_code": "Intercom",
        "loading_zone": "Loading zone",
        "responsible_person": "Responsible",
        "note": "Note",
    }
    values.update(overrides)
    return UpdateEstimateProjectCommand(**values)


class UpdateEstimateProjectUseCaseTests(unittest.IsolatedAsyncioTestCase):
    async def test_execute_normalizes_project_update_and_returns_project_id(self) -> None:
        storage = FakeEstimateProjectUpdateStorage(project={"id": 10})
        command = _valid_command(
            name="  Project A  ",
            residential_complex="  RC One  ",
            address="  Main street 10  ",
            entrance_section="  Section B  ",
            apartment="  45  ",
            floor="  12  ",
            lift_type="  passenger  ",
            site_access="  Call guard  ",
            intercom_code="  4512  ",
            loading_zone="  Yard gate  ",
            responsible_person="  Site manager  ",
            note="  Updated note  ",
        )

        project_id = await UpdateEstimateProjectUseCase(storage).execute(command)

        self.assertEqual(project_id, 10)
        self.assertEqual(
            storage.update_calls,
            [
                {
                    "project_id": 10,
                    "name": "Project A",
                    "residential_complex": "RC One",
                    "address": "Main street 10",
                    "entrance_section": "Section B",
                    "apartment": "45",
                    "floor": "12",
                    "has_elevator": 1,
                    "lift_type": "passenger",
                    "site_access": "Call guard",
                    "intercom_code": "4512",
                    "loading_zone": "Yard gate",
                    "responsible_person": "Site manager",
                    "note": "Updated note",
                }
            ],
        )

    async def test_execute_empty_lift_type_disables_elevator(self) -> None:
        storage = FakeEstimateProjectUpdateStorage(project={"id": 10})

        await UpdateEstimateProjectUseCase(storage).execute(_valid_command(lift_type=None))
        await UpdateEstimateProjectUseCase(storage).execute(_valid_command(lift_type="   "))

        self.assertEqual(storage.update_calls[0]["lift_type"], "")
        self.assertEqual(storage.update_calls[0]["has_elevator"], 0)
        self.assertEqual(storage.update_calls[1]["lift_type"], "")
        self.assertEqual(storage.update_calls[1]["has_elevator"], 0)

    async def test_execute_none_lift_type_disables_elevator(self) -> None:
        storage = FakeEstimateProjectUpdateStorage(project={"id": 10})

        await UpdateEstimateProjectUseCase(storage).execute(_valid_command(lift_type="none"))

        self.assertEqual(storage.update_calls[0]["lift_type"], "none")
        self.assertEqual(storage.update_calls[0]["has_elevator"], 0)

    async def test_execute_non_empty_lift_type_enables_elevator(self) -> None:
        storage = FakeEstimateProjectUpdateStorage(project={"id": 10})

        await UpdateEstimateProjectUseCase(storage).execute(_valid_command(lift_type="passenger"))
        await UpdateEstimateProjectUseCase(storage).execute(_valid_command(lift_type="cargo"))

        self.assertEqual(storage.update_calls[0]["has_elevator"], 1)
        self.assertEqual(storage.update_calls[1]["has_elevator"], 1)

    async def test_execute_rejects_missing_project(self) -> None:
        storage = FakeEstimateProjectUpdateStorage(project=None)

        with self.assertRaisesRegex(ValueError, "Calculator project not found"):
            await UpdateEstimateProjectUseCase(storage).execute(_valid_command())

        self.assertEqual(storage.update_calls, [])

    async def test_execute_rejects_empty_name(self) -> None:
        storage = FakeEstimateProjectUpdateStorage(project={"id": 10})

        with self.assertRaisesRegex(ValueError, "Project name is required"):
            await UpdateEstimateProjectUseCase(storage).execute(_valid_command(name="   "))

        self.assertEqual(storage.update_calls, [])

    async def test_execute_converts_empty_note_to_none(self) -> None:
        storage = FakeEstimateProjectUpdateStorage(project={"id": 10})

        await UpdateEstimateProjectUseCase(storage).execute(_valid_command(note="   "))

        self.assertEqual(storage.update_calls[0]["note"], None)
