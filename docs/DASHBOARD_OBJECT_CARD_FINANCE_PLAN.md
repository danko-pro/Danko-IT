# Dashboard object card finance plan

Статус: `DASH-OBJECT-CARD-0`, documentation checkpoint.

Этот документ фиксирует архитектуру отображения финансовых показателей внутри конкретного объекта. На этом этапе runtime Python/TypeScript код, UI/frontend, database schema, migrations, API response shape, auth/session/cookie, deploy/env и package files не меняются.

## Цель

Внутри конкретного объекта есть несколько смысловых вкладок:

1. Карточка объекта
2. Финансы
3. Таблица учета
4. Паспорт объекта
5. Другие будущие вкладки

Нужно зафиксировать разделение ответственности:

- **Карточка объекта** показывает итоговую управленческую картину объекта.
- **Финансы** содержат настройки финансовой модели объекта и финансовую детализацию.
- **Таблица учета** является источником строк расходов, планов, счетов, актов и обязательств.
- **Все объекты** является общей фиксированной вкладкой dashboard и агрегирует показатели всех объектов.

## Карточка Объекта

Вкладка **Карточка объекта** должна показывать готовые расчетные показатели, а не настраивать формулы.

Она должна отвечать на вопросы:

- сколько денег пришло;
- сколько уже потрачено;
- сколько запланировано;
- сколько висит в обязательствах;
- сколько останется после плана;
- сколько останется после обязательств;
- сколько зарезервировано под налоги;
- какой чистый остаток;
- есть ли риск кассового разрыва.

Карточка объекта показывает результат расчетов. Она не должна быть местом настройки налогов, маржи, договорных условий или строк учета.

## Источник Данных

Карточка объекта должна отображать данные из backend `finance_summary`.

Источник истины:

```text
src/supply_bot/projects/domain/finance.py
```

Read-model:

```text
src/supply_bot/projects/application/finance_read_model.py
```

Карточка объекта не должна сама считать финансовые формулы.

Frontend может форматировать числа, валюту, проценты и визуальные состояния, но не должен быть источником финансовой математики.

## Показатели Карточки Объекта

Целевые показатели для вкладки **Карточка объекта**:

- `contract_total`, если доступен из договора;
- `received_total`;
- `paid_expense_total`;
- `planned_expense_total`;
- `committed_unpaid_total`;
- `cash_balance`;
- `available_after_plan`;
- `available_after_obligations`;
- `tax_reserve_total`;
- `net_available`;
- `work_per_m2`;
- `materials_per_m2`.

Старые поля:

- `planned_total`;
- `actual_total`;
- `remaining_total`;
- `deferred_total`.

Эти поля могут временно отображаться для compatibility, но новый UI должен постепенно переходить на `finance_summary`.

## Risk Indicators

Будущие правила risk indicators для карточки объекта:

```text
cash_gap:
cash_balance < planned_expense_total

negative_after_plan:
available_after_plan < 0

negative_after_obligations:
available_after_obligations < 0

negative_net_available:
net_available < 0

tax_pressure:
tax_reserve_total > 0 and net_available < tax_reserve_total
```

На `DASH-OBJECT-CARD-0` это только план. Runtime risk calculation не реализуется.

## Вкладка Финансы

Вкладка **Финансы** - это не место первичного отображения итоговой карточки объекта.

На вкладке **Финансы** должны жить:

- налоговая ставка;
- налоговая база;
- плановая маржа;
- договор;
- авансы;
- финансовые настройки объекта;
- объяснение формул;
- возможные ручные корректировки;
- история финансовых изменений.

Важно:

```text
planned_margin_percent - это маржа.
tax_rate_percent - это налог.
```

Они не должны смешиваться.

## Вкладка Таблица Учета

Вкладка **Таблица учета** должна оставаться операционным источником строк учета:

- `planned`;
- `invoice`;
- `waiting-payment`;
- `paid`;
- `completed`;
- счет;
- акт;
- контрагент;
- плановая сумма;
- фактическая сумма;
- контрольная дата.

Таблица учета является источником расходов, планов, счетов, актов и обязательств. Она не должна быть итоговой карточкой объекта.

## Все Объекты

Вкладка **Все объекты** является общей фиксированной вкладкой dashboard.

Она агрегирует показатели всех объектов и должна использовать project-level `finance_summary`, а не собственную финансовую математику.

План общей вкладки закреплен в:

```text
docs/DASHBOARD_ROOT_OVERVIEW_PLAN.md
```

## Целевой Frontend Direction

Перед runtime UI implementation выполнен этап `DASH-OBJECT-CARD-1A`. Он зафиксировал карту текущего dashboard UI, подтвердил, что `overview` является вкладкой **Карточка объекта**, и выбрал безопасный integration path: грузить backend `finance_summary` через detail endpoint активного объекта `GET /api/projects/{project_id}`.

Audit checkpoint:

```text
docs/DASH_OBJECT_CARD_UI_AUDIT.md
docs/DASH_OBJECT_CARD_CHECKPOINT_1A.md
```

Будущий UI-этап `DASH-OBJECT-CARD-1` должен:

- подключить `finance_summary` к dashboard state;
- показать finance summary на вкладке **Карточка объекта**;
- не добавлять настройки на карточку объекта;
- не менять таблицу учета;
- не менять налоговую модель;
- только отображать готовые backend поля.

Будущий UI-этап `DASH-FINANCE-5` должен:

- добавить настройку `tax_rate_percent`;
- добавить настройку `tax_base_mode`;
- показать `planned_margin_percent` как маржу;
- сохранить разделение налога и маржи.

Перед этим выполнен audit `DASH-FINANCE-5A`: `docs/DASH_FINANCE_SETTINGS_UI_AUDIT.md`. Он подтверждает, что настройки `tax_rate_percent`, `tax_base_mode` и `planned_margin_percent` должны подключаться только во вкладке **Финансы**, а **Карточка объекта** продолжает показывать готовый backend `finance_summary`.

## Этапы

`DASH-OBJECT-CARD-0`: документационный checkpoint, runtime не меняем.

`DASH-OBJECT-CARD-1`: подключить `finance_summary` к UI карточки объекта.

`DASH-FINANCE-5`: добавить UI настроек финансов объекта.

`DASH-DASHBOARD-ROOT-1`: создать backend read-model для общей вкладки **Все объекты**.

## Ограничения

На `DASH-OBJECT-CARD-0` запрещено менять:

- runtime Python/TypeScript code;
- frontend/UI;
- database schema/migrations;
- API response shape;
- auth/session/cookie;
- deploy/env;
- package files.

## Acceptance Criteria

`DASH-OBJECT-CARD-0` закрыт, если:

- создан `docs/DASHBOARD_OBJECT_CARD_FINANCE_PLAN.md`;
- создан `docs/DASH_OBJECT_CARD_CHECKPOINT_0.md`;
- `ARCHITECTURE.md` обновлен коротким roadmap-блоком;
- runtime code не менялся;
- UI/frontend не менялись;
- migrations не менялись;
- package files не менялись;
- следующий этап зафиксирован как `DASH-OBJECT-CARD-1`.
