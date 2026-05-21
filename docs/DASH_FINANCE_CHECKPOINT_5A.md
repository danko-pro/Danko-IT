# Dashboard finance checkpoint 5A

Статус: `DASH-FINANCE-5A`, finance settings UI audit.

## Что Закрыто

Проведен аудит вкладки **Финансы** перед подключением UI управления:

- `planned_margin_percent`;
- `tax_rate_percent`;
- `tax_base_mode`.

Зафиксировано:

- `DashboardFinanceScene` сейчас рендерит expenses, advances и contract panels;
- `ProjectCardFinanceSettingsPanel` существует, но не подключена к `DashboardFinanceScene`;
- текущая settings panel умеет редактировать только `plannedMarginPercent`;
- frontend model уже содержит `plannedMarginPercent` и `financeSummary`;
- frontend model пока не содержит `taxRatePercent` и `taxBaseMode`;
- frontend action для `planned_margin_percent` существует, но не подключен к finance scene;
- frontend action для `tax_rate_percent` / `tax_base_mode` отсутствует;
- backend `PATCH /api/projects/{project_id}` уже принимает `planned_margin_percent`, `tax_rate_percent`, `tax_base_mode`;
- после будущего save settings нужен active detail refresh, чтобы обновить `financeSummary`.

Audit document:

```text
docs/DASH_FINANCE_SETTINGS_UI_AUDIT.md
```

## Confirmed Unchanged

- Runtime UI behavior unchanged.
- React component logic unchanged.
- Backend unchanged.
- API response shape unchanged.
- Database schema/migrations unchanged.
- Package files unchanged.
- Auth/session/cookie unchanged.
- Deploy/env unchanged.
- Accounting behavior unchanged.

## Следующий Этап

Следующий этап: `DASH-FINANCE-5`.

На `DASH-FINANCE-5` нужно подключить settings UI во вкладке **Финансы**, не перенося настройки на **Карточку объекта** и не добавляя финансовые формулы во frontend.
