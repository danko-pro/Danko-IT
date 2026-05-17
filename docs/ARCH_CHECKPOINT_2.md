# Architecture checkpoint 2

Current stable commit: `11479ee Extract projects delete application use case`

## Closed since checkpoint 1

- `ARCH-CLEAN-4A`: projects list/detail read use-cases.
- `ARCH-CLEAN-4B`: projects create use-case.
- `ARCH-CLEAN-4C`: projects update use-case.
- `ARCH-CLEAN-4D`: projects delete use-case.

## Current projects core CRUD shape

- `GET /api/projects` -> `ListProjectsUseCase`
- `GET /api/projects/{project_id}` -> `GetProjectDetailUseCase`
- `POST /api/projects` -> `CreateProjectUseCase`
- `PATCH /api/projects/{project_id}` -> `UpdateProjectUseCase`
- `DELETE /api/projects/{project_id}` -> `DeleteProjectUseCase`

`src/supply_bot/admin_api/project_routes/core.py` is now the HTTP adapter for projects core CRUD.
It receives HTTP payloads, resolves route storage, builds commands, calls application use-cases, and maps
application errors through `resolve_application_result`.

## Confirmed unchanged

- API response shape.
- Frontend.
- DB schema and migrations.
- Auth/session/cookie/login behavior.

## Protected application layer

- `src/supply_bot/projects/application/`

This package must not import FastAPI, `HTTPException`, `Request`, `Response`, SQLAlchemy, settings loaders,
or `admin_api` helpers. User-facing/business errors belong to `supply_bot.application.errors`.

## Remaining transitional zones

- Project advances.
- Project ledger.
- Project contracts.
- Project files/documents.
- AI extraction.

## Recommended next phase

`ARCH-CLEAN-4F`: projects advances read/create application use-cases.
