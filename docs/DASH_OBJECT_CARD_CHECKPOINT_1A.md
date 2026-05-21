# Dashboard object card checkpoint 1A

Статус: `DASH-OBJECT-CARD-1A`, UI integration audit.

## Что Закрыто

Проведен аудит frontend/dashboard UI перед подключением backend `finance_summary` к вкладке **Карточка объекта**.

Зафиксировано:

- `overview` является текущей scene для **Карточки объекта**;
- `DashboardScreen` передает активный `project` во все scene и переключает вкладки через `activeView` / `onSelectView`;
- текущая карточка объекта использует старые project fields и один frontend ledger calculation для "Ожидает оплаты";
- вкладка **Финансы** содержит расходы, авансы и договор; настройки налогов и маржи должны жить там, а не на карточке;
- **Таблица учета** остается источником ledger rows и не должна быть итоговой карточкой объекта;
- frontend model пока не содержит `financeSummary`;
- frontend client пока не использует `GET /api/projects/{project_id}`;
- рекомендованный путь для `DASH-OBJECT-CARD-1` - загрузить `finance_summary` через detail endpoint активного объекта.

Audit document:

```text
docs/DASH_OBJECT_CARD_UI_AUDIT.md
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

## Следующий Этап

Следующий этап: `DASH-OBJECT-CARD-1`.

На `DASH-OBJECT-CARD-1` нужно подключить backend `finance_summary` к UI вкладки **Карточка объекта** через безопасную detail-загрузку активного объекта, не перенося финансовые формулы во frontend.
