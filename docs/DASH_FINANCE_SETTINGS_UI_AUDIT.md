# Dashboard finance settings UI audit

Статус: `DASH-FINANCE-5A`, UI integration audit.

Этот документ фиксирует аудит вкладки **Финансы** перед подключением управления финансовыми настройками объекта:

- `tax_rate_percent`;
- `tax_base_mode`;
- `planned_margin_percent`.

На этом этапе runtime UI behavior, React component logic, backend, API response shape, database schema/migrations, package files, auth/session/cookie и deploy/env не меняются.

## Контекст

Закрытые предпосылки:

- `DASH-OBJECT-CARD-1` подключил backend `finance_summary` к вкладке **Карточка объекта** через detail load активного объекта.
- `GET /api/projects/{project_id}` уже отдает `finance_summary`.
- Backend уже хранит `tax_rate_percent` и `tax_base_mode`.
- Backend уже обновляет `planned_margin_percent`, `tax_rate_percent` и `tax_base_mode` через project update flow.

Архитектурное правило остается прежним:

- **Карточка объекта** показывает результат расчетов.
- **Финансы** хранят настройки финансовой модели и детализацию.
- **Таблица учета** остается источником ledger rows.
- UI не должен быть источником финансовых расчетов.

## Current Finance UI Map

Текущая вкладка **Финансы** находится в:

```text
admin-ui/src/features/dashboard/scenes/dashboard-finance-scene.tsx
```

`DashboardFinanceScene` сейчас рендерит:

- `ProjectCardExpensesPanel`;
- `ProjectCardAdvancesPanel`;
- `ProjectCardContractPanel`.

Файлы панелей:

```text
admin-ui/src/features/dashboard/card/project-card-expenses-panel.tsx
admin-ui/src/features/dashboard/card/project-card-advances-panel.tsx
admin-ui/src/features/dashboard/card/project-card-contract-panel.tsx
```

Текущая структура:

- левая колонка: расходы объекта через `ProjectCardExpensesPanel`;
- правая колонка: авансы и договор через `ProjectCardAdvancesPanel` и `ProjectCardContractPanel`;
- scene chrome общий с другими вкладками и управляется через `activeView` / `onSelectView`.

## Finance Settings Panel

Панель настроек уже существует:

```text
admin-ui/src/features/dashboard/card/project-card-finance-settings-panel.tsx
```

CSS для нее тоже есть и импортируется:

```text
admin-ui/src/features/dashboard/styles/project-card/finance-settings.css
admin-ui/src/features/dashboard/styles/project-card/index.css
```

Но на момент `DASH-FINANCE-5A` `ProjectCardFinanceSettingsPanel` **не подключена** в `DashboardFinanceScene`:

- `dashboard-finance-scene.tsx` ее не импортирует;
- `ProjectCardProps` не содержит props для settings panel;
- `DashboardScreen` не передает во вкладку **Финансы** action для обновления настроек;
- runtime UI behavior не использует эту панель.

Что сейчас умеет `ProjectCardFinanceSettingsPanel`:

- принимает `plannedMarginPercent: number`;
- принимает `onUpdatePlannedMarginPercent(plannedMarginPercent)`;
- держит локальный draft input;
- нормализует отрицательные/невалидные значения в `0`;
- сохраняет по blur или Enter;
- показывает локальные состояния `idle`, `saving`, `saved`, `error`;
- редактирует только `planned_margin_percent`.

Чего она сейчас не умеет:

- не принимает `taxRatePercent`;
- не принимает `taxBaseMode`;
- не вызывает action для налоговой ставки;
- не вызывает action для режима налоговой базы;
- не обновляет `financeSummary` после изменения tax settings.

Будущее место панели: вкладка **Финансы**, рядом с авансами/договором или отдельным верхним блоком настроек. Ее не нужно переносить на **Карточку объекта**.

## Frontend Model And API Fields

Текущие frontend model files:

```text
admin-ui/src/features/dashboard/model/project-model.ts
admin-ui/src/features/dashboard/model/project-api-mappers.ts
admin-ui/src/features/dashboard/state/project-state-merge.ts
admin-ui/src/features/dashboard/api/project-payloads.ts
```

Сейчас во frontend есть:

- `plannedMarginPercent` в `DashboardProjectCardData`;
- `planned_margin_percent` в `DashboardProjectApiRecord`;
- `financeSummary?: ProjectFinanceSummary` в `DashboardProjectCardData`;
- `finance_summary?: DashboardProjectFinanceSummaryApiRecord` в `DashboardProjectApiRecord`;
- mapper `mapFinanceSummaryRecord(...)`;
- merge detail payload в `mergeProjectRecord(...)`.

Сейчас во frontend **нет**:

- `taxRatePercent` в `DashboardProjectCardData`;
- `taxBaseMode` в `DashboardProjectCardData`;
- `tax_rate_percent` в `DashboardProjectApiRecord`;
- `tax_base_mode` в `DashboardProjectApiRecord`;
- mapper snake_case -> camelCase для tax settings;
- payload builder для tax settings patch;
- dedicated action для tax settings update.

Важно: backend payload уже содержит `tax_rate_percent` и `tax_base_mode`, но frontend type/model сейчас их не описывает и не сохраняет в dashboard state.

`ProjectFinanceSummary` сейчас содержит только поля, нужные **Карточке объекта**:

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

Frontend `ProjectFinanceSummary` сейчас не содержит `taxBase` и `taxRatePercent`, хотя backend finance summary payload имеет налоговые поля. Для settings UI лучше хранить persisted settings отдельно как `project.taxRatePercent` и `project.taxBaseMode`, а не читать их из display summary.

## Existing Frontend Mutations

Текущий project client:

```text
admin-ui/src/features/dashboard/api/project-client.ts
```

Уже есть:

- `getProjectDetail(projectId)` -> `GET /api/projects/{project_id}`;
- `updateProject(projectId, payload)` -> `PATCH /api/projects/{project_id}`.

Текущий action слой:

```text
admin-ui/src/features/dashboard/state/project-record-actions.ts
admin-ui/src/features/dashboard/state/use-dashboard-project-state.ts
```

Уже есть:

- `updateDashboardProjectPlannedMargin(...)`;
- `useDashboardProjectState().actions.updatePlannedMarginPercent(...)`.

Но это сейчас не подключено к `DashboardFinanceScene` и не используется `ProjectCardFinanceSettingsPanel`.

Сейчас нет:

- `updateDashboardProjectTaxSettings(...)`;
- `actions.updateTaxSettings(...)`;
- payload builder для `{ tax_rate_percent, tax_base_mode }`;
- refresh active project detail после изменения tax settings.

## Backend Endpoint Audit

Backend update route уже есть:

```text
PATCH /api/projects/{project_id}
```

Route file:

```text
src/supply_bot/admin_api/project_routes/core.py
```

Schema file:

```text
src/supply_bot/admin_api/schemas/projects.py
```

`ProjectUpdatePayload` уже принимает:

- `planned_margin_percent`;
- `tax_rate_percent`;
- `tax_base_mode`.

Domain builder:

```text
src/supply_bot/projects/domain/project.py
```

`build_project_update_values(...)` уже:

- обновляет `planned_margin_percent`;
- валидирует `tax_rate_percent`;
- нормализует `tax_base_mode`;
- fallback для unknown `tax_base_mode` идет в `received_total`.

Use-case:

```text
src/supply_bot/projects/application/update_project.py
```

После PATCH use-case возвращает обычный project read payload без `finance_summary`. Поэтому будущий frontend action должен после сохранения settings отдельно вызвать active detail refresh, чтобы обновить `financeSummary`.

## State Refresh Rule

После изменения `planned_margin_percent`, `tax_rate_percent` или `tax_base_mode` future UI должен:

1. Вызвать `PATCH /api/projects/{project_id}` с измененными settings.
2. Смёрджить старые compatibility fields из returned project payload.
3. Вызвать `loadProjectDetail(projectId)`.
4. Обновить `financeSummary` из backend detail payload.

Frontend не должен:

- пересчитывать `tax_reserve_total`;
- пересчитывать `net_available`;
- использовать `plannedMarginPercent` как налог;
- вычислять finance formulas из ledger rows.

## Recommended DASH-FINANCE-5 Path

Рекомендованный безопасный путь:

1. Расширить frontend model:
   - `taxRatePercent: number`;
   - `taxBaseMode: "received_total"` или string union с безопасным fallback.

2. Расширить `DashboardProjectApiRecord`:
   - `tax_rate_percent`;
   - `tax_base_mode`.

3. Расширить `mergeProjectRecord(...)`:
   - `tax_rate_percent` -> `taxRatePercent`;
   - `tax_base_mode` -> `taxBaseMode`.

4. Добавить payload helper:
   - `buildProjectFinanceSettingsPatchPayload(...)`;
   - внутри явно разделить `planned_margin_percent`, `tax_rate_percent`, `tax_base_mode`.

5. Добавить action:
   - `updateDashboardProjectFinanceSettings(...)`;
   - использовать существующий `updateProject(...)`;
   - после successful PATCH вызвать `loadProjectDetail(projectId)`.

6. Расширить `ProjectCardProps` и `DashboardFinanceScene` props:
   - `onUpdateFinanceSettings(...)`.

7. Подключить `ProjectCardFinanceSettingsPanel` во вкладке **Финансы**.

8. Расширить `ProjectCardFinanceSettingsPanel`:
   - показывать `plannedMarginPercent` как маржу;
   - показывать `taxRatePercent` как налоговую ставку;
   - показывать `taxBaseMode` как режим налоговой базы;
   - поддержать пока только `received_total`;
   - не показывать эти настройки на **Карточке объекта**.

9. После сохранения settings:
   - обновить active project settings;
   - refresh active detail;
   - получить свежий `financeSummary`.

## Safe Integration Points

Будущие runtime изменения должны быть ограничены:

- `admin-ui/src/features/dashboard/scenes/dashboard-finance-scene.tsx`;
- `admin-ui/src/features/dashboard/card/project-card-finance-settings-panel.tsx`;
- `admin-ui/src/features/dashboard/card/project-card-types.ts`;
- `admin-ui/src/features/dashboard/model/project-model.ts`;
- `admin-ui/src/features/dashboard/model/project-api-mappers.ts`;
- `admin-ui/src/features/dashboard/api/project-payloads.ts`;
- `admin-ui/src/features/dashboard/state/project-state-merge.ts`;
- `admin-ui/src/features/dashboard/state/project-record-actions.ts`;
- `admin-ui/src/features/dashboard/state/use-dashboard-project-state.ts`.

`ProjectCardOverview` не должен получать settings inputs. Он уже отображает backend `financeSummary`.

`accounting` files не должны меняться на `DASH-FINANCE-5`.

## Risks

- Спутать `planned_margin_percent` и `tax_rate_percent`.
- Показать settings на **Карточке объекта** вместо вкладки **Финансы**.
- Начать считать налог или `net_available` на frontend.
- Потерять `financeSummary` при merge старого project update payload без detail refresh.
- Затереть active project ledger/contract/advances при merge detail payload.
- Сломать accounting behavior.
- Расширить settings UI раньше, чем frontend model начнет хранить `taxRatePercent` и `taxBaseMode`.

## Acceptance Criteria For DASH-FINANCE-5

`DASH-FINANCE-5` закрыт, если:

- settings UI живет во вкладке **Финансы**;
- `planned_margin_percent` отображается и редактируется как маржа;
- `tax_rate_percent` отображается и редактируется как налоговая ставка;
- `tax_base_mode` отображается и редактируется как режим налоговой базы;
- **Карточка объекта** не содержит settings controls;
- frontend не пересчитывает finance formulas;
- после save active project detail refresh обновляет `financeSummary`;
- accounting behavior не меняется;
- backend/schema/API shape не меняются.
