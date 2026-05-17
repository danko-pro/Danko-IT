# Requests application layer

This package is the clean application layer for request scenarios.

## Layer rules

- Application layer must not import FastAPI.
- Application layer must not raise `HTTPException`.
- Application layer must not know `Request` or `Response`.
- Application layer must not import SQLAlchemy or settings loaders.
- Application layer must not import `admin_api` helpers.
- Use-cases work through passed storage/protocol objects.
- Use-cases use `supply_bot.application.errors` for user-facing/business errors.
- Read use-cases do not mutate data.
- API response shape is preserved by the route layer.

## Migrated use-cases

- List recent requests.
- Get request detail.
- Expire stale requests.
- Update request status.
- Update request delivery.
- Delete request.
- Create request item.
- Update request item.
- Delete request item.

## Transitional scope

Remaining notification-heavy scenarios still stay in
`src/supply_bot/admin_api/use_cases/requests.py`.
They should move in separate phases so each mutation path stays small and behavior-preserving.

New request scenarios must start in this package. HTTP error mapping belongs to the
`admin_api` route layer via `resolve_application_result` or compatibility wrappers
that convert `ApplicationError` through `raise_application_http_error`.
