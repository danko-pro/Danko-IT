# Phase 7B0: Ceilings Calculator Implementation Spec

Дата анализа: 2026-05-14.

Источник: Google Sheet `КП от «14» апреля 2026 г.`.

URL: `https://docs.google.com/spreadsheets/d/1PWoIgBbEC10g7DKAV2LVIZBywcEvx3TaJBMqtmBUuV4`.

Scope: только инвентаризация и техническая спецификация будущего переноса потолочного калькулятора. Runtime-код, миграции, repositories, routes, payload builders, tests и frontend не изменялись.

Repository note: `Gap-map file is tracked in repo: docs/calculator-google-sheets-gap-map.md`.

## 1. Executive summary

В Google Sheet по потолкам есть три разных слоя данных.

| Слой | Где находится | Что содержит | Статус переноса |
|---|---|---|---|
| Справочник позиций | `Пот v1` | Технические позиции `PT-*`: название, группа, единица, работа, материал, оборудование, расходники, коэффициент, комментарий | Источник для catalog/default items |
| Пакетные defaults | `Справочник (Потолок)` | Пакеты `MIN`, `MID`, `MAX`, базовые цены материала/работы и клиентские описания | Источник для global defaults и package templates |
| Расчетный блок | `Расчет`, строки 196-223 | Включение строк, помещение, позиция, количество, единица, суммы материалов/оборудования/работ/расходников/итого | Источник для project ceiling rows и domain rules |
| Клиентский текст | `КП смета`, раздел `5. ПОТОЛКИ`; `Спецификация`, строка потолков | Коммерческий текст, итоговые суммы с коэффициентом, AI-инструкции | Не переносить в Phase 7B calculator runtime |

На сайте потолочный калькулятор отсутствует: нет `ceilings` stage во frontend, нет backend routes/payloads, нет SQLAlchemy таблиц, нет repository, нет domain module.

Потолки можно переносить как отдельный calculator stage, потому что они привязаны к существующим `estimate_projects`, `estimate_rooms` и room geometry, но имеют собственный каталог позиций и собственные project rows. Это не требует смешивать потолки с текущими `flooring`, `wall-finish`, `warm-floor` или `doors`.

КП и AI-текст пока не переносим, потому что это document-generation layer. Источник истины должен быть structured ceiling calculation payload, а не клиентский текст из `КП смета` или prompt-инструкции из `Спецификация`.

Лучший архитектурный образец для потолков: гибрид `flooring`/`wall-finish` как room-based stage с summary/specification и `doors` как пример catalog item -> project item snapshot. `warm-floor` слишком простой для потолков, потому что не покрывает каталог произвольных позиций.

## 2. Source sheets reviewed

| Sheet name | What was reviewed | Relevant ranges / sections | Notes |
|---|---|---|---|
| `Пот v1` | Справочник потолочных позиций | Rows 1-26 | Чистый справочник. Формул нет. Основной источник catalog/default items. |
| `Справочник (Потолок)` | Пакеты потолков и клиентские описания | Rows 1, 3, 19, 35 | Есть пакеты `MIN`, `MID`, `MAX`; тексты клиентские, не runtime formulas. |
| `Расчет` | Потолочный расчетный блок | Rows 196-223 | Основная расчетная матрица потолков. Использует lookup в `Пот v1`. |
| `КП смета` | Раздел `5. ПОТОЛКИ` | Around row 201; totals from ceiling calculation | Клиентский документ. Нужен позже для proposal generation. |
| `Спецификация` | Строка `5. ПОТОЛКИ` | Row 11 | AI/technical text generation instructions. Не переносить в calculator runtime. |

## 3. Ceiling source model from Google Sheet

### `Пот v1` source fields

| Source field / column | Meaning | Example value | Target field candidate | Notes |
|---|---|---|---|---|
| `A: ID` | Код позиции | `PT-001` | `source_code`, `source_key` | Должен попасть в catalog item и snapshot. |
| `B: Позиция` | Название позиции | `Натяжной потолок ПВХ матовый / сатин` | `title` / `title_snapshot` | Основное client/internal название позиции. |
| `C: Группа` | Категория позиции | `Основной потолок`, `Профили`, `Ниши`, `Закладные`, `Доп. элементы`, `Демонтаж`, `Подготовка`, `ГКЛ`, `Отделка`, `Подсветка` | `category` / `category_snapshot` | Нужна для фильтров, UI группировки и specification. |
| `D: Ед. изм.` | Единица измерения | `м²`, `м.п.`, `шт` | `unit` / `unit_snapshot` | Определяет quantity rule. |
| `E: Работа, ₽/ед.` | Стоимость работы за единицу | `1700.0` | `work_price` / `work_price_snapshot` | Умножается на quantity и coefficient. |
| `F: Материал, ₽/ед.` | Стоимость материала за единицу | `1000.0` | `material_price` / `material_price_snapshot` | В `Расчет` идет в materials total. |
| `G: Оборудование, ₽/ед.` | Оборудование за единицу | `800.0` for LED | `equipment_price` / `equipment_price_snapshot` | Для подсветки и потенциальных систем. |
| `H: Расходники, ₽/ед.` | Расходники за единицу | `150.0` | `consumables_price` / `consumables_price_snapshot` | Отдельный total. |
| `I: Коэф.` | Коэффициент позиции | `1.0` | `price_factor` / `price_factor_snapshot` | В Sheet применяется к работам и материалам, но не ко всем колонкам одинаково. |
| `J: Включить в` | Раздел включения | `Потолки` | `include_section` | Для фильтра раздела. |
| `K: Комментарий` | Технический комментарий | `полотно ПВХ, профиль, крепеж, монтаж` | `note` / `note_snapshot` | Нужен для specification items. |

### `Пот v1` catalog groups

| Group | Unit examples | Position examples | Transfer note |
|---|---|---|---|
| `Основной потолок` | `м²` | `PT-001`, `PT-002`, `PT-003` | Основная площадь потолков по rooms. |
| `Профили` | `м.п.` | `PT-004`, `PT-005`, `PT-006` | Обычно quantity from perimeter/manual length. |
| `Ниши` | `м.п.` | `PT-007`, `PT-008`, `PT-009` | Curtain niche and curtain profile. |
| `Закладные` | `шт`, `м.п.` | `PT-010` - `PT-013` | Lighting/carriage embedded elements. |
| `Доп. элементы` | `шт` | `PT-014` - `PT-017` | Pipe bypass, ventilation, hatches, complex areas. |
| `Демонтаж` | `м²` | `PT-018` | Optional demolition. |
| `Подготовка` | `м²` | `PT-019` | Optional preparation. |
| `ГКЛ` | `м.п.`, `м²` | `PT-020`, `PT-021` | GKL boxes and sheathing. |
| `Отделка` | `м²` | `PT-022`, `PT-023` | Painting/spackling niche zones. |
| `Подсветка` | `м.п.`, `шт` | `PT-024`, `PT-025` | LED strip and power supply. |

### `Справочник (Потолок)` package defaults

| Package | Source row | Material price | Work price | What it means | Target candidate |
|---|---:|---:|---:|---|---|
| `Натяжной потолок ( MIN )` | 3 | `900.0` | `1000.0` | Economy package: basic PVC matte ceiling, minimal lowering, PVC insert, limited light cut-ins | global default package/template |
| `Натяжной потолок ( MID )` | 19 | `1000.0` | `1700.0` | Mid package: choice of PVC/fabric/color/texture, hidden communications, better details | global default package/template |
| `Натяжной потолок ( MAX )` | 35 | `1500.0` | `2000.0` | Max package: multilevel systems, combinations, engineering integration, complex lighting | global default package/template |

Package descriptions are client-facing. They should not become calculation source of truth. They can become default package metadata and proposal text templates later.

## 4. Calculation rules

### Common row calculation

Every ceiling row in `Расчет` rows 197-223 follows the same conceptual structure.

| Step | Meaning | Sheet expression pattern | Target field |
|---|---|---|---|
| Enabled | Include row or ignore row | `V = TRUE/1` | `is_enabled` |
| Room | Optional room binding | `X = room name` | `room_id`, `room_name_snapshot` |
| Position | Catalog item title | `AC = position title` | `catalog_item_id`, `title_snapshot` |
| Quantity | Manual or derived amount | `AQ` | `quantity`, `quantity_source` |
| Unit | Lookup from catalog | `VLOOKUP(position, 'Пот v1'!B:K, 3)` | `unit_snapshot` |
| Materials | Quantity * material price * coefficient | `AQ * VLOOKUP(..., 5) * VLOOKUP(..., 8)` | `material_total` |
| Equipment | Quantity * equipment price | `AQ * VLOOKUP(..., 6)` | `equipment_total` |
| Work | Quantity * work price * coefficient | `AQ * VLOOKUP(..., 4) * VLOOKUP(..., 8)` | `work_total` |
| Consumables | Quantity * consumables price | `AQ * VLOOKUP(..., 7)` | `consumables_total` |
| Total | Sum of categories | `SUM(AY, BC, BG, BK)` | `total` |
| Comment | Lookup from catalog | `VLOOKUP(position, 'Пот v1'!B:K, 10)` | `note_snapshot` |

Important nuance: coefficient in the Sheet is applied to material and work formulas, but equipment and consumables are not multiplied by coefficient in the observed formulas. The future domain layer must either preserve this behavior or explicitly document a product decision to change it.

### Area-based positions, `м²`

| Position examples | Input data | Formula meaning | Result fields | Risks |
|---|---|---|---|---|
| `Натяжной потолок ПВХ матовый / сатин`, `Натяжной потолок тканевый`, `Натяжной потолок световой` | Room floor/ceiling area from room geometry or manual quantity | Quantity = room area, usually current Sheet pulls from room area columns like `AB9:AB18` via room name matching | `quantity`, `unit=m²`, material/work/equipment/consumables totals | Need decide if ceiling area equals floor area by default; old estimates need quantity snapshots. |
| `Демонтаж старого потолка`, `Подготовка основания потолка`, `Гипсокартонная зашивка потолка`, niche painting/spackling | Room area or manual area | Quantity = area selected manually or derived from room | Same totals | Some rows may not map to full room area; UI must allow manual override. |

### Perimeter-based positions, `м.п.`

| Position examples | Input data | Formula meaning | Result fields | Risks |
|---|---|---|---|---|
| `Парящий потолок / парящий профиль`, `Теневой профиль`, `Потолочный плинтус / вставка ПВХ` | Room perimeter or manual length | Quantity = room perimeter or manual line length | `quantity`, `unit=м.п.`, totals | Current room geometry already has perimeter, but Sheet also uses manual sums for profile lengths. Need both modes. |
| `Профиль под нишу штор`, `Ниша под шторы`, `Закладная под потолочный карниз`, `Закладная под трековый светильник`, `Гипсокартонный короб потолочный`, `Светодиодная подсветка потолка` | Manual linear segments, sometimes sum of lengths | Quantity = sum of segment lengths | Same totals | Need line-length editor, not only room perimeter. |

Observed examples from `Расчет`:

| Row | Room | Position | Quantity source |
|---:|---|---|---|
| 203 | `Комната I` | `Светодиодная подсветка потолка` | Manual segment sum: `3.44+1.1+1.1+1.2+1.1+1.1` |
| 204 | `Комната II` | `Светодиодная подсветка потолка` | Manual segment sum: `5.8+3.715` |
| 219 | `Кухня - Гостинная` | `Парящий потолок / парящий профиль` | Manual segment sum: `1.6+1+1.6+1+1+1+1` |

### Piece-based positions, `шт`

| Position examples | Input data | Formula meaning | Result fields | Risks |
|---|---|---|---|---|
| `Закладная под точечный светильник`, `Врезка точечного светильника` | Count of lighting points | Quantity = count | `quantity`, `unit=шт`, totals | Electrical and ceilings both reference lighting. Avoid coupling with future electrical module in Phase 7B. |
| `Закладная под люстру / подвес` | Count of chandeliers/suspensions | Quantity = count | Same totals | Might later sync with electrical lighting groups, but not in Phase 7B. |
| `Обход трубы`, `Обход вентиляции / решетки`, `Люк ревизионный в потолке`, `Дополнительный угол / сложный участок`, `Блок питания LED` | Manual count | Quantity = count | Same totals | UI needs manual add item rows. |

### Lighting / embedded elements

Lighting-related ceiling positions in `Пот v1`:

| Code | Position | Unit | Category | Transfer note |
|---|---|---|---|---|
| `PT-010` | `Закладная под точечный светильник` | `шт` | `Закладные` | Project item row, count-based. |
| `PT-011` | `Врезка точечного светильника` | `шт` | `Закладные` | Project item row, count-based. |
| `PT-012` | `Закладная под люстру / подвес` | `шт` | `Закладные` | Project item row, count-based. |
| `PT-013` | `Закладная под трековый светильник` | `м.п.` | `Закладные` | Project item row, linear. |

Phase 7B should treat these as ceiling items only. Future electrical module may reference the same design intent, but should not block ceiling implementation.

### LED / backlight items

| Code | Position | Unit | Price structure | Transfer note |
|---|---|---|---|---|
| `PT-024` | `Светодиодная подсветка потолка` | `м.п.` | work + material + equipment + consumables | Needs linear quantity and equipment total. |
| `PT-025` | `Блок питания LED` | `шт` | work + material + equipment + consumables | Needs count quantity and equipment snapshot. |

### Floating profile / shadow profile

| Code | Position | Unit | Quantity source | Transfer note |
|---|---|---|---|---|
| `PT-004` | `Парящий потолок / парящий профиль` | `м.п.` | manual segments or room perimeter | Needs `quantity_source=manual_length` or `room_perimeter`. |
| `PT-005` | `Теневой профиль` | `м.п.` | manual segments or room perimeter | Same rule as profile. |

### Curtain niches

| Code | Position | Unit | Quantity source | Transfer note |
|---|---|---|---|---|
| `PT-007` | `Профиль под нишу штор` | `м.п.` | manual length | Separate item. |
| `PT-008` | `Ниша под шторы` | `м.п.` | manual length | Separate item. |
| `PT-009` | `Закладная под потолочный карниз` | `м.п.` | manual length | Separate item. |
| `PT-022` | `Покраска потолка в нише штор` | `м²` | manual area | Optional finish item. |
| `PT-023` | `Шпаклевка потолка в нише штор` | `м²` | manual area | Optional finish item. |

### Hatches / обходы / нестандартные элементы

| Code | Position | Unit | Quantity source | Transfer note |
|---|---|---|---|---|
| `PT-014` | `Обход трубы` | `шт` | manual count | Additional item. |
| `PT-015` | `Обход вентиляции / решетки` | `шт` | manual count | Additional item. |
| `PT-016` | `Люк ревизионный в потолке` | `шт` | manual count | Additional item with material cost. |
| `PT-017` | `Дополнительный угол / сложный участок` | `шт` | manual count | Complexity item. |

## 5. Proposed backend model

No migrations in Phase 7B0. This is only a future schema draft.

### `estimate_ceiling_configs`

| Aspect | Draft |
|---|---|
| Назначение | Project-level настройки потолочного модуля. |
| Основные поля | `id`, `owner_user_id`, `project_id`, `default_package_code`, `default_ceiling_height_mode`, `include_demolition`, `include_preparation`, `notes`, `created_at`, `updated_at` |
| `owner_user_id` | Required on repository-level for project config. |
| Global defaults | No for project configs. |
| `estimate_project_id` | Required. |
| `room_id` | No. |
| Snapshots | Package selection snapshot can be stored here or in room/items. |

### `estimate_ceiling_catalog_items`

| Aspect | Draft |
|---|---|
| Назначение | Catalog/default потолочных позиций from `Пот v1` and user custom items. |
| Основные поля | `id`, `owner_user_id`, `source_code`, `title`, `category`, `unit`, `work_price`, `material_price`, `equipment_price`, `consumables_price`, `price_factor`, `include_section`, `note`, `is_active`, `sort_order`, `created_at`, `updated_at` |
| `owner_user_id` | `NULL` allowed for global defaults; user id for custom items. |
| Global defaults | Yes. `owner_user_id = NULL` means seeded default from source. |
| `estimate_project_id` | No direct project relation for catalog defaults. |
| `room_id` | No. |
| Snapshots | Catalog values are copied into project item snapshots when selected. |

### `estimate_ceiling_rooms`

| Aspect | Draft |
|---|---|
| Назначение | Room-level ceiling settings and default selected ceiling type. |
| Основные поля | `id`, `owner_user_id`, `project_id`, `room_id`, `is_enabled`, `ceiling_area_m2`, `area_source`, `perimeter_m`, `perimeter_source`, `default_catalog_item_id`, `package_code_snapshot`, `note`, `created_at`, `updated_at` |
| `owner_user_id` | Required on repository-level. |
| Global defaults | No. Project data only. |
| `estimate_project_id` | Required. |
| `room_id` | Required when tied to existing estimate room. |
| Snapshots | Area/perimeter source snapshots required for stable estimates. |

### `estimate_ceiling_room_items` / `estimate_project_ceiling_items`

Recommended name: `estimate_ceiling_items` or `estimate_project_ceiling_items`. If every item belongs to a project and optionally a room, `estimate_project_ceiling_items` is explicit and consistent with `estimate_project_doors`.

| Aspect | Draft |
|---|---|
| Назначение | Selected ceiling rows for a project: area, length, piece items, LED, niches, profiles, hatches. |
| Основные поля | `id`, `owner_user_id`, `project_id`, `room_id`, `catalog_item_id`, `source_code_snapshot`, `title_snapshot`, `category_snapshot`, `unit_snapshot`, `quantity`, `quantity_source`, `work_price_snapshot`, `material_price_snapshot`, `equipment_price_snapshot`, `consumables_price_snapshot`, `price_factor_snapshot`, `work_total`, `material_total`, `equipment_total`, `consumables_total`, `total`, `note_snapshot`, `is_enabled`, `sort_order`, `created_at`, `updated_at` |
| `owner_user_id` | Required on repository-level. |
| Global defaults | No. This is project/user data only. |
| `estimate_project_id` | Required. |
| `room_id` | Optional but recommended where item belongs to a room. Some global project items may have no room. |
| Snapshots | Required. This is the main immutable estimate row snapshot. |

## 6. Pricing snapshot requirements

Minimum snapshot fields for every project ceiling item:

| Snapshot field | Why needed |
|---|---|
| `source_catalog_item_id` | Keeps link to catalog item without making old estimate depend on current catalog values. |
| `source_code` / `source_key` | Keeps original `PT-*` identity from Sheet/default catalog. |
| `title_snapshot` | Old estimate must preserve old title. |
| `category_snapshot` | Old estimate must preserve grouping/specification. |
| `unit_snapshot` | Quantity meaning must stay stable. |
| `work_price_snapshot` | Work price at estimate creation/update time. |
| `material_price_snapshot` | Material price at estimate creation/update time. |
| `equipment_price_snapshot` | Equipment price at estimate creation/update time. |
| `consumables_price_snapshot` | Consumables price at estimate creation/update time. |
| `price_factor_snapshot` | Preserves source coefficient. |
| `quantity_formula_snapshot` / `quantity_source` | Explains whether quantity came from room area, room perimeter, manual length, manual count, segment sum, or manual area. |
| `note_snapshot` | Preserves technical condition/comment used for specification. |
| `room_name_snapshot` | Useful if room is renamed later. |
| `package_code_snapshot` | Useful if selected from package default. |

Totals should also be stored or reproducible from snapshots. If totals are stored, tests must verify consistency with domain calculation.

## 7. Proposed domain layer

Future module:

```text
src/supply_bot/estimates/domain/ceiling.py
```

Do not implement in Phase 7B0. Proposed pure functions:

| Function candidate | Responsibility |
|---|---|
| `estimate_ceiling_area_quantity(...)` | Resolve quantity for `м²` positions from room area/manual area. |
| `estimate_ceiling_perimeter_quantity(...)` | Resolve quantity for `м.п.` positions from room perimeter/manual length/segment sum. |
| `estimate_ceiling_piece_quantity(...)` | Resolve quantity for `шт` positions from manual count. |
| `estimate_ceiling_item_totals(...)` | Calculate material/equipment/work/consumables/total from quantity and price snapshots. |
| `estimate_ceiling_summary(...)` | Aggregate project totals: material, equipment, work, consumables, total, count by category. |
| `build_ceiling_spec_items(...)` | Build structured specification rows from calculated item rows. |
| `normalize_ceiling_quantity_source(...)` | Normalize source enum: `room_area`, `manual_area`, `room_perimeter`, `manual_length`, `segment_sum`, `manual_count`. |

Domain layer rules:

| Rule | Decision |
|---|---|
| Formulas not in frontend | Frontend may preview, backend/domain is source of truth. |
| Formulas not in `calculator_payloads` | Payload builders only assemble API response. |
| No DB/session dependency | Domain functions must be pure. |
| No client text | AI/KP text belongs to document-generation layer. |

## 8. Proposed backend files for next phase

Future files for Phase 7B1/7B2 and later:

| File | Phase | Purpose |
|---|---|---|
| `src/supply_bot/storage_estimates/tables.py` | 7B1 | Add SQLAlchemy table metadata for ceiling entities. |
| `migrations/versions/0007_create_estimate_ceilings.py` | 7B1 | Create ceiling tables and indexes. |
| `src/supply_bot/storage_estimates/ceiling_repository.py` | 7B2 | Owner-scoped SQLAlchemy repository. |
| `src/supply_bot/estimates/domain/ceiling.py` | 7B3 | Pure calculation functions. |
| `src/supply_bot/admin_api/calculator_payloads/ceilings.py` | 7B4 | Assemble ceiling payload from repository/domain. |
| `src/supply_bot/admin_api/calculator_routes/ceilings.py` | 7B4 | API routes for configs, catalog, rooms, items. |
| `tests/test_estimate_ceiling_domain.py` | 7B3 | Domain calculation tests. |
| `tests/test_storage_estimates_ceiling_repository.py` | 7B2 | Repository, isolation, snapshots, defaults. |
| `tests/test_admin_calculator_ceilings_routes.py` | 7B4 | Route smoke and owner isolation. |

Existing backend patterns to follow:

| Existing module | What to reuse conceptually |
|---|---|
| `flooring` | Room-based stage, catalogs, summary/spec items, custom consumables. |
| `wall-finish` | Room zones, preparation/layout catalogs, summary/spec composition. |
| `doors` | Catalog item selected into project item with component-like snapshots. |
| `warm-floor` | Simple room inclusion and summary, but not enough for ceiling catalog complexity. |

## 9. Proposed frontend stage

Future folder:

```text
admin-ui/src/features/calculator/ceilings
```

Recommended panels:

| Panel | Purpose | Pattern to reuse |
|---|---|---|
| `CeilingsStageRoomsPanel` | Show rooms, enable/disable ceiling per room, area/perimeter source | `flooring/rooms.tsx`, `wall-finish/rooms.tsx` |
| `CeilingRoomCard` | Room-level selected ceiling type and quantities | `flooring/card.tsx`, `wall-finish/card.tsx` |
| `CeilingCatalogPanel` | Manage/select catalog items from defaults/custom items | `flooring/catalogs.tsx`, `doors/catalog.tsx` |
| `CeilingItemEditor` | Add manual items: LED length, profiles, hatches, bypasses, embedded points | `doors/door-form.tsx`, `flooring/room-zone-actions.ts` conceptually |
| `CeilingSummaryPanel` | Material/work/equipment/consumables/total summary | `flooring/summary.tsx`, `wall-finish/summary.tsx` |
| `CeilingSpecificationPanel` | Structured spec rows, not AI/client text | `flooring/spec.tsx`, `wall-finish/spec.tsx` |
| `CeilingSettingsPanel` | Defaults: package, area source, perimeter source | `warm-floor/settings.tsx`, `flooring/settings.tsx` |

How users should work with it:

| Action | UI behavior |
|---|---|
| Select rooms | User enables rooms for ceilings, defaulting to all existing rooms if product decision allows. |
| Select ceiling type | User picks default main ceiling item from catalog/package. |
| Set quantity source | For `м²`: room area or manual area. For `м.п.`: room perimeter, manual length, or segment sum. For `шт`: manual count. |
| Add extra items | User adds LED, profiles, niches, embedded elements, hatches, bypasses as item rows. |
| See summary | UI shows category totals and full totals. |
| See specification | UI shows structured rows safe for future proposal generation. |

What can be repeated from existing modules:

| Existing module | Reusable idea |
|---|---|
| `flooring` | Stage shape, catalogs, room list, spec/summary panels. |
| `wall-finish` | Room-specific zones/items and technical map concept. |
| `doors` | Catalog item selected into project data with snapshots. |
| `screen/header-data.tsx` | Add future stage option `ceilings` only when implementation starts. |
| `screen/stages.tsx` | Add stage facade only in frontend phase, not now. |

What not to do in first UI:

| Do not do | Reason |
|---|---|
| Do not build full КП editor | Proposal generation is separate. |
| Do not add AI generation UI | AI rules are Phase 7G. |
| Do not couple with electrical stage | Electrical is Phase 7C. |
| Do not create complex CAD-like ceiling designer | Start with structured rows and quantities. |
| Do not put formulas only in frontend | Backend/domain must own calculations. |

## 10. What must NOT be moved yet

| Not moved | Reason |
|---|---|
| `КП смета` | It is client-facing commercial document, not calculation source of truth. |
| AI-инструкции из `Спецификация` | They belong to document-generation layer, not calculator runtime. |
| Commercial proposal generation | Must not live in `calculator_payloads`. |
| Коэффициент/маржа/себестоимость in client-facing text | Must not leak internal pricing logic. |
| Electrical runtime | Separate Phase 7C. |
| Plumbing runtime | Separate Phase 7D. |
| Completion packages | Separate Phase 7E. |
| Existing flooring/wall-finish/warm-floor/doors behavior | Phase 7B should be additive. |

## 11. Recommended implementation sequence

### Phase 7B1: schema + Alembic migration only

| Field | Plan |
|---|---|
| Scope | Add ceiling tables and indexes only. |
| Touched files | `src/supply_bot/storage_estimates/tables.py`, `migrations/versions/0007_create_estimate_ceilings.py` |
| Not touched files | Routes, payloads, frontend, repositories, domain formulas, existing calculator modules. |
| Red line | Alembic upgrade/check green for SQLite fallback and Postgres clean smoke. No runtime switch. |

### Phase 7B2: ceiling repository + tests

| Field | Plan |
|---|---|
| Scope | SQLAlchemy owner-scoped repository for catalog defaults, configs, rooms, project items. |
| Touched files | `src/supply_bot/storage_estimates/ceiling_repository.py`, repository tests |
| Not touched files | Frontend, routes, payloads except maybe dependency wiring if strictly needed later. |
| Red line | User 1 cannot see user 2 ceiling data; global defaults visible; project rows owner-required. |

### Phase 7B3: ceiling domain calculations + tests

| Field | Plan |
|---|---|
| Scope | Pure functions for quantity and totals. |
| Touched files | `src/supply_bot/estimates/domain/ceiling.py`, `tests/test_estimate_ceiling_domain.py` |
| Not touched files | Routes, frontend, DB schema. |
| Red line | Domain tests cover `м²`, `м.п.`, `шт`, LED, profiles, snapshots, coefficient behavior. |

### Phase 7B4: ceiling payload/routes switch

| Field | Plan |
|---|---|
| Scope | API for loading/saving ceiling config, catalog, room settings, item rows and payload summary. |
| Touched files | `calculator_payloads/ceilings.py`, `calculator_routes/ceilings.py`, route registration, route tests |
| Not touched files | Frontend UI beyond API type assumptions. |
| Red line | API owner isolation, payload totals, project linkage, no legacy SQLite path. |

### Phase 7B5: frontend ceilings stage

| Field | Plan |
|---|---|
| Scope | Add `ceilings` stage following existing stage architecture. |
| Touched files | `admin-ui/src/features/calculator/ceilings/*`, stage registry/header/stages/view integration |
| Not touched files | Backend schema, other stages, proposal generation. |
| Red line | Frontend build green; save/load works; no regressions in existing stages. |

### Phase 7B6: API/build/manual smoke

| Field | Plan |
|---|---|
| Scope | Full smoke on SQLite fallback and Postgres runtime. |
| Touched files | No new feature code unless bugfixes are required. |
| Not touched files | New unrelated features. |
| Red line | Create project -> rooms -> ceilings -> reload -> data persists -> user isolation. |

## 12. Final recommendation

Phase 7B1 can start after this document is accepted.

Source of truth for Phase 7B1 schema:

| Source | Use for schema |
|---|---|
| `Пот v1` | Catalog item fields: code, title, category, unit, work/material/equipment/consumables price, factor, include section, note. |
| `Расчет` rows 196-223 | Project item fields: enabled, room binding, selected catalog item, quantity, quantity source, unit snapshot, totals, note snapshot. |
| `Справочник (Потолок)` | Optional package/default fields and default package metadata. |
| Existing estimates schema | Owner scoping, global defaults, project linkage and index patterns. |

Questions that remain unclear before implementation:

| Question | Why it matters |
|---|---|
| Should `estimate_ceiling_rooms` be mandatory for every room or created lazily on first edit? | Affects repository API and frontend load behavior. |
| Should package `MIN/MID/MAX` auto-create room items or only set default catalog/prices? | Affects user workflow and seed logic. |
| Should coefficient apply only to material/work as in Sheet, or to all price components? | Sheet applies coefficient to material and work formulas, not equipment/consumables. |
| Should LED/electrical-related ceiling items later sync with electrical module? | For Phase 7B the answer should be no, but future integration should be planned. |
| Should project item totals be stored or always recalculated from snapshots? | Storing totals improves auditability; recalculation reduces drift. |

Recommended next phase: `Phase 7B1: schema + Alembic migration only`.

Do not start routes, repositories, frontend or domain implementation until Phase 7B1 schema boundaries are approved.
