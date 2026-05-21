# Dashboard object card checkpoint 0

Статус: `DASH-OBJECT-CARD-0`, documentation checkpoint.

## Что Закрыто

Документационно закреплено разделение:

- **Карточка объекта** показывает результат backend расчетов через `finance_summary`;
- **Финансы** хранят настройки финансовой модели и детализацию;
- **Таблица учета** является источником расходов, планов, счетов, актов и обязательств;
- **Все объекты** агрегирует показатели всех объектов.

План создан:

```text
docs/DASHBOARD_OBJECT_CARD_FINANCE_PLAN.md
```

## Confirmed Unchanged

- Runtime Python/TypeScript code unchanged.
- UI/frontend unchanged.
- Database schema/migrations unchanged.
- API response shape unchanged.
- Auth/session/cookie unchanged.
- Deploy/env unchanged.
- Package files unchanged.

## Следующий Этап

Следующий этап: `DASH-OBJECT-CARD-1`.

На `DASH-OBJECT-CARD-1` нужно подключить `finance_summary` к UI вкладки **Карточка объекта** без переноса финансовых расчетов во frontend.
