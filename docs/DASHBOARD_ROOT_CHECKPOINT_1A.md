# Dashboard root checkpoint 1A

Статус: `DASH-DASHBOARD-ROOT-1A`, dashboard root overview data path audit.

## Что Закрыто

Проведен аудит текущего dashboard frontend/backend перед внедрением фиксированной вкладки **Все объекты**.

Зафиксировано:

- текущие dashboard views являются project-level views: `overview`, `passport`, `finance`, `accounting`;
- `overview` уже означает **Карточка объекта**, поэтому **Все объекты** не должен переиспользовать этот view;
- `DashboardProjectSwitcher` сейчас рендерит только реальные объекты;
- для **Все объекты** нужна synthetic fixed tab перед project tabs;
- `listProjects()` должен остаться легким списком объектов;
- `finance_summary` сейчас приходит через detail endpoint только для активного объекта;
- ledger rows сейчас грузятся только для активного объекта;
- aggregate finance summary нельзя считать на frontend из текущего state;
- backend read-model должен жить в `src/supply_bot/projects/application/dashboard_root_read_model.py`;
- рекомендуемый будущий endpoint: `GET /api/dashboard/root-summary`;
- frontend должен отображать готовый backend root summary, а не считать finance formulas.

Audit document:

```text
docs/DASHBOARD_ROOT_UI_AUDIT.md
```

## Confirmed Unchanged

- Runtime UI unchanged.
- Backend logic unchanged.
- API unchanged.
- Database schema/migrations unchanged.
- Auth/session/cookie unchanged.
- Deploy/env unchanged.
- Package files unchanged.
- Accounting behavior unchanged.

## Следующий Этап

Следующий этап: `DASH-DASHBOARD-ROOT-1`.

На `DASH-DASHBOARD-ROOT-1` нужно создать backend application read-model для общей сводки **Все объекты** без endpoint/UI и без изменения database schema.
