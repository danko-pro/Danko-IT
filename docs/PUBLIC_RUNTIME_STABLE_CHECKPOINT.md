# PUBLIC-RUNTIME-STABLE-1 — стабильный public runtime перед переносом калькулятора

Дата фиксации: 2026-05-24

## 1. Current main checkpoint

Repository:

```text
danko-pro/Danko-IT
```

Branch:

```text
main
```

Latest known merge commit:

```text
1a37221 Merge pull request #41 from danko-pro/admin-leads-1a
```

Этот checkpoint фиксирует состояние после `ADMIN-LEADS-1A`, где публичные заявки начали сохраняться в отдельную таблицу `public_leads`.

## 2. Public routes

Текущие публичные и системные маршруты:

- `/` — public landing.
- `/privacy` — public privacy page.
- `/app` — admin app.
- `/api/public/leads` — public lead endpoint.

Private admin API routes remain protected by admin session. Public bypass должен оставаться точечным для `/api/public/leads`; не расширять его до wildcard-маршрутов без отдельной задачи.

## 3. Public website state

Публичный сайт сейчас содержит:

- header;
- hero;
- services;
- packages/projects;
- process;
- contacts;
- privacy page;
- lead form.

Форма заявки уже подключена к backend endpoint и больше не является frontend-only.

## 4. Public lead runtime

Текущая production-like цепочка:

```text
Public landing form
-> consent checkbox
-> honeypot website
-> frontend POST /api/public/leads
-> backend validation
-> public lead rate limit
-> save to public_leads DB table
-> Telegram notification
-> update telegram_delivery_status
-> client receives { "ok": true }
```

Клиентский response shape не изменился:

```json
{ "ok": true }
```

Telegram delivery errors не должны раскрывать детали клиенту. Клиентская форма не должна зависеть от успешной отправки Telegram, если backend уже принял заявку.

## 5. Public lead persistence

Public leads сохраняются отдельно от текущих bot requests.

Таблица:

```text
public_leads
```

Назначение:

- sales/contact intake с публичного сайта;
- хранение контактных вводных;
- фиксация consent;
- статус Telegram delivery;
- будущий review/admin workflow.

Важно:

- `public_leads` не смешивать с `request_drafts`;
- `request_drafts` остаются для Telegram bot material requests;
- public leads сейчас не отображаются в admin UI;
- admin UI integration paused.

## 6. Current guardrails

Сохранять следующие правила:

- не смешивать `public_leads` с `request_drafts`;
- не менять public response shape `{ "ok": true }` без отдельной задачи;
- не расширять public auth bypass шире `/api/public/leads`;
- не логировать персональные данные: name, contact, phone, comment;
- не хранить honeypot `website`;
- не тащить Telegram tokens во frontend;
- не трогать auth/session/cookie без отдельной задачи;
- не трогать admin UI в рамках calculator migration;
- не подключать Google Sheets как runtime source на первом этапе;
- не добавлять AI в public intake без отдельной задачи;
- не делать автоматический контакт с клиентом без отдельной contact strategy.

## 7. Roadmap correction

Решение на текущую точку:

- `ADMIN-LEADS-1B` paused;
- `BOT-LEADS-ACTIONS-1A` paused;
- `LEAD-AI-1A` paused;
- near-term focus is public website and calculator.

Причина: public lead pipeline уже дошёл до стабильной минимальной рабочей цепочки: сайт принимает заявку, backend валидирует и сохраняет её, Telegram-группа получает уведомление. Следующий полезный продуктовый прирост — публичный расчёт ремонта.

## 8. Next stages

Рекомендуемый порядок:

1. `CALCULATOR-MIGRATION-0` — audit Google Sheets calculator logic.
2. `CALCULATOR-DOMAIN-1A` — calculator domain model.
3. `CALCULATOR-ENGINE-1A` — deterministic calculator engine.
4. `PUBLIC-CALCULATOR-1A` — public calculator UI.
5. `PUBLIC-CALCULATOR-LEAD-1A` — connect calculation result to lead form.

## 9. Calculator migration principle

Принцип переноса калькулятора:

- сначала аудит таблиц;
- потом доменная модель;
- потом engine;
- потом публичный UI;
- потом связь с заявкой;
- не переносить Google Sheets хаос напрямую;
- не делать сайт зависимым от Google Sheets как runtime source на первом этапе.

Google Sheets может оставаться источником анализа и сверки, но не должен быть runtime-зависимостью публичного сайта в первой версии калькулятора.

## 10. Verification commands

Backend:

```bash
python -m pytest tests/test_admin_api_auth_middleware.py -q
python -m pytest tests/test_admin_request_routes.py -q
```

Frontend:

```bash
cd admin-ui
npm run build
npm run preview
```

Routes to check:

- `/`
- `/privacy`
- `/app`
- `POST /api/public/leads`

Public lead checks:

- valid payload with `personalDataConsent=true` returns `{ "ok": true }`;
- missing/false consent returns 422;
- non-empty honeypot `website` returns 422;
- rate limit returns 429 with `Retry-After`;
- accepted lead is stored in `public_leads`;
- Telegram delivery status is updated.

## 11. Definition of done

This checkpoint is complete when:

- created only `docs/PUBLIC_RUNTIME_STABLE_CHECKPOINT.md`;
- `git diff --check` passes;
- working tree is clean after commit;
- PR is opened.

This task is docs-only. It must not change:

- runtime code;
- frontend;
- backend;
- migrations;
- tests;
- package files;
- Dockerfile;
- Render config.
