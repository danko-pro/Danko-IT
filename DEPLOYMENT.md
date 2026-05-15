# Production deployment

## Current production readiness status

The project is ready for the first controlled production deployment after the Phase 7B ceiling calculator work.

```text
users/auth: Postgres-ready
catalog/materials: Postgres-ready
requests/runtime: Postgres-ready
notifications: Postgres-ready
projects/dashboard/accounting: Postgres-ready
estimates/calculator: Postgres-ready
ceilings calculator: Postgres-ready
SQLite: local/dev/test fallback only
Postgres: production source of truth
```

Do not use SQLite as production storage. Production backend API and Telegram bot worker must share the same `DATABASE_URL`.

## Target topology

```text
danko39.ru / www.danko39.ru -> frontend static site
api.danko39.ru              -> FastAPI backend web service
Telegram bot worker         -> separate background worker
Render Postgres             -> shared production database
/app/data/project-documents -> persistent local file storage
```

Backend and bot must run outside Russia in an environment where OpenAI API access is available. Keep AI provider keys only in backend/worker environment variables, never in frontend variables.

## Hosting choice for the first production deployment

Recommended first deployment target: Render.

Reason: the project already has a Dockerfile, needs HTTPS, custom domains, Render Postgres, environment variables, and a persistent disk for local file storage. Render Web Services support Docker deployment and must bind to `0.0.0.0` with the provider `PORT`. Render Persistent Disks preserve files under the configured mount path, while the rest of the service filesystem is ephemeral. Render custom domains receive managed TLS certificates and HTTP to HTTPS redirects.

Official docs:

```text
Render Web Services: https://render.com/docs/web-services
Render environment variables: https://render.com/docs/environment-variables
Render Postgres: https://render.com/docs/databases
Render persistent disks: https://render.com/docs/disks
Render custom domains/TLS: https://render.com/docs/custom-domains
```

## Dockerfile audit

Current Dockerfile is suitable for a Render Docker Web Service:

```text
uvicorn command: OK
host binding through ADMIN_API_HOST=0.0.0.0: OK
Render PORT support through ${PORT:-8000}: OK
PYTHONPATH=/app/src: OK
migrations copied into image: OK
/app/data/project-documents created: OK
```

The web service command is:

```bash
uvicorn supply_bot.admin_api.app:create_admin_app --factory --host ${ADMIN_API_HOST:-0.0.0.0} --port ${PORT:-8000}
```

## Required production environment variables

Backend Web Service and Bot Worker:

```env
DATABASE_URL=postgresql+asyncpg://USER:PASSWORD@HOST:5432/DATABASE
ADMIN_SESSION_SECRET=replace-with-generated-secret
ADMIN_SESSION_COOKIE_SECURE=True
ADMIN_API_CORS_ORIGINS=https://danko39.ru,https://www.danko39.ru
BOT_TOKEN=replace-with-telegram-bot-token
OPENAI_API_KEY=replace-with-openai-api-key
OPENAI_BASE_URL=https://api.openai.com/v1
FILE_STORAGE_BACKEND=local
PROJECT_DOCUMENTS_DIR=/app/data/project-documents
```

Frontend Static Site:

```env
VITE_API_BASE_URL=https://api.danko39.ru
```

Generate `ADMIN_SESSION_SECRET` locally:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(64))"
```

Render Postgres can show a connection string as `postgresql://...`. The application uses SQLAlchemy async runtime, so production `DATABASE_URL` should use the async driver form:

```text
postgresql+asyncpg://USER:PASSWORD@HOST:5432/DATABASE
```

Use Render internal database URL for Render services in the same region when possible. Use external URL only for local administration or one-off smoke checks.

## File storage

Current production file storage mode:

```env
FILE_STORAGE_BACKEND=local
PROJECT_DOCUMENTS_DIR=/app/data/project-documents
```

Render setup:

```text
Attach persistent disk to backend Web Service
Mount path: /app/data
Initial size: 1-5 GB
```

Only files written under `/app/data` are persistent. Without the disk, uploaded project documents will be lost on redeploy or restart.

The file storage adapter is intentionally isolated so it can later move to S3/R2 without rewriting routes.

## Deploy-1 checklist: Render Postgres + Backend Web Service

1. Create Render Postgres in the same region planned for backend and bot worker.
2. Copy the internal Postgres connection string.
3. Convert it to `postgresql+asyncpg://...` for `DATABASE_URL` if needed.
4. Create Render Web Service from GitHub repository.
5. Runtime: Docker.
6. Branch: `main`.
7. Attach persistent disk.
8. Disk mount path: `/app/data`.
9. Configure backend env variables from `.env.production.example` using real secrets in Render UI.
10. Run `alembic upgrade head` against production `DATABASE_URL` before relying on the service.
11. Deploy backend.
12. Smoke backend technical URL: `https://<service>.onrender.com/api/health`.
13. Add custom domain `api.danko39.ru` in Render.
14. Add DNS record at reg.ru according to Render instructions.
15. Wait for domain verification and HTTPS certificate.
16. Smoke production API: `https://api.danko39.ru/api/health`.

## Deploy-2 checklist: Frontend Static Site

1. Create Render Static Site or equivalent frontend hosting.
2. Build command:

```bash
cd admin-ui && npm install && npm run build
```

3. Publish directory:

```text
admin-ui/dist
```

4. Configure frontend env:

```env
VITE_API_BASE_URL=https://api.danko39.ru
```

5. Add custom domains:

```text
danko39.ru
www.danko39.ru
```

6. Configure DNS at reg.ru according to hosting provider instructions.
7. Wait for HTTPS.
8. Open frontend and verify login/register.

## Deploy-3 checklist: Telegram bot worker

The bot must run as a separate worker, not inside the backend Web Service.

```text
Backend Web Service -> FastAPI only
Bot Worker          -> Telegram bot runtime only
Shared Postgres     -> same DATABASE_URL
```

Worker env must include at least:

```env
DATABASE_URL=postgresql+asyncpg://USER:PASSWORD@HOST:5432/DATABASE
BOT_TOKEN=replace-with-telegram-bot-token
OPENAI_API_KEY=replace-with-openai-api-key
OPENAI_BASE_URL=https://api.openai.com/v1
FILE_STORAGE_BACKEND=local
PROJECT_DOCUMENTS_DIR=/app/data/project-documents
```

If bot needs access to uploaded documents with local storage, use a storage plan that is shared safely between services or move file storage to S3/R2 before enabling that path. A Render persistent disk is attached to one service instance and should not be treated as shared storage between backend and worker.

## Production smoke checklist

Run in this order:

```bash
curl https://api.danko39.ru/api/health
```

Expected:

```json
{"status":"ok"}
```

Protected API without session must be closed:

```bash
curl -i https://api.danko39.ru/api/dashboard/summary
```

Expected:

```text
401 Unauthorized
```

Manual browser smoke:

```text
1. Open https://danko39.ru
2. Register user 1
3. Login user 1
4. Create calculator project
5. Open calculator tabs
6. Add and delete a ceiling item
7. Verify dashboard and totals
8. Logout
9. Register user 2
10. Verify user 2 does not see user 1 data
11. Verify project documents upload/download if storage is enabled
12. Verify Telegram bot worker starts and can process a basic scenario
```

If user isolation fails, do not open public registration.

## Local baseline commands

SQLite fallback:

```powershell
$env:PYTHONPATH='src'
Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
python -m compileall -q src tests migrations
python -m ruff check src tests migrations --no-cache
alembic upgrade head
alembic check
python -m unittest discover -s tests -v
```

Frontend:

```powershell
cd admin-ui
npm run build
```

Local Postgres smoke with WSL Docker Engine:

```powershell
$wslKeepAlive = Start-Process -FilePath "wsl.exe" `
  -ArgumentList @("-d", "Ubuntu", "--", "sleep", "infinity") `
  -WindowStyle Hidden `
  -PassThru

$env:PYTHONPATH='src'
$env:DATABASE_URL="postgresql+asyncpg://danko:danko_dev_pass@127.0.0.1:5432/danko_bot"
alembic upgrade head
alembic check
python -m unittest discover -s tests -v

Stop-Process -Id $wslKeepAlive.Id -Force
```

## Backup and rollback notes

Before public launch:

```text
Postgres backup policy confirmed
/app/data persistent disk snapshot policy confirmed
manual export/restore procedure documented
GitHub main branch contains the deployed commit
Render rollback target known
```

Do not store real secrets in repository files. Use `.env.production.example` only as a placeholder checklist.
