# Dashboard finance checkpoint 5B

Статус: `DASH-FINANCE-5B`, finance settings UI smoke checkpoint.

Этот checkpoint фиксирует кодовый smoke-аудит после runtime UI этапа `DASH-FINANCE-5`. Новая функциональность на этом этапе не внедрялась.

## Что Проверено

Проверено текущее состояние frontend/dashboard после merge `DASH-FINANCE-5`:

- `ProjectCardFinanceSettingsPanel` подключена только во вкладке **Финансы** через `admin-ui/src/features/dashboard/scenes/dashboard-finance-scene.tsx`.
- Вкладка **Паспорт объекта** больше не содержит поле **Плановая маржа**.
- `ProjectCardOverview` не содержит controls для `planned_margin_percent`, `tax_rate_percent` или `tax_base_mode`.
- `useDashboardProjectState` предоставляет `updateFinanceSettings(...)`.
- `updateFinanceSettings(...)` вызывает `updateDashboardProjectFinanceSettings(...)`.
- `updateDashboardProjectFinanceSettings(...)` после `PATCH /api/projects/{project_id}` вызывает `loadProjectDetail(projectId)`.
- `buildProjectFinanceSettingsPatchPayload(...)` отправляет:
  - `planned_margin_percent`;
  - `tax_rate_percent`;
  - `tax_base_mode`.
- Frontend не считает финансовые формулы:
  - `tax_reserve_total`;
  - `net_available`;
  - `available_after_plan`;
  - `available_after_obligations`.
- `ProjectCardOverview` только отображает и форматирует backend `financeSummary`.
- Accounting behavior на этом checkpoint не менялся.

## Подтвержденная Граница Ответственности

- **Карточка объекта** показывает результат backend `finance_summary`.
- **Финансы** содержат настройки финансовой модели объекта:
  - `planned_margin_percent` как плановая маржа;
  - `tax_rate_percent` как налоговая ставка;
  - `tax_base_mode` как режим налоговой базы.
- **Паспорт объекта** хранит паспортные и технические параметры объекта, но не финансовые настройки.
- **Таблица учета** остается источником ledger rows и не становится местом итоговых финансовых расчетов.

## Confirmed Unchanged

- Runtime UI behavior unchanged на `DASH-FINANCE-5B`.
- React logic unchanged на `DASH-FINANCE-5B`.
- Backend unchanged.
- API response shape unchanged.
- Database schema/migrations unchanged.
- Auth/session/cookie unchanged.
- Deploy/env unchanged.
- Package files unchanged.
- Accounting behavior unchanged.

## Следующий Этап

`DASH-FINANCE-5B` закрывает smoke-checkpoint после подключения finance settings UI.

Следующий безопасный этап можно выбирать отдельно:

- `DASH-DASHBOARD-ROOT-1`: backend read-model для общей вкладки **Все объекты**;
- или отдельный UI/QA этап для ручной проверки finance settings flow в браузере.
