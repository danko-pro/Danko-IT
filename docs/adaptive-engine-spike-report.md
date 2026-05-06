# Adaptive Engine Spike Report

Дата: 2026-05-06

Ветка: `spike/calculator-adaptive-engine`

## Статус после отката

2026-05-06 проект был откатан к состоянию до внедрения `adaptive-engine`.
Кодовая интеграция движка, adapter, probe, sandbox и npm scripts удалены из рабочего проекта через возврат к checkpoint `checkpoint/pre-adaptive-engine`.

Этот документ оставлен намеренно как технический комментарий к будущему внедрению. Его задача:

- зафиксировать, что уже было проверено;
- сохранить правильный принцип интеграции через CSS Grid;
- предупредить, что сам `adaptive-engine/` менять не нужно;
- дать будущему исполнителю карту файлов, коммитов, ошибок и решений spike-ветки.

Если внедрение будет продолжено, начинать следует не с повторного эксперимента с `left/top`, а с модели:

```text
measured workspace -> engine metrics/cssVariables -> CSS Grid container -> gridColumn/gridRow
```

Отдельная копия кода вокруг движка, подготовленная для передачи в работу, лежит вне git-tracked интеграции:

```text
F:\Новая папка\adaptive-engine-spike-code
```

Исходная точка до эксперимента:

```text
checkpoint/pre-adaptive-engine -> 5223654
feature/ui-dashboard          -> 5223654 на момент старта spike
```

Текущая цель spike: проверить, можно ли использовать внешний `adaptive-engine` как layout-ядро вкладки калькулятора в `admin-ui`, не меняя сам движок.

## 1. Исходный билд движка

Исходная папка, которую приняли как источник билда:

```text
C:\Users\Danko\Downloads\Проект движок редактора-20260506T104417Z-3-001\Проект движок редактора
```

В исходном билде были важны:

```text
adaptive-engine/
safety-system/checkImportBoundaries.js
safety-system/checkEngineStructure.js
safety-system/engine-structure/
src/layout/LayoutCanvas.jsx
src/layout/layout.css
src/debug/operations/GridOperationProbe.jsx
src/debug/pointer/GridDebugHoverCell.jsx
```

Не переносили:

```text
.env
node_modules/
dist/
донорский src/ как приложение
донорский index.html
донорский package.json
safety-system/ai-fix/
safety-system/dashboard/
```

Причина: нам нужен только движок, инструменты проверки и принцип UI-интеграции, а не отдельное React-приложение внутри нашего проекта.

## 2. Архитектурное решение

Движок нужен только для вкладки калькулятора, чтобы раскладывать интерфейсные блоки по координатам и проверять:

- попадание в grid;
- пересечения;
- валидность layout;
- операции перемещения;
- диагностику;
- поведение на разных размерах рабочей области.

Принятое правило:

```text
adaptive-engine/ не меняем.
Наш проект подгоняем через adapter, probe, mapping, CSS и scripts.
```

Причина размещения внутри `admin-ui`: движок сейчас обслуживает UI-раскладку калькулятора, написан на JS и нужен React/Vite frontend, а не Python backend и не Telegram bot.

Текущий путь движка в проекте:

```text
F:\Новая папка\admin-ui\src\features\calculator\adaptive-engine\
```

Adapter и интеграционный код:

```text
F:\Новая папка\admin-ui\src\features\calculator\adaptive-engine-adapter\
F:\Новая папка\admin-ui\src\features\calculator\adaptive-engine-probe.tsx
F:\Новая папка\admin-ui\src\styles\calculator-adaptive-engine-probe.css
```

Проверочные инструменты:

```text
F:\Новая папка\admin-ui\src\features\calculator\adaptive-engine-tools\
```

## 3. Rollback-подготовка

Перед переносом создана отдельная ветка-страховка:

```powershell
git branch checkpoint/pre-adaptive-engine
git switch -c spike/calculator-adaptive-engine
```

Если spike нужно полностью отбросить:

```powershell
git switch feature/ui-dashboard
git branch -D spike/calculator-adaptive-engine
```

Если нужно посмотреть состояние до эксперимента:

```powershell
git switch checkpoint/pre-adaptive-engine
```

## 4. Перенос движка

Перенесено:

```text
admin-ui/src/features/calculator/adaptive-engine/
```

Внутри лежат слои:

```text
area/
calculators/
config/
constraints/
contracts/
coordinates/
core/
diagnostics/
docs/
fitting/
layout/
modes/
observers/
operations/
placement/
rejections/
selection/
tests/
validators/
```

Добавлены tools:

```text
admin-ui/src/features/calculator/adaptive-engine-tools/checkImportBoundaries.js
admin-ui/src/features/calculator/adaptive-engine-tools/checkEngineStructure.js
admin-ui/src/features/calculator/adaptive-engine-tools/engine-structure/
admin-ui/src/features/calculator/adaptive-engine-tools/runAdaptiveEngineTests.js
admin-ui/src/features/calculator/adaptive-engine-tools/runAdaptiveEngineChecks.js
```

Добавлены npm scripts в `admin-ui/package.json`:

```json
"check:adaptive-engine:imports": "node src/features/calculator/adaptive-engine-tools/checkImportBoundaries.js",
"check:adaptive-engine:structure": "node src/features/calculator/adaptive-engine-tools/checkEngineStructure.js",
"test:adaptive-engine": "node src/features/calculator/adaptive-engine-tools/runAdaptiveEngineTests.js",
"check:adaptive-engine": "node src/features/calculator/adaptive-engine-tools/runAdaptiveEngineChecks.js"
```

Проверка после переноса:

```powershell
cd "F:\Новая папка\admin-ui"
npm run check:adaptive-engine
npm run build
```

Результат: обе команды проходят.

Коммит:

```text
bdfb679 spike: add calculator adaptive engine
```

## 5. Первый visual probe

Добавлен визуальный блок во вкладку калькулятора:

```text
admin-ui/src/features/calculator/adaptive-engine-probe.tsx
admin-ui/src/styles/calculator-adaptive-engine-probe.css
```

Подключение в:

```text
admin-ui/src/features/calculator/screen/view.tsx
```

Сначала probe был статическим: брал несколько абстрактных items, прогонял через engine и показывал:

- `layout ok`;
- grid board;
- stage;
- grid size;
- cell size;
- resolved items;
- diagnostics status.

Коммит:

```text
a84d6f3 spike: show adaptive engine calculator probe
```

## 6. Adapter-слой

Чтобы не менять `adaptive-engine/`, добавлен adapter:

```text
admin-ui/src/features/calculator/adaptive-engine-adapter/
```

Основные файлы:

```text
types.ts
engine-api.ts
calculator-layout-items.ts
use-container-workspace.ts
use-adaptive-calculator-layout.ts
```

Назначение:

- типизировать JS API движка снаружи;
- держать mapping калькулятора отдельно от движка;
- измерять контейнер через `ResizeObserver`;
- считать layout и diagnostics через публичный facade `adaptive-engine/core/index.js`;
- не импортировать внутренности движка напрямую из UI.

Probe стал dev-only:

```ts
import.meta.env.DEV && import.meta.env.VITE_CALCULATOR_ADAPTIVE_ENGINE_PROBE !== "false"
```

Отключение:

```powershell
$env:VITE_CALCULATOR_ADAPTIVE_ENGINE_PROBE="false"
```

Коммит:

```text
fb87ab2 spike: add adaptive engine calculator adapter
```

## 7. Compare mode

Добавлен замер текущей DOM-раскладки активной сцены калькулятора:

```text
admin-ui/src/features/calculator/adaptive-engine-adapter/use-dom-layout-probe.ts
```

Probe начал показывать:

- `Current CSS` - фактические DOM-блоки текущей сцены;
- `Engine suggestion` - layout, который предлагает engine.

Это read-only режим. Реальный калькулятор не управляется движком.

Коммит:

```text
fd481d3 spike: compare adaptive engine with calculator css layout
```

## 8. Calibration matrix

Добавлены workspace profiles:

```text
admin-ui/src/features/calculator/adaptive-engine-adapter/workspace-profiles.ts
```

Профили:

```text
Desktop  1120 x 520
Tablet    820 x 460
Compact   520 x 420
Mobile    390 x 560
```

Добавлен hook:

```text
admin-ui/src/features/calculator/adaptive-engine-adapter/use-adaptive-layout-calibration.ts
```

Probe показывает по каждому профилю:

- diagnostics status;
- workspace;
- grid;
- cell size;
- resolved items.

Коммит:

```text
847174c spike: add adaptive engine calibration matrix
```

## 9. Stage-aware mapping

Добавлена карта layout items по стадиям калькулятора:

```text
admin-ui/src/features/calculator/adaptive-engine-adapter/calculator-stage-layout-items.ts
```

Стадии:

```text
project
rooms
warmfloor
flooring
wallfinish
doors
```

Пример смысла:

- `project`: паспорт, контакты, дизайн, материалы, монтаж, итог;
- `rooms`: список помещений, редактор, проемы, полы, стены;
- `warmfloor`: параметры, помещения, контуры, материалы, итог;
- `flooring`: помещения, покрытия, расходники, техкарта, смета;
- `wallfinish`: помещения, поверхности, покрытия, расходники, смета;
- `doors`: очередь, редактор, комплектация, каталог, итог.

Коммит:

```text
a7936d9 spike: map adaptive engine items by calculator stage
```

## 10. Stage diagnostics matrix

Добавлена матрица всех стадий против всех workspace profiles:

```text
admin-ui/src/features/calculator/adaptive-engine-adapter/use-adaptive-stage-matrix.ts
```

В probe появилась таблица:

```text
project     desktop/tablet/compact/mobile
rooms       desktop/tablet/compact/mobile
warmfloor   desktop/tablet/compact/mobile
flooring    desktop/tablet/compact/mobile
wallfinish  desktop/tablet/compact/mobile
doors       desktop/tablet/compact/mobile
```

Каждая ячейка показывает `ok` или `fail`.

Коммит:

```text
5409949 spike: add adaptive engine stage diagnostics matrix
```

## 11. Draggable sandbox

Добавлен интерактивный sandbox:

```text
admin-ui/src/features/calculator/adaptive-engine-adapter/use-adaptive-layout-sandbox.ts
```

Назначение:

- держать локальные sandbox items;
- обрабатывать `move-area`;
- вызывать `applyOperation` через adapter;
- принимать move только если engine вернул `valid: true`;
- показывать `accepted` / `rejected`;
- reset возвращает sandbox к исходной карте.

Расширены:

```text
admin-ui/src/features/calculator/adaptive-engine-adapter/types.ts
admin-ui/src/features/calculator/adaptive-engine-adapter/engine-api.ts
admin-ui/src/features/calculator/adaptive-engine-probe.tsx
admin-ui/src/styles/calculator-adaptive-engine-probe.css
```

Коммит:

```text
73d192d spike: add draggable adaptive engine sandbox
```

## 12. Исправления drag/drop

### 12.1 Drag preview

Сначала блок можно было выбрать, но он не следовал за мышью. Добавлен live preview через `pointermove` и `transform`.

Коммит:

```text
ab1f406 fix: preview adaptive engine sandbox drag
```

### 12.2 Snap by grid delta

Drop сначала считался по координате курсора на board, что давало неверные target cells. Исправлено на:

```text
new x/y = old x/y + round(pointer delta / cellSize)
```

Коммит:

```text
15fbd42 fix: snap adaptive engine drag by grid delta
```

### 12.3 Persist drag target

React state мог быть асинхронным, поэтому drag state вынесен в `ref`. Во время drag показывается target cell.

Коммит:

```text
26b6383 fix: persist adaptive sandbox drag target
```

### 12.4 Align sandbox to engine grid

Была важная ошибка: визуальная доска не была строго привязана к `cellSize`, а стартовые stage items были слишком плотно уложены. Исправлено:

- board получила реальные `gridWidth`, `gridHeight`, `cellSize`;
- фон сетки использует engine `cellSize`;
- sandbox получает разреженную карту через `createSandboxItems`;
- board завернута в scroll viewport.

Коммит:

```text
f40e2fa fix: align adaptive sandbox to engine grid
```

### 12.5 Использование родного принципа донорского `src`

После просмотра донорского `src` стало понятно, что правильный принцип не `left/top`, а CSS Grid:

```tsx
gridColumn: `${item.x} / span ${item.w}`
gridRow: `${item.y} / span ${item.h}`
```

Наш sandbox переведен на этот принцип:

- board: `display: grid`;
- `grid-template-columns: repeat(columns, cellSize)`;
- `grid-template-rows: repeat(rows, cellSize)`;
- items: `gridColumn/gridRow`.

Это совпадает с донорскими:

```text
src/layout/LayoutCanvas.jsx
src/layout/layout.css
src/debug/operations/GridOperationProbe.jsx
```

Коммит:

```text
0afdcac fix: use engine grid placement in sandbox
```

### 12.6 Drop motion

Была попытка добавить плавный drop, но она дала неправильный эффект: после отпускания блок визуально replay-ился из старой точки в новую.

Коммит с попыткой:

```text
f0429d0 fix: smooth adaptive sandbox drop motion
```

После замечания эффект убран. Теперь:

- во время drag блок следует за мышью;
- после отпускания engine принимает координаты;
- блок остается в принятой grid-позиции;
- нет replay из старой точки.

Коммит:

```text
6bbc78b fix: stop replaying adaptive sandbox drop
```

## 13. Важное открытие из донорского `src`

Донорский принцип интеграции:

```text
createAdaptiveGrid(workspaceRef.current, layoutRules, setGridMetrics)
gridMetrics.cssVariables -> .layout-canvas
CSS Grid tracks -> gridColumn/gridRow для элементов
```

Ключевые файлы:

```text
src/layout/LayoutCanvas.jsx
src/layout/layout.css
src/debug/operations/GridOperationProbe.jsx
src/debug/pointer/GridDebugHoverCell.jsx
```

Правильная модель:

```text
engine metrics -> CSS variables/grid tracks -> gridColumn/gridRow
```

Неправильная первая попытка:

```text
engine rect -> absolute left/top
```

Вывод: для будущего apply-mode надо строить controllable layout container именно на CSS Grid, а не на абсолютном позиционировании.

## 14. Текущее состояние UI

Проект запущен:

```text
Frontend: http://127.0.0.1:5173/
Backend:  http://127.0.0.1:8000
Health:   http://127.0.0.1:8000/api/health
```

Проверка backend:

```json
{"status":"ok"}
```

Логи:

```text
F:\Новая папка\.tmp\admin-api.out.log
F:\Новая папка\.tmp\admin-api.err.log
F:\Новая папка\.tmp\admin-ui-vite.out.log
F:\Новая папка\.tmp\admin-ui-vite.err.log
```

## 15. Текущие команды проверки

Из `admin-ui`:

```powershell
cd "F:\Новая папка\admin-ui"
npm run check:adaptive-engine
npm run build
```

`npm run check:adaptive-engine` включает:

- import boundary check;
- engine structure check;
- tests for area;
- fitting;
- grid metrics;
- grid mode;
- grid rules;
- workspace state;
- metrics validation;
- coordinates;
- constraints;
- layout validation;
- layout resolve;
- layout report;
- layout process;
- engine snapshot;
- diagnostics;
- operations;
- placement;
- rejections;
- selection.

## 16. Текущий commit stack

От checkpoint до текущего состояния:

```text
6bbc78b fix: stop replaying adaptive sandbox drop
f0429d0 fix: smooth adaptive sandbox drop motion
0afdcac fix: use engine grid placement in sandbox
f40e2fa fix: align adaptive sandbox to engine grid
26b6383 fix: persist adaptive sandbox drag target
15fbd42 fix: snap adaptive engine drag by grid delta
ab1f406 fix: preview adaptive engine sandbox drag
73d192d spike: add draggable adaptive engine sandbox
5409949 spike: add adaptive engine stage diagnostics matrix
a7936d9 spike: map adaptive engine items by calculator stage
847174c spike: add adaptive engine calibration matrix
fd481d3 spike: compare adaptive engine with calculator css layout
fb87ab2 spike: add adaptive engine calculator adapter
a84d6f3 spike: show adaptive engine calculator probe
bdfb679 spike: add calculator adaptive engine
```

## 17. Что не сделано

Пока не сделано:

- engine не управляет реальными блоками калькулятора;
- реальные DOM-секции калькулятора еще не размечены `data-layout-block`;
- apply-mode под флагом еще не добавлен;
- layout реальных стадий пока только сравнивается и моделируется в sandbox;
- результат drag sandbox не сохраняется в storage;
- нет Playwright visual smoke по размерам viewport.

## 18. Следующие рекомендуемые шаги

1. Добавить README для adapter boundary:

```text
admin-ui/src/features/calculator/adaptive-engine-adapter/README.md
```

2. Разметить реальные секции калькулятора:

```tsx
data-layout-block="flooring-estimate"
data-layout-block="doors-editor"
```

3. Сделать controlled apply-mode только под флагом:

```text
VITE_CALCULATOR_ADAPTIVE_ENGINE_APPLY=true
```

4. Начинать apply-mode с простой стадии:

```text
project или warmfloor
```

5. Перенести родной принцип donor canvas:

```text
measured workspace -> createAdaptiveGrid -> cssVariables -> CSS Grid container -> gridColumn/gridRow
```

6. Добавить Playwright smoke на viewports:

```text
1280
1024
768
390
```

## 19. Главный технический вывод

`adaptive-engine` уже умеет:

- считать grid metrics;
- валидировать layout;
- применять move operations;
- отклонять collision/out-of-grid;
- давать diagnostics.

Ключевое условие успешной интеграции: UI должен использовать engine как координатную CSS Grid-систему, а не пытаться вручную повторить ее через absolute layout.

Правильная интеграционная формула:

```text
adapter описывает блоки -> engine считает/валидирует -> React рисует CSS Grid по engine координатам
```

И правило остается:

```text
Сам adaptive-engine не меняем.
Меняем только adapter, probe, mapping, CSS и внешний UI.
```
