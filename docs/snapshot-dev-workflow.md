# Snapshot dev workflow (PF7)

Дата: 2026-06-04

Краткий гайд по генерации `generated/*.snapshot.json` для локальной проверки package-first полов и других разделов.

## Проблема

Публичный сайт **не ходит в backend за snapshot в runtime**. Vite бандлит JSON из `admin-ui/src/features/public/generated/` на этапе сборки.

Если `npm run build` запускается без remote base URL, prebuild перезаписывает `flooring.snapshot.json` **локальным seed** (`scripts/flooring-v2-package-seed.json`). Backend при этом может уже отдавать актуальный package-first snapshot — сайт будет показывать устаревший bundled seed.

## Режимы `generate-snapshot.js`

| Режим | Как включить | Поведение |
|-------|--------------|-----------|
| **auto** (default) | `prebuild`, `node scripts/generate-snapshot.js` | Env URL → remote; иначе local seed |
| **local** | `npm run snapshot:local` | Всегда seed (Python plumbing + warm-floor v1 + flooring-v2 package seed) |
| **remote** | `npm run snapshot:remote` + env URL, или `snapshot:remote:local` | GET `/api/public/catalog/{section}/snapshot`; без URL — ошибка |
| **strict-remote** | `npm run snapshot:strict-remote` + env URL | Как remote, но обязателен base URL; invalid payload → exit != 0, без seed fallback |

### Переменные окружения

| Переменная | Назначение |
|------------|------------|
| `PUBLIC_SNAPSHOT_BASE_URL` | Приоритетный base URL backend (без trailing slash) |
| `VITE_API_BASE_URL` | Fallback base URL |
| `SNAPSHOT_MODE` | Явный режим: `local` \| `remote` \| `strict-remote` |

CLI: `--mode=local|remote|strict-remote`, `--base-url=http://127.0.0.1:8000`.

## Команды перед локальной проверкой

1. Поднять backend с актуальной DB (локально обычно `http://127.0.0.1:8000`).

2. Обновить snapshot из backend:

```powershell
cd admin-ui
npm run snapshot:remote:local
```

Или с явным env:

```powershell
$env:PUBLIC_SNAPSHOT_BASE_URL = "http://127.0.0.1:8000"
npm run snapshot:remote
```

3. Собрать сайт (prebuild в auto-режиме снова возьмёт seed, если env не задан — поэтому для проверки backend snapshot либо держите env при build, либо сначала `snapshot:remote:local`, потом build с тем же env):

```powershell
$env:PUBLIC_SNAPSHOT_BASE_URL = "http://127.0.0.1:8000"
npm run build
```

4. Явно перегенерировать только seed (offline, без backend):

```powershell
npm run snapshot:local
```

5. CI / gate против backend (fail-fast, без fallback):

```powershell
$env:PUBLIC_SNAPSHOT_BASE_URL = "https://your-backend.example.com"
npm run snapshot:strict-remote
```

## Как понять, что использует сайт

| Признак | Bundled seed | Backend snapshot |
|---------|--------------|------------------|
| Когда генерировали | `npm run snapshot:local` или build без env URL | `snapshot:remote:local` / build с `PUBLIC_SNAPSHOT_BASE_URL` |
| Содержимое | Совпадает с `scripts/flooring-v2-package-seed.json` | Совпадает с `GET /api/public/catalog/flooring/snapshot` |
| Runtime | Импорт `./generated/flooring.snapshot.json` | Тот же импорт, но файл записан из remote при prebuild |

Проверка drift:

```powershell
# Ответ backend
curl http://127.0.0.1:8000/api/public/catalog/flooring/snapshot

# Bundled файл после генерации
Get-Content admin-ui/src/features/public/generated/flooring.snapshot.json
```

У flooring-v2 каждая позиция в `coverings` / `preparations` / `layouts` должна иметь непустой `specLines`.

## Связанные файлы

- `admin-ui/scripts/generate-snapshot.js` — генератор и валидация
- `admin-ui/scripts/flooring-v2-package-seed.json` — package-first local seed
- `admin-ui/src/features/public/public-flooring-snapshot.ts` — runtime loader (strict validate)
- `docs/flooring-package-first-audit-plan.md` — PF7 в контексте пилота полов
