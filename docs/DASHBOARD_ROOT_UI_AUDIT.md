# Dashboard root UI audit

Статус: `DASH-DASHBOARD-ROOT-1A`, dashboard root overview data path audit.

Этот документ фиксирует аудит текущего frontend/backend перед внедрением общей фиксированной вкладки dashboard **Все объекты**. Runtime UI, backend logic, API, database schema/migrations, auth/session/cookie, package files и accounting behavior на этом этапе не меняются.

## Current Dashboard Views

Текущие views описаны в:

```text
admin-ui/src/features/dashboard/dashboard-scene-types.ts
```

Сейчас `DashboardSceneView` содержит только project-level views:

- `overview` - **Карточка объекта**;
- `passport` - **Паспорт объекта**;
- `finance` - **Финансы**;
- `accounting` - **Таблица учета**.

`DashboardScreen` хранит локальный `view` и рендерит четыре project-level scene:

```text
admin-ui/src/features/dashboard/screen.tsx
```

Scene switch внутри объекта живет в:

```text
admin-ui/src/features/dashboard/dashboard-scene-switch.tsx
admin-ui/src/features/dashboard/dashboard-scene-chrome.tsx
```

Этот switch переключает только views выбранного объекта. Общая вкладка **Все объекты** не должна становиться обычным `overview`, потому что `overview` уже означает **Карточка объекта**.

## Current Project List And Selection Flow

Список объектов и выбор активного объекта сейчас проходят через:

```text
admin-ui/src/features/dashboard/project-switcher.tsx
admin-ui/src/features/dashboard/state/use-dashboard-project-state.ts
admin-ui/src/features/dashboard/state/project-loaders.ts
admin-ui/src/features/dashboard/api/project-client.ts
```

Текущий поток:

1. `useDashboardProjectState()` вызывает `loadProjects()`.
2. `loadProjects()` вызывает frontend client `listProjects()`.
3. `listProjects()` вызывает `GET /api/projects`.
4. `selectedProjectId` выбирает активный объект.
5. При выборе объекта frontend грузит:
   - `GET /api/projects/{project_id}`;
   - `GET /api/projects/{project_id}/advances`;
   - `GET /api/projects/{project_id}/ledger`;
   - `GET /api/projects/{project_id}/contract`.
6. `GET /api/projects/{project_id}` отдает `finance_summary` только для активного объекта.

`DashboardProjectSwitcher` сейчас рендерит только реальные project tabs и не имеет synthetic fixed tab для **Все объекты**.

## Safe Place For Fixed Tab

Безопасная будущая точка для **Все объекты**:

- добавить в `DashboardProjectSwitcher` первую synthetic tab **Все объекты**;
- держать root selection отдельно от `selectedProjectId`, например `activeDashboardScope = "root" | "project"`;
- не использовать `selectedProjectId = null` как root state, потому что `null` уже означает отсутствие выбранного объекта / empty state;
- при выборе **Все объекты** не запускать detail/advances/ledger/contract loaders активного объекта;
- рендерить отдельную scene, например `DashboardRootOverviewScene`.

Project-level scene switch (`overview`, `passport`, `finance`, `accounting`) должен остаться внутри выбранного объекта.

## Why Frontend Must Not Aggregate Finance

Нельзя считать aggregate finance summary на frontend из текущего state, потому что:

- `listProjects()` не содержит `finance_summary`;
- `finance_summary` грузится только для активного объекта через detail endpoint;
- ledger rows грузятся только для активного объекта;
- загрузка ledger всех объектов во frontend резко увеличит blast radius и объем данных;
- frontend не должен дублировать finance formulas из `src/supply_bot/projects/domain/finance.py`;
- налоговая логика и `tax_base_mode` должны оставаться backend read-model behavior;
- текущие старые project fields (`planned_total`, `actual_total`, `remaining_total`, `deferred_total`) сохраняют compatibility semantics и не равны новым aggregate finance fields.

UI общей вкладки должен отображать готовый backend read-model, а не строить агрегаты из локального dashboard state.

## Backend Read-Model

Целевой read-model должен жить здесь:

```text
src/supply_bot/projects/application/dashboard_root_read_model.py
```

Причина: project finance engine, project detail `finance_summary` и ledger input уже находятся в `projects` domain/application boundary. Общая вкладка агрегирует портфель объектов, но финансовая база остается project finance model.

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

- для каждого объекта построить project-level `finance_summary` через существующий `build_project_finance_summary_payload(...)`;
- агрегировать totals;
- сформировать строки по объектам;
- сформировать risk/status для каждого объекта;
- вернуть serializable read-model.

## Target Read-Model Data

Будущий response должен включать:

- aggregate summary по всем объектам;
- rows по каждому объекту;
- risk/status для каждого объекта;
- списки рискованных объектов и ближайших дат, если данные доступны без перегруза API.

Минимальные aggregate поля:

- `received_total`;
- `paid_expense_total`;
- `planned_expense_total`;
- `committed_unpaid_total`;
- `cash_balance`;
- `available_after_plan`;
- `available_after_obligations`;
- `tax_reserve_total`;
- `net_available`.

Минимальная project row:

```text
{
    "project_id": number,
    "code": string,
    "name": string,
    "stage_label": string,
    "finance_summary": {...},
    "risk_status": string,
    "risk_flags": []
}
```

Risk rules должны быть backend read-model rules:

- `negative_net_available`: `finance_summary.net_available < 0`;
- `cash_gap`: `finance_summary.cash_balance < finance_summary.planned_expense_total`;
- `obligation_pressure`: `finance_summary.available_after_obligations < 0`;
- `tax_pressure`: `finance_summary.tax_reserve_total > 0 and finance_summary.net_available < finance_summary.tax_reserve_total`.

## Endpoint Recommendation

Рекомендованный будущий endpoint:

```text
GET /api/dashboard/root-summary
```

Почему не `GET /api/projects`:

- `listProjects()` должен остаться легким списком объектов;
- root summary требует ledger данных всех объектов;
- расширение `listProjects()` тяжелым finance aggregation увеличит риск регрессий;
- frontend не должен получать ledger всех объектов для расчетов.

Почему не переиспользовать `GET /api/dashboard/summary`:

- текущий endpoint уже используется для общего admin dashboard summary;
- он агрегирует catalog/request/project counters и legacy project totals;
- root portfolio finance summary имеет другой payload и другой lifecycle.

Route может жить в dashboard route namespace, но вызывать application/read-model из `projects/application/dashboard_root_read_model.py`.

## Future Frontend Files

Вероятные frontend файлы для будущих этапов:

- `admin-ui/src/features/dashboard/dashboard-scene-types.ts` - добавить root-level scope/view model;
- `admin-ui/src/features/dashboard/project-switcher.tsx` - добавить fixed synthetic tab **Все объекты**;
- `admin-ui/src/features/dashboard/screen.tsx` - рендерить root scene отдельно от project scenes;
- `admin-ui/src/features/dashboard/api/project-client.ts` или новый `dashboard-root-client.ts` - добавить `getDashboardRootSummary()`;
- `admin-ui/src/features/dashboard/state/use-dashboard-project-state.ts` или отдельный hook - хранить root summary state;
- будущий `admin-ui/src/features/dashboard/scenes/dashboard-root-overview-scene.tsx`;
- будущие model/mappers для root summary payload.

## Future Backend Files

Вероятные backend файлы для будущих этапов:

- `src/supply_bot/projects/application/dashboard_root_read_model.py`;
- use-case рядом с projects application layer, если понадобится orchestration;
- thin route в dashboard namespace для `GET /api/dashboard/root-summary`;
- storage/repository helper, который эффективно получает projects и ledger entries grouped by project для текущего owner scope.

## Risks

- Не расширять `listProjects()` тяжелой логикой.
- Не грузить ledger всех объектов во frontend.
- Не считать finance formulas на frontend.
- Не дублировать `projects/domain/finance.py`.
- Не ломать **Карточку объекта** и ее active project detail flow.
- Не ломать **Таблицу учета** и ее ledger mutation behavior.
- Не смешивать old compatibility fields с новыми finance summary fields.
- Не переиспользовать `planned_margin_percent` как налог.

## Recommended Next Steps

`DASH-DASHBOARD-ROOT-1`: создать backend application read-model `dashboard_root_read_model.py` и unit tests без endpoint/UI.

`DASH-DASHBOARD-ROOT-2`: добавить `GET /api/dashboard/root-summary` без UI.

`DASH-DASHBOARD-ROOT-3`: добавить frontend client/state для root summary.

`DASH-DASHBOARD-ROOT-4`: добавить UI фиксированной вкладки **Все объекты**.
