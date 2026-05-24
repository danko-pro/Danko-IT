# BOT-AI-RUNTIME-0 — аудит и стратегия запуска bot + AI слоя

Дата фиксации: 2026-05-24

## 1. Цель

Зафиксировать стратегию полноценного запуска слоя заявок, бота и AI:

public landing form
-> backend lead intake
-> lead entity / shared database
-> admin bot notification
-> admin approval
-> contact strategy
-> customer messenger flow when technically available
-> AI qualification / summary
-> manager-ready lead card

Это не временная отправка сообщения в Telegram. Заявка с сайта должна стать нормальной сущностью системы.

## 2. Render runtime model

Нужно два отдельных сервиса из одного GitHub repo.

### Web Service

Start command:

python run_admin.py

Ответственность:
- HTTP API;
- `/api/public/leads`;
- admin API;
- public lead creation;
- consent capture;
- AI summary trigger;
- admin bot notification enqueue/send;
- future calculator API.

Render requirement:
- web service must bind to `0.0.0.0`;
- use `PORT`.

Current note:
- `run_admin.py` delegates to admin API main.
- `src/supply_bot/admin_api/app_factory.py` currently defaults `ADMIN_API_HOST` to `127.0.0.1`.
- For Render production, env must include:
  ADMIN_API_HOST=0.0.0.0

### Background Worker

Start command:

python run_bot.py

Ответственность:
- Telegram polling;
- private admin bot;
- admin approval callbacks;
- group scenarios;
- customer qualification scenario;
- bot-side lead actions.

Do not run `python run_bot.py` inside the Web Service process.

## 3. Shared database requirement

Web Service and Background Worker must use the same database.

Problem:
- local SQLite per service would isolate data;
- Web Service could create a lead that Bot Worker cannot see.

Target:
- use Render Postgres;
- set the same `DATABASE_URL` for Web Service and Background Worker;
- prefer Render internal database URL when both services are in the same region.

Repo note:
- `src/supply_bot/database/runtime.py` already supports `DATABASE_URL`;
- `postgres://` and `postgresql://` are normalized to `postgresql+asyncpg://`;
- SQLite remains local/dev fallback.

## 4. Public lead lifecycle

Target lead statuses:

- pending_admin_approval
- approved_for_contact
- rejected_by_admin
- manual_contact_required
- waiting_for_customer_start
- conversation_started
- qualification_in_progress
- qualified
- manager_notified
- closed

Initial flow:
1. Customer submits public form.
2. Backend validates payload and consent flags.
3. Backend creates lead with status `pending_admin_approval`.
4. Admin receives lead card in Telegram admin bot.
5. Admin chooses:
   - approve contact;
   - reject;
   - mark manual contact required.
6. Only after approve does Contact Strategy run.

## 5. Consent model

Public form must eventually capture:

- personal data processing consent;
- consent to be contacted via selected channel;
- optional consent that a digital assistant may ask preliminary questions.

Consent is legal/process permission.
Consent does not bypass Telegram/MAX/WhatsApp technical limitations.

The site must not promise that the bot will automatically contact the customer unless the technical channel exists.

Recommended success message:
`Заявка отправлена. Мы проверим вводные и свяжемся с вами выбранным способом.`

## 6. Telegram limitation and Contact Strategy

Normal Telegram Bot API cannot reliably initiate a private chat with a user who has never started the bot.

Contact Strategy must decide:

- if lead has `telegram_chat_id`:
  bot can message directly;
- if lead has only Telegram username/phone:
  do not assume direct bot contact is possible;
  use manual instruction or deep link flow;
- if customer starts bot through deep link:
  bind Telegram chat_id to lead;
- if MAX/WhatsApp:
  use future adapters by their own rules;
- if phone:
  manual contact required.

Target deep link format:
https://t.me/<bot_username>?start=lead_<token>

## 7. Admin bot approval model

Admin notification must contain full lead data:

- name;
- contact;
- preferred contact method;
- object type;
- area;
- package/format;
- comment;
- consent flags;
- source;
- status.

Inline buttons:

- Одобрить контакт
- Отклонить
- Нужна ручная связь
- Открыть в админке, later

Callback shape proposal:

- lead:approve:<lead_id>
- lead:reject:<lead_id>
- lead:manual:<lead_id>

## 8. AI model

AI must be service-layer, not route-layer.

Use existing AI client layer:
- `LlmProviderClient`;
- OpenAI / Mistral / OpenRouter fallback;
- no direct AI calls from React;
- no direct AI calls in route handlers.

AI must not block lead creation or admin notification.

Failure behavior:
- if AI fails, lead still exists;
- admin still receives lead;
- summary can be omitted or marked unavailable.

AI first useful roles:
- normalize customer comment;
- extract object type, area, urgency, package hint;
- generate manager summary;
- propose clarifying questions.

## 9. Architecture constraints

Keep project layering:

adapter:
- FastAPI route;
- Telegram handler.

application:
- lead intake use-case;
- admin approval use-case;
- contact strategy use-case;
- qualification use-case.

services:
- AI provider client;
- Telegram notification/message sender;
- future MAX/WhatsApp adapters.

domain:
- pure lead status transitions;
- validation rules;
- summary structures.

Do not put business logic directly into FastAPI routes or aiogram handlers.

## 10. Suggested implementation sequence after BOT-AI-RUNTIME-0

### BOT-AI-RUNTIME-1A
Prepare Render env checklist:
- Web Service env;
- Worker env;
- shared DATABASE_URL;
- ADMIN_API_HOST=0.0.0.0;
- BOT_TOKEN;
- ADMIN_IDS;
- TEAM_GROUP_CHAT_ID;
- AI provider keys;
- SUPPLY_DIALOGUE_ENABLED.

### DATA-RUNTIME-1A
Audit and verify shared Postgres runtime:
- Web Service and Worker use same DB;
- metadata/create_all behavior safe;
- no SQLite-only assumptions for new lead tables.

### PUBLIC-LEADS-1A
Implement backend endpoint:
POST /api/public/leads

Creates lead:
status = pending_admin_approval

No customer contact yet.

### ADMIN-LEADS-1A
Send admin bot notification with lead card.

### ADMIN-LEADS-1B
Handle approve/reject/manual callbacks in admin bot.

### LEAD-CONTACT-1A
Implement Contact Strategy.

### LEAD-CONVERSATION-1A
Start qualification dialogue after approved contact and available channel.

### LEAD-AI-1A
Add AI summary and qualification support.

### PUBLIC-LEADS-UI-1A
Connect public landing form to real backend endpoint and add consent checkboxes.

## 11. Explicit non-goals for BOT-AI-RUNTIME-0

Do not:
- change runtime code;
- add endpoint;
- add database tables;
- add migrations;
- change frontend;
- change auth/session/cookie behavior;
- change package files;
- change Render config;
- start bot worker in web service;
- contact customer automatically.

This PR is documentation/audit only.
