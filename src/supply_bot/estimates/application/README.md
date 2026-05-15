# Estimates application layer

Этот пакет предназначен для будущего use-case слоя калькулятора и смет.

`ARCH-1` только создает skeleton. Реальные use-case классы и функции пока не подключаются к runtime.

## Правила слоя

- Use-case управляет пользовательским сценарием.
- Use-case может вызывать чистые функции из `src/supply_bot/estimates/domain/`.
- Use-case может работать с repository/storage только через переданный объект.
- Use-case не должен знать про FastAPI `Request` / `Response`.
- Use-case не должен сам читать env.
- Use-case не должен напрямую вызывать `load_settings()`.
- Use-case не должен напрямую создавать SQLAlchemy engine/session.
- Route должен принять HTTP payload, вызвать use-case и вернуть response.

## Будущие кандидаты на use-case сценарии

- Создать проект расчета.
- Обновить помещение.
- Рассчитать теплый пол.
- Рассчитать напольные покрытия.
- Рассчитать отделку стен.
- Рассчитать потолки.
- Собрать общий результат расчета.

## Минимальный пример будущего направления

`POST /api/calculator/projects` должен постепенно прийти к такой структуре:

```text
route
  -> CreateEstimateProjectUseCase
  -> repository
  -> payload builder / response
```

В этом примере:

- route отвечает только за HTTP-адаптацию;
- `CreateEstimateProjectUseCase` управляет сценарием;
- repository сохраняет данные;
- payload builder собирает API response.

`ARCH-1` не переносит текущий код на эту схему. Он только фиксирует правило для следующих безопасных фаз.
