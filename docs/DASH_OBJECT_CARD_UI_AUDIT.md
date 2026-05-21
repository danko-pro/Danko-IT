# Dashboard object card UI integration audit

Статус: `DASH-OBJECT-CARD-1A`, UI integration audit.

Этот документ фиксирует аудит frontend/dashboard перед подключением backend `finance_summary` к вкладке **Карточка объекта**. На этом этапе runtime UI behavior, React-компоненты, backend, API, database schema, migrations, package files, auth/session/cookie и deploy/env не меняются.

## Current Dashboard UI Map

### DashboardScreen

Основная точка dashboard UI:

```text
admin-ui/src/features/dashboard/screen.tsx
```

`DashboardScreen` держит локальный `view`:

```text
overview | passport | finance | accounting
```

Список доступных scene зафиксирован в:

```text
admin-ui/src/features/dashboard/dashboard-scene-types.ts
```

Переключение вкладок идет через `activeView` / `onSelectView`. Внутри `DashboardScreen` все scene получают один и тот же `project` из `useDashboardProjectState()`.

Текущая карта scene:

- `overview` - вкладка **Карточка объекта**.
- `passport` - вкладка **Паспорт объекта**.
- `finance` - вкладка **Финансы**.
- `accounting` - вкладка **Таблица учета**.

`DashboardProjectSwitcher` меняет объект через `actions.selectProject(projectId)` и возвращает view в `overview`. Это значит, что будущая загрузка `finance_summary` для активного объекта должна быть привязана к `selectedProjectId`, а не к отдельному UI-событию карточки.

### Overview / Card

Текущая вкладка **Карточка объекта** устроена так:

```text
admin-ui/src/features/dashboard/scenes/dashboard-overview-scene.tsx
admin-ui/src/features/dashboard/card/project-card-overview.tsx
admin-ui/src/features/dashboard/card/project-card-primitives.tsx
admin-ui/src/features/dashboard/card/project-card-metrics-view.ts
```

`DashboardOverviewScene` является тонкой оболочкой: показывает `DashboardSceneChrome` и передает `project` в `ProjectCardOverview`.

`ProjectCardOverview` сейчас показывает:

- `receivedTotal` как "Пришло";
- `remainingTotal` как "Остаток";
- `waitingPaymentTotal`, рассчитанный на frontend из `ledgerEntries` через `sumLedgerCommittedByStatuses(..., ["waiting-payment"])`;
- `plannedTotal` как "План" с frontend presentation helper `buildPlanValue`;
- `actualTotal` как "Факт";
- `workPerM2`;
- `materialsPerM2`;
- `plannedMarginPercent`.

`SummaryMetric` и `SideMetric` из `project-card-primitives.tsx` можно переиспользовать для будущего блока `finance_summary`, потому что они являются чистыми display primitives.

Безопасная точка будущего подключения:

```text
admin-ui/src/features/dashboard/card/project-card-overview.tsx
```

Именно там нужно заменить управленческие финансовые показатели на значения из `project.financeSummary`, не перенося настройки и не добавляя финансовые формулы во frontend.

### Finance

Текущая вкладка **Финансы**:

```text
admin-ui/src/features/dashboard/scenes/dashboard-finance-scene.tsx
admin-ui/src/features/dashboard/card/project-card-advances-panel.tsx
admin-ui/src/features/dashboard/card/project-card-contract-panel.tsx
admin-ui/src/features/dashboard/card/project-card-expenses-panel.tsx
```

`DashboardFinanceScene` сейчас собирает:

- `ProjectCardExpensesPanel` - статьи расходов объекта из `project.expenses`;
- `ProjectCardAdvancesPanel` - авансы / поступления;
- `ProjectCardContractPanel` - договор, milestones, upload/extract/update/delete contract.

В коде также есть подготовленная, но не подключенная панель:

```text
admin-ui/src/features/dashboard/card/project-card-finance-settings-panel.tsx
```

Она редактирует `plannedMarginPercent`. Для будущего этапа настроек именно вкладка **Финансы** должна принять:

- `tax_rate_percent`;
- `tax_base_mode`;
- `planned_margin_percent`.

Настройки не нужно добавлять на **Карточку объекта**, потому что карточка объекта должна показывать результат расчетов, а не менять финансовую модель.

### Accounting

Текущая вкладка **Таблица учета**:

```text
admin-ui/src/features/dashboard/accounting/project-accounting-workspace.tsx
admin-ui/src/features/dashboard/accounting/project-accounting-ledger-table.tsx
admin-ui/src/features/dashboard/accounting/project-accounting-summary-strip.tsx
admin-ui/src/features/dashboard/accounting/project-accounting-status-summary.tsx
```

`ProjectAccountingWorkspace` показывает chrome, summary strip и ledger table.

`ProjectAccountingLedgerTable` остается операционным источником строк учета. Она работает с:

- category;
- item;
- owner;
- counterparty;
- status;
- invoice/act documents;
- planAmount;
- actualAmount;
- controlDate.

`ProjectAccountingSummaryStrip` и `ProjectAccountingStatusSummary` сейчас считают часть сумм на frontend:

- `ledgerPlanBaselineAmount`;
- `ledgerCommittedAmount`;
- `ledgerPlanBalanceAmount`;
- `sumLedgerCommittedByStatuses`;
- `sumLedgerPaidByStatuses`;
- `sumLedgerPlanByStatuses`.

Эти расчеты допустимы как текущая UI-логика таблицы учета, но не должны становиться источником управленческих итогов для **Карточки объекта**. В будущих этапах часть summary UI в accounting можно будет заменить на backend `finance_summary`, но `DASH-OBJECT-CARD-1` не должен менять accounting behavior.

### State / Loaders

Текущая frontend model и загрузка:

```text
admin-ui/src/features/dashboard/model/project-model.ts
admin-ui/src/features/dashboard/model/project-api-mappers.ts
admin-ui/src/features/dashboard/state/project-state-merge.ts
admin-ui/src/features/dashboard/api/project-client.ts
admin-ui/src/features/dashboard/state/use-dashboard-project-state.ts
admin-ui/src/features/dashboard/state/project-loaders.ts
admin-ui/src/features/dashboard/state/project-state-loaders.ts
```

Сейчас `DashboardProjectCardData` не содержит `financeSummary`.

Сейчас `DashboardProjectApiRecord` не описывает:

- `finance_summary`;
- `tax_rate_percent`;
- `tax_base_mode`.

Сейчас `project-state-merge.ts` маппит старые project fields:

- `received_total` -> `receivedTotal`;
- `remaining_total` -> `remainingTotal`;
- `deferred_total` -> `deferredTotal`;
- `planned_total` -> `plannedTotal`;
- `actual_total` -> `actualTotal`;
- `work_per_m2` -> `workPerM2`;
- `materials_per_m2` -> `materialsPerM2`;
- `planned_margin_percent` -> `plannedMarginPercent`.

`finance_summary` пока не маппится из snake_case в camelCase.

Текущие frontend API calls:

- `GET /api/projects` через `listProjects()`;
- `GET /api/projects/{project_id}/advances`;
- `GET /api/projects/{project_id}/ledger`;
- `GET /api/projects/{project_id}/contract`;
- project create/update/delete;
- advance mutations;
- ledger mutations;
- contract mutations.

`GET /api/projects/{project_id}` на backend уже существует и возвращает `finance_summary`, но в frontend `project-client.ts` сейчас нет `getProjectDetail(projectId)`.

## Current Object Card Fields

Текущие показатели **Карточки объекта** и их источник:

| UI показатель | Текущий источник |
| --- | --- |
| Пришло | `project.receivedTotal` из старого project payload |
| Остаток | `project.remainingTotal` из старого project payload |
| Ожидает оплаты | frontend расчет из `project.ledgerEntries`, только `waiting-payment` |
| План | `project.plannedTotal` из старого legacy API field |
| Факт | `project.actualTotal` из старого project payload |
| Работы / м2 | `project.workPerM2` из старого project payload |
| Материалы / м2 | `project.materialsPerM2` из старого project payload |
| Плановая маржа | `project.plannedMarginPercent` из project payload |

Текущие дополнительные источники:

- contract data приходит отдельно из `GET /api/projects/{project_id}/contract`;
- advances приходят отдельно из `GET /api/projects/{project_id}/advances`;
- ledger entries приходят отдельно из `GET /api/projects/{project_id}/ledger`;
- expenses могут пересобираться на frontend из ledger через `applyLedgerEntriesToProject`.

## Target Object Card Fields

Будущая **Карточка объекта** должна отображать backend `finance_summary`:

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

Во frontend model эти поля должны жить как camelCase read-model, например:

- `receivedTotal`;
- `paidExpenseTotal`;
- `plannedExpenseTotal`;
- `committedUnpaidTotal`;
- `cashBalance`;
- `availableAfterPlan`;
- `availableAfterObligations`;
- `taxReserveTotal`;
- `netAvailable`;
- `workPerM2`;
- `materialsPerM2`.

Старые поля `plannedTotal`, `actualTotal`, `remainingTotal`, `deferredTotal` могут оставаться в state для compatibility, но новый display карточки должен читать итоговые финансовые показатели из `financeSummary`.

## Integration Decision

Рекомендованный путь для `DASH-OBJECT-CARD-1`: **Вариант A - добавить frontend detail load для активного объекта**.

Нужно добавить frontend client:

```text
getProjectDetail(projectId) -> GET /api/projects/{project_id}
```

Причины:

- backend detail endpoint уже возвращает `finance_summary`;
- текущий dashboard уже имеет `selectedProjectId` и effect на смену активного объекта;
- можно грузить `finance_summary` только для активного объекта;
- не нужно расширять `GET /api/projects` и считать ledger finance summary для всего списка;
- меньше blast radius для listProjects, mutations, advances, ledger и contract loading;
- не нужно делать временный frontend fallback-расчет финансовых формул.

Вариант B - расширить listProjects response - менее безопасен для первого UI-этапа, потому что потребует либо тяжелого backend aggregation по ledger для всех проектов, либо изменения semantics list payload.

Вариант C - временно считать finance summary на frontend из старых полей или ledger - нежелателен, потому что нарушает правило: UI не должен быть источником финансовых расчетов.

## Future Implementation Plan

`DASH-OBJECT-CARD-1` должен:

- добавить frontend type для `finance_summary` API payload;
- добавить frontend camelCase type `ProjectFinanceSummary`;
- добавить `financeSummary?: ProjectFinanceSummary` в `DashboardProjectCardData`;
- добавить `getProjectDetail(projectId)` в `project-client.ts`;
- добавить mapper snake_case -> camelCase для `finance_summary`;
- добавить merge helper для detail payload;
- загрузить detail для активного объекта при `selectedProjectId`;
- после ledger/advance mutations предусмотреть refresh detail для активного объекта, чтобы `financeSummary` не устаревал;
- показать `financeSummary` на `ProjectCardOverview`;
- оставить настройки на вкладке **Финансы**;
- не менять accounting logic на этом этапе.

Файлы, которые вероятно будут изменяться на `DASH-OBJECT-CARD-1`:

- `admin-ui/src/features/dashboard/model/project-model.ts`;
- `admin-ui/src/features/dashboard/model/project-api-mappers.ts`;
- `admin-ui/src/features/dashboard/state/project-state-merge.ts`;
- `admin-ui/src/features/dashboard/api/project-client.ts`;
- `admin-ui/src/features/dashboard/state/project-loaders.ts`;
- `admin-ui/src/features/dashboard/state/project-state-loaders.ts`;
- `admin-ui/src/features/dashboard/state/use-dashboard-project-state.ts`;
- `admin-ui/src/features/dashboard/card/project-card-overview.tsx`;
- возможно CSS в `admin-ui/src/features/dashboard/styles/project-card/overview.css`.

## Risks

- `financeSummary` может быть отсутствующим до завершения detail load. UI должен показывать безопасный fallback или состояние "нет данных".
- Старые mutation responses сейчас возвращают старый project payload без `finance_summary`. После ledger/advance mutations нужен явный refresh detail активного объекта или другой контролируемый sync.
- `planned_total` остается legacy compatibility field и не должен подменять `planned_expense_total`.
- `plannedMarginPercent` не должен отображаться как налог и не должен участвовать в налоговых расчетах.
- Accounting UI сейчас содержит frontend ledger calculations. Их нельзя переносить в object card как source of truth.

## Acceptance Criteria For DASH-OBJECT-CARD-1

`DASH-OBJECT-CARD-1` закрыт, если:

- **Карточка объекта** показывает backend `finance_summary`;
- настройки финансовой модели не отображаются на **Карточке объекта**;
- вкладка **Финансы** остается местом настроек;
- frontend не пересчитывает finance formulas;
- если `finance_summary` временно отсутствует, UI использует безопасный fallback или показывает "нет данных";
- accounting logic не меняется без отдельного этапа;
- старые API-поля остаются совместимыми.
