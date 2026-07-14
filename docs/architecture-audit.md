# Read-only архитектурный аудит Danko-IT

Дата аудита: 2026-07-14

Аудит выполнен по запросу: прочитать ключевые документы и исследовать `src/supply_bot/admin_api/`, `src/supply_bot/services/`, `admin-ui/src/`, `tests/`, `docs/`.

Во время аудита исходные файлы не менялись. Git-команды не использовались на этапе read-only аудита. Проверки `ruff` и `unittest` запускались только для понимания состояния окружения.

## Исследовано

Документы и манифесты:

- `AGENTS.md`
- `ARCHITECTURE.md`
- `PROJECT_RULES.md`
- `README.md`
- `pyproject.toml`
- `admin-ui/package.json`
- `docs/AUTH_SECURITY.md`
- `architecture_guard.json`

Директории:

- `src/supply_bot/admin_api/`
- `src/supply_bot/services/`
- `admin-ui/src/`
- `tests/`
- `docs/`

Оценочный объем проверенных зон:

- `src/supply_bot/admin_api`: 82 Python-файла, примерно 9373 строки.
- `src/supply_bot/services`: 35 Python-файлов, примерно 4043 строки.
- `admin-ui/src`: 745 файлов, примерно 110410 строк.
- `tests`: 128 Python-файлов, примерно 22012 строк.
- `docs`: 47 Markdown-файлов, примерно 11801 строк.

## 1. Архитектура frontend/backend

### Backend

Основная целевая схема зафиксирована в `ARCHITECTURE.md`:

```text
UI / API / Telegram adapters
        -> application / use cases
        -> domain logic
        -> repository ports
        -> infrastructure repositories / database / external APIs
```

FastAPI admin API находится в `src/supply_bot/admin_api/`.

Ключевые файлы:

- `src/supply_bot/admin_api/app.py` — тонкий экспорт `create_admin_app` и `main`.
- `src/supply_bot/admin_api/app_factory.py` — фактическая composition root: settings, storage, repositories, DB runtime, CORS, auth middleware, lifespan, seeding, route registration.
- `src/supply_bot/admin_api/route_registry.py` — централизованная регистрация групп маршрутов.

Application/use-case слои уже явно выделены:

- `src/supply_bot/estimates/application/`
- `src/supply_bot/projects/application/`
- `src/supply_bot/materials/application/`
- `src/supply_bot/requests/application/`

Domain:

- `src/supply_bot/estimates/domain/` — расчеты калькулятора.
- `src/supply_bot/projects/domain/` — finance/read-model логика.

Infrastructure/storage:

- `src/supply_bot/storage_*/`
- `src/supply_bot/database/`
- `src/supply_bot/config.py`

Services:

- `src/supply_bot/services/` — Telegram dialogue, LLM, media intake, notifications, profiles.
- Внешние AI-вызовы централизованы в `src/supply_bot/services/llm_client.py` через `httpx`, retry и provider abstraction.

### Frontend

Frontend — React 19 + TypeScript + Vite.

Точка входа:

- `admin-ui/src/main.tsx` -> `admin-ui/src/App.tsx`

`App.tsx` разделяет публичные маршруты и admin shell:

- `/` — `PublicLanding`
- `/privacy` — `PublicPrivacy`
- `/estimate` — `PublicEstimate`
- `/catalog-editor` — `AdminApp catalogEditor` за auth-gate
- остальное — `AdminApp`

Admin shell:

- `admin-ui/src/AdminApp.tsx`
- `admin-ui/src/shell/controller.ts`
- `admin-ui/src/shell/screen-router.tsx`
- `admin-ui/src/shell/navigation.ts`

Фичи лежат в `admin-ui/src/features/`:

- `dashboard`
- `requests`
- `materials`
- `calculator`
- `settings`
- `public`
- `catalog-editor`

Shared слой:

- `admin-ui/src/shared/network.ts` — API base, `fetchJson`, `downloadFile`, `ApiError`.
- `admin-ui/src/shared/types.ts`, `utils.ts`, ui-компоненты, formatters.

API-вызовы в основном идут через `fetchJson` из shared helpers. Прямой `fetch` сосредоточен в shared/network layer, что соответствует правилу “API calls go through existing client/helpers”.

## 2. Точки запуска

### Backend/admin API

`run_admin.py`:

- добавляет `src` в `sys.path`;
- вызывает `tools.project_guard.require_project_guard("admin-api")`;
- запускает `supply_bot.admin_api.app.main()`.

`src/supply_bot/admin_api/app_factory.py`:

- `main()` запускает `uvicorn` на `ADMIN_API_HOST` или `127.0.0.1`, `PORT`/`ADMIN_API_PORT` или `8000`.

По `README.md`:

```bash
python run_admin.py
```

API:

```text
http://127.0.0.1:8000
```

Health endpoint:

```text
/api/health
```

### Telegram bot

`run_bot.py`:

- вызывает `project_guard("bot")`;
- запускает `supply_bot.main.main()`.

По `README.md`:

```bash
python run_bot.py
```

Для Telegram группы нужен disabled privacy mode через BotFather.

### Frontend

`admin-ui/package.json`:

- `npm run dev` -> `vite`
- `npm run build` -> `tsc --noEmit && vite build`
- `npm test` -> `vitest run`
- `npm run smoke:ui` -> `playwright test`

`admin-ui/vite.config.ts`:

- dev host: `127.0.0.1:5173`
- preview host: `127.0.0.1:4173`

По `README.md`:

```bash
cd admin-ui
npm install
npm run dev
```

UI:

```text
http://127.0.0.1:5173
```

Production frontend требует `VITE_API_BASE_URL`: `admin-ui/src/shared/network.ts` бросает ошибку в `PROD`, если переменная не задана.

### Docker

`Dockerfile` — backend-only:

- base image: `python:3.13-slim`
- `PYTHONPATH=/app/src`
- `ADMIN_API_HOST=0.0.0.0`
- `pip install -r requirements.txt`
- копирует `src`, `alembic.ini`, `migrations`, `.env.example`
- стартует через `uvicorn supply_bot.admin_api.app:create_admin_app --factory --host ... --port ...`

## 3. Границы модулей

Backend границы выглядят в целом осознанно и частично защищены тестами/architecture_guard.

### `admin_api`

Роль:

- HTTP adapter
- route registration
- schemas
- auth middleware
- payload builders

По целевой архитектуре не должен содержать тяжелую бизнес-логику.

### `application`

Use cases по estimates/projects/materials/requests.

Поиск по application/domain зонам не нашел запрещенные зависимости `fastapi`, `HTTPException`, `Request`, `Response`, `sqlalchemy`, `load_settings`, `admin_api` в:

- `src/supply_bot/estimates/application/`
- `src/supply_bot/projects/application/`
- `src/supply_bot/materials/application/`
- `src/supply_bot/requests/application/`
- `src/supply_bot/estimates/domain/`
- `src/supply_bot/projects/domain/`

### `storage/database`

SQLAlchemy и DB runtime находятся в `storage_*`/`database`.

`src/supply_bot/database/runtime.py` поддерживает:

- `DATABASE_URL`
- SQLite fallback через `DATABASE_PATH`
- нормализацию `postgres://` и `postgresql://` в `postgresql+asyncpg://`

### `services`

В `architecture_guard.json` есть правило: `services` не должны импортировать `handlers`/`admin_api`.

Поиск по `src/supply_bot/services/` показал независимость от `admin_api`/`handlers`.

### Frontend

`architecture_guard.json` фиксирует:

- `shell/shared/features/editor` topology;
- `shared` не должен зависеть от `features`/`editor`;
- calculator slices не должны импортировать sibling slices напрямую;
- `requests`/`materials` требуют `screen.tsx` + `controller.ts`;
- `dashboard` требует `screen.tsx` + `api/model/scenes/state/styles`.

### Transitional zones

Текущие переходные зоны явно задокументированы в `ARCHITECTURE.md`:

- `src/supply_bot/admin_api/use_cases/materials.py` — compatibility wrapper.
- `src/supply_bot/admin_api/use_cases/requests.py` — compatibility wrapper.
- `src/supply_bot/admin_api/app_routes_support.py` — mixed support/settings/dashboard endpoints.
- Project route modules для ledger documents, contracts, files/documents и AI extraction остаются transitional.

Следующий рекомендуемый этап в `ARCHITECTURE.md`:

- `ARCH-CLEAN-4M` — project ledger documents application use-cases.

## 4. Запуск и деплой

### Локальный запуск

Backend:

```bash
pip install -r requirements.txt
python run_admin.py
```

Bot:

```bash
python run_bot.py
```

Frontend:

```bash
cd admin-ui
npm install
npm run dev
```

### Проверки

Backend baseline из `AGENTS.md`:

```bash
python -m ruff check src tests --no-cache
python -m ruff format --check src tests
python -m unittest discover -s tests -v
```

`README.md` пока указывает минимально:

```bash
python -m ruff check src tests --no-cache
python -m unittest discover -s tests -v
```

Frontend:

```bash
cd admin-ui
npm run build
npm test
```

### Деплой

Найдено:

- `Dockerfile` для backend FastAPI.
- `alembic.ini`.
- `migrations/env.py`.
- `migrations/versions/0001...0014`.

Не найдено:

- `docker-compose.yml`
- `render.yaml`
- GitHub Actions workflow
- отдельная staging deploy spec

`DATABASE_URL` поддерживает postgres/postgresql URL и нормализует в `postgresql+asyncpg`.

Если `DATABASE_URL` нет, используется SQLite через `DATABASE_PATH`.

В Dockerfile backend стартует через uvicorn factory.

Frontend production build требует `VITE_API_BASE_URL`, но отдельной deploy-конфигурации frontend в найденных файлах нет.

## 5. Проблемы слоёв и зависимостей

### Что хорошо

- Application/domain слои по проверенным токенам не импортируют FastAPI/SQLAlchemy/admin_api.
- Есть отдельные архитектурные boundary tests:
  - `tests/test_estimates_application_architecture_boundaries.py`
  - `tests/test_projects_application_architecture_boundaries.py`
  - `tests/test_materials_application_architecture_boundaries.py`
  - `tests/test_requests_application_architecture_boundaries.py`
- `architecture_guard.json` покрывает:
  - frontend shared boundary;
  - services boundary;
  - infrastructure boundary;
  - calculator slice boundaries;
  - topology rules.
- `route_registry.py` централизует регистрацию маршрутов и отделяет composition от route modules.
- `src/supply_bot/services/llm_client.py` держит внешние LLM HTTP-вызовы в одном клиенте.

### Риски и архитектурный долг

- `src/supply_bot/admin_api/app_factory.py` очень насыщен: composition root, auth middleware, tenant runtime cache, DB initialization, seeding, legacy owner claim, public paths, CORS. Как composition root это допустимо, но файл является концентрацией runtime инфраструктуры.
- `src/supply_bot/admin_api/app_routes_support.py` смешивает health, dashboard summary, groups, notifications, settings delivery. Это прямо совпадает с transitional zone из `ARCHITECTURE.md` и кандидат на `ARCH-CLEAN-5 split`.
- `src/supply_bot/admin_api/project_routes/ledger_documents.py` содержит HTTP transport плюс orchestration/service calls, file upload/download, validation mapping. Это также совпадает с documented transitional projects area.
- Project contract routes уже частично разрезаны на `contract_records`/`contract_files`/`contract_ai`, но contract AI/files остаются adapter-heavy зонами.
- Во frontend calculator/public estimate много TS-файлов с `calc`/`engine`/`snapshot` логикой. Это может быть нормально как preview/UX слой, но по правилам проекта frontend не должен становиться source of truth для расчетных формул. Нужна постоянная сверка с backend/domain, особенно для public estimate и calculator slices.
- `app_routes_support.py` вызывает `TelegramNotificationOutboxService` из route. Это не прямой внешний API из router, но route уже оркестрирует service flush; лучше будущим этапом оформить как application use case.
- `README.md` говорит “ruff пока используется мягко”, а `AGENTS.md` уже требует `ruff format --check`. Есть легкое расхождение документации по строгости checks.

## 6. Тесты и линтеры

### Backend

`pyproject.toml`:

- ruff target: `py313`
- line-length: `120`
- lint select: `E`, `F`, `I`
- extend-exclude: `admin-ui`, `data`
- format: double quotes, spaces
- pytest config есть, но основной регламент использует `unittest`

`requirements-dev.txt`:

```text
-r requirements.txt
ruff>=0.15,<1.0
```

`tests/`: 128 Python-файлов.

Есть много архитектурных тестов:

- boundary tests
- route error mapping boundaries
- architecture_guard
- topology
- application errors

### Read-only проверки, которые запускались

```bash
python3 -m ruff check src tests --no-cache
```

Результат:

```text
/usr/bin/python3: No module named ruff
```

```bash
python3 -m ruff format --check src tests
```

Результат:

```text
/usr/bin/python3: No module named ruff
```

```bash
PYTHONPATH=src python3 -m unittest discover -s tests -v
```

Результат:

```text
Ran 369 tests
FAILED (errors=67)
```

По выводу причина — окружение без зависимостей, а не подтвержденные падения бизнес-логики:

- `No module named pytest`
- `No module named fastapi`
- `No module named sqlalchemy`
- `No module named aiogram`
- `No module named httpx`

Часть pure/domain/application тестов успела пройти, включая architecture boundary tests.

### Frontend

`admin-ui/package.json`:

- `build = tsc --noEmit && vite build`
- `test = vitest run`
- `smoke:ui = playwright test`

`package-lock.json` есть.

Frontend проверки во время аудита не запускались, потому что исходный запрос разрешал при необходимости только `ruff`/`unittest`, а `npm build/test` для read-only аудита не требовались.

## 7. Staging/production

### Production/security

`docs/AUTH_SECURITY.md` описывает текущую auth/session/cookie/CORS модель.

Auth включается при наличии `ADMIN_SESSION_SECRET`.

Без `ADMIN_SESSION_SECRET` backend работает в local-bypass режиме.

Cookie:

- name: `supply_admin_session`
- `httpOnly`: true
- `Secure` управляется `ADMIN_SESSION_COOKIE_SECURE`
- `SameSite` управляется `ADMIN_SESSION_COOKIE_SAMESITE`

Для cross-origin production в `AUTH_SECURITY.md` указано:

```text
ADMIN_SESSION_COOKIE_SECURE=true
ADMIN_SESSION_COOKIE_SAMESITE=none
ADMIN_API_CORS_ORIGINS=<frontend origin>
```

Есть:

- `/api/auth/diagnostics`
- 401 diagnostic headers
- in-memory login rate limit

Ограничение login rate limit:

- сбрасывается при restart/redeploy;
- не общий для нескольких backend instances.

Known future gaps из docs:

- server-side session registry/revocation;
- roles/permission matrix;
- audit log;
- CSRF protection для cookie-auth unsafe methods.

### Staging

Явной staging-инфраструктуры в репозитории не найдено:

- нет `docker-compose.yml`;
- нет `render.yaml`;
- нет CI workflow в найденной области;
- нет отдельного staging config template, кроме общей `.env.example`/README схемы.

`AGENTS.md` явно запрещает production deploy и работу с production DB/bot без отдельного задания.

В `AGENTS.md` “Docker Compose for staging only” указан как good first task, то есть staging compose скорее запланирован, но не реализован.

Текущий `Dockerfile` подходит как backend deployment artifact, но не описывает весь staging контур:

- frontend;
- DB;
- secrets;
- migrations;
- domain/CORS/cookie env.

## Короткий итог

- Архитектурная цель хорошо зафиксирована и частично enforced тестами/architecture_guard.
- Backend application/domain границы по проверенным зонам выглядят чистыми.
- Основной долг сосредоточен в transitional HTTP/project/support зонах и в необходимости удерживать frontend calculator/public estimate как preview, а не source of truth.
- Deploy/staging слой пока слабее application architecture: есть Dockerfile и env rules, но нет явной staging/CI/deploy спецификации в репозитории.
- Проверки в текущем окружении не проходят из-за отсутствующих dev/runtime зависимостей. Для реального результата нужно подготовить venv/uv env с `requirements.txt` + `requirements-dev.txt`.
