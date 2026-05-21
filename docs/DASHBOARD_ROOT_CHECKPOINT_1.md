# Dashboard root checkpoint 1

Статус: `DASH-DASHBOARD-ROOT-1`, backend dashboard root read-model.

## Что Закрыто

Создан backend application read-model для будущей общей вкладки dashboard **Все объекты**:

```text
src/supply_bot/projects/application/dashboard_root_read_model.py
```

Read-model:

- принимает `projects` и `ledger_entries_by_project` как аргументы;
- не ходит в database напрямую;
- строит `finance_summary` по каждому объекту через существующий project finance read-model;
- агрегирует totals как сумму project-level `finance_summary`;
- не использует legacy fields `planned_total`, `actual_total`, `remaining_total`, `deferred_total` как source of truth;
- возвращает serializable payload с `summary` и `projects`;
- добавляет `risk_flags` и `risk_status` для project rows.

Source of truth для финансовых расчетов остается:

```text
src/supply_bot/projects/domain/finance.py
```

## Payload

Минимальный payload read-model:

```text
{
  "summary": {
    "received_total": number,
    "paid_expense_total": number,
    "planned_expense_total": number,
    "committed_unpaid_total": number,
    "cash_balance": number,
    "available_after_plan": number,
    "available_after_obligations": number,
    "tax_reserve_total": number,
    "net_available": number
  },
  "projects": [
    {
      "project_id": number,
      "code": string,
      "name": string,
      "stage_label": string,
      "finance_summary": object,
      "risk_status": "ok|warning|critical",
      "risk_flags": []
    }
  ]
}
```

## Risk Rules

Зафиксированы backend read-model flags:

- `negative_net_available`;
- `obligation_pressure`;
- `plan_pressure`;
- `tax_pressure`.

Risk status:

- `critical`, если есть `negative_net_available` или `obligation_pressure`;
- `warning`, если есть `plan_pressure` или `tax_pressure`;
- `ok`, если flags пустой.

## Confirmed Unchanged

- Endpoint/API unchanged.
- `listProjects()` response shape unchanged.
- Project detail endpoint shape unchanged.
- Frontend/UI unchanged.
- Database schema/migrations unchanged.
- Auth/session/cookie unchanged.
- Deploy/env unchanged.
- Package files unchanged.
- Accounting behavior unchanged.

## Следующий Этап

Следующий этап: `DASH-DASHBOARD-ROOT-2`.

На `DASH-DASHBOARD-ROOT-2` нужно добавить backend endpoint/read path `GET /api/dashboard/root-summary` без UI и без изменения database schema.
