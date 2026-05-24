# PUBLIC-LEADS-AUDIT-1A — аудит публичного приёма заявок

Дата фиксации: 2026-05-24

## 1. Цель

Подготовить безопасный публичный приём заявок с landing page.

Будущий endpoint:

```text
POST /api/public/leads
```

Первый backend шаг должен только:

- принять payload;
- провалидировать его;
- вернуть `{ "ok": true }`.

В первый backend implementation step не входят:

- Telegram-отправка;
- запись в database;
- подключение frontend submit;
- AI summary / qualification.

## 2. Текущая архитектура

Backend запускается через:

```text
supply_bot.admin_api.app:create_admin_app
```

Реальная сборка приложения находится в:

```text
src/supply_bot/admin_api/app_factory.py
```

Routes регистрируются через:

```text
src/supply_bot/admin_api/route_registry.py
```

Public landing form сейчас frontend-only.

Связанные frontend файлы:

- hook формы: `admin-ui/src/features/public/hooks/useLeadFormDraft.ts`;
- тип формы: `admin-ui/src/features/public/public-types.ts`;
- начальные значения и опции: `admin-ui/src/features/public/public-content.ts`.

## 3. Auth boundary

Все `/api/*` endpoints требуют admin session, если путь не добавлен в `PUBLIC_ADMIN_API_PATHS`.

Будущий endpoint:

```text
/api/public/leads
```

должен быть добавлен в `PUBLIC_ADMIN_API_PATHS` точечно.

На первом этапе не использовать широкий bypass вида:

```text
/api/public/*
```

`OPTIONS` должен остаться публичным как сейчас.

## 4. Будущие backend paths

Ожидаемые файлы для будущей backend задачи:

- `src/supply_bot/admin_api/app_routes_public.py`
- `src/supply_bot/admin_api/schemas/public.py`
- `src/supply_bot/admin_api/schemas/__init__.py`
- `src/supply_bot/admin_api/route_registry.py`
- `src/supply_bot/admin_api/app_factory.py`

## 5. Future DTO

Поля будущего request DTO:

- `name`
- `phone`
- `objectType`
- `area`
- `packageType`
- `contactMethod`
- `comment`

`area` пока должна оставаться строкой, потому что клиент может писать:

- `около 50`;
- `63,9`;
- `50-55`;
- `не знаю`.

## 6. Implementation stages

### Stage 1: PUBLIC-LEADS-API-1A

- добавить backend endpoint `POST /api/public/leads`;
- добавить validation;
- вернуть `{ "ok": true }`;
- не писать в БД;
- не отправлять Telegram;
- не вызывать AI;
- не менять frontend.

### Stage 2: PUBLIC-LEADS-FRONTEND-1A

- подключить форму сайта к backend endpoint;
- добавить loading/success/error states.

### Stage 3: BOT-LEADS-1A

- отправлять заявку в Telegram admin notification.

### Stage 4: ADMIN-LEADS-1A

- сохранять заявки и показывать в admin UI.

### Stage 5: LEAD-AI-1A

- добавить AI summary/qualification после стабильного канала заявок.

## 7. Guardrails

Не менять в этой docs-only задаче:

- backend code;
- frontend code;
- auth/session/cookie logic;
- database/migrations;
- `package.json` / `package-lock.json`;
- Dockerfile;
- Render config;
- bot runtime.

Ожидаемый diff:

- `docs/PUBLIC_LEADS_INTAKE_AUDIT.md`
