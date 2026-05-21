# Dashboard finance checkpoint 1

Статус: `DASH-FINANCE-1`, domain engine checkpoint.

## Что закрыто

Создан чистый domain finance engine для dashboard объектов:

```text
src/supply_bot/projects/domain/finance.py
```

Добавлены unit tests:

```text
tests/test_projects_domain_finance.py
```

Engine считает:

- ledger amount-компоненты по статусам `planned`, `invoice`, `waiting-payment`, `paid`, `completed`;
- `paid_expense_total`;
- `planned_expense_total`;
- `committed_unpaid_total`;
- `cash_balance`;
- `available_after_plan`;
- `available_after_obligations`;
- `tax_reserve_total`;
- `net_available`;
- `work_amount`, `materials_amount`, `work_per_m2`, `materials_per_m2`.

## Confirmed unchanged

- Storage/API/UI не подключались.
- Frontend unchanged.
- Database schema/migrations unchanged.
- API response shape unchanged.
- Auth/session/cookie unchanged.
- Package files unchanged.
- Deploy/env unchanged.

## Следующий этап

Следующий этап: `DASH-FINANCE-2`.

На `DASH-FINANCE-2` нужно подключить `storage_projects/summary.py` к finance engine без изменения API shape.
