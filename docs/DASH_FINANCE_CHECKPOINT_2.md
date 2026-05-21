# Dashboard finance checkpoint 2

Статус: `DASH-FINANCE-2`, storage summary wiring checkpoint.

## Что закрыто

`src/supply_bot/storage_projects/summary.py` подключен к чистому domain finance engine:

```text
src/supply_bot/projects/domain/finance.py
```

Storage summary теперь выступает adapter-слоем:

- читает project и ledger rows из БД;
- собирает `ProjectLedgerFinanceInput`;
- вызывает `calculate_project_finance_summary`;
- сохраняет существующие summary-поля проекта.

## Compatibility

API response shape unchanged.

Старые поля продолжают обновляться в прежнем публичном shape:

- `actual_total` = `summary.paid_expense_total`;
- `remaining_total` = `summary.cash_balance`;
- `deferred_total` = `summary.committed_unpaid_total`;
- `work_per_m2` = `summary.work_per_m2`;
- `materials_per_m2` = `summary.materials_per_m2`;
- `planned_total` остается legacy API field.

`planned_total` пока означает remaining plan balance, а не total planned expenses. Новые поля `planned_expense_total`, `available_after_plan` и `net_available` пока не exposed через API.

## Confirmed unchanged

- Frontend unchanged.
- UI unchanged.
- Database schema/migrations unchanged.
- API response shape unchanged.
- Auth/session/cookie unchanged.
- Package files unchanged.
- Deploy/env unchanged.

## Следующий этап

Следующий этап: `DASH-FINANCE-3`.

На `DASH-FINANCE-3` нужно добавить read-model расчет новых finance fields без UI и без миграции, если возможно.
