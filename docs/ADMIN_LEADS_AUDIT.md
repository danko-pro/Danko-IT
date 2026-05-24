# ADMIN-LEADS-AUDIT-1A — аудит сохранения публичных заявок

Дата фиксации: 2026-05-24

## 1. Цель

Подготовить безопасный план для следующего этапа `ADMIN-LEADS-1A`, где заявки с публичной формы сайта будут сохраняться в базе данных.

Этот аудит не меняет runtime-код. На текущем этапе публичная форма уже отправляет `POST /api/public/leads`, backend валидирует payload, применяет защиту от спама и отправляет уведомление в Telegram-группу заявок. Но заявка пока не сохраняется в БД и не отображается в web-admin.

Цель следующего этапа: добавить persistence для public leads без поломки:
- текущей Telegram-доставки;
- admin auth/session/cookie;
- bot runtime;
- существующих Telegram bot requests;
- текущих request APIs;
- response shape публичного endpoint.

## 2. Изученные файлы

Public lead intake:
- `src/supply_bot/admin_api/app_routes_public.py`
- `src/supply_bot/admin_api/schemas/public.py`
- `src/supply_bot/admin_api/public_rate_limit.py`
- `src/supply_bot/admin_api/public_lead_notifications.py`
- `src/supply_bot/admin_api/route_registry.py`
- `src/supply_bot/admin_api/app_factory.py`
- `src/supply_bot/config.py`
- `tests/test_admin_api_auth_middleware.py`

Existing request runtime:
- `src/supply_bot/storage_requests/tables.py`
- `src/supply_bot/storage_requests/repository.py`
- `src/supply_bot/storage_requests/runtime_repository.py`
- `src/supply_bot/storage_scope.py`
- `src/supply_bot/domain/requests.py`
- `src/supply_bot/domain/request_lifecycle.py`
- `src/supply_bot/requests/application/list_recent_requests.py`
- `src/supply_bot/admin_api/app_routes_requests.py`
- `src/supply_bot/admin_api/use_cases/requests.py`
- `src/supply_bot/services/dialogue_request_flow_summary.py`
- `src/supply_bot/services/notifications.py`
- `src/supply_bot/storage_notifications/tables.py`
- `tests/test_admin_request_routes.py`

Admin UI requests:
- `admin-ui/src/features/requests/api.ts`
- `admin-ui/src/features/requests/controller.ts`
- `admin-ui/src/features/requests/screen.tsx`
- `admin-ui/src/features/requests/list-panel.tsx`
- `admin-ui/src/shell/controller.ts`
- `admin-ui/src/shell/screen-router.tsx`

Database and migrations:
- `src/supply_bot/database/metadata.py`
- `src/supply_bot/database/runtime.py`
- `src/supply_bot/storage_bootstrap/migrations.py`
- `migrations/env.py`
- `migrations/versions/0004_create_request_runtime.py`
- `migrations/versions/0009_use_bigint_for_telegram_ids.py`

## 3. Current state: public lead endpoint

Current endpoint:

```text
POST /api/public/leads
```

The route is registered in `register_admin_routes()` through `register_public_routes()` from `src/supply_bot/admin_api/app_routes_public.py`.

The endpoint is public because `src/supply_bot/admin_api/app_factory.py` includes the exact path `/api/public/leads` in `PUBLIC_ADMIN_API_PATHS`. This is intentionally a narrow bypass, not a wildcard `/api/public/*`.

Current request DTO is `PublicLeadPayload` in `src/supply_bot/admin_api/schemas/public.py`.

Current fields:
- `name`
- `phone`
- `objectType`
- `area`
- `packageType`
- `contactMethod`
- `comment`
- `personalDataConsent`
- `website`

Current validation:
- `name` is required and limited to 120 chars;
- `phone` is required and limited to 120 chars;
- `objectType` is limited to 120 chars;
- `area` is limited to 40 chars and intentionally remains string;
- `packageType` is limited to 160 chars;
- `contactMethod` is limited to 40 chars;
- `comment` is limited to 2000 chars;
- `personalDataConsent` must be exactly `true`;
- `website` is a honeypot field limited to 120 chars.

Current route behavior:
1. Rejects non-empty `website` with 422.
2. Checks `app.state.public_lead_rate_limiter`.
3. Rate limits by client IP using `X-Forwarded-For` first IP or `request.client.host`.
4. On rate limit, returns 429 and `Retry-After`.
5. Resolves `PublicLeadTelegramNotifier`.
6. Sends Telegram message through `TELEGRAM_PUBLIC_BOT_TOKEN` and `TELEGRAM_LEADS_CHAT_ID`.
7. Swallows Telegram delivery exceptions.
8. Returns:

```json
{ "ok": true }
```

The endpoint currently does not:
- write to DB;
- call AI;
- create an admin entity;
- contact the customer;
- log public lead payload.

## 4. Current security and privacy boundary

Current auth boundary is appropriate for this stage:
- `OPTIONS` remains public.
- `/api/public/leads` is public through an exact bypass.
- private admin endpoints, including `/api/requests/recent`, still require admin session.

Current public hardening:
- required `personalDataConsent=true`;
- hidden honeypot `website`;
- in-memory IP rate limit: 5 submissions per 10 minutes;
- `Retry-After` on 429;
- backend-only Telegram token;
- no frontend token exposure;
- Telegram delivery failures do not leak details to the client.

Guardrail for the next implementation: do not add a broad public bypass. Keep `/api/public/leads` exact unless a separate public route is explicitly introduced and reviewed.

## 5. Existing request architecture

The existing web-admin request system is not a generic lead CRM. It is a Telegram bot request runtime.

Core tables in `src/supply_bot/storage_requests/tables.py`:
- `request_drafts`
- `request_draft_participants`
- `request_items`
- `group_profiles`
- `group_message_history`

Related notification table:
- `telegram_notification_outbox`

Current request lifecycle in `src/supply_bot/domain/request_lifecycle.py`:
- `collecting`
- `awaiting_confirmation`
- `confirmed`
- `in_progress`
- `done`
- `cancelled`

Current admin request endpoints:
- `GET /api/requests/recent`
- `GET /api/requests/{draft_id}`
- `PATCH /api/requests/{draft_id}/status`
- `DELETE /api/requests/{draft_id}`
- `PATCH /api/requests/{draft_id}/delivery`
- item CRUD under `/api/requests/...`

Current list flow:

```text
admin-ui requests controller
-> fetchRecentRequests()
-> GET /api/requests/recent
-> ListRecentRequestsUseCase
-> storage.list_recent_request_summaries()
-> request_drafts + group_profiles + request_items
```

The current admin UI screen expects request rows with fields like:
- `id`
- `master_name`
- `object_name`
- `status`
- `waiting_for`
- delivery fields;
- `items_count`.

That shape is tied to bot-created material requests and request items.

## 6. Bot-created/global request visibility

The project already has an important owner-scope rule in `src/supply_bot/storage_scope.py`.

Repositories can be created as:
- `for_owner(user_id)` for strict tenant-owned rows;
- `for_owner_with_global_reads(user_id)` for user-owned rows plus global rows.

For registered non-admin web users, `src/supply_bot/admin_api/app_factory.py` configures request storage as:

```text
request_repository.for_owner_with_global_reads(user_id)
```

This allows web-admin users to read global bot-created rows where `owner_user_id IS NULL`, while still preserving isolation between different user-owned rows.

This was verified in existing tests: registered users can see global bot-created requests, but cannot see another user's tenant-owned requests.

Guardrail: do not fix future public lead visibility by removing tenant isolation globally. Public leads should have their own explicit read policy.

## 7. Why public leads should not be mixed into request_drafts now

Public leads and Telegram bot requests have different semantics.

Telegram bot request:
- created inside object/group context;
- has `chat_id`, `master_id`, participants and group profile;
- collects material items;
- moves through `collecting -> awaiting_confirmation -> confirmed`;
- can be edited as logistics/material request;
- uses Telegram notification outbox for admin status messages.

Public lead:
- comes from website form;
- has personal contact fields;
- may not have Telegram chat_id;
- has consent state;
- starts as sales/contact intake;
- may have no material items;
- should later support review, acceptance, postponement or rejection.

Recommendation: create a separate `public_leads` table and read model. Do not force public leads into `request_drafts` unless a later product decision explicitly converts an accepted lead into a real request/project.

## 8. Recommended public lead model

Recommended separate table:

```text
public_leads
```

Minimal fields:
- `id`
- `name`
- `contact`
- `contact_method`
- `object_type`
- `area`
- `package_type`
- `comment`
- `source`
- `status`
- `created_at`
- `updated_at`
- `telegram_delivery_status`
- `telegram_message_id` nullable
- `reviewed_by` nullable
- `reviewed_at` nullable

Recommended additional fields to consider in implementation:
- `personal_data_consent` boolean, stored as proof of received consent;
- `honeypot_triggered` should not be stored for rejected spam payloads in the first implementation;
- `client_ip_hash` optional later, only if needed for abuse analysis and privacy-reviewed;
- `telegram_delivery_error` optional and sanitized, only if operationally needed.

Recommended defaults:
- `source = "public_landing"`
- `status = "new"`
- `telegram_delivery_status = "not_sent" | "sent" | "skipped" | "failed"`

Do not store the honeypot `website` value.

## 9. Recommended public lead statuses

For the first admin-facing lifecycle:
- `new`
- `in_progress`
- `accepted`
- `postponed`
- `rejected`

Notes:
- Keep these statuses separate from `request_drafts.status`.
- Do not reuse `collecting` or `awaiting_confirmation`, because those describe the Telegram bot material request dialogue.
- If a lead becomes a real material request/project later, add an explicit conversion step instead of overloading the status.

## 10. Recommended DB and migration placement

Follow current project conventions:
- define SQLAlchemy table in a storage package using shared metadata from `src/supply_bot/database/metadata.py`;
- import the new table module from `migrations/env.py` so Alembic sees metadata;
- add an Alembic revision under `migrations/versions`;
- if local SQLite bootstrap must support the table, update bootstrap path consistently with existing conventions.

Suggested package structure:

```text
src/supply_bot/domain/public_leads.py
src/supply_bot/storage_public_leads/tables.py
src/supply_bot/storage_public_leads/repository.py
src/supply_bot/admin_api/app_routes_public_leads.py      # future admin-private list route
```

For `ADMIN-LEADS-1A`, the route can still be the existing `app_routes_public.py`; the new repository should be used only after validation, honeypot and rate limit pass.

## 11. Recommended next PR: ADMIN-LEADS-1A

Goal: persist public leads after backend validation while keeping current client and Telegram behavior.

Small PR scope:
1. Add `public_leads` table/model.
2. Add Alembic migration.
3. Add repository/use-case for creating public lead.
4. In `POST /api/public/leads`, after validation/honeypot/rate limit, create a lead row.
5. Keep Telegram delivery.
6. Optionally update delivery status after notifier result.
7. Keep response exactly:

```json
{ "ok": true }
```

Important ordering recommendation:
1. Validate payload.
2. Reject honeypot.
3. Check rate limit.
4. Save public lead.
5. Try Telegram notification.
6. Update Telegram delivery status if implemented.
7. Return `{ "ok": true }` even if Telegram fails, matching current behavior.

Tests for `ADMIN-LEADS-1A`:
- valid public lead creates one DB row;
- missing/false `personalDataConsent` still returns 422 and creates no row;
- non-empty honeypot returns 422 and creates no row;
- rate-limited request creates no extra row;
- Telegram notifier failure does not change client response;
- private admin route without cookie still returns 401.

## 12. Recommended later PR: ADMIN-LEADS-1B

Goal: show website leads in web-admin without changing current material request screen.

Recommended backend:
- add authenticated admin endpoint, for example:

```text
GET /api/admin/public-leads
```

or another path that matches existing admin route conventions.

Recommended frontend:
- add a separate admin UI section named `Заявки с сайта`;
- do not overload existing `RequestsScreen` in the first pass;
- keep the current `Заявки` screen focused on Telegram bot material requests;
- add filters and status actions later.

Possible minimal list fields:
- id;
- created_at;
- name;
- contact;
- contact_method;
- object_type;
- area;
- package_type;
- status;
- telegram_delivery_status.

## 13. Privacy and operational guardrails

Keep:
- exact public bypass only for `/api/public/leads`;
- private admin endpoints protected by session;
- no tokens in frontend;
- no payload logging with personal data;
- Telegram errors hidden from client;
- no AI call in public intake until a separate AI task;
- no automatic customer contact;
- no frontend response shape change unless explicitly planned.

If operational diagnostics are needed later, log only non-personal metadata such as:
- lead id;
- status;
- delivery status;
- source;
- sanitized error category.

Do not log:
- name;
- phone/contact;
- raw comment;
- Telegram token;
- full Telegram API response containing sensitive data.

## 14. Non-goals for this audit

This audit does not:
- change backend runtime code;
- add migrations;
- change frontend;
- change Telegram delivery;
- change auth/session/cookie;
- change package files;
- change Dockerfile or Render config;
- change current request APIs;
- delete or rename existing models/use-cases.

## 15. Definition of done for this audit

Done means:
- this document exists;
- only `docs/ADMIN_LEADS_AUDIT.md` changed;
- `git diff --check` passes;
- next implementation can start from `ADMIN-LEADS-1A` with a small persistence-only PR.
