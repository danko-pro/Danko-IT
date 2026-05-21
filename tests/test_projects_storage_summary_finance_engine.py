from __future__ import annotations

import unittest
from pathlib import Path
from typing import Any

from supply_bot.storage_projects.summary import ProjectSummaryStorageMixin

REPO_ROOT = Path(__file__).resolve().parents[1]
SUMMARY_PATH = REPO_ROOT / "src" / "supply_bot" / "storage_projects" / "summary.py"


class _Cursor:
    def __init__(self, *, rows: list[dict[str, Any]] | None = None, row: dict[str, Any] | None = None) -> None:
        self._rows = rows or []
        self._row = row

    async def fetchall(self) -> list[dict[str, Any]]:
        return self._rows

    async def fetchone(self) -> dict[str, Any] | None:
        return self._row


class _SummaryDb:
    def __init__(
        self,
        *,
        project_row: dict[str, Any],
        ledger_rows: list[dict[str, Any]],
    ) -> None:
        self.project_row = project_row
        self.ledger_rows = ledger_rows
        self.updated_values: tuple[Any, ...] | None = None

    async def execute(self, sql: str, params: tuple[Any, ...] = ()) -> _Cursor:
        normalized_sql = " ".join(sql.lower().split())
        if normalized_sql.startswith("select category"):
            return _Cursor(rows=self.ledger_rows)
        if normalized_sql.startswith("select area_m2"):
            return _Cursor(row=self.project_row)
        if normalized_sql.startswith("update projects"):
            self.updated_values = params
            return _Cursor()
        raise AssertionError(f"Unexpected SQL: {sql}")


class _SummaryStorage(ProjectSummaryStorageMixin):
    pass


def _row(
    *,
    status: str,
    category: str = "",
    plan_amount: float = 0.0,
    actual_amount: float = 0.0,
    control_date: str = "",
) -> dict[str, Any]:
    return {
        "status": status,
        "category": category,
        "plan_amount": plan_amount,
        "actual_amount": actual_amount,
        "control_date": control_date,
    }


async def _sync_summary(
    *,
    received_total: float,
    area_m2: float = 0.0,
    ledger_rows: list[dict[str, Any]],
) -> tuple[Any, ...]:
    db = _SummaryDb(
        project_row={"area_m2": area_m2, "received_total": received_total},
        ledger_rows=ledger_rows,
    )
    await _SummaryStorage()._sync_project_summary_from_ledger(db, project_id=10)
    assert db.updated_values is not None
    return db.updated_values


class ProjectStorageSummaryFinanceEngineTests(unittest.IsolatedAsyncioTestCase):
    async def test_paid_entry_uses_engine_paid_total_and_cash_balance(self) -> None:
        values = await _sync_summary(
            received_total=100000,
            ledger_rows=[_row(status="paid", plan_amount=30000)],
        )

        self.assertEqual(values[1], 30000.0)
        self.assertEqual(values[2], 70000.0)

    async def test_planned_entry_keeps_legacy_planned_total(self) -> None:
        values = await _sync_summary(
            received_total=1064370.98,
            ledger_rows=[_row(status="planned", plan_amount=62600)],
        )

        self.assertEqual(values[0], 62600.0)
        self.assertEqual(values[1], 0.0)
        self.assertEqual(values[2], 1064370.98)

    async def test_invoice_and_waiting_payment_update_deferred_total_without_reducing_remaining(self) -> None:
        invoice_values = await _sync_summary(
            received_total=100000,
            ledger_rows=[_row(status="invoice", plan_amount=50000)],
        )
        waiting_values = await _sync_summary(
            received_total=100000,
            ledger_rows=[_row(status="waiting-payment", plan_amount=50000)],
        )

        self.assertEqual(invoice_values[3], 50000.0)
        self.assertEqual(invoice_values[2], 100000.0)
        self.assertEqual(waiting_values[3], 50000.0)
        self.assertEqual(waiting_values[2], 100000.0)

    async def test_paid_and_completed_use_actual_amount_when_actual_exceeds_plan(self) -> None:
        paid_values = await _sync_summary(
            received_total=1000,
            ledger_rows=[_row(status="paid", plan_amount=100, actual_amount=150)],
        )
        completed_values = await _sync_summary(
            received_total=1000,
            ledger_rows=[_row(status="completed", plan_amount=100, actual_amount=150)],
        )

        self.assertEqual(paid_values[1], 150.0)
        self.assertEqual(completed_values[1], 150.0)

    async def test_work_and_materials_per_m2_use_engine_category_amounts(self) -> None:
        values = await _sync_summary(
            received_total=100000,
            area_m2=10,
            ledger_rows=[
                _row(status="paid", category="Работы", plan_amount=30000),
                _row(status="planned", category="Материалы", plan_amount=20000),
            ],
        )

        self.assertEqual(values[4], 3000.0)
        self.assertEqual(values[5], 2000.0)

    async def test_empty_ledger_after_delete_resyncs_summary(self) -> None:
        values = await _sync_summary(received_total=100000, ledger_rows=[])

        self.assertEqual(values[0], 0.0)
        self.assertEqual(values[1], 0.0)
        self.assertEqual(values[2], 100000.0)
        self.assertEqual(values[3], 0.0)


class ProjectStorageSummaryArchitectureTests(unittest.TestCase):
    def test_summary_adapter_uses_finance_engine_without_old_amount_helpers(self) -> None:
        source = SUMMARY_PATH.read_text(encoding="utf-8")

        self.assertIn("calculate_project_finance_summary", source)
        self.assertIn("ProjectLedgerFinanceInput", source)
        self.assertNotIn("_ledger_committed_amount", source)
        self.assertNotIn("_ledger_paid_amount", source)
        self.assertIn("_legacy_ledger_plan_balance_amount", source)


if __name__ == "__main__":
    unittest.main()
