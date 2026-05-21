# Dashboard finance checkpoint 4

Статус: `DASH-FINANCE-4`, project tax runtime read-model checkpoint.

## Что закрыто

Добавлен отдельный backend tax runtime read-model layer для `finance_summary`:

```text
src/supply_bot/projects/application/tax_read_model.py
```

Этот слой отвечает за налоговые параметры проекта на текущем этапе:

- `tax_rate_percent`;
- `tax_base_mode`;
- расчет `tax_base`.

`finance_summary` теперь получает налоговые параметры через `tax_read_model`, а затем передает их в чистый domain finance engine.

## Текущие runtime-правила

- `tax_rate_percent` пока всегда `0.0`.
- `tax_base_mode` пока всегда `received_total`.
- `tax_base` считается из `project["received_total"]`.
- Некорректный или отсутствующий `received_total` дает `tax_base = 0.0`.
- `tax_reserve_total` пока остается `0.0`.

## Разделение понятий

`planned_margin_percent` не используется как налоговая ставка.

`planned_margin_percent` - это плановая маржа.

`tax_rate_percent` - это налоговая ставка.

Это разные финансовые понятия. Persisted tax rate требует отдельного schema/config этапа.

## Confirmed unchanged

- UI/frontend unchanged.
- Database schema/migrations unchanged.
- Package files unchanged.
- Old API fields unchanged.
- Auth/session/cookie unchanged.
- Deploy/env unchanged.

## Следующий этап

Следующий этап:

- либо `DASH-FINANCE-5`: UI отображение `finance_summary`;
- либо `DASH-FINANCE-4B`: persisted tax settings, если сначала решим хранить налоговые настройки.
