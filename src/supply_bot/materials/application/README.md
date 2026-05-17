# Materials application layer

Этот пакет является чистым application layer для домена `materials`.

## Правила слоя

- Application layer не импортирует FastAPI.
- Application layer не выбрасывает `HTTPException`.
- Application layer не знает про `Request` или `Response`.
- Use-case работает через переданный storage/protocol.
- Use-case использует `supply_bot.application.errors` для пользовательских/business ошибок.
- Read use-cases не изменяют данные.
- API response shape сохраняется route layer.

## Уже перенесено

- List material families.
- Get material family detail.
- Search materials.

## Transitional scope

Create/update сценарии пока остаются в `src/supply_bot/admin_api/use_cases/materials.py`:

- create material family;
- create material variant;
- create material sku;
- create material alias.

Их перенос будет отдельной фазой, чтобы не смешивать read-only cleanup с write-сценариями.
