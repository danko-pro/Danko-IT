# Dashboard root overview plan

Статус: `DASH-DASHBOARD-ROOT-0`, documentation checkpoint.

Этот документ фиксирует архитектурный план общей вкладки dashboard по всем объектам. На этом этапе runtime Python/TypeScript код, UI/frontend, database schema, migrations, API response shape, auth/session/cookie, deploy/env и package files не меняются.

## Цель

Общая вкладка dashboard нужна для управления портфелем объектов. Она должна быть фиксированной первой вкладкой и не зависеть от выбора конкретного объекта.

Будущая структура dashboard:

1. Общая вкладка / Все объекты
2. Объект 1
3. Объект 2
4. Объект 3
5. И так далее

Рабочее название общей вкладки: **Все объекты**.

## Назначение Общей Вкладки

Общая вкладка должна показывать агрегаты по всем объектам:

- общее количество объектов;
- общий договорный объем;
- всего получено авансов;
- всего фактических расходов;
- всего плановых расходов;
- всего обязательств без оплаты;
- общий cash balance;
- общий available_after_plan;
- общий available_after_obligations;
- общий tax_reserve_total;
- общий net_available;
- объекты с отрицательным net_available;
- объекты с риском кассового разрыва;
- ближайшие контрольные даты;
- ближайшие оплаты;
- топ объектов по расходам;
- топ объектов по остаткам.

## Финансовая База

Общая вкладка должна использовать тот же finance engine, что и dashboard конкретного объекта:

```text
src/supply_bot/projects/domain/finance.py
```

И тот же finance summary read-model:

```text
src/supply_bot/projects/application/finance_read_model.py
```

Нельзя создавать вторую математику для общей вкладки. Source of truth для финансовых формул остается в `projects/domain/finance.py`.

## Целевая Backend Architecture

Предпочтительный будущий файл:

```text
src/supply_bot/projects/application/dashboard_root_read_model.py
```

Этот вариант лучше, чем `src/supply_bot/dashboard/application/root_summary.py`, потому что текущая финансовая логика, project payload и ledger read-model уже живут внутри `projects` domain/application boundary. Общая вкладка агрегирует портфель объектов, но ее финансовая база остается project finance model.

Будущая функция:

```python
def build_dashboard_root_summary_payload(
    *,
    projects: list[Mapping[str, Any]],
    ledger_entries_by_project: Mapping[int, list[Mapping[str, Any]]],
) -> dict[str, Any]:
    ...
```

Она должна:

- пройти по всем проектам;
- для каждого проекта построить `finance_summary`;
- агрегировать totals;
- сформировать risk indicators;
- вернуть serializable read-model.

## Целевой Payload

Будущий payload общей вкладки:

```text
dashboard_root_summary = {
    "projects_count": number,
    "contract_total": number,
    "received_total": number,
    "paid_expense_total": number,
    "planned_expense_total": number,
    "committed_unpaid_total": number,
    "cash_balance": number,
    "available_after_plan": number,
    "available_after_obligations": number,
    "tax_reserve_total": number,
    "net_available": number,
    "risk_projects_count": number,
    "negative_net_available_projects": [],
    "cash_gap_projects": [],
    "upcoming_control_dates": [],
    "top_expense_projects": [],
    "top_balance_projects": []
}
```

`contract_total` должен агрегироваться из договорного read-model, когда он будет доступен в безопасной backend точке. Финансовые поля должны агрегироваться из project-level `finance_summary`.

## Risk Rules

Базовые правила рисков:

```text
negative_net_available:
project.finance_summary.net_available < 0

cash_gap:
project.finance_summary.cash_balance < project.finance_summary.planned_expense_total

obligation_pressure:
project.finance_summary.available_after_obligations < 0

tax_pressure:
project.finance_summary.tax_reserve_total > 0
and project.finance_summary.net_available < project.finance_summary.tax_reserve_total
```

На `DASH-DASHBOARD-ROOT-0` это только план. Runtime risk calculation не реализуется.

## UI Direction

Общая вкладка должна быть первой вкладкой dashboard.

Варианты названия:

- Обзор;
- Все объекты;
- Портфель;
- Сводка.

Рабочее название: **Все объекты**.

Будущий UI должен показывать:

- верхние summary cards;
- блок рисков;
- таблицу объектов;
- ближайшие даты;
- фильтры по статусам;
- переход в конкретный объект.

UI должен только отображать backend read-model. Он не должен быть источником финансовых расчетов.

## Этапы Реализации

`DASH-DASHBOARD-ROOT-0`: документационный checkpoint, runtime не меняем.

`DASH-DASHBOARD-ROOT-1`: создать backend application read-model для общей сводки.

`DASH-DASHBOARD-ROOT-2`: добавить backend endpoint/read path для общей сводки без UI.

`DASH-DASHBOARD-ROOT-3`: подключить frontend state/API client.

`DASH-DASHBOARD-ROOT-4`: сделать UI общей вкладки **Все объекты**.

`DASH-DASHBOARD-ROOT-5`: добавить фильтры, сортировки, risk indicators.

## Ограничения

На `DASH-DASHBOARD-ROOT-0` запрещено менять:

- runtime Python/TypeScript код;
- frontend/UI;
- database schema/migrations;
- API response shape;
- auth/session/cookie;
- deploy/env;
- package files.

## Acceptance Criteria

`DASH-DASHBOARD-ROOT-0` закрыт, если:

- создан `docs/DASHBOARD_ROOT_OVERVIEW_PLAN.md`;
- в `ARCHITECTURE.md` добавлен короткий roadmap-блок про fixed global dashboard tab;
- создан `docs/DASHBOARD_ROOT_CHECKPOINT_0.md`;
- runtime code не менялся;
- UI/frontend не менялись;
- migrations не менялись;
- package files не менялись;
- следующий этап зафиксирован как `DASH-DASHBOARD-ROOT-1`.
