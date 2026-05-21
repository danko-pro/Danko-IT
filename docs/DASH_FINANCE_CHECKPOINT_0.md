# Dashboard finance checkpoint 0

Статус: `DASH-FINANCE-0`, documentation checkpoint.

## Что закрыто

Закрыт только документационный checkpoint по перестройке финансового движка dashboard объектов.

Создан план:

- `docs/DASHBOARD_FINANCE_ENGINE_PLAN.md`

План фиксирует:

- цель перестройки;
- текущую проблему;
- текущую архитектурную ситуацию;
- целевую архитектуру;
- финансовый словарь;
- целевые формулы;
- смысл статусов ledger;
- этапы реализации;
- ограничения;
- acceptance criteria.

## Confirmed unchanged

- Runtime code unchanged.
- Frontend unchanged.
- Database schema/migrations unchanged.
- API response shape unchanged.
- Auth/session/cookie unchanged.
- Package files unchanged.
- Deploy/env unchanged.

## Следующий этап

Следующий этап: `DASH-FINANCE-1`.

На `DASH-FINANCE-1` нужно создать чистый backend/domain finance engine в:

```text
src/supply_bot/projects/domain/finance.py
```

и покрыть его unit-тестами без подключения UI, migrations или изменения API response shape.
