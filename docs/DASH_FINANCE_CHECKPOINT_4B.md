# Dashboard finance checkpoint 4B

Статус: `DASH-FINANCE-4B`, persisted project tax settings checkpoint.

## Что закрыто

Добавлено постоянное хранение налоговых настроек объекта:

- `projects.tax_rate_percent`;
- `projects.tax_base_mode`.

`finance_summary` теперь использует сохраненную `tax_rate_percent`, а не всегда `0.0`.

## Текущие runtime-правила

- `tax_rate_percent` хранится в `projects` и по умолчанию равен `0.0`.
- `tax_base_mode` хранится в `projects` и по умолчанию равен `received_total`.
- Пока поддержан только `tax_base_mode = received_total`.
- `tax_base` считается от `project["received_total"]`.
- Неизвестный `tax_base_mode` безопасно откатывается к `received_total`.
- Некорректная или отрицательная налоговая ставка в read-model трактуется как `0.0`.

## Разделение понятий

`planned_margin_percent` не используется как налоговая ставка.

`planned_margin_percent` - это плановая маржа.

`tax_rate_percent` - это налоговая ставка.

Это разные поля и разные финансовые смыслы.

## Schema

Database schema/migration changed intentionally.

Migration:

```text
migrations/versions/0008_add_project_tax_settings.py
```

Старые API-поля проекта сохранены и не переименовывались.

## Confirmed unchanged

- UI/frontend unchanged.
- Package files unchanged.
- Auth/session/cookie unchanged.
- Deploy/env unchanged.
- Старые API-поля и их смысл сохранены.

## Следующий этап

Следующий этап можно выбрать:

- `DASH-FINANCE-5`: UI отображение `finance_summary` на вкладке финансы объекта;
- `DASH-DASHBOARD-ROOT-0`: архитектурный план общей вкладки dashboard по всем объектам.
