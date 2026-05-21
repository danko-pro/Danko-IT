# Архитектура Danko-IT / Danko BuildTech

## Статус документа

Этот документ фиксирует целевую архитектуру проекта, закрытый baseline backend-калькулятора после этапов `ARCH-1`...`ARCH-15` и план дальнейшей очистки архитектуры по всему проекту.

`ARCH-1` был документационным и подготовительным этапом. `ARCH-2`...`ARCH-15` перевели backend-калькулятор на application/use-case слой без изменения публичного API, frontend, database schema, migrations или production deployment logic.

`ARCH-CLEAN-0` является документационным этапом. Он фиксирует карту остальных доменов и roadmap дальнейшего project-wide hardening. Runtime-код, routes, frontend, API response shape, database schema, migrations и deploy/env на этом этапе не меняются.

`ARCH-CLEAN-1A`...`ARCH-CLEAN-1G` перевели calculator application layer на общую иерархию `ApplicationError` без изменения API response shape. Calculator routes должны использовать HTTP mapper из `admin_api/error_mapping.py`, а не ручной `ValueError -> HTTPException` mapping.

Auth/session/security baseline перед runtime hardening зафиксирован в `docs/AUTH_SECURITY.md`.

`AUTH-HARDEN-0`...`AUTH-HARDEN-2` закрыли документацию auth/security модели, runtime diagnostics для cookie/CORS/session и in-memory login rate limiting без изменения session token format, cookie name или успешного login response shape.

Текущий architecture checkpoint после calculator, materials, requests, auth hardening, projects core CRUD, project advances и project ledger entries зафиксирован в `docs/ARCH_CHECKPOINT_4.md`. Stable commit: `7f187f5 Extract project ledger delete application use case`.

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

Текущий runtime use-case слой для `estimates/calculator`.

Здесь уже живут сценарии backend-калькулятора:

- создать, прочитать и обновить проект расчета;
- создать, прочитать, обновить и удалить помещение;
- обновить теплый пол;
- создать справочники и обновить напольные покрытия;
- создать справочники и обновить отделку стен;
- создать и обновить двери и дверные компоненты;
- обновить потолки.

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

- application слой не должен импортировать `fastapi`, `HTTPException`, `Request`, `Response`;
- application слой не должен импортировать SQLAlchemy, database engine или database session;
- application слой не должен принимать FastAPI `Request` / `Response` как часть бизнес-сценария;
- application слой не должен напрямую читать env;
- application слой не должен напрямую вызывать `load_settings()`;
- application слой не должен напрямую создавать SQLAlchemy engine/session;
- application слой не должен импортировать admin_api route helpers;
- frontend не должен быть источником истины для расчетов;
- payload builders не должны превращаться в место хранения формул и бизнес-правил.

## Как должен выглядеть route

Целевое направление для новых и постепенно рефакторящихся сценариев:

```text
route
  -> command / use case
  -> domain functions
  -> repository/storage dependency
  -> payload builder / response
```

Route должен оставаться тонким:

- принять HTTP payload;
- получить текущего пользователя/session context;
- собрать command;
- вызвать use-case;
- преобразовать application error в HTTP response;
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

Route-файлы в `src/supply_bot/admin_api/calculator_routes/` теперь являются HTTP adapter layer:

- получить storage из request context;
- собрать command из HTTP payload;
- вызвать application use-case;
- преобразовать `ApplicationError` в HTTP response через `resolve_application_result` / `application_error_to_http_exception`;
- вызвать payload builder или helper загрузки ответа.

Application слой в `src/supply_bot/estimates/application/` не должен импортировать FastAPI, SQLAlchemy, `Request`, `Response`, route helpers или runtime settings. Use-case должен зависеть от переданного storage/repository через `Protocol` или совместимый интерфейс.

Для пользовательских и business ошибок calculator use-case должен выбрасывать shared application errors из `supply_bot.application.errors`: `ValidationError`, `NotFoundError`, `ConflictError`, `OperationFailedError` или `ExternalServiceError`. Raw `ValueError` не должен использоваться как application/business error; его допустимо только ловить как техническую ошибку конвертации и перекидывать в `ValidationError`.

Payload builders пока остаются в `src/supply_bot/admin_api/calculator_payloads/` как response assembly layer. В рамках текущего baseline они не переносятся в application/domain, чтобы не менять API response shape.

Новые calculator-сценарии должны начинаться с application use-case. Логика сценария не должна расти внутри route-функции.

## Карта доменов проекта

Основные домены и текущие архитектурные ожидания:

- `estimates/calculator`: калькулятор смет. Baseline закрыт: routes вызывают `src/supply_bot/estimates/application/`, расчетные функции остаются в `src/supply_bot/estimates/domain/`, persistence остается в `storage_estimates`.
- `projects`: project workspace, договоры, документы, учет, авансы, ledger. `ARCH-CLEAN-4A`...`ARCH-CLEAN-4D` закрыли базовый CRUD application layer, `ARCH-CLEAN-4F`...`ARCH-CLEAN-4G` закрыли project advances read/create/delete, а `ARCH-CLEAN-4I`...`ARCH-CLEAN-4K` закрыли project ledger entries read/create/update/delete. Core CRUD, advances и ledger entry use-cases живут в `src/supply_bot/projects/application/`; ledger documents/contracts/files/AI extraction остаются transitional.
- `requests`: заявки из Telegram/API, черновики, runtime request state. `ARCH-CLEAN-3` закрыт: migrated request scenarios живут в `src/supply_bot/requests/application/`; `admin_api/use_cases/requests.py` остается compatibility wrapper для старых импортов и adapter wiring.
- `materials`: каталог материалов и связанные admin API сценарии. `ARCH-CLEAN-2` закрыт: read-сценарии и create family/variant/sku/alias живут в `src/supply_bot/materials/application/`; `admin_api/use_cases/materials.py` остается только compatibility wrapper для старых импортов.
- `dashboard`: агрегированные summary/read models для админки. Должен остаться read/application сценариями поверх storage, без бизнес-логики в route. Dashboard finance engine для объектов живет в `src/supply_bot/projects/domain/finance.py`; UI не должен быть источником финансовых расчетов. План финансового движка закреплен в `docs/DASHBOARD_FINANCE_ENGINE_PLAN.md`; общая вкладка dashboard **Все объекты** закреплена в `docs/DASHBOARD_ROOT_OVERVIEW_PLAN.md`.
- `notifications`: outbox и уведомления. Должны быть вынесены в application/service layer с infrastructure adapters для Telegram/future MAX/email.
- `settings/support`: health/support/settings endpoints и вспомогательные операции. Сейчас часть mixed endpoints остается в `app_routes_support.py`; целевая зона для раздельных support/settings adapters.
- `auth`: admin users, password/session/cookie. Должен оставаться отдельной границей с application-сценариями для login/register/session lifecycle и infrastructure для token/cookie/hash.
- `files/documents`: uploads, downloads, generated project documents. Должны отделять HTTP multipart/download adapter от application сценариев хранения/проверки/генерации.
- `future Telegram/MAX adapters`: внешние messaging adapters. Они должны вызывать application use-cases, а не содержать бизнес-сценарии напрямую.

Целевая схема для каждого домена:

```text
admin_api / Telegram / external adapter
  -> application use-cases
  -> domain logic
  -> repository protocols
  -> infrastructure repositories
  -> database / external APIs
```

## Transitional zones

Текущие зоны, которые еще не доведены до целевого состояния:

- `src/supply_bot/admin_api/use_cases/materials.py`: compatibility wrapper для materials сценариев. Business validation перенесена в `src/supply_bot/materials/application/`; wrappers нужны только для старых импортов и HTTP mapping.
- `src/supply_bot/admin_api/use_cases/requests.py`: compatibility wrapper для request сценариев. Business validation перенесена в `src/supply_bot/requests/application/`; wrappers нужны для старых импортов и adapter wiring.
- `src/supply_bot/admin_api/app_routes_support.py`: mixed support endpoints. Нужен split на support/settings/dashboard adapters и application сценарии.
- `src/supply_bot/admin_api/project_routes/core.py`: thin HTTP adapter для базового projects CRUD; он вызывает `ListProjectsUseCase`, `GetProjectDetailUseCase`, `CreateProjectUseCase`, `UpdateProjectUseCase` и `DeleteProjectUseCase`.
- `src/supply_bot/admin_api/project_routes/advances.py`: thin HTTP adapter для project advances; он вызывает `ListProjectAdvancesUseCase`, `CreateProjectAdvanceUseCase` и `DeleteProjectAdvanceUseCase`.
- `src/supply_bot/admin_api/project_routes/ledger_entries.py`: thin HTTP adapter для project ledger entries; он вызывает `ListProjectLedgerEntriesUseCase`, `CreateProjectLedgerEntryUseCase`, `UpdateProjectLedgerEntryUseCase` и `DeleteProjectLedgerEntryUseCase`.
- Project route modules для ledger documents, contracts, files/documents и AI extraction остаются transitional.

Эти зоны не считаются нарушением текущего calculator baseline. Они являются следующими целями `ARCH-CLEAN`.

## Project-wide cleanup roadmap

Следующие безопасные этапы:

- `ARCH-CLEAN-1`: application errors + HTTP error mapper. Calculator часть закрыта этапами `ARCH-CLEAN-1A`...`ARCH-CLEAN-1G`; остальные домены нужно переводить по тому же pattern без импорта FastAPI в application слой.
- `ARCH-CLEAN-2`: materials application layer. Закрыт этапами `ARCH-CLEAN-2A`...`ARCH-CLEAN-2D`: read use-cases и create family/variant/sku/alias находятся в `src/supply_bot/materials/application/`.
- `ARCH-CLEAN-3`: requests application layer. Закрыт этапами `ARCH-CLEAN-3A`...`ARCH-CLEAN-3F`: read/status/delivery/delete/item scenarios находятся в `src/supply_bot/requests/application/`.
- `ARCH-CLEAN-4`: projects application layer. `ARCH-CLEAN-4A`...`ARCH-CLEAN-4K` закрыли projects core CRUD, project advances и project ledger entries: core list/detail/create/update/delete, advances read/create/delete и ledger entries read/create/update/delete use-cases находятся в `src/supply_bot/projects/application/`. Следующие projects phases должны переносить ledger documents, contracts и files/documents малыми отдельными фазами.
- `ARCH-CLEAN-5`: support/settings/dashboard split. Разделить mixed support/settings/dashboard endpoints на тонкие adapters и application/read сценарии.
- `ARCH-CLEAN-6`: global boundary tests for all application layers. Расширить boundary-test подход с estimates application на остальные application packages.
- `DASH-DASHBOARD-ROOT`: dashboard должен иметь fixed global tab **Все объекты**. Global tab агрегирует `finance_summary` по всем объектам, не дублирует финансовые формулы и использует `src/supply_bot/projects/domain/finance.py` как source of truth. Следующий этап - `DASH-DASHBOARD-ROOT-1`: создать backend application read-model для общей сводки.
- `DASH-OBJECT-CARD`: карточка объекта отображает `finance_summary`; вкладка **Финансы** хранит настройки финансовой модели; **Таблица учета** является источником расходов и обязательств; общая вкладка **Все объекты** агрегирует показатели всех объектов. UI не должен быть источником финансовых расчетов. Следующий этап - `DASH-OBJECT-CARD-1`: подключить `finance_summary` к UI карточки объекта.

Рекомендуемый следующий этап после `ARCH_CHECKPOINT_4`: `ARCH-CLEAN-4M` - project ledger documents application use-cases.

## Практическое правило для будущих фаз

Если новый код содержит расчетную формулу, он сначала должен рассматриваться как кандидат в `estimates/domain/`.

Если новый код описывает пользовательский сценарий, он должен рассматриваться как кандидат в application layer соответствующего домена.

Если новый код знает про SQLAlchemy, таблицы, engine или session, он должен оставаться в infrastructure/storage слое.

Если новый код знает про HTTP, cookie, request, response или route registration, он должен оставаться в adapter слое, например `admin_api/` или Telegram/MAX adapter.
