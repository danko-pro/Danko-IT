# Package Engine Stabilization Plan

Дата: 2026-06-05

Статус: план укрепления механизма переноса пакетов перед масштабированием на стены, потолки, электрику, сантехнику и остальные разделы.

Пилотный раздел: `flooring`.

Связанные документы:

- `docs/package-engine-architecture-plan.md`
- `docs/flooring-package-first-audit-plan.md`
- `docs/pf5c-aggregated-client-estimate-plan.md`
- `docs/pf6-public-estimate-document-plan.md`

## 1. Цель

Мы уже отработали рабочую цепочку на полах:

```text
админка -> пакет -> backend validation/projection -> public snapshot -> public calculator -> PublicEstimateDocument -> modal/PDF
```

Теперь задача не в том, чтобы сразу переносить стены или сантехнику, а в том, чтобы сделать сам механизм достаточно прочным и универсальным.

Нельзя копировать flooring-логику в каждый раздел как отдельный мост. Это создаст восемь похожих, но разных систем, которые будут ломаться по-разному.

Цель стабилизации: выделить общие правила package engine и оставить разделам только бизнес-адаптеры.

## 2. Главный принцип

Публичная позиция калькулятора должна быть пакетом.

Flat-ставки допустимы только как производная проекция пакета. Они не являются самостоятельным источником правды.

Если позиция не имеет валидного пакета:

- она не публикуется в public snapshot;
- она не попадает в dropdown;
- она не участвует в расчете;
- она не попадает в спецификацию;
- она не заменяется hardcoded fallback-строкой.

## 3. Что должно стать универсальным

### 3.1 Package contract

Нужен общий контракт пакета:

```text
Package
  section
  targetKind
  targetId
  code
  title
  version
  rows
  flatProjection
  specLines
  procurementLines / procurement metadata
  publicationStatus
  validationErrors
```

Разделы могут иметь свои типы целей, но общий смысл одинаковый:

- пакет хранится в админке;
- backend валидирует пакет;
- projection строит flat totals, spec lines и procurement;
- snapshot публикует только валидные пакеты;
- public calculator и PDF читают один документ.

### 3.2 Base row contract

Каждая строка пакета должна иметь общие признаки:

```text
section
kind
formula
title
unit
price
consumption / quantity basis
package size, if purchase mode is package
package price, if purchase mode is package
public category
public title
enabled flag
sort order
```

Раздел может добавлять свои поля, но не должен обходить базовые правила.

### 3.3 Publication status

Пакет должен иметь понятный статус публикации:

- `valid` - можно публиковать;
- `draft` - есть, но не готов;
- `invalid` - есть ошибки;
- `disabled` - явно выключен;
- `orphaned` - catalog row есть, package нет;
- `projection_failed` - не удалось построить flat/spec/procurement.

Публичный сайт видит только `valid`.

## 4. Общий validator

Нужно отделить базовую валидацию от правил раздела.

### 4.1 Base validation

Общие правила для всех разделов:

- пакет не пустой;
- есть хотя бы одна включенная строка;
- `title` заполнен;
- `unit` заполнен и не является числом;
- `price` не отрицательный;
- `consumption` / `quantityPerBasis` не отрицательный;
- `formula` входит в разрешенный справочник;
- `publicCategory` входит в разрешенный справочник;
- internal fields не проходят в public payload;
- package-aware строка имеет `packageSize > 0` и `packagePrice > 0`;
- disabled rows не участвуют в projection и publication.

### 4.2 Section validation

Правила раздела подключаются адаптером.

Примеры:

- Полы:
  - покрытие: material + consumables/tools;
  - подготовка/укладка: work-only.
- Стены:
  - покрытие/материал: material + consumables/tools;
  - подготовка/работа: work/material rules по модели стен.
- Электрика:
  - точка/линия/щит: works + materials + equipment + consumables.
- Сантехника:
  - прибор/зона/узел: works + materials/equipment + optional procurement.

Общий validator не должен знать детали каждого раздела. Он должен вызывать adapter rules.

## 5. Projection

Projection - это единая операция:

```text
package rows -> flatProjection + specLines + procurement metadata
```

У projection есть три результата:

1. Flat projection
   - быстрые ставки для итогов калькулятора.
   - не источник правды.

2. Spec lines
   - строки состава для спецификации.
   - basis, unit, quantityPerBasis, unitPrice, category.

3. Procurement
   - закупочные правила.
   - package mode, package size, package price, aggregation key.

Если projection не построился, пакет не публикуется.

## 6. Publication gate

Publication gate должен быть общим:

```text
catalog row + package -> validate -> project -> whitelist -> publish or skip
```

Правила:

- backend не падает от одной битой сборки;
- невалидный пакет пропускается и диагностируется;
- snapshot содержит только валидные package-backed rows;
- public validator повторно проверяет payload;
- forbidden/internal keys запрещены рекурсивно.

Нужна диагностика причин, почему пакет не попал в snapshot:

- no package;
- empty package;
- all rows disabled;
- invalid unit;
- missing package metadata;
- invalid formula;
- projection failed;
- forbidden key;
- incomplete specLines.

## 7. Admin write rules

Админка не должна создавать public row без пакета.

Правила:

- create catalog row = create package;
- edit catalog row = edit package;
- flat fields являются проекцией package rows;
- direct flat create заблокирован для package-first разделов;
- direct flat patch заблокирован, если package существует;
- bootstrap/from-flat допускается только как временный synthetic package path;
- invalid package не создает public row.

## 8. Runtime snapshot bridge

Public site должен иметь общий snapshot bridge:

1. bundled fallback;
2. refresh from backend on page load;
3. validation;
4. replace in-memory catalog only if remote snapshot is valid;
5. fail-closed behavior for package-first sections;
6. no silent hardcoded fallback for unknown package code.

Сейчас этот путь отработан на flooring. Его нужно превратить в общий механизм для остальных package-first разделов.

## 9. Public estimate document

`PublicEstimateDocument` должен быть единственным источником для клиентского отображения:

- modal;
- PDF;
- future export/dev CSV;
- section detail.

Правило:

```text
calculator result + package/spec/procurement -> PublicEstimateDocument -> renderers
```

Модалка и PDF не должны считать сами.

Для клиента основной вид:

- работы;
- материалы и расходники;
- оборудование, если есть;
- итог;
- примечания.

Комнатные строки и технические детализации - это appendix/detail, а не основной вид.

## 10. Diagnostics and observability

Для масштабирования нужна диагностика.

Минимально:

- endpoint или admin view со статусами пакетов;
- список invalid packages;
- причина непубликации;
- target section/kind/id;
- timestamp последней проверки;
- projection summary;
- warning, если bundled snapshot отличается от backend snapshot.

Без диагностики каждый новый раздел будет превращаться в ручной поиск: почему строка не появилась на сайте.

## 11. Test contract для каждого раздела

Для каждого package-first раздела должен быть одинаковый набор gate-тестов.

### 11.1 Backend

- valid package saves atomically;
- invalid package does not create catalog row;
- direct flat create blocked;
- direct flat patch blocked when package exists;
- package projection equals flat totals;
- invalid package is not published;
- valid package appears in public snapshot;
- forbidden keys do not leak.

### 11.2 Frontend

- snapshot validator accepts valid package rows;
- snapshot validator rejects invalid rows;
- dropdown uses package-backed rows;
- unknown code does not silently map to fallback;
- calculation uses package rates;
- specification expands package lines;
- procurement aggregates package quantities;
- PDF/document renders from `PublicEstimateDocument`.

### 11.3 E2E smoke

```text
admin creates package
  -> backend saves package
  -> snapshot publishes package
  -> site refresh sees package
  -> dropdown shows package
  -> calculator totals update
  -> modal shows package composition
  -> PDF shows client estimate
```

## 12. What is already solid from flooring

Рабочие pieces, которые можно переиспользовать:

- package-first create/edit principle;
- backend validation before publication;
- package projection into flat/spec/procurement;
- runtime snapshot refresh on page load;
- fail-closed public dropdown behavior;
- `PublicEstimateDocument`;
- aggregated client presentation groups;
- print-ready PDF document;
- package metadata backfill;
- skip invalid legacy assemblies instead of crashing backend.

## 13. What is still too flooring-specific

Нужно не копировать, а вынести/обобщить:

- `flooring_catalog_assembly.py` validation;
- `flooring_package_projection.py`;
- `flooring_snapshot.py` publication gate;
- `public-flooring-snapshot.ts` runtime store pattern;
- `public-estimate-flooring-procurement.ts`;
- flooring-specific `presentationGroups` attachment.

Цель: оставить flooring как adapter, а не как единственный engine.

## 14. Rollout

### PE1 - Stabilization audit

Цель: пройти по flooring implementation и отметить:

- что уже universal;
- что section-specific;
- что нужно вынести;
- какие interfaces нужны;
- какие tests станут обязательными для каждого раздела.

Результат: audit report + prioritized extraction plan.

### PE2 - Base package validator

Цель: вынести общие правила package validation.

Результат:

- base validator;
- section adapter interface;
- flooring подключен к base validator;
- flooring tests still green.

### PE3 - Publication gate abstraction

Цель: общий publish/skip path.

Результат:

- package publication result;
- skip reasons;
- diagnostics;
- flooring snapshot uses common gate.

### PE4 - Snapshot runtime bridge abstraction

Цель: общий frontend loader/refresh contract.

Результат:

- reusable snapshot store pattern;
- flooring migrated to shared helper;
- ready for walls/plumbing/electric.

### PE5 - PublicEstimateDocument adapters

Цель: общий adapter contract для document sections.

Результат:

- section document adapter interface;
- flooring adapter;
- flat legacy adapter for old sections;
- PDF/modal use same document.

### PE6 - First non-flooring migration

Рекомендуемый первый раздел: стены.

Причина: стены ближе к полам по структуре: покрытие, подготовка, расходники, площадь.

Результат:

- walls package-first chain;
- same tests as flooring;
- no new custom bridge.

## 15. Definition of Done

Package engine считается готовым к масштабированию, когда:

- flooring остается green после выноса общих pieces;
- новый раздел подключается через adapter, а не копирование всего flooring path;
- public snapshot публикует только valid packages;
- сайт refresh-ит snapshot на page load;
- modal/PDF строятся из `PublicEstimateDocument`;
- invalid package имеет понятную причину;
- одна битая строка не валит backend;
- для раздела есть полный smoke: admin -> snapshot -> site -> document -> PDF.

## 16. Важное ограничение

До завершения PE1-PE5 не начинать полноценный перенос стен.

Можно готовить данные и анализировать файл со стенами, но нельзя строить новый раздел как отдельную копию flooring.

Сначала укрепляем мост. Потом подключаем новые разделы.
