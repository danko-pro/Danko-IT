# Dashboard finance checkpoint 3

Статус: `DASH-FINANCE-3`, backend finance read-model checkpoint.

## Что закрыто

Добавлен backend read-model расчет `finance_summary` для dashboard объектов.

Ключевой helper:

```text
src/supply_bot/projects/application/finance_read_model.py
```

`finance_summary` собирается через чистый domain engine:

```text
src/supply_bot/projects/domain/finance.py
```

Подключение выполнено для безопасного read path:

```text
GET /api/projects/{project_id}
```

List responses и mutation responses пока сохраняют прежнюю форму; расширение этих путей отложено до отдельного этапа, чтобы не увеличивать blast radius.

## Compatibility

- Старые API-поля проекта сохранены.
- Старые поля не переименовывались.
- `planned_total`, `actual_total`, `remaining_total`, `deferred_total`, `work_per_m2`, `materials_per_m2` сохраняют прежний смысл.
- `finance_summary` добавлен как новое вложенное поле на project detail read path.
- `tax_rate_percent` пока всегда `0.0`.
- `tax_base` по умолчанию равен `received_total`.
- Налоговый runtime-блок будет отдельным этапом `DASH-FINANCE-4`.

## Confirmed unchanged

- UI/frontend unchanged.
- Database schema/migrations unchanged.
- Package files unchanged.
- Auth/session/cookie unchanged.
- Deploy/env unchanged.

## Следующий этап

Следующий этап: `DASH-FINANCE-4`.

На `DASH-FINANCE-4` нужно добавить налоговый runtime-блок без смешивания налога с `planned_margin_percent`.
