# Package Engine Architecture Plan

Дата: 2026-06-04

Статус: целевой план внедрения + универсальный аудит цепочки (2026-06-04). Документ фиксирует не только полы, а общую пакетную систему для всего публичного калькулятора и админки.

Связанный документ (пилот «Полы», PF1–PF8): `docs/flooring-package-first-audit-plan.md`.

## 1. Зачем этот трек

Текущая проблема: часть калькулятора уже умеет собирать пакеты в админке, но публичный сайт все еще может жить от плоских ставок, fallback-метрик и старых snapshot-строк. Из-за этого получается хрупкий мост:

- админка собирает пакет;
- backend может публиковать `specLines`;
- public calculator продолжает считать и показывать раздел как набор flat-строк;
- спецификация выглядит как простыня, а не как понятная смета по выбранным пакетам.

Цель трека: сделать единую package-first систему, которая масштабируется на все разделы калькулятора: полы, сантехника, стены, потолки, электрика, теплый пол, двери, комплектация и будущие разделы.

Полы являются пилотным разделом. Но контракты, loaders, estimate document, validation и export должны быть общими, а не зашитыми только под полы.

## 2. Главный закон

В публичном калькуляторе не должно существовать самостоятельных непакетных позиций.

Публичная позиция каталога - это пакет.

Flat-ставки допустимы только как производная проекция пакета для быстрых итогов. Они не являются отдельным источником правды.

Если у позиции нет валидного пакета, она:

- не публикуется в public snapshot;
- не попадает в dropdown;
- не участвует в расчете;
- не попадает в спецификацию;
- не замещается silently hardcoded fallback-строкой.

## 3. Что считаем пакетом

Пакет - это публично выбираемая позиция калькулятора, собранная из строк состава.

Примеры:

- Полы: `Керамогранит 120x60`, `Грунтование`, `Крупный формат`.
- Сантехника: зона/пакет точки подключения, комплект работ и материалов.
- Стены: покрытие, подготовка, способ нанесения.
- Потолки: тип потолка, подготовка, закладные.
- Электрика: тип точки, группа, линия, комплект материалов и работ.

Пакет имеет:

- публичный код;
- название;
- раздел;
- тип цели внутри раздела;
- строки состава;
- flat projection;
- specification lines;
- procurement metadata;
- версию контракта;
- признак валидности.

## 4. Единая модель данных

### 4.1 Package

```ts
type PublicPackage = {
  code: string;
  title: string;
  section: string;
  targetKind: string;
  version: string;
  flatProjection: PackageFlatProjection;
  specLines: PackageSpecLine[];
  procurement?: PackageProcurementMeta;
};
```

### 4.2 Package line

Строка состава пакета. В админке она может ссылаться на библиотеку кубиков, но в public snapshot должна быть уже безопасной копией.

Обязательные публичные поля:

- `code`;
- `title`;
- `category`: `works`, `materials`, `consumables`, `tools`, при необходимости расширяется;
- `basis`: площадь, штуки, метр, зона, точка, помещение;
- `unit`;
- `quantityPerBasis`;
- `unitPrice`;
- `calculationNote`, если нужна понятная расшифровка;
- procurement-поля, если строка закупается упаковками.

Запрещенные публичные поля:

- DB id;
- owner id;
- internal note;
- source;
- raw CRM JSON;
- timestamps;
- себестоимость, маржа, risk;
- любые private/admin-only поля.

### 4.3 Flat projection

Flat projection - это кэш итоговых ставок пакета.

Для полов это может быть:

- материал за м2;
- работа за м2;
- расходники за м2;
- запас;
- коэффициент укладки.

Для других разделов projection будет отличаться. Например:

- сантехника: цена зоны, точки, группы;
- электрика: цена точки, линии, группы;
- потолки: цена м2, погонного метра, закладной;
- двери: комплект двери, доборы, монтаж.

Projection всегда считается из строк пакета. Ручное редактирование projection как источника правды запрещено.

### 4.4 Estimate document

Публичная смета должна строиться из одного нормализованного документа:

```ts
type PublicEstimateDocument = {
  sections: EstimateDocumentSection[];
  totals: EstimateDocumentTotals;
};

type EstimateDocumentSection = {
  sectionId: string;
  title: string;
  groups: EstimateDocumentGroup[];
  totals: EstimateDocumentTotals;
};

type EstimateDocumentGroup = {
  scopeLabel: string;       // помещение, зона, группа, объект
  selectedPackages: EstimateSelectedPackage[];
  totals: EstimateDocumentTotals;
};

type EstimateSelectedPackage = {
  packageCode: string;
  title: string;
  targetKind: string;
  lines: EstimateDocumentLine[];
  procurementLines: EstimateProcurementLine[];
  totals: EstimateDocumentTotals;
};
```

UI, CSV и будущий PDF читают этот же документ. Не должно быть трех разных логик для модалки, CSV и PDF.

## 5. Целевая цепочка

```mermaid
flowchart LR
  Admin["Admin: package builder"]
  Library["Library: reusable cubes"]
  Backend["Backend: validation + projection"]
  DB["DB: package + rows + projection cache"]
  Snapshot["Public snapshot gateway"]
  Loader["Public package loader"]
  Calc["Section adapter calculation"]
  Doc["Estimate document"]
  Render["Modal / CSV / PDF"]

  Library --> Admin
  Admin --> Backend
  Backend --> DB
  DB --> Snapshot
  Snapshot --> Loader
  Loader --> Calc
  Calc --> Doc
  Doc --> Render
```

## 6. Конечный результат

В конце трека система должна работать так:

1. Администратор собирает позицию из кубиков.
2. Backend валидирует пакет.
3. Если пакет пустой, битый или неполный, он не сохраняется как публичная позиция.
4. При сохранении backend считает flat projection и сохраняет его атомарно со строками пакета.
5. Public snapshot публикует только валидные package-backed позиции.
6. Публичный калькулятор строит dropdown только из package snapshot.
7. Пользователь выбирает понятную позицию: покрытие, подготовку, укладку, зону, точку, пакет работ и т.д.
8. Итоговые суммы считаются из package projection.
9. Спецификация раскрывает состав пакета, а не показывает плоский суп строк.
10. Закупочный блок показывает упаковки, мешки, пачки, литры, штуки как справочную часть.
11. CSV и PDF используют тот же estimate document, что и модалка.
12. Если snapshot битый, build/test падает. Сайт не молча откатывается на hardcoded fallback.

Для пользователя итоговая смета должна быть не закупочной накладной, а понятным коммерческим документом:

- что выбрано;
- где выбрано;
- из каких работ и материалов состоит;
- сколько стоит;
- какие материалы ориентировочно потребуются;
- какие итоги по разделам и по проекту.

## 7. Неприемлемые состояния

Эти состояния считаются ошибкой, а не допустимым fallback:

- public snapshot v2/vNext содержит позицию без `specLines`;
- dropdown показывает позицию без валидного пакета;
- расчет использует hardcoded rates при валидном package snapshot;
- пакет сохраняется пустым;
- all-disabled пакет считается валидным;
- flat PATCH меняет package-backed позицию в обход package projection;
- CSV показывает другую структуру, чем модалка;
- PDF строит свою отдельную модель;
- private/owner/internal поля попадают в public snapshot;
- локальный build случайно перетирает remote package snapshot старым seed без явного режима.

## 8. Архитектурные слои

### PE1. Package contract

Сделать общий контракт package snapshot, который не зависит от пола.

Результат:

- общие типы `PublicPackage`, `PackageSpecLine`, `PackageProcurementLine`;
- список разрешенных публичных полей;
- единый forbidden-key validator;
- versioning contract;
- разделы используют adapters, а не свои несовместимые payloads.

### PE2. Backend package validation

Общие правила валидации:

- пакет имеет минимум одну enabled строку;
- строка имеет название, категорию, единицу, формулу и цену;
- package-aware формулы требуют упаковку или явно работают в raw mode;
- section adapter проверяет domain-specific правила;
- invalid package возвращает ошибку до записи или до публикации.

Результат:

- нельзя сохранить публичный package-shell без полезного состава;
- нельзя опубликовать битый пакет;
- flat projection не расходится со строками.

### PE3. Package projection engine

Общий engine считает:

- flat projection;
- spec lines;
- procurement metadata.

Section adapters задают только domain rules:

- flooring: площадь, запас, слой, упаковки;
- plumbing: зоны, точки, комплекты;
- walls: площадь, слои, материалы;
- ceilings: площадь, периметр, закладные;
- electrical: точки, линии, группы.

Результат:

- новая секция не пишет свой отдельный mini-engine с нуля;
- формулы проверяемы и тестируемы;
- projection и specification имеют один источник.

### PE4. Public snapshot gateway

Snapshot любого раздела публикует только package-backed позиции.

Результат:

- build-time JSON содержит package contract;
- runtime API и generated JSON совпадают по форме;
- remote generation fail-fast при битом payload;
- local seed явно package-first.

### PE5. Public package loader

Общий loader:

- валидирует package snapshot;
- строит dropdown options;
- отдает projection для быстрых итогов;
- отдает spec/procurement для estimate document.

Результат:

- public UI не держит hardcoded options как нормальный путь;
- fallback допускается только как dev seed, а не как production behavior;
- custom/admin-created позиции появляются на сайте после snapshot generation.

### PE6. Estimate document renderer

Сделать общий estimate document.

Результат:

- модалка, CSV и PDF используют одну структуру;
- строки сгруппированы по разделу, помещению/зоне и пакету;
- закупка показывается отдельно как справочная сводка;
- public estimate выглядит как смета, а не как технический лог строк.

### PE7. Flooring pilot completion

Полы довести до package-first полностью.

Acceptance:

- local backend snapshot `flooring-v2` не содержит непакетных покрытий, подготовок и укладок;
- dropdown полов берет только package-backed позиции;
- расчет использует projection пакета;
- specification раскрывает пакет;
- procurement показывает упаковки;
- CSV показывает тот же estimate document;
- нет flat fallback в package-first пути.

### PE8. Rollout to other sections

После полов переносить не код копипастой, а общий слой:

- сантехника;
- стены;
- потолки;
- электрика;
- теплый пол;
- двери;
- комплектация.

Для каждого раздела добавляется только section adapter и domain-specific library rows.

## 9. План внедрения

### Step 0. Freeze the target

Зафиксировать этот документ как источник правды.

Не начинать новые UI-фичи, пока не закрыты:

- package contract;
- snapshot gateway;
- estimate document;
- flooring pilot acceptance.

### Step 1. Audit current flooring bridge

Проверить:

- backend runtime действительно на текущем `main`;
- `/api/public/catalog/flooring/snapshot` отдает только package-backed rows;
- generated snapshot совпадает с runtime;
- public dropdown не берет старые hardcoded строки;
- specification не fallback-ится в flat section.

### Step 2. Remove flooring flat fallback from public path

Для package-first flooring:

- v2/vNext без `specLines` invalid;
- no package means no public item;
- `calculateFlooring` использует projection только как derived package projection;
- fallback-тесты оставить только для legacy v1 fixtures, не для основной логики.

### Step 3. Build package-view estimate document

Для полов:

- группировать по помещению;
- внутри помещения группировать выбранные пакеты;
- внутри пакета показывать работы, материалы, расходники, инструмент;
- закупку вынести отдельной сводкой.

### Step 4. Connect CSV to estimate document

CSV должен экспортировать тот же document, что видит пользователь.

Не отдельная procurement-only таблица и не старая flat-простыня.

### Step 5. Prepare PDF renderer

PDF с логотипом строится поверх estimate document.

Минимум:

- логотип/бренд;
- данные проекта;
- разделы;
- пакеты;
- строки состава;
- итоги;
- справочная закупка;
- дисклеймер по ориентировочности закупки.

### Step 6. Generalize after flooring pilot

Когда полы проходят acceptance, выделить общий слой:

- package contract types;
- package snapshot validator;
- estimate document builder;
- procurement aggregator;
- export renderer;
- section adapter interface.

Только после этого переносить на сантехнику и остальные разделы.

## 10. Acceptance criteria

### Backend

- Invalid package не сохраняется или не публикуется.
- Empty/all-disabled package не публикуется.
- Flat PATCH не меняет package-backed позицию в обход пакета.
- Owner/private data не попадает в public snapshot.
- Snapshot tests падают при public item без package.

### Frontend

- Dropdown options берутся из package snapshot.
- Package snapshot validator падает на missing `specLines`.
- Public calculation не зависит от hardcoded rates в package-first режиме.
- Specification показывает package-view.
- CSV и PDF читают один estimate document.

### Local E2E

1. Создать или изменить пакет в админке.
2. Перезапустить/обновить backend, если требуется.
3. Сгенерировать snapshot из backend.
4. Открыть public calculator.
5. Увидеть позицию в dropdown.
6. Рассчитать смету.
7. Открыть спецификацию.
8. Увидеть состав пакета.
9. Скачать CSV/PDF.
10. Убедиться, что экспорт совпадает с модалкой по смыслу и итогам.

### Production readiness

- Remote snapshot generation не проходит, если backend отдает старый flat payload.
- Release не выполняется, если local generated snapshot не package-first.
- Нельзя опубликовать раздел, где package-first path не покрыт тестами.

## 11. Что не входит в этот трек

- Визуальная полировка UI/CSS.
- Маркетинговые тексты лендинга.
- Редизайн публичного калькулятора.
- Перенос всех разделов сразу.
- PDF-дизайн как отдельная визуальная задача до готового estimate document.

UI можно править параллельно, но он не должен менять contract и business logic.

## 12. Первый практический следующий шаг

Следующая задача агенту:

1. Проверить runtime drift для flooring backend.
2. Добиться, чтобы `/api/public/catalog/flooring/snapshot` на локальном backend отдавал package-first payload.
3. Убрать или ограничить public flat fallback для flooring v2.
4. Собрать package-view estimate document для полов.
5. Проверить dropdown, modal, CSV на локальном сайте.

После этого будет понятно, достаточно ли текущей модели для переноса на сантехнику или нужно сначала выделять общий package engine.

---

## 13. Аудит полной цепочки (file paths / modules)

Ниже — фактическая карта модулей по этапам: admin → assembly → validation → projection → PF2/PF3/Bridge1 → generate-snapshot → public calc → spec → CSV. Нумерация PF/PE согласована с `docs/flooring-package-first-audit-plan.md`.

### 13.1 Admin: создание и редактирование catalog row

| Этап | Модули | Состояние |
|------|--------|-----------|
| Flat forms (legacy primary) | `admin-ui/src/features/catalog-editor/FlooringCatalogEditForms.tsx`, `FlooringCatalogPanel.tsx`, `useFlooringCatalogPanel.ts` | Flat-поля (клей/грунт/СВП/затирка) — primary UI |
| Package assembly UI | `FlooringAssemblyBlock.tsx`, `FlooringAssemblyLibraryPanel.tsx`, `flooring-assembly.ts` | Сборка строк, library cubes |
| Create from assembly | `flooring-catalog-assembly-create-row.ts`, `flooring-catalog-assembly-save.ts` | Create требует enabled rows на frontend |
| Edit/save assembly | `flooring-catalog-assembly-edit-save.ts`, `useFlooringAssemblyEditLoad.ts` | Projection перед PATCH flat draft |
| Frontend projection (mirror backend) | `flooring-package-projection.ts` | Дублирует backend rules (риск drift) |
| API client/mappers | `api/flooring-client.ts`, `api/flooring-mappers.ts`, `api/flooring-types.ts` | POST flat + PUT assembly |
| Snapshot promote | `flooring-snapshot-promote.ts`, `flooring-snapshot-promote-actions.ts` | Bridge admin → catalog |

**Backend create (flat-only path ещё открыт):**

- `src/supply_bot/estimates/application/create_flooring_catalog.py` — `CreateFlooringCoveringUseCase`, `CreateFlooringPreparationUseCase`, `CreateFlooringLayoutUseCase` без assembly
- `src/supply_bot/admin_api/calculator_routes/flooring.py` — `POST /coverings`, `/preparations`, `/layouts`

**Backend update:**

- `update_flooring_catalog.py` — `reject_flooring_flat_update_when_assembly_present` блокирует flat PATCH, если assembly record exists

### 13.2 Catalog assemblies / packages (DB + REST)

| Слой | Модули |
|------|--------|
| Migration | `migrations/versions/0013_create_flooring_catalog_assemblies.py` |
| Tables | `src/supply_bot/storage_estimates/tables.py` |
| Repository | `src/supply_bot/storage_estimates/flooring_repository.py` |
| Use cases | `flooring_catalog_assembly.py` — `Get/Replace/DeleteFlooringCatalogAssemblyUseCase` |
| REST | `calculator_routes/flooring.py` — `GET/PUT/DELETE .../{kind}/{id}/assembly` |
| Library items | `flooring_assembly_catalog.py` |

### 13.3 Backend validation (PF1)

**Реализовано** в `validate_flooring_package_for_publication()` (`flooring_catalog_assembly.py`, ~313–372):

- empty rows → 400
- all-disabled → 400
- covering: min 1 enabled `material`
- preparation/layout: min 1 enabled `work`
- package-aware formulas: `consumption_per_m2`, `package_size`, `price`, `layer_mm`

**Вызывается при:** `ReplaceFlooringCatalogAssemblyUseCase.execute()`.

**Тесты:** `tests/test_flooring_package_backend_consistency.py`, `tests/test_admin_calculator_flooring_routes.py`.

**Пробел:** `POST` flat create не вызывает validation; empty assembly shell возможен до первого PUT.

### 13.4 Package projection

| Модуль | Роль |
|--------|------|
| `flooring_package_projection.py` | Pure: `build_flooring_package_projection()` → `{ flat, totals, specLines }` |
| `catalog_update_values_from_projection()` | Derived flat columns для CRM cache |
| `admin-ui/.../flooring-package-projection.ts` | Frontend mirror (риск drift) |
| `admin-ui/.../flooring-assembly.ts` | `calculateAssemblyRowTotal`, aggregates |

**Эвристики по названию (см. V6):** `_classify_consumable()` — substring «клей», «грунт», «свп», «затир» для routing consumable → flat bucket.

### 13.5 Synthetic migration (PF2)

| Модуль | Роль |
|--------|------|
| `flooring_synthetic_assembly.py` | `build_synthetic_flooring_catalog_assembly()` из flat columns |
| `migrate_flooring_synthetic_assemblies.py` | `MigrateGlobalFlooringSyntheticAssembliesUseCase` |
| `storage_estimates/flooring_synthetic_assembly_seed.py` | Idempotent startup hook |
| `admin_api/app_factory.py` | `ensure_global_flooring_synthetic_catalog_assemblies()` on boot |

**Особенность:** preparation synthetic = work-only; `material_price_per_m2` может оставаться на flat columns (`catalog_updates_for_synthetic_assembly`).

### 13.6 Snapshot builder (PF3, Bridge1)

| Модуль | Роль |
|--------|------|
| `flooring_snapshot.py` | `BuildFlooringSnapshotUseCase`, `build_public_flooring_snapshot_from_catalog()` |
| Bridge1 | `_package_backed_catalog_rows()` — фильтр `row.get("specLines")` |
| Publication gate | `_publish_package_backed_snapshot_row()` — validation + `covering_spec_lines_are_complete()` |
| Local seed | `build_flooring_v2_local_package_seed()`, `_package_first_catalog_item_from_defaults()` |
| Defaults | `DEFAULT_PUBLIC_FLOORING_SNAPSHOT` — plinthTypes/globalAddons + reference flat rows |
| Title→code heuristics | `_COVERING_TITLE_TO_CODE`, `_resolve_public_code()` |

**Legacy bridge (не в public build, но в кодовой базе):** `_attach_spec_lines_to_snapshot_row()` — flat row без specLines, если assembly invalid (см. V15).

### 13.7 generate-snapshot.js (PF3 frontend gate)

`admin-ui/scripts/generate-snapshot.js`:

- Remote: `GET /api/public/catalog/flooring/snapshot`
- Local: `FLOORING_V2_SEED` из `scripts/flooring-v2-package-seed.json` (генерируется `tools/generate_flooring_package_seed.py`)
- `validateFlooringSnapshotPayload()` — flooring-v2 **требует** `specLines` на coverings/preparations/layouts
- Forbidden keys whitelist
- Plumbing: Python seed fallback; warm-floor: hardcoded `WARM_FLOOR_V1_SEED`

**Тесты:** `admin-ui/src/features/public/generate-snapshot-validation.test.ts`

**Dev workflow (PF7):** `docs/snapshot-dev-workflow.md` — явные режимы `local` / `remote` / `strict-remote`, npm scripts, проверка drift bundled vs backend.

### 13.8 Public calculator dropdowns

| Модуль | Поведение |
|--------|-----------|
| `estimate/flooring-snapshot-options.ts` | `getFlooringCoveringOptions()` и др. — snapshot first |
| `public-flooring-snapshot.ts` | `loadFlooringSnapshot()`, runtime validator |
| `useFlooringEstimate.ts` | Defaults через `getDefaultFlooringCovering()` и др. |

**Нарушения:** `FALLBACK_FLOORING_*_OPTIONS` при пустом/invalid snapshot (V1).

### 13.9 Public calculation (`calculateFlooring`)

`admin-ui/src/features/public/public-estimate-flooring.ts`:

- **Source of truth для totals сегодня:** flat rates из snapshot
- `pickSnapshotRate()` — silent fallback (V2)
- Hardcoded line items «Клей», «Грунт», «СВП», «Затирка» — дублируют flat buckets, не specLines
- v2: labor на layout; `covering.laborPricePerM2` fallback сохранён

### 13.10 Spec modal / estimate document

| Модуль | Роль |
|--------|------|
| `public-estimate-flooring-spec.ts` | `buildFlooringSpecification()` — specLines expansion |
| Hybrid fallback | Нет specLines → `specificationSection = flatSection` (V4) |
| Partial hybrid | Часть пакетов со specLines + остаток flat (V5) |
| `estimate/spec.ts` | `mapSectionsForSpec()`, `buildEstimateSpecModalData()` |

**Drift:** totals секции из flat `calculateFlooring`; specLines totals могут отличаться (V12).

### 13.11 CSV / export / procurement

| Модуль | Роль |
|--------|------|
| `public-estimate-flooring-procurement.ts` | `buildFlooringProcurementSummary()` из specLines |
| `estimate/spec-export.ts` | `buildSpecExportCsv()`; отдельный `buildProcurementExportCsvSection()` |

**Drift:** CSV spec ≈ modal spec; procurement block не часть `PublicEstimateDocument` (V13).

### 13.12 Tests и docs

**Backend:** `test_flooring_package_projection.py`, `test_flooring_package_backend_consistency.py`, `test_public_flooring_snapshot_whitelist.py`, `test_admin_calculator_flooring_routes.py`, `test_storage_estimates_flooring_catalog_assembly.py`.

**Frontend:** `public-estimate-flooring.test.ts` (сохраняет flat fallback test), `public-estimate-flooring-spec.test.ts`, `public-flooring-snapshot.test.ts`, `flooring-package-projection.test.ts`, `admin-ui/tests/smoke/flooring.spec.ts`.

### 13.13 Другие разделы (baseline для universal engine)

| Раздел | Snapshot | Package model |
|--------|----------|---------------|
| Plumbing | `plumbing_snapshot.py`, `generated/plumbing.snapshot.json` | Zones + packages + atoms — ближе к ideal, другая schema |
| Warm floor | `warm_floor_snapshot.py`, hardcoded seed | Flat rates only |
| Walls | No snapshot | Flat rates + те же consumable names (`public-estimate-walls.ts`) |
| Electric, ceilings, doors, furniture | Various flat calculators | No package engine |

---

## 14. Каталог нарушений package-first (V1–V18)

| # | Violation | Где | Severity |
|---|-----------|-----|----------|
| V1 | Silent hardcoded dropdown fallback | `flooring-snapshot-options.ts` `FALLBACK_FLOORING_*` | High |
| V2 | `pickSnapshotRate()` silent fallback | `public-estimate-flooring.ts` (~118–125) | High |
| V3 | Totals from flat, not package projection | `calculateFlooring()` | **Critical** |
| V4 | Spec hybrid: specLines OR flat fallback | `buildFlooringSpecification()` | **Critical** |
| V5 | Partial room hybrid (mixed models) | `buildFlooringSpecification()` (~194–249) | High |
| V6 | Name heuristics vs structural fields | `_classify_consumable` (backend), snapshot classifiers, `coveringConsumableUsesPurchaseArea` (frontend) | High |
| V7 | Flat create without package | `create_flooring_catalog.py`, POST routes | High |
| V8 | Empty assembly shell allowed | PUT blocked; create+no assembly OK | Medium |
| V9 | Duplicated validation/projection rules | backend + `flooring-package-projection.ts` + `generate-snapshot.js` + `public-flooring-snapshot.ts` | High |
| V10 | plinthTypes/globalAddons flat-only | `DEFAULT_PUBLIC_FLOORING_SNAPSHOT` | Medium (accepted v1?) |
| V11 | preparation material outside assembly | PF2 synthetic preserves flat material | Medium |
| V12 | Modal totals ≠ specLines totals | by design today (test asserts) | **Critical** для unified doc |
| V13 | CSV procurement separate from estimate doc | `spec-export.ts` | Medium |
| V14 | Title→code mapping | `_COVERING_TITLE_TO_CODE`, `_resolve_public_code` | Medium |
| V15 | Legacy `_attach_spec_lines_to_snapshot_row` | `flooring_snapshot.py` | Low (dead path for public) |
| V16 | Local dev without ENV uses seed | masks remote drift | Medium |
| V17 | Orphan assembly on delete | `public-site-architecture-plan.md` | Medium |
| V18 | Custom catalog codes vs fixed TS unions | `FlooringCoveringType` hardcoded | Medium |

Связь с §7: V3–V5, V12 закрывают большинство «неприемлемых состояний» для пилота полов.

---

## 15. Ideal architecture (дополнение к §3–§5)

§3–§5 и §8 (PE1–PE8) уже задают контракт и слои. Ниже — уточнения аудита без дублирования полных type blocks.

### 15.1 Сущности и routing

- `PackageCatalogItem`: `code`, `title`, `section`, `targetKind`, `status`, `version`, `validity`, `rows`, `flatProjection`, `specLines`, `procurementMeta`.
- `PackageRow`: структурное поле `consumableRole` (`adhesive` | `primer` | `svp` | `grout` | `underlay` | `other`) вместо substring по `title`.
- `section` = id раздела калькулятора; `targetKind` = подтип внутри раздела; **section adapter** задаёт allowed kinds, basis, projection keys, domain validation.

### 15.2 Сигналы валидности

| Signal | Rule |
|--------|------|
| `hasEnabledRows` | ≥1 enabled row |
| `requiredKindsPresent` | section-specific (covering→material, prep/layout→work) |
| `formulaParamsValid` | package-aware formulas complete |
| `projectionConsistent` | flat cache == sum(projection) |
| `specLinesComplete` | все buckets покрыты (или buckets deprecated) |
| `forbiddenKeysClean` | нет admin-only полей в public payload |

### 15.3 Статусы публикации (целевые)

| Status | Admin | Snapshot | Public dropdown |
|--------|-------|----------|-----------------|
| draft | editable, invalid OK | no | no |
| ready | valid package, not published | preview only | no |
| published | valid | yes | yes |
| disabled | frozen | no | no |

*Сейчас статусов нет — только implicit filter через `_publish_package_backed_snapshot_row`.*

### 15.4 Потоки validation и projection

```mermaid
flowchart TD
  AdminSave[Admin save package] --> RowVal[validate_package_rows]
  RowVal --> Proj[project_package]
  Proj --> FlatCache[write flat cache + assembly atomic]
  FlatCache --> PubGate{status == published?}
  PubGate -->|yes| SnapVal[validate_public_package]
  SnapVal --> Snapshot[BuildSnapshotUseCase]
  PubGate -->|no| End[CRM only]
  Snapshot --> GenJSON[generate-snapshot.js]
  GenJSON --> Public[Public loader strict validate]
```

**Projection:** один `project_package(sectionAdapter, rows)` → `{ flatProjection, specLines, procurementHints }`; без title substring classification.

**Public contract:** `PublicPackageItem` с обязательными `specLines` для v2+; loader strict validate; dropdown = published only; без `FALLBACK_*` в production.

**Estimate document:** один builder `selections + snapshot → PublicEstimateDocument`; modal/CSV/PDF = renderers; totals = sum(document lines); procurement = appendix из тех же keys, что specLines.

### 15.5 Reuse across sections (PE layers)

| Layer | Shared | Section-specific |
|-------|--------|------------------|
| PE1 Contract | `PublicPackage`, validators | — |
| PE2 Validation | base rules | adapter: kinds, basis |
| PE3 Projection | formula engine | adapter: buckets, roles |
| PE4 Snapshot gateway | forbidden keys, status filter | mapper per section |
| PE5 Public loader | dropdown builder | section hooks |
| PE6 Estimate doc | section/group structure | quantity resolver |
| Plumbing head start | zone/package composition | map to `PackageRow` model |

---

## 16. Ideal vs current

### 16.1 Что уже близко к ideal

| Component | Verdict |
|-----------|---------|
| Assembly DB + REST | **Keep** — шаблон для других разделов |
| `validate_flooring_package_for_publication` (PF1) | **Keep** — extract to generic + adapter |
| `build_flooring_package_projection` | **Keep** — extract PE3 engine |
| PF2 synthetic migration | **Keep** — pattern для legacy backfill |
| Bridge1 `_package_backed_catalog_rows` | **Keep temporarily** |
| `generate-snapshot.js` flooring-v2 validation | **Keep** — extend to PE4 |
| `public-flooring-snapshot.ts` loader | **Keep** — generalize |
| Plumbing zones/packages | **Reuse concept** — align schema в PE8 |
| `spec-export.ts` structure | **Keep** — wire to unified doc |

### 16.2 Keep / rename / extract / delete

| Action | Target |
|--------|--------|
| **Extract** | `package_engine/` — validation, projection, snapshot gateway |
| **Rename** | optional explicit `package` block рядом со `specLines` |
| **Keep temp** | `DEFAULT_PUBLIC_FLOORING_SNAPSHOT` только для plinth/globalAddons |
| **Delete (after PF5)** | `FALLBACK_FLOORING_*`, `pickSnapshotRate` fallbacks, flat spec fallback tests |
| **Replace** | `_classify_consumable(title)` → `consumableRole` on row |
| **Deprecate** | Flat POST create → assembly-first create |
| **Delete** | `_attach_spec_lines_to_snapshot_row` legacy path |

### 16.3 Временные migration bridges

| Bridge | Until |
|--------|-------|
| Bridge1 `_package_backed_catalog_rows` | Все global rows с valid assemblies (PF2 в prod DB) |
| Synthetic PF2 seed on boot | Manual assemblies replace synthetic |
| flooring-v1 legacy in validator | Нет v1 snapshots в wild |
| `buildFlooringSpecification` flat fallback | PF5 unified estimate doc shipped |
| Frontend `flooring-package-projection.ts` | Admin → backend preview endpoint only |

**Bridge «reliable» when:**

- Remote snapshot = generated JSON (CI gate)
- Zero flat-only rows в `/api/public/catalog/flooring/snapshot`
- E2E PF8 green
- Modal totals == export totals == calculator totals (±rounding policy)

### 16.4 Migration risks

- Underlay promote price inflation (`public-site-architecture-plan.md`)
- Partial DB catalog vs defaults overlay
- Orphan assemblies on delete (V17)
- Custom codes vs TS union types (V18)
- SpecLines partial publish drops consumables (mitigated by `covering_spec_lines_are_complete`)
- Duplicate titles → wrong code mapping (V14)

---

## 17. Rollout PF + PE (согласование с flooring audit)

Карта фаз из `docs/flooring-package-first-audit-plan.md`, выровненная с PE1–PE8 (§8) и Step 0–6 (§9).

```text
DONE/PARTIAL: PF1 (validation), PF2 (synthetic), PF3+Bridge1 (snapshot filter), PF7 partial (local seed)
NEXT: PF4 → PF3 hardening → PF5 → PF6 → PF8 → PE generalization
```

| Stage | Scope | Ключевые файлы | Verification |
|-------|-------|----------------|--------------|
| **PF1 ✓** | Backend validation hardening | `flooring_catalog_assembly.py` | `test_flooring_package_backend_consistency.py` |
| **PF2 ✓/△** | Synthetic migration | `migrate_flooring_synthetic_assemblies.py`, startup seed | `test_public_flooring_snapshot_whitelist.py` |
| **PF3 ✓/△** | Snapshot package contract | `flooring_snapshot.py`, Bridge1 | `generate-snapshot-validation.test.ts`, whitelist tests |
| **PF4** | Admin package-first save | block flat POST; assembly required; projection read-only | vitest save flow; route 400 on flat create |
| **PF5** | Public estimate document | `buildPublicEstimateDocument()`; убрать flat fallback в spec | golden: totals = spec totals |
| **PF6** | Modal/CSV/PDF | `spec.ts`, `spec-export.ts` на unified doc | CSV parity test |
| **PF7** | Local dev reliability | ENV docs; fail if seed overwrites remote | prebuild remote mode CI |
| **PF8** | E2E chain | admin → API → generate-snapshot → dropdown → calc → modal → CSV | smoke + pytest/vitest |
| **PE1** | Shared contract types | extract validators | shared forbidden-key test |
| **PE2–PE3** | Generic validation + projection | section adapters | per-section unit tests |
| **PE4–PE6** | Snapshot gateway, loader, estimate doc | generalize flooring modules | plumbing pilot #2 |
| **PE7** | Flooring pilot completion | см. §8 PE7 | acceptance из §10 |
| **PE8** | Rollout other sections | adapters only | section snapshot tests |

**Минимальный порядок для стабильного пилота полов** (из flooring audit):

```text
PF1 → PF2 → PF3 → PF4 → PF7 → PF8
```

Затем:

```text
PF5 → PF6
```

для единого estimate document, CSV и PDF.

### 17.1 Тесты к добавлению

- Cross-layer parity: backend projection == admin preview == snapshot row
- `calculateFlooring` totals == sum(specLines × quantities) для package-only fixture
- Remove/mark legacy `flat when no specLines` (`public-estimate-flooring.test.ts`)
- Orphan assembly delete test
- Custom code dropdown после PF5 dynamic options
- Procurement totals consistency с specLines aggregation keys

### 17.2 Когда legacy fallback допустим

- Явные `flooring-v1` fixture tests
- Local dev без backend (documented ENV)
- `plinthTypes` / `globalAddons` до отдельной package-фазы

---

## 18. Executive summary (аудит 2026-06-04)

### Близость к ideal

| Scope | % |
|-------|---|
| Flooring infrastructure (DB, REST, projection, snapshot gate) | **~65–70%** |
| Flooring principle compliance (no flat fallback, unified doc) | **~45–50%** |
| Universal Package Engine (shared layers PE1–PE6) | **~15–20%** |
| Non-flooring sections | **~5%** (plumbing composition closest) |

### Top 5 actions

1. **PF5: Unified `PublicEstimateDocument`** — убрать dual path totals (flat calc) vs spec (specLines); modal/CSV/PDF из одного источника (закрывает V3, V4, V12).
2. **Remove public flat fallback** — `pickSnapshotRate`, `FALLBACK_FLOORING_*`, flat branch в `buildFlooringSpecification`; strict loader fail-fast (V1, V2, V4, V5).
3. **Extract Package Engine core (PE1–PE3)** — один validation/projection модуль; flooring/plumbing = adapters; удалить дубли JS/Python (V9).
4. **PF4: Admin package-first create** — запрет flat-only POST; `consumableRole` вместо title heuristics (V6, V7).
5. **PF8 E2E gate + Bridge1 exit criteria** — remote prebuild обязателен; synthetic migration в prod DB; три equal totals (calc/spec/export).

### Следующий практический шаг

См. §12: runtime drift flooring → package-first snapshot → ограничить flat fallback → package-view estimate document → проверка dropdown/modal/CSV локально.

