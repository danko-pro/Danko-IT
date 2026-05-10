# Backend Implementation History v1.0

Дата среза: 2026-05-10.

Этот документ фиксирует историю backend-укрепления после начала подготовки проекта к более умному Telegram/admin backend. Он не заменяет `BACKEND_INTELLIGENCE_LAYER v1.1.md`; здесь хранится конкретная хронология сделанных изменений, проверок и текущая стоп-линия.

## Цель

Backend должен стать устойчивым рабочим слоем, а не набором случайных обработчиков:

- заявки имеют единый жизненный цикл;
- сообщения Telegram не теряются при сетевых сбоях;
- admin API и Telegram-бот используют общие use-case/storage границы;
- новые контракты постепенно уходят от сырых `dict[str, Any]` к явным DTO;
- AI/LLM может помогать, но не должен мутировать состояние в обход доменных правил.

## Сделано

### 1. Logistics/materials use-case слой

Коммиты:

- `15955eb refactor: move admin logistics use cases`
- `bba1980 refactor: move admin summary queries into storage`

Что изменилось:

- FastAPI routes для материалов и заявок стали тонкими транспортными входами.
- Бизнес-операции заявок и материалов вынесены в `src/supply_bot/admin_api/use_cases`.
- SQL для recent requests и material search перенесен в persistence-слой.
- Публичные API не менялись.

Зачем:

- один и тот же сценарий можно будет дергать из web-admin, Telegram-admin и будущих адаптеров движка;
- routes больше не являются местом бизнес-логики.

### 2. Жизненный цикл заявки

Коммит:

- `48c5216 feat: enforce request lifecycle transitions`

Что изменилось:

- Добавлен доменный модуль `src/supply_bot/domain/request_lifecycle.py`.
- Зафиксированы статусы:
  - `collecting`
  - `awaiting_confirmation`
  - `confirmed`
  - `in_progress`
  - `done`
  - `cancelled`
- Storage валидирует переходы статусов перед записью.
- Admin API возвращает `400`, если переход запрещен.
- Удаление заявки опирается на общий lifecycle, а не на локальный список статусов.

Зачем:

- бот, LLM и админка больше не могут по-разному трактовать статус заявки;
- отмененную заявку нельзя случайно перевести в выполненную.

### 3. Telegram notification outbox

Коммиты:

- `8555a3a feat: add telegram notification outbox`
- `8843155 refactor: type telegram notification outbox`

Что изменилось:

- Добавлена таблица `telegram_notification_outbox`.
- Добавлен storage-слой `src/supply_bot/storage_notifications.py`.
- Добавлен сервис `src/supply_bot/services/notifications.py`.
- Уведомления из admin status flow и подтверждения заявки ботом идут через outbox.
- При сетевом сбое сообщение остается `pending`, хранит `attempts`, `last_error`, `next_attempt_at`.
- Добавлены admin API endpoints:
  - `GET /api/notifications/telegram`
  - `POST /api/notifications/telegram/flush`
- Введен DTO `TelegramNotification`.

Зачем:

- если интернет или Telegram API падает, уведомление не пропадает;
- админ может увидеть и вручную дожать очередь.

### 4. DTO контракты для admin/request/materials

Коммиты:

- `a409d16 refactor: type admin request summaries`
- `d4c4907 refactor: type material search targets`

Что изменилось:

- Добавлен DTO `RequestSummary`.
- `list_recent_request_summaries()` возвращает typed objects, а не сырые SQLite rows.
- Добавлен DTO `MaterialSearchTarget`.
- `search_material_targets()` возвращает typed objects.
- HTTP слой явно сериализует DTO в JSON.

Зачем:

- admin API и storage имеют явные контракты;
- поиск материалов безопаснее использовать для привязки заявки к `family/variant/sku`;
- снижается риск ошибок из-за отсутствующих или неверно названных ключей.

## Проверки

Последний полный прогон после backend DTO/material search:

```text
pytest
94 passed
```

После каждого backend-шага перезапускались:

```text
run_admin.py
run_bot.py
GET /api/health -> ok
```

## Текущая backend stop line

Следующий backend-шаг считается полезным, если он закрывает одну из практических задач:

- вывод outbox-очереди в UI админки, а не только HTTP endpoint;
- более строгие доменные DTO для request detail/items;
- единые правила материалов: единицы измерения, размеры, дубли, архивность;
- автоматический retry outbox по расписанию, а не только при ручном flush/следующем уведомлении;
- наблюдаемость: понятные счетчики ошибок Telegram/LLM/media intake.

Не стоит продолжать:

- типизировать весь backend подряд без пользовательского сценария;
- вводить новые слои без тестов и видимой точки управления;
- менять диалоговый flow массово без проверки в реальном Telegram-чате.

## Незакоммиченный внешний контекст

На момент этого среза в рабочем дереве отдельно остается пользовательский документ:

```text
admin-ui/src/shared/ADMIN_UI_V3_NAVIGATION_HOST_CONTRACT v1.0.md
```

Он не является частью backend-коммитов выше и должен коммититься отдельно, когда будет готов его собственный handoff/history.
