# Project Topology

## Status

`PROJECT_TOPOLOGY.md` is the operational topology contract for this repository.

Priority of architecture documents:

1. `ENGINEERING_LAWS.md` defines the engineering laws.
2. `PROJECT_TOPOLOGY.md` defines the expected folder topology and facades.
3. `ARCHITECTURE.md` describes the broader system and historical debt.

This file is intentionally strict. It is written to be mirrored by `architecture_guard`.

## Main Chapters

The project has three product-facing chapters and one shared Python core.

### 1. Backend

Path: `src/supply_bot/admin_api`

Role:
- FastAPI transport for the admin surface
- request/response orchestration
- DTO and route grouping

This chapter must not become the home for domain logic or storage orchestration.

### 2. Bot

Paths:
- `src/supply_bot/main.py`
- `src/supply_bot/handlers`
- `src/supply_bot/keyboards`
- `src/supply_bot/states.py`

Role:
- Telegram transport
- conversational entrypoints
- bot-specific wiring

This chapter must stay thin. Heavy scenario logic belongs in the shared core.

### 3. UI

Path: `admin-ui/src`

Role:
- React admin application
- shell, shared UI, and product features

The UI chapter is split into `shell`, `shared`, `features`, and the standalone `editor` module.

### 4. Shared Python Core

Paths:
- `src/supply_bot/services`
- `src/supply_bot/projects`
- `src/supply_bot/storage`
- `src/supply_bot/storage_bootstrap`
- `src/supply_bot/storage_catalog`
- `src/supply_bot/storage_estimates`
- `src/supply_bot/storage_projects`
- `src/supply_bot/storage_requests`
- `src/supply_bot/config.py`
- `src/supply_bot/constants.py`
- `src/supply_bot/utils.py`

Role:
- application orchestration
- reusable domain services
- storage and infrastructure access

This shared core is not the backend chapter and not the bot chapter. Both transports depend on it.

## Python Runtime Shape

`src/supply_bot` is the Python runtime root. Its immediate children are expected to stay explicit:

- transport: `admin_api`, `handlers`, `keyboards`, `main.py`, `states.py`
- shared core: `services`, `projects`, `config.py`, `constants.py`, `utils.py`
- storage: `storage`, `storage_bootstrap`, `storage_catalog`, `storage_estimates`, `storage_projects`, `storage_requests`

Random new roots under `src/supply_bot` are architectural violations until the topology is updated.

## Backend Shape

`src/supply_bot/admin_api` is the backend transport root.

Expected top-level zones:
- route/app wiring: `app*.py`, `auth.py`, `deps.py`, `route_registry.py`
- route groups: `project_routes`, `calculator_routes`
- payload builders: `calculator_payloads`
- schemas: `schemas`

If backend logic grows beyond that shape, it must grow by explicit submodule, not by dumping files into the root.

## Projects Core Shape

`src/supply_bot/projects` is the internal project-workspace core.

Expected top-level zones:
- `access`
- `domain`
- `use_cases`
- thin orchestration files in the package root

`domain` is for models and domain rules.
`use_cases` is for application actions.
`access` is for adapters/readers used by the module.

## UI Shape

`admin-ui/src` is the frontend runtime root.

Expected top-level zones:
- `App.tsx`
- `main.tsx`
- `features`
- `shared`
- `shell`
- `styles.css`
- optional structured modules: `editor`, `styles`

No new top-level frontend zones should appear without an explicit architectural decision.

## Frontend Module Rules

### Feature entrypoints

Every directory in `admin-ui/src/features/*` must expose a clear entrypoint:

- `screen.tsx`
- or `index.tsx`

Small features may use `screen.tsx` directly.
Structured features should expose `index.tsx` as the facade.

### Calculator

`admin-ui/src/features/calculator` is a structured feature.

Required shape:
- facade: `index.tsx`
- core zones: `screen`, `model`, `shared`
- bounded submodules: `app`, `project`, `room`, `rooms`, `stage`, `doors`, `flooring`, `wall-finish`, `warm-floor`

This module must grow by internal slices, not by reintroducing a giant root screen file.

### Dashboard

`admin-ui/src/features/dashboard` is a structured workspace feature.

Required shape:
- entry: `screen.tsx`
- feature zones: `api`, `model`, `scenes`, `state`, `styles`
- support zones: `card`, `accounting`

Root files in this feature are allowed only for scene switching, shell composition, and local specs.

### Requests And Materials

`requests` and `materials` are controller-driven features.

Expected entry files:
- `screen.tsx`
- `controller.ts`

Additional panels may live beside them while the feature is still compact.

### Editor

`admin-ui/src/editor` is a standalone structured module outside `features`.

Required shape:
- facade shell: `editor-shell.ts`
- `model`
- `state`
- `ui`

### Shared And Shell

`admin-ui/src/shared` contains reusable cross-feature code.
It must not turn into another feature tree.

`admin-ui/src/shell` contains app-level composition:
- navigation
- screen routing
- top-level controller
- frame components

## Facade Rule

When a module becomes structured, it must expose a recognizable entrypoint.

Current required facades:
- `admin-ui/src/features/*`: `screen.tsx` or `index.tsx`
- `admin-ui/src/features/calculator`: `index.tsx`
- `admin-ui/src/editor`: `editor-shell.ts`

Later we may extend guard with strict import-through-facade checks. For now the minimum contract is that the facade must exist.

## What Guard Must Enforce

`architecture_guard` is expected to validate:

1. The main chapters exist and remain separated.
2. `src/supply_bot` and `admin-ui/src` keep their defined top-level shape.
3. Structured modules keep their required child zones.
4. Frontend features expose entrypoints/facades.
5. Layer rules continue to protect import boundaries.

If the topology changes intentionally, this document and `architecture_guard.json` must change together.
