# Auth/session/security model

Этот документ фиксирует текущую модель авторизации, сессий, cookie, CORS и known gaps перед runtime-усилением auth слоя.

Статус: `AUTH-HARDEN-0`, документационный baseline. Runtime-код, API response shape, frontend, database schema, migrations, deploy/env и storage/repositories на этом этапе не меняются.

## Current auth overview

Текущий admin frontend вызывает backend auth endpoints в FastAPI admin API.

Базовая схема:

1. Frontend вызывает `POST /api/auth/login` или `POST /api/auth/register`.
2. Backend проверяет пароль или создает пользователя.
3. Backend создает signed session token через `create_admin_session_token`.
4. Token кладется в `httpOnly` cookie `supply_admin_session`.
5. Protected `/api/*` endpoints читают cookie в middleware.
6. Middleware проверяет подпись, срок действия и payload session token.
7. Без валидной session cookie protected endpoints возвращают `401` с `{"detail":"Admin authentication required"}`.

Ключевые файлы:

- `src/supply_bot/admin_api/auth.py`: session token, cookie helpers, password hashing.
- `src/supply_bot/admin_api/app_routes_auth.py`: auth endpoints.
- `src/supply_bot/admin_api/app_factory.py`: auth middleware, public paths, CORS.
- `src/supply_bot/admin_api/deps.py`: session helpers для routes.
- `src/supply_bot/config.py`: auth/cookie/env settings.
- `src/supply_bot/storage_auth/`: app users table and repository.

## Auth endpoints

### `GET /api/auth/session`

Публичный endpoint.

Код: `src/supply_bot/admin_api/app_routes_auth.py`.

Что делает:

- читает optional session из cookie;
- возвращает `auth_enabled`, `authenticated`, `mode`, user payload и `expires_at`;
- если auth выключен локально, возвращает local bypass session.

Основные response cases:

- auth disabled: `authenticated=true`, `mode=local-bypass`;
- valid cookie: `authenticated=true`, user/session data;
- missing or invalid cookie: `authenticated=false`, `user=null`.

### `POST /api/auth/login`

Публичный endpoint.

Код: `src/supply_bot/admin_api/app_routes_auth.py`.

Что делает:

- если auth выключен, возвращает local bypass session;
- если payload содержит email, ищет active app user в `storage_auth`;
- проверяет password через `verify_admin_password`;
- если email не передан, использует legacy/platform admin password через `ADMIN_PASSWORD_HASH`;
- при успехе создает signed session token и ставит `supply_admin_session` cookie.

Основные response cases:

- success: session payload + `Set-Cookie`;
- invalid credentials: `401`;
- auth disabled: local bypass session.

### `POST /api/auth/register`

Публичный endpoint.

Код: `src/supply_bot/admin_api/app_routes_auth.py`.

Что делает:

- требует enabled auth, то есть `ADMIN_SESSION_SECRET`;
- валидирует email и password length;
- создает app user в `storage_auth`;
- password сохраняется как hash через `hash_admin_password`;
- при успехе сразу создает session token и ставит `supply_admin_session` cookie.

Основные response cases:

- success: session payload + `Set-Cookie`;
- auth not enabled: `400`;
- invalid email/password: `400`;
- duplicate email: `409`.

### `POST /api/auth/logout`

Публичный endpoint.

Код: `src/supply_bot/admin_api/app_routes_auth.py`.

Что делает:

- удаляет `supply_admin_session` cookie через `clear_admin_session_cookie`;
- возвращает session payload с `authenticated=false`, если auth enabled.

Основные response cases:

- success: cookie clear + session payload;
- auth disabled: local bypass session remains.

## Protected API model

Auth middleware находится в `configure_admin_auth` в `src/supply_bot/admin_api/app_factory.py`.

Публичные пути:

- `/api/health`
- `/api/auth/session`
- `/api/auth/login`
- `/api/auth/register`
- `/api/auth/logout`

Правила:

- `OPTIONS` requests bypass auth, чтобы CORS preflight не требовал session cookie.
- Пути вне `/api/` не требуют admin session.
- Public auth/health paths не требуют admin session.
- Остальные `/api/*` требуют валидную admin session, если `admin_auth_enabled=true`.
- `admin_auth_enabled` включается, когда задан реальный `ADMIN_SESSION_SECRET`.
- Если auth выключен локально, `get_optional_admin_session` возвращает local bypass admin session.
- `/api/health` остается публичным, чтобы Render/monitoring могли проверять backend без cookie.

При отсутствии или невалидности cookie middleware возвращает:

```json
{"detail":"Admin authentication required"}
```

со status code `401`.

## Cookie/session model

Cookie:

- name: `supply_admin_session`
- `httpOnly`: true
- `secure`: зависит от `ADMIN_SESSION_COOKIE_SECURE`
- `samesite`: зависит от `ADMIN_SESSION_COOKIE_SAMESITE`
- `path`: `/`
- `max_age`: `ADMIN_SESSION_TTL_SECONDS`

Session token:

- создается в `create_admin_session_token`;
- подписан HMAC-SHA256 через `ADMIN_SESSION_SECRET`;
- payload сериализуется в compact JSON и кодируется base64url;
- signature хранится рядом с payload в формате `payload.signature`;
- token stateless: сервер не хранит отдельную session registry.

Payload содержит:

- `sub`: subject;
- `role`: роль;
- `exp`: Unix timestamp истечения;
- `uid`: user id;
- `email`: email;
- `name`: display name.

При чтении token backend проверяет:

- наличие token и secret;
- формат `payload.signature`;
- HMAC signature;
- JSON payload;
- типы основных полей;
- `exp > now`.

## Password model

Password hashing находится в `src/supply_bot/admin_api/auth.py`.

Текущая модель:

- algorithm: `pbkdf2_sha256`;
- default iterations: `390000`;
- salt: random `secrets.token_hex(16)`, если явно не передан;
- stored format: `pbkdf2_sha256$iterations$salt$digest`;
- verification uses `hmac.compare_digest`.

Где используется:

- `hash_admin_password` используется при registration app users.
- `verify_admin_password` используется при login app users и legacy/platform admin password.
- App users хранятся в `app_users` через `src/supply_bot/storage_auth/`.
- Legacy/platform admin login включается только если заданы реальные `ADMIN_PASSWORD_HASH` и `ADMIN_SESSION_SECRET`.

## Required / important env variables

### `ADMIN_SESSION_SECRET`

Главный secret для подписи session token.

Если не задан:

- `admin_auth_enabled=false`;
- protected auth middleware фактически не требует cookie;
- локально используется `local-bypass`.

Production должен задавать реальный random secret через hosting secret/env UI.

### `ADMIN_PASSWORD_HASH`

Optional legacy/platform-admin password hash.

Если задан вместе с `ADMIN_SESSION_SECRET`, login без email может использовать этот hash.

Если не нужен legacy admin password, оставить пустым.

### `ADMIN_SESSION_TTL_SECONDS`

TTL session cookie/token.

Default: `43200` seconds.

### `ADMIN_SESSION_COOKIE_SECURE`

Управляет `Secure` flag cookie.

Production HTTPS должен использовать:

```text
ADMIN_SESSION_COOKIE_SECURE=true
```

### `ADMIN_SESSION_COOKIE_SAMESITE`

Допустимые значения:

- `lax`
- `strict`
- `none`

Default: `lax`.

Guardrail:

- `SameSite=None` требует `Secure=True`;
- это проверяется в `config.py` и cookie helpers.

### `ADMIN_API_CORS_ORIGINS`

Comma-separated origins для admin frontend.

Backend CORS:

- `allow_credentials=True`;
- origins берутся из `ADMIN_API_CORS_ORIGINS`;
- если env не задан, используются local dev origins.

## Production cross-origin setup

Текущая Render схема:

```text
frontend: https://name-danko-site.onrender.com
backend:  https://danko-it.onrender.com
```

Так как frontend и backend находятся на разных origins, cookie должна быть cross-site:

```text
ADMIN_SESSION_COOKIE_SECURE=true
ADMIN_SESSION_COOKIE_SAMESITE=none
ADMIN_API_CORS_ORIGINS=https://name-danko-site.onrender.com
```

Если используются production custom domains, CORS должен учитывать frontend origins:

```text
https://danko39.ru
https://www.danko39.ru
```

Backend custom domain:

```text
https://api.danko39.ru
```

`api.danko39.ru` является API base URL для frontend, но CORS origins должны перечислять именно browser origin frontend, а не сам API URL.

## Current strengths

- `httpOnly` session cookie снижает риск чтения token из JavaScript.
- Session token подписан через `ADMIN_SESSION_SECRET`.
- Session имеет expiry (`exp` + cookie max-age).
- Password hash использует salted `pbkdf2_sha256`.
- Middleware защищает `/api/*` endpoints по allowlist public paths.
- Public paths явно перечислены.
- CORS настроен с `allow_credentials=True`.
- `SameSite=None` требует `Secure=True` guard уже есть.
- App users имеют `is_active`, `role`, `last_login_at`.

## Current risks / gaps

- Нет login rate limiting.
- Нет failed login lockout/cooldown.
- Нет server-side session registry.
- Нет точечной session revocation, кроме clear cookie или rotation `ADMIN_SESSION_SECRET`.
- Нет списка активных сессий.
- Нет audit log для auth actions.
- Нет audit log для critical business actions.
- Нет permission matrix beyond `role` field.
- Нет CSRF protection для cookie-authenticated unsafe methods.
- CORS/cookie configuration fragile при разных frontend/backend domains.
- Diagnostics для cookie/session issues в основном manual.
- Нет отдельного production auth safety checklist в runtime flow.

## Proposed hardening roadmap

### AUTH-HARDEN-1

Production env/cookie/CORS guardrails and diagnostics.

Цель:

- явно диагностировать неправильные `ADMIN_SESSION_COOKIE_SECURE`, `ADMIN_SESSION_COOKIE_SAMESITE`, `ADMIN_API_CORS_ORIGINS`;
- добавить безопасные startup warnings/errors для production;
- улучшить troubleshooting visibility без раскрытия secrets.

### AUTH-HARDEN-2

Login rate limit and failed-attempt cooldown.

Цель:

- ограничить brute force по email/IP;
- добавить cooldown после серии failed attempts;
- не менять успешный login response shape без необходимости.

### AUTH-HARDEN-3

Server-side sessions and session revocation.

Цель:

- хранить session id server-side;
- поддержать logout/revoke;
- добавить rotation/expiry management.

### AUTH-HARDEN-4

Roles and permission matrix.

Цель:

- формализовать роли;
- описать доступы к calculator, projects, requests, materials, accounting, settings;
- не полагаться только на свободный текст `role`.

### AUTH-HARDEN-5

Audit log for auth and critical business actions.

Цель:

- фиксировать login/register/logout/failures;
- фиксировать критичные изменения в проектах, расчетах, документах и настройках.

### AUTH-HARDEN-6

CSRF protection for cookie-authenticated unsafe methods.

Цель:

- защитить POST/PATCH/PUT/DELETE при cookie-auth;
- подобрать схему, совместимую с frontend/backend cross-origin deployment.

## Troubleshooting

### Symptoms

- `/api/health` returns `200`.
- Protected endpoints return `401`.
- Browser console shows CORS error.

### Meaning

- Backend is alive.
- Session cookie is likely missing, expired, invalid, blocked by browser, or issued for another domain.
- CORS error can be secondary after failed credentialed request or wrong origin/cookie setup.

### Steps

1. Open `GET /api/auth/session` from frontend context.
2. Check response: `authenticated`, `user`, `expires_at`.
3. In browser DevTools, open Application -> Cookies.
4. Check backend domain cookies.
5. Verify `supply_admin_session` exists.
6. Check `POST /api/auth/login` Network response headers for `Set-Cookie`.
7. Verify cookie attributes: `HttpOnly`, `Secure`, `SameSite=None` for cross-origin production.
8. Verify backend env `ADMIN_API_CORS_ORIGINS` contains the exact frontend origin.
9. Clear site data if the browser kept an old cookie.
10. Login again.
11. Recheck protected endpoint; expected authenticated result is `200`.
