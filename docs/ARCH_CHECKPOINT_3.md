# Architecture checkpoint 3

Current stable commit:
`62f8579 Extract project advance delete application use case`

## Closed since checkpoint 2

- `ARCH-CLEAN-4F`: project advances read/create application use-cases.
- `ARCH-CLEAN-4G`: project advance delete application use-case.

## Current projects core CRUD shape

- `GET /api/projects` -> `ListProjectsUseCase`
- `GET /api/projects/{project_id}` -> `GetProjectDetailUseCase`
- `POST /api/projects` -> `CreateProjectUseCase`
- `PATCH /api/projects/{project_id}` -> `UpdateProjectUseCase`
- `DELETE /api/projects/{project_id}` -> `DeleteProjectUseCase`

## Current project advances shape

- `GET /api/projects/{project_id}/advances` -> `ListProjectAdvancesUseCase`
- `POST /api/projects/{project_id}/advances` -> `CreateProjectAdvanceUseCase`
- `DELETE /api/projects/{project_id}/advances/{advance_id}` -> `DeleteProjectAdvanceUseCase`

## Confirmed unchanged

- API response shape.
- Frontend.
- DB schema and migrations.
- Auth/session/cookie/login behavior.

## Protected application layer

- `src/supply_bot/projects/application/`

Application layer must not import:

- FastAPI
- HTTPException
- Request
- Response
- SQLAlchemy
- settings loaders
- admin_api helpers

## Remaining transitional zones

- Project ledger.
- Project contracts.
- Project files/documents.
- AI extraction.

## Recommended next phase

`ARCH-CLEAN-4I`: project ledger read/create application use-cases.
