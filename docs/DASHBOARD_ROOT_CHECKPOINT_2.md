# Dashboard root checkpoint 2

Статус: `DASH-DASHBOARD-ROOT-2`, backend endpoint for dashboard root summary.

## Что Закрыто

Добавлен backend endpoint для будущей общей вкладки dashboard **Все объекты**:

```text
GET /api/dashboard/root-summary
```

Endpoint:

- protected тем же admin auth style, что project/dashboard API;
- получает owner-scoped список проектов;
- получает ledger entries batch-запросом по всем project ids;
- передает `projects` и `ledger_entries_by_project` в `build_dashboard_root_summary_payload(...)`;
- возвращает готовый JSON payload с `summary` и `projects`;
- не считает финансовые формулы в route layer.

Source of truth для финансовых расчетов остается:

```text
src/supply_bot/projects/domain/finance.py
src/supply_bot/projects/application/dashboard_root_read_model.py
```

## Storage Read Path

Добавлен batch helper:

```text
list_project_ledger_entries_for_projects(project_ids)
```

Он нужен, чтобы `GET /api/dashboard/root-summary` не делал N+1 запрос по ledger строкам каждого объекта.

## Confirmed Unchanged

- Frontend/UI unchanged.
- Database schema/migrations unchanged.
- `listProjects()` response shape unchanged.
- Project detail endpoint shape unchanged.
- Accounting behavior unchanged.
- Finance formulas unchanged.
- Auth/session/cookie behavior unchanged.
- Deploy/env unchanged.
- Package files unchanged.

## Следующий Этап

Следующий этап: `DASH-DASHBOARD-ROOT-3`.

На `DASH-DASHBOARD-ROOT-3` нужно добавить frontend API client/state для `GET /api/dashboard/root-summary` без изменения project-level views.
