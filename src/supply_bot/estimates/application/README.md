# Estimates application layer

Этот пакет является текущим runtime application layer для `estimates/calculator`.

После `ARCH-2`...`ARCH-15` calculator routes используют use-case классы из этого пакета. Новые calculator сценарии должны начинаться здесь, а не с бизнес-логики внутри FastAPI route.

## Правила слоя

- Use-case управляет пользовательским сценарием.
- Use-case может вызывать чистые функции из `src/supply_bot/estimates/domain/`.
- Use-case может работать с repository/storage только через переданный объект.
- Use-case не должен знать про FastAPI `Request` / `Response`.
- Use-case не должен импортировать FastAPI, `HTTPException`, SQLAlchemy или admin_api route helpers.
- Use-case не должен сам читать env.
- Use-case не должен напрямую вызывать `load_settings()`.
- Use-case не должен напрямую создавать SQLAlchemy engine/session.
- Для пользовательских и business ошибок use-case должен использовать `supply_bot.application.errors`, а не raw `ValueError`.
- `ValueError` / `TypeError` можно ловить только как технические ошибки конвертации и сразу перекидывать в `ValidationError`.
- Route должен принять HTTP payload, вызвать use-case и вернуть response.
- Route должен преобразовывать application errors через `supply_bot.admin_api.error_mapping.resolve_application_result`.

Слой защищен boundary-test:

```text
tests/test_estimates_application_architecture_boundaries.py
tests/test_calculator_routes_error_mapping_boundaries.py
```

## Уже вынесенные calculator сценарии

- Создать проект расчета.
- Получить список проектов.
- Получить проект.
- Обновить проект.
- Создать помещение.
- Получить помещение.
- Обновить помещение.
- Удалить помещение.
- Обновить теплый пол.
- Создать справочники напольных покрытий.
- Обновить напольные покрытия.
- Создать справочники отделки стен.
- Обновить отделку стен.
- Создать и обновить doors catalog.
- Создать, обновить и удалить project doors.
- Создать, обновить и удалить door components.
- Обновить ceiling config.
- Создать и обновить ceiling catalog items.
- Заменить ceiling rooms.
- Создать, обновить и удалить project ceiling items.

## Текущий route pattern

Calculator routes должны оставаться в такой структуре:

```text
route
  -> Command dataclass
  -> UseCase(storage).execute(command)
  -> payload builder / response
```

В этом pattern:

- route отвечает только за HTTP-адаптацию;
- command переносит HTTP payload в application слой;
- use-case управляет сценарием и работает через переданный storage/protocol;
- use-case выбрасывает `ValidationError`, `NotFoundError`, `ConflictError`, `OperationFailedError` или `ExternalServiceError` для пользовательских/business ошибок;
- payload builder собирает API response.

Payload builders пока остаются в `src/supply_bot/admin_api/calculator_payloads/`, чтобы не менять response shape.
