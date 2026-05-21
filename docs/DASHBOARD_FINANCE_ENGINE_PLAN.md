# Dashboard finance engine plan

Статус: `DASH-FINANCE-0`, documentation checkpoint.

Этот документ фиксирует план перестройки финансового движка dashboard объектов. На этапе `DASH-FINANCE-0` runtime-код, frontend, database schema, migrations, API response shape, auth/session/cookie и deploy/env не меняются.

## Цель перестройки

Цель - вынести финансовые формулы dashboard объектов в отдельный чистый backend/domain engine, чтобы:

- явно считать поступления, фактические расходы, плановые расходы, обязательства, налоги и чистый остаток;
- сделать расчеты расширяемыми без роста бизнес-логики в storage, routes или UI;
- сохранить текущий API contract на первых этапах миграции;
- подготовить backend к будущему UI, который будет только отображать рассчитанные backend значения.

## Текущая проблема

Сейчас dashboard показывает остаток как:

```text
received_total - actual_total
```

Этого недостаточно для управления объектом, потому что в одной плоскости смешиваются:

- фактически полученные авансы;
- фактически оплаченные расходы;
- будущие плановые расходы;
- счета и ожидающие оплаты обязательства;
- налоговый резерв;
- чистый доступный остаток после всех будущих удержаний.

Из-за этого текущий `remaining_total` не отвечает на вопросы:

- сколько денег осталось после уже оплаченных расходов;
- сколько останется после плановых расходов;
- сколько уже зарезервировано обязательствами без оплаты;
- какой остаток доступен после налогов.

## Текущая архитектурная ситуация

В dashboard/projects уже есть:

- договор и договорные условия;
- авансы;
- таблица учета / ledger;
- фактические расходы;
- план расходов;
- summary-поля проекта, которые используются API и frontend.

Сейчас часть финансовых правил находится в `src/supply_bot/storage_projects/summary.py`. Этот модуль пересчитывает summary на основе ledger и обновляет `projects`. В текущем состоянии он одновременно:

- достает данные из БД;
- интерпретирует статусы ledger;
- считает финансовые totals;
- сохраняет summary.

Это transitional-состояние. В дальнейшем `storage_projects/summary.py` должен перестать быть местом бизнес-формул.

## Целевая архитектура

Целевой backend layout:

```text
src/supply_bot/projects/domain/finance.py
```

В этом модуле должен жить чистый финансовый движок без зависимостей от:

- FastAPI;
- SQLAlchemy;
- Request;
- Response;
- settings;
- env;
- Render;
- React.

Планируемые чистые функции:

```text
calculate_ledger_entry_amounts(...)
calculate_project_finance_summary(...)
calculate_tax_reserve(...)
```

Роль `storage_projects/summary.py` после миграции:

- достать данные из БД;
- передать их в domain finance engine;
- получить расчет;
- сохранить summary.

UI не должен быть источником финансовых расчетов. Frontend может показывать preview только при условии, что backend остается источником истины для сохраненных и публичных значений.

## Финансовый словарь

`contract_total` - сумма договора.

`received_total` - сумма фактически полученных авансов.

`paid_expense_total` - сумма фактически оплаченных расходов по ledger.

`planned_expense_total` - сумма плановых расходов по ledger.

`committed_unpaid_total` - сумма обязательств без оплаты: `invoice` + `waiting-payment`.

`cash_balance` - остаток после фактических расходов.

`available_after_plan` - доступно после фактических и плановых расходов.

`available_after_obligations` - доступно после фактических расходов, плана и обязательств без оплаты.

`tax_rate_percent` - ставка налога в процентах.

`tax_base` - налоговая база. Конкретное правило выбора базы должно быть зафиксировано на этапе `DASH-FINANCE-4` перед runtime-включением налогового блока.

`tax_reserve_total` - налоговый резерв.

`net_available` - чистый доступный остаток после расходов, плана, обязательств и налогов.

## Целевые формулы

```text
contract_total = сумма договора

received_total = сумма фактически полученных авансов

paid_expense_total = сумма фактически оплаченных расходов по ledger

planned_expense_total = сумма плановых расходов по ledger

committed_unpaid_total = сумма обязательств без оплаты:
invoice + waiting-payment

cash_balance = received_total - paid_expense_total

available_after_plan = received_total - paid_expense_total - planned_expense_total

available_after_obligations =
received_total - paid_expense_total - planned_expense_total - committed_unpaid_total

tax_reserve_total = tax_base * tax_rate_percent / 100

net_available =
received_total - paid_expense_total - planned_expense_total - committed_unpaid_total - tax_reserve_total
```

## Смысл статусов ledger

`planned` - будущая плановая трата. Уменьшает `available_after_plan`.

`invoice` - счет получен, но еще не оплачен. Это обязательство.

`waiting-payment` - ожидает оплаты. Это обязательство.

`paid` - фактически оплачено.

`completed` - закрыто / завершено. В финансовом смысле считается как оплачено, если сумма оплаты есть.

## Будущие правила расчета ledger amounts

`calculate_ledger_entry_amounts(...)` должен нормализовать одну ledger-запись в набор финансовых amount-компонентов:

- paid amount;
- planned amount;
- committed unpaid amount;
- optional category buckets для существующих summary-полей вроде `work_per_m2` и `materials_per_m2`.

Статусы должны интерпретироваться только в domain finance engine. Storage и UI не должны дублировать эти правила.

## Этапы реализации

`DASH-FINANCE-0`: документационный checkpoint, runtime не меняем.

`DASH-FINANCE-1`: создать чистый finance engine в `projects/domain/finance.py` и покрыть unit-тестами. Реализовано в `src/supply_bot/projects/domain/finance.py`, checkpoint: `docs/DASH_FINANCE_CHECKPOINT_1.md`.

`DASH-FINANCE-2`: подключить `storage_projects/summary.py` к finance engine без изменения API shape.

`DASH-FINANCE-3`: добавить read-model расчет новых полей без UI и без миграции, если возможно.

`DASH-FINANCE-4`: добавить налоговый блок:

- `tax_rate_percent`;
- `tax_base`;
- `tax_reserve_total`;
- `net_available`.

`DASH-FINANCE-5`: только после стабилизации движка идти в UI.

## Ограничения

На `DASH-FINANCE-0` запрещено менять:

- runtime Python/TypeScript код;
- frontend;
- package files;
- migrations;
- database schema;
- API response shape;
- auth/session/cookie;
- deploy/env.

На следующих этапах до отдельного согласования также важно:

- не ломать существующие поля `received_total`, `remaining_total`, `deferred_total`, `planned_total`, `actual_total`;
- не переименовывать публичные API-поля без compatibility layer;
- не переносить финансовые формулы в frontend;
- не смешивать finance domain engine с SQLAlchemy или FastAPI.

## Acceptance criteria

`DASH-FINANCE-0` считается закрытым, если:

- создан этот документ с целевой архитектурой и формулами;
- создан checkpoint `docs/DASH_FINANCE_CHECKPOINT_0.md`;
- `ARCHITECTURE.md` содержит короткий roadmap-блок про dashboard finance engine;
- runtime Python/TypeScript код не менялся;
- package files не менялись;
- migrations не менялись;
- frontend не менялся;
- API response shape не менялся;
- auth/session/cookie не менялись;
- следующий этап явно зафиксирован как `DASH-FINANCE-1`.
