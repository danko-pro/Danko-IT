# Materials application layer

This package is the clean application layer for the `materials` domain.

## Layer rules

- Application layer must not import FastAPI.
- Application layer must not raise `HTTPException`.
- Application layer must not know `Request` or `Response`.
- Use-cases work through passed storage/protocol objects.
- Use-cases use `supply_bot.application.errors` for user-facing/business errors.
- Read use-cases do not mutate data.
- API response shape is preserved by the route layer.

## Migrated use-cases

- List material families.
- Get material family detail.
- Search materials.
- Create material family.
- Create material variant.
- Create material SKU.
- Create material alias.

## Transitional scope

`src/supply_bot/admin_api/use_cases/materials.py` still exists as a compatibility wrapper for legacy imports.

New materials scenarios must start in this package. HTTP error mapping belongs to the `admin_api`
route layer via `resolve_application_result` or compatibility wrappers that convert
`ApplicationError` through `raise_application_http_error`.
