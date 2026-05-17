# Projects application layer

This package is the clean application layer for project scenarios.

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

- List projects.
- Get project detail.
- Create project.
- Update project.
- Delete project.
- List project advances.
- Create project advance.
- Delete project advance.
- List project ledger entries.
- Create project ledger entry.

## Transitional scope

Ledger update/delete, ledger documents, contracts, files, documents, and AI extraction remain in the existing
project route/use-case modules for later phases.

New project scenarios should start in this package. HTTP error mapping belongs to the
`admin_api` route layer via `resolve_application_result` or compatibility wrappers
that convert `ApplicationError` through `raise_application_http_error`.
