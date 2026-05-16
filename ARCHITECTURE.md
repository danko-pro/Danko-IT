# Архитектура Danko-IT / Danko BuildTech

## Статус документа

Этот документ фиксирует целевую архитектуру проекта и текущий baseline backend-калькулятора после этапов `ARCH-1`...`ARCH-15`.

`ARCH-1` является только документационным и подготовительным этапом:

- runtime-код не переносится;
- API-контракты не меняются;
- схема базы данных не меняется;
- frontend UI не меняется;
- production deployment logic не меняется.

Цель этапа - зафиксировать направление развития проекта и подготовить пустой application-layer skeleton для будущих use-case сценариев.

## Целевая схема слоев

```text
UI / API / Telegram adapters
        ↓
application / use cases
        ↓
domain logic
        ↓
repository ports
        ↓
infrastructure repositories / database / external APIs
```

Смысл схемы: внешние адаптеры принимают ввод пользователя или внешнего сервиса, use-case слой управляет сценарием, domain слой выполняет чистые правила и расчеты, infrastructure слой сохраняет данные и общается с внешними системами.

## Ответственность основных частей проекта

### `admin-ui/`

React/Vite frontend.

Отвечает за:

- интерфейс пользователя;
- screens, shell, features;
- клиентские формы и локальное состояние UI;
- вызовы backend API;
- shared helpers для frontend.

Не должен быть источником истины для бизнес-формул. Расчетные формулы могут использоваться только как preview, если итоговая проверка и сохранение происходят на backend.

### `src/supply_bot/admin_api/`

FastAPI HTTP adapter.

Отвечает за:

- маршруты;
- request/response DTO;
- auth/session orchestration;
- middleware;
- регистрацию routes;
- преобразование HTTP payload в вызов application/use-case слоя.

Не должен содержать тяжелую бизнес-логику, расчетные формулы и инфраструктурные детали, которые можно вынести ниже.

### `src/supply_bot/estimates/domain/`

Чистая бизнес-логика калькулятора и смет.

Отвечает за:

- расчеты;
- формулы;
- геометрию помещений;
- нормы;
- коэффициенты;
- правила формирования totals и specification;
- чистые функции без runtime side effects.

Domain слой не должен импортировать FastAPI, SQLAlchemy, React, Telegram, Render env или HTTP request/response объекты.

### `src/supply_bot/estimates/application/`

Use-case слой для калькулятора и смет.

Здесь постепенно должны появляться сценарии:

- создать проект расчета;
- обновить помещение;
- рассчитать теплый пол;
- рассчитать напольные покрытия;
- рассчитать отделку стен;
- рассчитать потолки;
- собрать результат расчета;
- подготовить структурированный payload для ответа API.

Use-case слой управляет пользовательским сценарием, вызывает domain functions и работает с repository/storage через переданные зависимости.

### `src/supply_bot/storage_*`

Infrastructure/persistence adapters.

Отвечают за:

- SQLAlchemy repositories;
- runtime repositories;
- чтение и запись данных;
- owner-scoped доступ;
- persistence-specific constraints;
- адаптацию БД к интерфейсу, который нужен use-case слою.

Этот слой может знать про SQLAlchemy и структуру таблиц. Domain слой этого знать не должен.

### `src/supply_bot/services/`

Внешние сервисы и интеграции.

Здесь должны жить или постепенно появляться:

- AI-интеграции;
- генерация документов;
- уведомления;
- Telegram integration;
- future MAX integration;
- email;
- PDF/DOCX generation;
- другие внешние API.

### `src/supply_bot/config.py` и `src/supply_bot/database/`

Infrastructure/runtime config.

Отвечают за:

- чтение env;
- настройки runtime;
- database engine/session lifecycle;
- metadata;
- Alembic-facing database integration.

Эти модули не должны становиться местом для бизнес-правил.

## Правила зависимостей

Разрешенное направление зависимостей:

```text
admin_api / Telegram handlers / frontend adapter
        -> application
        -> domain
        -> repository ports
        -> infrastructure implementation
```

Запрещенное направление зависимостей:

```text
domain -> FastAPI
domain -> SQLAlchemy
domain -> Telegram
domain -> React
domain -> Render env
domain -> HTTP request/response
```

Также запрещено:

- application слой не должен принимать FastAPI `Request` / `Response` как часть бизнес-сценария;
- application слой не должен напрямую читать env;
- application слой не должен напрямую создавать SQLAlchemy engine/session;
- frontend не должен быть источником истины для расчетов;
- payload builders не должны превращаться в место хранения формул и бизнес-правил.

## Как должен выглядеть будущий route

Целевое направление для новых и постепенно рефакторящихся сценариев:

```text
route
  -> use case
  -> domain functions
  -> repository/storage dependency
  -> payload builder / response
```

Route должен оставаться тонким:

- принять HTTP payload;
- получить текущего пользователя/session context;
- вызвать use-case;
- вернуть response.

## Calculator architecture baseline

После `ARCH-1`...`ARCH-15` backend-калькулятор приведен к схеме:

```text
FastAPI routes
  -> application use-cases
  -> storage/repository protocols
  -> payload builders / response assembly
```

Покрытые calculator-модули:

- core;
- warm_floor;
- flooring;
- wall_finish;
- doors;
- ceilings.

Route-файлы в `src/supply_bot/admin_api/calculator_routes/` теперь должны рассматриваться как HTTP adapter layer:

- получить storage из request context;
- собрать command из HTTP payload;
- вызвать application use-case;
- преобразовать `ValueError` в `HTTPException`;
- вызвать payload builder или helper загрузки ответа.

Application слой в `src/supply_bot/estimates/application/` не должен импортировать FastAPI, SQLAlchemy, `Request`, `Response`, route helpers или runtime settings. Use-case должен зависеть от переданного storage/repository через `Protocol` или совместимый интерфейс.

Payload builders пока остаются в `src/supply_bot/admin_api/calculator_payloads/` как response assembly layer. В рамках текущего baseline они не переносятся в application/domain, чтобы не менять API response shape.

Новые calculator-сценарии должны начинаться с application use-case. Логика сценария не должна расти внутри route-функции.

## Граница `ARCH-1`

В рамках `ARCH-1` разрешено только:

- заменить этот архитектурный документ;
- создать пакет `src/supply_bot/estimates/application/`;
- добавить README с правилами use-case слоя.

В рамках `ARCH-1` запрещено:

- переносить существующие routes;
- менять calculator routes;
- менять payload builders;
- менять repositories;
- менять database schema;
- добавлять migrations;
- менять frontend UI;
- менять Render env/secrets;
- менять auth/session/cookie;
- менять production deployment logic.

## Практическое правило для будущих фаз

Если новый код содержит расчетную формулу, он сначала должен рассматриваться как кандидат в `estimates/domain/`.

Если новый код описывает пользовательский сценарий, он должен рассматриваться как кандидат в `estimates/application/`.

Если новый код знает про SQLAlchemy, таблицы, engine или session, он должен оставаться в infrastructure/storage слое.

Если новый код знает про HTTP, cookie, request, response или route registration, он должен оставаться в `admin_api/`.
