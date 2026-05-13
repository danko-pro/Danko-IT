# Production deployment

## Target topology

Use the existing `danko39.ru` domain as the public site and host the backend outside Russia:

```text
danko39.ru / www.danko39.ru -> frontend hosting
api.danko39.ru              -> FastAPI backend hosting
```

The backend should run in a country supported by the OpenAI API. Keep `OPENAI_API_KEY` only on the backend.

## Backend

Recommended first deployment target: Render, Fly.io, Railway, or a small VPS in Europe.

Production database must be Postgres. SQLite remains a local/dev/test fallback only.

Run migrations before starting or updating production services:

```bash
alembic upgrade head
```

In production this migration step must run once against the shared `DATABASE_URL` before the FastAPI web service and Telegram worker rely on new tables.

Build:

```bash
docker build -t supply-bot-admin-api .
```

Run:

```bash
docker run --rm -p 8000:8000 --env-file .env.production.example supply-bot-admin-api
```

Production env values must be configured in the hosting provider:

```text
ADMIN_API_CORS_ORIGINS=https://danko39.ru,https://www.danko39.ru
ADMIN_SESSION_COOKIE_SECURE=True
DATABASE_URL=postgresql+asyncpg://...
FILE_STORAGE_BACKEND=local
PROJECT_DOCUMENTS_DIR=/app/data/project-documents
```

While `FILE_STORAGE_BACKEND=local`, attach persistent storage mounted at `/app/data`. Without persistent storage, uploaded documents will be lost on redeploy. The file storage adapter is intentionally isolated so it can move to S3/R2 later.

## Frontend

Build command:

```bash
cd admin-ui
npm install
npm run build
```

Output directory:

```text
admin-ui/dist
```

Frontend env:

```text
VITE_API_BASE_URL=https://api.danko39.ru
```

## DNS at reg.ru

Set records according to the hosting provider instructions:

```text
danko39.ru      -> frontend
www.danko39.ru  -> frontend
api.danko39.ru  -> backend
```

Enable HTTPS certificates on both frontend and backend hosts before using production cookies.

## Access model

The app supports public user registration with an HttpOnly session cookie.

Runtime data is split by role:

```text
Postgres                            -> shared backend API and Telegram bot state
file storage adapter                -> project documents and uploads
SQLite                              -> local/dev/test fallback only
```

Keep `ADMIN_SESSION_SECRET` configured in production. `ADMIN_PASSWORD_HASH` is optional and only enables the legacy platform-admin password login.

## Локальный Postgres smoke в WSL

На Windows Postgres smoke сейчас идёт через Docker Engine внутри WSL Ubuntu. Если WSL-сессия завершается, Docker-контейнер может получить `fast shutdown`, и Windows-тесты начнут падать с `ConnectionRefused`.

Перед Postgres smoke держи WSL живым отдельным процессом:

```powershell
$wslKeepAlive = Start-Process -FilePath "wsl.exe" `
  -ArgumentList @("-d", "Ubuntu", "--", "sleep", "infinity") `
  -WindowStyle Hidden `
  -PassThru
```

После smoke остановить keep-alive:

```powershell
Stop-Process -Id $wslKeepAlive.Id -Force
```

Минимальный контур проверки:

```powershell
$env:DATABASE_URL="postgresql+asyncpg://danko:danko_dev_pass@127.0.0.1:5432/danko_bot"
alembic upgrade head
alembic check
python -m unittest discover -s tests -v
```

## Инвентаризация оставшегося legacy storage

Статус после Phase 4:

```text
users/auth: Postgres-ready
catalog/materials: Postgres-ready
requests/runtime: Postgres-ready
notification outbox: Postgres-ready
SQLite: local/dev/test fallback
```

Оставшийся production-risk находится в legacy `BotStorage` и прямых `connection()`-запросах.

### Legacy runtime domains

```text
bot_settings
dashboard summary
groups support endpoint
projects/accounting
project advances
project ledger entries
project ledger documents metadata
project contracts
project contract milestones
estimate projects
estimate rooms and geometry
warm floor calculator
flooring calculator
wall finish calculator
door calculator
estimate catalog tables
```

### Основные production-path точки

```text
src/supply_bot/admin_api/app_routes_support.py
src/supply_bot/admin_api/project_routes/
src/supply_bot/admin_api/calculator_routes/
src/supply_bot/admin_api/calculator_payloads/
src/supply_bot/projects/
src/supply_bot/storage_projects/
src/supply_bot/storage_estimates/
src/supply_bot/storage/runtime.py
```

Особенно опасные места:

```text
/api/dashboard/summary      -> прямой storage.connection()
/api/groups                 -> прямой storage.connection()
/api/settings/delivery      -> bot_settings в legacy SQLite
project routes              -> storage_projects mixins
calculator routes           -> storage_estimates mixins
calculator payload helpers  -> часть прямых SQL-запросов через connection()
```

### Риск для публичной регистрации

Пока `projects/accounting` и `estimates/calculator` остаются в legacy SQLite, публичная multi-user архитектура не полностью чистая:

```text
новые пользователи изолируются через отдельный user SQLite fallback
Postgres не является единым source of truth для workspace-проектов
dashboard может читать не тот backend storage
часть storage-кода нельзя безопасно масштабировать как shared production runtime
```

Это не ломает текущие проверки Phase 4, но блокирует production-ready статус всего продукта.

## Phase 5 red line

Следующий домен:

```text
Phase 5: projects / dashboard / accounting storage -> SQLAlchemy/Postgres
```

Минимальный scope:

```text
projects
project_advances
project_ledger_entries
project_ledger_documents
project_contracts
project_contract_milestones
dashboard summary reads
groups support read model
delivery settings decision: global или owner-scoped
```

Не включать в Phase 5:

```text
estimate_projects
estimate_rooms
warm_floor
flooring
wall_finish
doors
calculator catalogs
```

Phase 5 считается закрытой только если:

```text
project/accounting routes работают через owner-scoped SQLAlchemy repositories
dashboard не читает production данные через raw SQLite connection
project document metadata живет в Postgres
file storage остается через отдельный adapter
SQLite fallback зеленый
Postgres clean smoke зеленый
user isolation route smoke зеленый
старые project/accounting tests зеленые
```

Phase 6 после этого:

```text
estimates / calculator storage -> SQLAlchemy/Postgres
```
