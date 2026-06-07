# PF5c — Аудит и план: агрегированный клиентский документ сметы

**Дата:** 2026-06-05  
**Статус:** аудит + план (без реализации агрегации, без flip калькулятора)  
**Связано:** `docs/pf5-public-estimate-document-implementation-plan.md` (PF5a/b), `docs/pf6-public-estimate-document-plan.md`, `docs/package-engine-architecture-plan.md` (PF5→PF6)

**Продуктовая модель:** клиентская смета — **не** room log. Первичный вид:

1. **Работы** — список с суммарным количеством, ценой, суммой  
2. **Материалы и расходники** — агрегированные закупочные/материальные строки  
3. **Комнаты/пакеты** — только детализация расчёта (appendix / modal tab), не основной PDF

---

## Executive summary

PF5a/b уже ввели `PublicEstimateDocument` и прокинули modal через `buildPublicEstimateDocument` → `documentToEstimateSpecModalData`, но **полы и остальные разделы остаются плоским списком строк** (`flatLines`), часто **по комнате** (`title: «… — Комната»`). `groups` / `selectedPackages` в типах есть, но **не заполняются** (`buildFlooringDocumentSection` = копия `specificationSection.items` в `flatLines`, пустые `selectedPackages`).

`procurementLines` считаются отдельно (`buildFlooringProcurementSummary`), лежат в `appendices.procurement`, попадают в **CSV**, но **не в UI модалки** (`EstimateSpecOverlay` принимает prop, не рендерит). Итоги **трёхконтурные**: калькулятор и modal footer — **flat legacy `section.totals`**; document section totals — **пересчёт из строк** (`calculateDocumentLineTotals`), с явным тестом на сохранение legacy totals в адаптере modal.

**PF5c** — политика и типы **агрегированного клиентского слоя** (`workLines`, `materialLines`, `presentationGroups` / `detailGroups`), без смены формул `calculateFlooring()` до отдельного flip. **Первый шаг:** pure helpers агрегации + shadow-тесты на golden flooring, без смены overlay/PDF.

---

## 1. Текущие строки полов в документе (works / materials / consumables / tools / global)

### 1.1 Два контура: flat (калькулятор) и spec (документ/modal)

| Контур | Источник | Файл | Строки |
|--------|----------|------|--------|
| **Flat (калькулятор)** | `calculateFlooring` → `section.items` | `public-estimate-flooring.ts` ~244–397 | Per-room + global |
| **Spec (документ flooring)** | `buildFlooringSpecification` → `specificationSection.items` | `public-estimate-flooring-spec.ts` ~193–288 | Per-room specLines + global fallback |
| **Document** | `buildFlooringDocumentSection` кладёт spec items в `flatLines` | `estimate/public-estimate-document.ts` ~312–329 | = spec items |

### 1.2 Flat buckets (калькулятор, `EstimateCostCategory`)

**Per-room** (`createLineItem` / `addConsumable`, id `{prefix}-{roomId}`):

| Категория | Id prefix / title | Кол-во / база |
|-----------|-------------------|---------------|
| **works** | `flooring-installation-*`, `flooring-preparation-labor-*` | `area`, цена укладки / подготовки |
| **materials** | `flooring-material-*`, `flooring-preparation-material-*` | material: `purchaseArea`; prep material: `area` |
| **consumables** | `flooring-underlay`, `adhesive`, `primer`, `svp`, `grout`, **`flooring-tools`** | underlay/adhesive/svp/grout: `purchaseArea`; primer/tools: `area` |

**Global** (`GLOBAL_FLAT_IDS`, `public-estimate-flooring-spec.ts` ~62–67):

| Id | Категория | Условие |
|----|-----------|---------|
| `flooring-plinth-material` | materials | `includePlinth` |
| `flooring-plinth-labor` | works | то же |
| `flooring-thresholds` | materials | `includeThresholds` |
| `flooring-demolition` | works | `includeDemolition` |

### 1.3 Spec lines (каталог `FlooringPackageSpecLine.category`)

Категории snapshot: `materials | works | consumables | tools` (`public-flooring-snapshot.ts` ~9–24).

- **Разворот:** `expandSpecLinesForRoom` — одна строка на `specLine` × комната, id `flooring-spec-{sourceKind}-{code}-{line.code}-{roomId}`, title **`{line.title} — {room.roomName}`** (~141–162).
- **Маппинг в смету:** `mapSpecificationCategoryToEstimateCategory` — **`tools` → `consumables`** (~73–77, ~166–178).
- **Пропуск flat-дублей:** при наличии `specLines` room flat prefixes в `COVERING_FLAT_PREFIXES`, `PREPARATION_*`, `LAYOUT_*` (~48–60, 218–238).
- **Hybrid:** без specLines — fallback на flat; `packageFirst` отключает room flat, оставляет global (~265–267, 242–253).

### 1.4 Что попадает в `PublicEstimateDocument` сегодня

- Все spec items → `EstimateDocumentSection.flatLines` (~312–328).  
- `groups[].selectedPackages` — **пусто**.  
- `procurementLines` — только `appendices.procurement` (~398–400), не в `lines`.

**Итог по видам для клиента сейчас:** модалка/CSV показывают **room-level spec list** + опционально CSV-блок закупки; категории **works / materials / consumables** (tools уже схлопнуты в consumables на уровне `EstimateLineItem`).

---

## 2. Room-level vs клиентские агрегированные строки

| Представление | Где | Характер |
|---------------|-----|----------|
| **Room-level** | `FlooringSpecificationLine`, `specificationSection.items`, `document.flatLines`, modal list | N строк × комнаты; заголовок с именем комнаты |
| **Flat buckets** | `flooringResult.section.items` | Агрегация «внутри комнаты» на уровне типа работы (одна строка укладки на комнату), не сквозная по проекту |
| **Procurement** | `FlooringProcurementLine[]` | **Сквозная** по `aggregationKey` (проект или по комнатам для pack) |
| **Клиентский агрегат** | — | **Не реализован** (`workLines` / `materialLines` отсутствуют в коде) |

`documentToEstimateSpecSections` (`public-estimate-document.ts` ~158–182) отдаёт **все** `collectDocumentSectionLines` в `items` без группировки.

---

## 3. Procurement: raw, purchase, package, aggregationKey, project vs room

**Тип:** `FlooringProcurementLine` — `public-estimate-flooring-procurement.ts` ~9–25.

| Поле | Смысл |
|------|--------|
| `rawQuantity` | Сумма `computeFlooringSpecLineRawQuantity` по entries (~114) |
| `rawUnit` | `line.unit` |
| `purchaseMode` | `raw` или `package` (~41–43, 119–138) |
| `purchaseQuantity` | `ceil(raw/packageSize)` — **project:** сумма raw по всем комнатам; **room:** ceil per room, затем сумма (~80–104, 45–51) |
| `purchaseUnit` | `packageUnit` или `line.unit` |
| `unitPrice` / `packagePrice` | В package mode total = `purchaseQuantity * packagePrice` |
| `aggregationKey` | `line.aggregationKey \|\| code \|\| title\|unit` (~36–38) |
| `purchaseAggregation` | Явное `room`/`project`, default: **works → room**, иначе **project** (~45–51) |

**Сборка:** `buildFlooringProcurementSummary` (~163–204) — только строки из **catalog `specLines`**, не из global flat (плинтус/пороги).

**Тесты:** `public-estimate-flooring-procurement.test.ts` (glue/SVP package, room vs project); интеграция — `calculateFlooring` не меняет flat totals (~334+).

---

## 4. Может ли `procurementLines` быть основой блока «Материалы и расходники»

**Частично — да, с оговорками.**

| Критерий | Оценка |
|----------|--------|
| Покрытие материалов/расходников из пакетов | **Да**, если позиция в `specLines` с корректным `aggregationKey` |
| Упаковки и закупочные единицы | **Да** — `purchaseQuantity`, `packagePrice` ближе к «листу закупки» |
| Работы | **Нет** в procurement как клиентский блок работ (works в procurement редки; default aggregation room) |
| Global (плинтус, пороги, демонтаж) | **Нет**, пока не в `specLines` |
| Совпадение сумм со spec/flat | **Не гарантировано** — package ceil vs `quantity * unitPrice` в spec lines |
| Tools | В procurement category может быть `tools`; в CSV → «Расходники» (`spec-export.ts` ~125–130) |

**Рекомендация PF5c:**  
- **Материалы и расходники (клиент):** primary из **`procurementLines`** (materials + consumables + tools), дополнение **global material lines** из `flatLines` / spec fallback, не дублируя room-level spec qty.  
- **Работы:** отдельная агрегация из document/spec lines (см. §5), не из procurement.

---

## 5. Ключи агрегации работ

**Цель:** одна строка на «одинаковую» работу по проекту; **не смешивать** разные `unitPrice` / пакеты.

Предлагаемый ключ `WorkAggregationKey` (новый helper, PF5c1):

```ts
// Псевдокод политики
key = [
  normalizeTitle(baseTitle),      // без суффикса " — {roomName}"
  category,                        // must be "works"
  unit,
  unitPrice,                       // строгое равенство
  packageCode?,                    // covering|preparation|layout code если известен
  targetKind?,                     // covering | preparation | layout
].join("|")
```

**Источники строк:**

1. `EstimateDocumentLine` с `category === "works"` из `flatLines` / будущих package lines.  
2. Парсинг title: spec формат `{title} — {roomName}` (`expandSpecLinesForRoom` ~154).  
3. Global works: id из `GLOBAL_FLAT_IDS` (plinth labor, demolition) — **отдельные ключи по id**, не merge с room works.

**Запрещено:** merge строк с разным `unitPrice` или разным `packageCode` при том же title.

**Количество:** `sum(quantity)`; **сумма:** `roundMoney(sum(qty) * unitPrice)` или sum line totals — зафиксировать одну политику (§10).

---

## 6. Агрегация материалов (package vs raw, единицы)

| Режим | Когда | Total |
|-------|--------|-------|
| **Procurement package** | `purchaseMode === "package"` | `purchaseQuantity * packagePrice` |
| **Procurement raw** | иначе | `rawQuantity * unitPrice` |
| **Spec line (room)** | fallback / сверка | `quantity * unitPrice` per room |

**Ключ материалов (клиент):** приоритет **`aggregationKey`** из procurement; fallback для non-procurement:

```ts
key = procurement?.aggregationKey
  ?? [code, category, purchaseUnit|unit, unitPrice|packagePrice].join("|")
```

**Единицы в UI:** показывать **`purchaseUnit` + `purchaseQuantity`** в клиентском блоке; `rawQuantity` + `rawUnit` — в `detailGroups` / tooltip / CSV detail.

**Не смешивать:** m² vs уп. vs п.м. (плинтус global — отдельная строка, unit «м»).

---

## 7. Инструменты (tools)

| Слой | Поведение |
|------|-----------|
| Snapshot | `category: "tools"` |
| Spec → Estimate | **`consumables`** (`mapSpecificationCategoryToEstimateCategory`) |
| Flat calc | `flooring-tools` → **consumables** (`addConsumable`) |
| Procurement | category может остаться `tools` |
| CSV export | label «Расходники» |

**Политика PF5c:** в клиентском блоке **«Материалы и расходники»** включать tools вместе с consumables; не выделять отдельную секцию «Инструмент» для PDF. В агрегате использовать procurement row при наличии, иначе spec/flat tools line.

---

## 8. Плоские / global строки (плинтус, пороги, демонтаж)

- Определены в `GLOBAL_FLAT_IDS` (`public-estimate-flooring-spec.ts` ~62–67).  
- В spec попадают через `fallbackFlatItems` (~256–275), **без** room suffix.  
- В procurement **не входят**, если нет в catalog `specLines`.

**Клиентский документ:**  
- **works:** plinth labor, demolition — в `workLines` (ключ по stable id / title).  
- **materials:** plinth material, thresholds — в `materialLines` (не через procurement, пока не пакетированы в snapshot).  
- **detailGroups:** опционально «Глобальные опции пола» с breakdown, не в primary PDF table.

---

## 9. Политика итогов: document = sum(aggregated lines); parity / delta

### 9.1 Сегодня

| Слой | Итог |
|------|------|
| `calculateFlooring().total` | flat `section.totals` (~384–392) |
| Modal footer `grandTotal` | `sum(section.totals.total)` legacy (`EstimateSpecOverlay.tsx` ~91, ~181) |
| `document.sections[].totals` | `calculateDocumentLineTotals(flatLines)` (~314–315, 244–254) |
| `documentToEstimateSpecSections` | **подменяет totals на legacy** (~174) |
| Тест V12 | `expandFlooringSectionForSpec` сохраняет flat totals (~869–888 `public-estimate-flooring-spec.test.ts`) |
| Тест drift | `public-estimate-document.test.ts` ~390–409 — legacy totals ≠ spec line sum |

### 9.2 Целевая политика PF5c

```
document.totals = sum(workLines) + sum(materialLines) + sum(otherCategories?)
section.totals  = то же для секции flooring (или весь document для full)
```

**Parity:**

| Пара | Действие |
|------|----------|
| Aggregated document vs sum(room lines) | **Must match** (пересчёт из тех же источников) |
| Document vs `calculateFlooring().total` | **Допустим delta** до PF5c flip / PF4; golden-тест `document.totals` vs `FLOORING_GOLDEN_TOTAL` — shadow, не блокер UI |
| Modal footer | После PF5c2/3: опция `document.sections[].totals` или sum aggregated; убрать legacy bind (~174) по флагу |
| CSV | `buildSpecExportCsv` — новый adapter с aggregated rows или dual export |

**Equipment:** в полах обычно 0; для других разделов — либо третий bucket, либо включение в materials по категории.

---

## 10. Округление

| Место | Правило |
|-------|---------|
| `public-estimate-document.ts` | `roundMoney`: `Math.round(x*100)/100` (~214–216, 227) |
| `public-estimate-model.ts` | `safeMoney`, line total **без** round на строке (~64–77) |
| `spec-export.ts` | `formatExportNumber` — 2 знака (~37–44) |
| Procurement | `purchaseQuantity` integer ceil; money product без отдельного round на line (~136, 157) |

**Политика PF5c:**  
- Пересчёт aggregated line total: **`roundMoney(quantity * unitPrice)`** на каждой агрегированной строке.  
- Document total = **sum rounded line totals** (не round после sum), согласовано с `calculateDocumentLineTotals`.  
- Закупочные строки: total из procurement как есть; при merge в materialLines не пересчитывать qty с float drift.

---

## 11. Целевая структура `PublicEstimateDocument`

Расширение типов в `public-estimate-document.ts` (PF5c2):

```ts
type AggregatedClientLine = {
  id: string;           // stable: hash(key) или aggregationKey
  title: string;        // без room suffix
  category: EstimateCostCategory;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  isIncluded: boolean;
  note?: string;
  sources?: { roomName?: string; packageCode?: string; procurementCode?: string }[];
};

type EstimatePresentationGroup = {
  kind: "works" | "materials" | "detail";
  title: string;
  lines: AggregatedClientLine[];
  totals: EstimateDocumentTotals;
};

// В PublicEstimateDocument или EstimateDocumentSection:
workLines?: AggregatedClientLine[];
materialLines?: AggregatedClientLine[];
presentationGroups?: EstimatePresentationGroup[];  // primary PDF order
detailGroups?: EstimateDocumentGroup[];            // room × package (существующий контракт)
```

**Поведение:**

- **PDF (PF6b):** читает `presentationGroups` или `[workLines, materialLines]`.  
- **Modal (PF5c3):** default — текущий room list; toggle `view: "aggregated" | "detail"`.  
- **Procurement:** не отдельный «технический» appendix в PDF; данные **сливаются** в `materialLines`, appendix оставить для dev CSV.

**Заполнение flooring adapter:** заменить пустой `buildFlooringDocumentSection` на:  
1) build detail groups (room × package) из `specificationLines`;  
2) `aggregateWorkLines` / `aggregateMaterialLines` (+ procurement);  
3) `presentationGroups` для клиента.

---

## 12. Rollout

| Фаза | Scope | Файлы | Verification |
|------|-------|-------|--------------|
| **PF5c1** | `aggregateFlooringWorkLines`, `aggregateFlooringMaterialLines` (+ tests shadow, не UI) | новый `estimate/aggregate-client-lines.ts`, тесты рядом с `public-estimate-document.test.ts` | aggregated sum = sum(spec items); procurement keys stable; golden laminate |
| **PF5c2** | Поля `workLines`, `materialLines`, `presentationGroups` в document; builder flooring | `public-estimate-document.ts`, flooring section builder | document totals = sum(presentation); shadow vs flat total documented |
| **PF5c3** | Modal optional aggregated view; footer totals from document | `EstimateSpecOverlay.tsx`, `spec.ts`, `EstimateSpecModal.tsx` | `spec.test.ts` + snapshot UI; procurement не дублировать в list |
| **PF6b** | PDF renderer aggregated view | по `pf6-public-estimate-document-plan.md` | PDF smoke |

**Не в PF5c:** flip `calculateFlooring` totals; удаление flat fallback (PF4/PF5 legacy).

---

## 13. Риски

| ID | Риск | Митигация |
|----|------|-----------|
| R1 | Delta procurement total vs spec materials | Один источник truth для client materials = procurement; spec room lines только в detail |
| R2 | Слияние работ с разными ценами | Жёсткий ключ с `unitPrice` + `packageCode` |
| R3 | Ломаем modal footer / CSV при смене totals | Feature flag; обновить `spec-export.test.ts`, тест ~888 только при явном flip |
| R4 | Plumbing/walls без procurement | Flat aggregate по title+unit+price; отдельные adapters позже |
| R5 | Двойная работа PF5c vs старый PF5c «totals parity» | Этот план **расширяет** totals parity: сначала aggregated lines, потом footer |

---

## 14. Первый шаг (конкретно)

1. Добавить `estimate/aggregate-client-lines.ts` с:  
   - `stripRoomSuffix(title)` для spec titles;  
   - `aggregateWorkLines(lines: EstimateDocumentLine[])`;  
   - `materialLinesFromProcurement(procurement: FlooringProcurementLine[], globals: EstimateDocumentLine[])`.  
2. Vitest в `aggregate-client-lines.test.ts`: golden `calculateFlooring` + mock multi-room; assert keys, qty sum, totals.  
3. **Не** менять `buildPublicEstimateDocument` export surface до PF5c2 (только тест импортирует helpers).

---

## 15. Файлы аудита и тестов

| Файл | Роль |
|------|------|
| `estimate/public-estimate-document.ts` | Типы document, flat flooring section, totals, appendices |
| `estimate/spec.ts` | `buildEstimateSpecModalData` → document |
| `EstimateSpecOverlay.tsx` | UI list; legacy totals; procurement unused |
| `public-estimate-flooring.ts` | flat calc + procurement/spec side effects |
| `public-estimate-flooring-spec.ts` | spec lines, global ids, tools mapping |
| `public-estimate-flooring-procurement.ts` | procurement aggregation |
| `public-estimate-model.ts` | categories, section totals |
| `public-estimate-plumbing-zones.ts` | `EstimateSpecSection`, zone expansion |
| `estimate/spec-export.ts` | CSV + procurement block |
| `estimate/public-estimate-document.test.ts` | document builder, legacy totals test |
| `estimate/spec.test.ts` | modal data, procurement passthrough |
| `estimate/spec-export.test.ts` | CSV procurement |
| `public-estimate-flooring-spec.test.ts` | V12 totals, tools, package-first |
| `public-estimate-flooring-procurement.test.ts` | package math, integration |

---

## 16. Открытые решения (Product)

1. Показывать ли **equipment** отдельным блоком в клиентском PDF?  
2. При delta document vs calculator — показывать клиенту **document total** или calculator до flip?  
3. Нужен ли **единый** aggregated view для plumbing (зоны) в PF5c или только flooring?  
4. Удалять ли room-level view из modal после PF5c3 или оставить навсегда как «Детализация»?

---

*Конец документа PF5c.*
