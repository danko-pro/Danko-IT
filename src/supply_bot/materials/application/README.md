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

## Transitional scope

These write scenarios still stay in `src/supply_bot/admin_api/use_cases/materials.py`:

- create material sku;
- create material alias.

They should move in a separate phase so SKU/alias validation is not mixed with family/variant migration.
