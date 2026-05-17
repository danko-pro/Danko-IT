# Architecture checkpoint 4

Current stable commit:
`7f187f5 Extract project ledger delete application use case`

## Closed since checkpoint 3

- `ARCH-CLEAN-4I`: project ledger entries read/create application use-cases.
- `ARCH-CLEAN-4J`: project ledger entry update application use-case.
- `ARCH-CLEAN-4K`: project ledger entry delete application use-case.

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

## Current project ledger entries shape

- `GET /api/projects/{project_id}/ledger` -> `ListProjectLedgerEntriesUseCase`
- `POST /api/projects/{project_id}/ledger` -> `CreateProjectLedgerEntryUseCase`
- `PATCH /api/projects/{project_id}/ledger/{entry_id}` -> `UpdateProjectLedgerEntryUseCase`
- `DELETE /api/projects/{project_id}/ledger/{entry_id}` -> `DeleteProjectLedgerEntryUseCase`

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

- Project ledger documents.
- Project contracts.
- Project files/documents.
- AI extraction.

## Recommended next phase

`ARCH-CLEAN-4M`: project ledger documents application use-cases.
