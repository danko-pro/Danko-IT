# BOT-RUNTIME-STABLE-1 — рабочий checkpoint bot/backend/admin контура

Дата фиксации: 2026-05-24

## 1. Цель checkpoint

Зафиксировать стабильное состояние после запуска рабочего Telegram bot runtime на Render и подключения его к backend/web-admin через общий Postgres.

Контур теперь работает не как макет, а как production-like pipeline:

```text
Telegram group
-> bot worker
-> shared Postgres
-> backend admin API
-> web-admin under email login
-> Telegram admin notification
```

## 2. Merge baseline

Зафиксировать последние ключевые merge:

### BOT-AI-RUNTIME-0

PR #26

Назначение: стратегия двухконтурного Render runtime, shared DB, admin approval/contact strategy, AI boundaries.

### BOT-POSTGRES-BIGINT-1A

PR #28

Назначение: BigInteger для Telegram `chat_id`/`user_id`, чтобы supergroup ids вида `-100...` не ломали Postgres.

### ADMIN-REQUESTS-VISIBILITY-1A

PR #29

Merge commit: `8bd4a31 Merge pull request #29 from danko-pro/admin-requests-visibility-1a`

Назначение: user-scoped web-admin видит global bot-created requests без нарушения изоляции user-owned tenant requests.

## 3. Render runtime state

Зафиксировать текущую схему:

### Backend Web Service

Render service: Danko-IT

Runtime: Docker

Назначение:

- FastAPI backend;
- `/api/health`;
- admin API;
- request APIs;
- future public leads endpoint;
- future AI/backend processing.

Dockerfile запускает backend через `uvicorn supply_bot.admin_api.app:create_admin_app --factory`.

Обязательные env:

- `DATABASE_URL`
- `BOT_TOKEN`
- `ADMIN_IDS`
- `ADMIN_SESSION_SECRET`
- `ADMIN_SESSION_COOKIE_SECURE`
- `ADMIN_SESSION_COOKIE_SAMESITE`
- `ADMIN_API_CORS_ORIGINS`

### Bot Background Worker

Render service: danko-bot-worker

Runtime: Docker

Start command:

```text
python -m supply_bot.main
```

Назначение:

- Telegram polling;
- group request intake;
- admin bot notification;
- AI-assisted dialogue when enabled;
- interaction with shared Postgres.

Обязательные env:

- `DATABASE_URL`
- `BOT_TOKEN`
- `ADMIN_IDS`
- `DEBUG`
- `TIMEZONE`
- `SUPPLY_DIALOGUE_ENABLED`
- AI provider variables when AI enabled.

### Shared database

Render Postgres: danko-postgres

Backend and bot worker must use the same `DATABASE_URL`.

Prefer internal Render database URL when services are in the same region.

Critical rule:

Web Service and Bot Worker must never use separate SQLite databases in production.

## 4. Smoke checks already passed

Зафиксировать фактически пройденные проверки:

### Backend

`/api/health` returns ok.

Backend deploy is live on Render.

### Bot worker

Render logs showed:

- service is live;
- aiogram polling started;
- polling runs for `@Danko_ai_bot`.

### Telegram group

In object group:

- `/ping` returns `Бот на связи`.
- Bot receives material request.
- Bot detects object mismatch and asks clarification.
- Bot accepts correction to current object.
- Bot adds additional item.
- Bot reaches confirmation state.
- Bot accepts confirmation.
- Bot replies that request was sent to administrator.

Example passed scenario:

```text
/ping
Бот на связи.

бот заявка кабель 3x2.5 150 м.п. подрозетники 120 шт доставка завтра 10:00 объект АГ 82
```

Бот собрал заявку, уточнил объект, добавил:

- кабель 3x2.5 — 150 м.п.
- подрозетники — 120 шт

Потом была добавлена позиция:

```text
3. щит внутренний 18 модулей — 3 шт
```

После команды подтверждения бот ответил:

```text
Заявку подтвердил и передал администратору.
```

### Admin Telegram

Confirmed request is sent to admin Telegram account.

### Web admin

Confirmed bot request is visible in web-admin under email login.

This validates global bot-created request visibility for user-scoped admin storage.

## 5. Known production guardrails

### One polling process only

Telegram Bot API polling allows only one active polling process per `BOT_TOKEN`.

If logs show:

```text
TelegramConflictError: Conflict: terminated by other getUpdates request
```

Then another process is polling the same bot token.

Checklist:

- no local `python run_bot.py`;
- no second Render worker;
- no old Docker/WSL bot process;
- no second service with same `BOT_TOKEN`;
- no duplicate deployment manually started.

### Telegram id fields must remain BigInteger

Telegram supergroup chat IDs can exceed int32 range.

Fields that must remain BigInteger:

- `request_drafts.chat_id`
- `request_drafts.master_id`
- `request_draft_participants.user_id`
- `group_profiles.chat_id`
- `group_message_history.chat_id`
- `group_message_history.user_id`
- `telegram_notification_outbox.chat_id`

Do not revert them to Integer.

### Shared database must remain shared

Backend and bot worker must use the same `DATABASE_URL`.

If bot requests stop appearing in web-admin:

- Compare backend `DATABASE_URL`.
- Compare worker `DATABASE_URL`.
- Check owner scope.
- Check `/api/requests/recent`.
- Check latest rows in `request_drafts`.

### User-scope visibility rule

Bot-created requests are global rows.

User-scoped admin request storage must be able to read global bot-created rows while preserving isolation between different user-owned rows.

Do not “fix” visibility by removing tenant isolation globally.

### AI must not block core request flow

AI may be enabled via:

- `SUPPLY_DIALOGUE_ENABLED`
- `SUPPLY_DIALOGUE_PRIMARY_PROVIDER`
- `OPENAI_API_KEY` or other provider keys
- model env variables

But AI failure must not break:

- group `/ping`;
- request collection;
- confirmation;
- admin notification;
- web-admin visibility.

### Render deployment guardrail

Bot worker start command should remain:

```text
python -m supply_bot.main
```

Do not use `python run_bot.py` inside current Docker image unless Dockerfile is updated to copy root entrypoints and tools.

## 6. Operational checklist after every deploy

After every backend/worker deploy:

1. Check backend:
   open `/api/health`;
   expect ok.
2. Check bot worker logs:
   no crash loop;
   no repeated `TelegramConflictError`;
   no `DBAPIError`;
   polling active.
3. Check Telegram group:
   send `/ping`;
   expect `Бот на связи`.
4. Check request flow:
   send a small test request;
   reach confirmation;
   confirm;
   verify admin Telegram notification.
5. Check web-admin:
   login under email account;
   confirm request is visible;
   open request details if available.
6. Check Postgres:
   if visibility issue appears, inspect `request_drafts` latest rows;
   ensure status is `confirmed`;
   ensure expected `chat_id` is stored.

## 7. Cleanliness audit for this checkpoint

This checkpoint task must not modify:

- runtime code;
- frontend;
- database schema;
- migrations;
- package files;
- auth/session/cookie;
- Render config.

Allowed change:

- new docs file only.

Expected changed file:

- `docs/BOT_RUNTIME_STABLE_CHECKPOINT.md`

## 8. Next recommended implementation stages

After this checkpoint, continue in this order:

### BOT-RUNTIME-HARDEN-1A

Add runtime diagnostics/health tooling if needed:

- bot worker startup diagnostic log;
- optional admin command `/runtime`;
- duplicate polling guidance;
- DB backend/status display;
- AI enabled/provider summary without secrets.

### PUBLIC-LEADS-1A

Implement public lead endpoint:

```text
POST /api/public/leads
```

Target:

- create lead with status `pending admin approval`;
- no automatic customer contact;
- admin notification first.

### ADMIN-LEADS-1A

Add admin approval buttons for website leads:

- approve contact;
- reject;
- manual contact required.

### LEAD-CONTACT-1A

Implement Contact Strategy:

- direct Telegram only when `chat_id` exists;
- deep link/manual instruction when only username/phone exists;
- future MAX/WhatsApp adapters.

### LEAD-AI-1A

AI summary for lead qualification:

- service-layer only;
- graceful fallback;
- no direct React/route AI calls.

### CALCULATOR-MIGRATION-0

Start formal migration of Google Sheets calculator model after lead pipeline is stable.

## 9. Rollback notes

If bot stops responding:

- Check worker status.
- Check logs for `TelegramConflictError`.
- Check logs for DB errors.
- Confirm `BOT_TOKEN` is still valid.
- Send `/ping` in group.
- If `/ping` works but request fails, inspect latest stack trace.
- If Postgres id range error returns, verify BigInteger migration applied.

If web-admin stops showing bot requests:

- Check `/api/requests/recent`.
- Check login role / user scope.
- Check latest `request_drafts`.
- Ensure global-read visibility for bot-created rows was not reverted.

## 10. Definition of done

This checkpoint is complete when:

- document is added;
- `git diff --check` passes;
- no runtime files are changed;
- PR title is correct;
- PR summary lists the verified bot/backend/admin state;
- main remains clean after merge.
