# Architecture checkpoint 1

Current stable commit: `c88ac54 Finalize requests application guardrails`.

This checkpoint documents the project state after calculator, materials, requests, and auth hardening phases. It is a documentation checkpoint only: no runtime behavior, API response shape, frontend, database schema, migrations, storage, repositories, or auth behavior changes are included.

## Closed architecture blocks

- `ARCH-CLEAN-0`: project-wide architecture map and cleanup roadmap documented.
- `ARCH-CLEAN-1A`...`ARCH-CLEAN-1G`: calculator application layer, shared application errors, HTTP mapping, and guardrails closed.
- `ARCH-CLEAN-2A`...`ARCH-CLEAN-2D`: materials read and create scenarios moved to `src/supply_bot/materials/application/`; materials guardrails closed.
- `ARCH-CLEAN-3A`...`ARCH-CLEAN-3F`: requests read/status/delivery/delete/item scenarios moved to `src/supply_bot/requests/application/`; requests guardrails closed.

## Closed auth blocks

- `AUTH-HARDEN-0`: current auth/session/security model and hardening roadmap documented.
- `AUTH-HARDEN-1`: production auth cookie/CORS guardrails and diagnostics added.
- `AUTH-HARDEN-2`: login rate limiting and failed-attempt cooldown added.

## Production status at checkpoint

- Backend health endpoint works.
- Auth diagnostics endpoint works.
- Protected endpoints return `401` without a valid session cookie.
- Frontend opens.

## Current clean architecture pattern

The backend architecture now follows this pattern for completed domains:

```text
admin_api routes
  -> application use-cases
  -> storage/repository protocols
  -> infrastructure storage/repositories
  -> payload builders / response assembly
```

Routes are HTTP adapters. They parse HTTP input, build commands, call application use-cases, map application errors through `admin_api/error_mapping.py`, and return the existing API response shape.

Application use-cases own business scenarios. They validate user-facing inputs, coordinate storage calls, use domain rules where appropriate, and raise shared application errors from `supply_bot.application.errors`.

Storage and repositories remain infrastructure. They own persistence details, SQLAlchemy integration, and database-facing behavior.

Payload builders and response assembly remain responsible for stable API responses. API response shape must stay stable unless a task explicitly changes the public contract.

## Protected application layers

The following application layers are currently protected by architecture guardrails:

- `src/supply_bot/estimates/application`
- `src/supply_bot/materials/application`
- `src/supply_bot/requests/application`

## Guardrails

Application layers must not import:

- `fastapi`
- `HTTPException`
- `Request`
- `Response`
- `sqlalchemy`
- `load_settings`
- `admin_api`

Application layers must not raise raw `ValueError` as a business/application error. `ValueError` or `TypeError` may be caught as technical conversion errors only when they are rethrown as `ValidationError` or another shared application error.

Migrated routes should call use-cases through `resolve_application_result` instead of manually mapping `ValueError` to `HTTPException`.

Compatibility wrappers may remain only for old imports and adapter wiring. They should not contain duplicated business validation rules that already live in application packages.

## Remaining transitional zones

The following areas still need project-wide cleanup:

- `projects`: project workspace, accounting, contracts, and documents still need a dedicated project application layer.
- `dashboard`: read models and summaries should be split from route-level aggregation.
- `support/settings`: mixed support/settings endpoints should be separated into thin adapters and application/read scenarios.
- `notifications`: Telegram/outbox behavior should be isolated behind application services and infrastructure adapters.
- `auth future hardening`: server-side sessions, revocation, roles, permissions, audit log, and CSRF are still future phases.
- `files/documents`: upload/download/generation scenarios still need a clearer application boundary.
- `future Telegram/MAX adapters`: external messaging adapters should call application use-cases instead of owning business scenarios.

## Recommended next phase

`ARCH-CLEAN-4A: projects read/basic use-cases`

Start with low-risk project read/basic scenarios before moving project accounting, documents, contracts, or write-heavy flows.
