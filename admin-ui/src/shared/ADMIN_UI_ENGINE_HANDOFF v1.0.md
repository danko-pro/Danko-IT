# Admin UI Engine Handoff v1.0

Дата снимка: 2026-05-09.

Этот документ является верхним handoff по текущей подготовке `admin-ui` к `adaptive-engine` / `composition-engine V2`. Он не заменяет детальные карты. Его задача: быстро объяснить команде движка, что уже сделано, какие слои появились, какие контракты считаются правильными, где лежат подробности и что осталось до полной stop line.

## Статус

`admin-ui` переводится из набора feature JSX/CSS в host-проект с явными слоями:

```text
feature data/model
-> workspace registry
-> workspace adapter snapshot
-> runtime snapshot
-> composition input bridge
-> V2 suggestions
-> host adapter
-> React UI
```

Главный принцип: движок не должен угадывать структуру по DOM и CSS. Host обязан отдавать понятную карту блоков, элементов, связей, возможностей и ограничений.

## Документы-источники

| Документ | Назначение |
|---|---|
| `ADMIN_UI_ENGINE_HANDOFF v1.0.md` | Этот обзор: что сделано и как читать остальные документы. |
| `ARCHITECTURE 1.1.md` | Правила shared UI layer, ownership, фасады, CSS-группы, migration rule. |
| `V2_COMPONENT_MAP 1.3.md` | Полная карта компонентов, workspace blocks, inner elements, relationships, inventories. |
| `UI_STOP_LINE.md` | Условия готовности UI host к ограниченной интеграции движка. |
| `ADMIN_UI_RESPONSE_TO_COMPOSITION_ENGINE v1.3.md` | Ответ/аналитика для текущей версии composition engine. |
| `ADMIN_UI_NAVIGATION_COMPOSITION_CONTRACT v1.0.md` | Новый контракт глобальных страниц, меню, page registry, navigation projection и состояний меню. |

Правило версий: при обновлении handoff/architecture/component-map документов нужно поднимать версию в имени файла и в первом заголовке.

## Что уже сделано по shared UI

Вынесены и нормализованы базовые фасады:

```text
src/shared/index.ts
src/shared/controls
src/shared/ui.tsx
src/shared/ui-actions.tsx
src/shared/ui-cards.tsx
src/shared/ui-fields.tsx
src/shared/ui-status.tsx
src/shared/interactions
src/shared/formatters
```

Канонические UI primitives:

| Primitive | Слой | Назначение |
|---|---|---|
| `Button` | `shared/controls` | Общая кнопка действия. |
| `IconButton` | `shared/controls` | Icon-only button. |
| `AddButton` | `shared/controls` | Добавление строк/позиций. |
| `DeleteButton` | `shared/controls` | Единый danger/delete action. |
| `ConfirmDeleteContent` | `shared/controls` | Подтверждение удаления. |
| `DropdownRoot/Trigger/Chevron/Check` | `shared/controls` | Базовый dropdown/select shell. |
| `Field`, `SelectField`, `TimeField`, `TextAreaField` | `shared/ui` | Поля ввода. |
| `DenseRow` | `shared/ui` | Плотная повторяемая строка списка с active state. |
| `StatChip` | `shared/ui` | Compact metric/attribute chip. |
| `StatusBadge`, `SignalChip` | `shared/ui` | Статусы и сигналы. |
| `InfoCard`, `MetricCard`, `SettingCard` | `shared/ui` | Повторяемые cards. |
| `PanelResizeHandle`, `useResizablePersistentPanel` | `shared/ui`, `shared/interactions` | Resize/persistent popover behavior. |

Feature-компонент должен использовать эти фасады, если локальный элемент уже выражается через них. Одноразовый элемент либо остается приватным внутри feature, либо заменяется типовым shared primitive.

## CSS и motion

CSS сгруппирован по ответственности:

```text
components-primitives.css
components-actions.css
components-confirm-delete.css
components-dropdown.css
components-forms.css
components-feedback.css
components-tooltips.css
components-resizable.css
components-motion.css
```

Feature CSS должен хранить layout/density/tone overrides, но не создавать второй источник правды для кнопок, dropdown, tooltip, delete action, row/chip/status primitives.

Motion-подход:

- анимации должны идти через один слой owner;
- V2 не должен генерировать произвольный CSS;
- будущий contract должен использовать именованные motion presets;
- уже есть shared motion group и stage transitions;
- следующий шаг: формализовать `motionProfile` / `motion tokens`.

## Calculator feature facade

Добавлен feature-level фасад для калькуляторных stage-секций:

```text
src/features/calculator/shared/stage-section.tsx
```

Компоненты:

| Component | Назначение |
|---|---|
| `CalculatorStageSectionHeader` | Единый header секции: kicker/title/note/actions. |
| `CalculatorStageEmptyState` | Единое пустое состояние stage section. |

Это не shared-global primitive, потому что визуальный язык stage-секций относится к калькулятору. Но оно оборачивает общие CSS-группы и дает V2 стабильную структуру.

## Что сделано в разделе дверей

Дверной legacy-раздел переведен на типовые фасады без изменения бизнес-логики:

```text
src/features/calculator/doors/door-list.tsx
src/features/calculator/doors/part-list.tsx
src/features/calculator/doors/part-head.tsx
src/features/calculator/doors/part-panel.tsx
src/features/calculator/doors/summary.tsx
src/features/calculator/doors/door-catalog.tsx
src/features/calculator/doors/part-catalog.tsx
```

Сделано:

- ручные `dense-row` заменены на `DenseRow`;
- ручные `stat-chip` заменены на `StatChip`;
- `calculator-stage-empty` заменен на `CalculatorStageEmptyState`;
- повторяемый section header заменен на `CalculatorStageSectionHeader`;
- delete actions приведены к `DeleteButton`;
- один битый UI-разделитель `В·` заменен на нормальный `·`.

Цель: раздел дверей должен выглядеть как набор управляемых блоков и типовых элементов, а не как локальный одноразовый JSX.

## Workspace contract

Добавлен слой описания host UI:

```text
src/shared/workspace-contract/types.ts
src/shared/workspace-contract/registry.ts
src/shared/workspace-contract/manifest.ts
src/shared/workspace-contract/layout-items.ts
src/shared/workspace-contract/validation.ts
```

Ключевые сущности:

| Entity | Meaning |
|---|---|
| `WorkspaceComponentSchema` | Parent/block-level component для V2/adapter. |
| `WorkspaceElementSchema` | Inner element: button/input/select/dropdown/metric/status/list-item. |
| `WorkspaceManifest` | Набор registries одной workspace. |
| `WorkspaceArea` | Grid area `{ x, y, w, h }`, совместимая с V1 layout. |
| `WorkspaceCapabilityMap` | movable/resizable/deletable/copyable/collapsible. |
| `WorkspaceRelationship` | controls/selects/reads/writes/depends-on/summarizes/etc. |
| `layoutParticipation` | `always`, `conditional`, `none`. |

Правило: workspace contract описывает host UI и не импортирует engine internals, React components или feature modules.

## Workspace adapter

Добавлен host-side adapter layer:

```text
src/shared/workspace-adapter/snapshot.ts
src/shared/workspace-adapter/runtime-snapshot.ts
src/shared/workspace-adapter/composition-input.ts
src/shared/workspace-adapter/rejection.ts
src/shared/workspace-adapter/types.ts
```

Основные функции:

| Function | Meaning |
|---|---|
| `createWorkspaceAdapterSnapshot` | Полный snapshot из manifest: validation, layoutItems, constraints, meta. |
| `createWorkspaceRuntimeSnapshot` | Компактный active-zone snapshot: components/elements/relationships/metrics. |
| `createWorkspaceCompositionInput` | Bridge из runtime snapshot в текущий V2 shape `{ mode, metrics, items, contentSchemas, dependencies }`. |

Adapter не импортирует движок. Это важно: `admin-ui` остается host side, а engine integration идет через явную границу.

## Composition bridge

Текущий composition engine ожидает старый input:

```ts
{
  mode,
  metrics,
  items,
  contentSchemas,
  dependencies
}
```

В `admin-ui` добавлен compatibility bridge, который:

- берет `WorkspaceRuntimeSnapshot`;
- превращает компоненты с area в composition `items`;
- строит `contentSchemas`;
- строит `dependencies` из relationships;
- мапит host types в текущие content types:
  - `toolbar` -> `control`;
  - `stage/workspace/list/table/summary/panel` -> `content`;
  - `form/editor` -> `control`;
  - header/sidebar/footer/warning обрабатываются отдельно;
- исключает conditional components по умолчанию, если не передан `includeConditional`.

Это временная совместимость до расширения V2 input.

## Workspace manifests

Сейчас описаны основные workspace-зоны:

```text
src/shell/workspace-registry.ts
src/shell/workspace-manifest.ts
src/shell/workspace-catalog.ts

src/features/calculator/app/workspace-manifest.ts
src/features/calculator/stage/workspace-registry.ts
src/features/calculator/project/workspace-registry.ts
src/features/calculator/rooms/workspace-registry.ts
src/features/calculator/flooring/workspace-registry.ts
src/features/calculator/wall-finish/workspace-registry.ts
src/features/calculator/warm-floor/workspace-registry.ts
src/features/calculator/doors-workbench/workspace-registry.ts

src/features/dashboard/accounting/workspace-manifest.ts
src/features/dashboard/accounting/workspace-registry.ts
src/features/dashboard/contract/workspace-manifest.ts
src/features/dashboard/contract/workspace-registry.ts
src/features/dashboard/passport/workspace-manifest.ts
src/features/dashboard/passport/workspace-registry.ts

src/features/requests/workspace-manifest.ts
src/features/requests/workspace-registry.ts
src/features/materials/workspace-manifest.ts
src/features/materials/workspace-registry.ts
```

Top-level catalog:

```text
src/shell/workspace-catalog.ts
```

Он владеет cross-feature discovery, потому что `shared` не может импортировать feature manifests.

## Shell как управляемая workspace

Shell больше не должен считаться фиксированным UI вне движка.

Сейчас shell описан как workspace:

```text
shell.root
shell.frame
shell.sidebar
shell.sidebar.calculator-projects
shell.header
shell.screen-router
shell.footer
shell.auth-gate
```

Значимые связи:

```text
shell.frame controls shell.sidebar/header/screen-router/footer
shell.sidebar selects shell.screen-router
shell.sidebar controls shell.sidebar.calculator-projects
shell.header summarizes shell.screen-router
shell.screen-router depends-on shell.sidebar/header
shell.auth-gate controls shell.screen-router
```

Это база для полной управляемости рабочей области: навигация, header, route outlet и footer должны быть видимы движку как blocks с constraints.

## Navigation / global pages

Отдельно сформирован новый контракт:

```text
ADMIN_UI_NAVIGATION_COMPOSITION_CONTRACT v1.0.md
```

Ключевая позиция:

```text
menu button != page
page != workspace component
route != visual block
overlay menu != layout participant
local tabs != global pages
```

Правильная модель:

```text
CompositionBook
-> Page Registry
-> Navigation Projection
-> Workspace Activation
-> Runtime Snapshot
-> V2 suggestions
-> Host Adapter
-> React UI
```

Глобальные страницы живут в `Page Registry`. Меню является projection, а не источником страниц.

Нужно поддержать 4 состояния меню:

| State | Layout effect |
|---|---|
| `Pinned Integrated` | Меню участвует в layout и резервирует место. |
| `Overlay Drawer` | Меню сверху UI, не меняет layout active workspace. |
| `Collapsed Rail` | Меню участвует в layout, но занимает минимальную площадь. |
| `Hidden / Command Only` | Меню скрыто, но Page Registry остается активным. |

В edit mode под сеткой должны появляться вкладки как в Google Sheets:

```text
[ Дашборд ] [ Логистика ] [ Материалы ] [ Калькулятор ] [ + ]
```

Они управляют глобальными страницами: создать, переименовать, изменить порядок, скрыть, удалить пользовательскую страницу.

## Safe workspace devtools

Добавлен dev-only слой:

```text
src/shell/workspace-devtools.ts
```

Устанавливается только в `import.meta.env.DEV`.

API в браузере:

```ts
window.__ADMIN_UI_WORKSPACE__.list()
window.__ADMIN_UI_WORKSPACE__.adapter(id)
window.__ADMIN_UI_WORKSPACE__.runtime(id, options)
window.__ADMIN_UI_WORKSPACE__.composition(id, runtimeOptions, compositionOptions)
window.__ADMIN_UI_WORKSPACE__.shellCalculator()
window.__ADMIN_UI_WORKSPACE__.calculator()
```

Если открыть:

```text
http://127.0.0.1:5174/?workspaceProbe=1
```

появляется dev-only visual probe panel. Он показывает snapshots/composition data, но:

- не импортирует engine;
- не вызывает V2;
- не мутирует React state;
- не устанавливается в production build.

Если auth включен, probe может быть виден поверх auth gate. Это ожидаемо для dev mode.

## Engine-side observations

Был просмотрен внешний проект composition engine.

Текущее состояние engine:

- V1/checks в engine проходят;
- composition input пока использует старую форму `{ mode, metrics, items, contentSchemas, dependencies }`;
- content types: `header`, `content`, `sidebar`, `control`, `warning`, `unknown`;
- relation types: `header-to-workspace`, `content-with-sidebar`, `control-for-content`, `warning-for-content`, `unknown-needs-role`.

Найден toolchain issue:

- engine project использует latest dependencies;
- Vite требует Node `20.19+` или `22.12+`;
- текущий Node был `20.11.0`;
- ошибка build связана с `node:util styleText`;
- это не ошибка `admin-ui`, а drift toolchain engine project.

## Проверки admin-ui

После последних изменений проходили:

```text
npm run build
python tools/project_guard.py frontend
python -m tools.architecture_guard check --config architecture_guard.json
```

Результат: успешно.

Smoke UI запускался, но уперся в auth gate:

```text
test expected [data-screen="dashboard"]
actual dev server requires admin session
```

Это не связано с UI-фасадом дверей. Для smoke нужен local bypass/admin session или корректная авторизация в тесте. `test-results` после запуска удален.

## Что сейчас открыто/грязно в рабочем дереве

В worktree много измененных и новых файлов из текущей большой чистки UI/adapter/workspace слоев. Их нельзя откатывать без явного решения.

Особенно важно:

- есть untracked `adaptive-engine-spike-code/`;
- есть новые workspace registry/manifests;
- есть новые docs;
- есть modified feature UI files;
- есть modified shared controls/styles;
- есть modified architecture guard config.

Правило работы: не делать `git reset`, не откатывать чужие изменения, работать поверх текущего состояния.

## Текущая stop line

До ограниченной реальной интеграции engine нужно:

1. Довести shared primitives и убрать оставшиеся one-off controls.
2. Добить navigation contract в коде:
   - `Page Registry`;
   - `Route Registry`;
   - `Navigation Projection`;
   - menu states;
   - reserved shell areas.
3. Передавать `reservedShellArea` в runtime/composition input.
4. Добавить relationships:
   - `mounts`;
   - `focuses`;
   - `projects`;
   - `constrains`.
5. Формализовать motion presets.
6. Разделить global navigation, workspace navigation и local block navigation.
7. Настроить smoke под auth/local bypass.
8. Подключать engine сначала только к sandbox/limited workspace.

Что не делать до stop line:

- не включать V2 auto behavior;
- не давать engine менять React/DOM напрямую;
- не хранить geometry только в CSS;
- не импортировать engine internals в feature JSX;
- не позволять каждому feature самостоятельно решать move/resize/collapse правила;
- не считать overlay menu участником layout collision checks.

## Как должен выглядеть итоговый продукт

В обычном режиме пользователь видит нормальную админку:

- shell/header/menu;
- калькулятор;
- этапы работ;
- двери/полы/стены/теплый пол;
- dashboard/materials/requests.

Движок работает под капотом и не мешает расчету.

В режиме управления/редактирования:

- включается overlay/diagnostic layer;
- блоки подсвечиваются именами/цветами;
- видны parentId, dataKey, relationships, capabilities;
- снизу появляются global page tabs;
- меню можно держать pinned, overlay, collapsed или hidden;
- V2 предлагает layout/menu/motion изменения;
- host adapter применяет только подтвержденные изменения.

## Главная просьба к V2

V2 должен различать уровни:

```text
global page
route
workspace
workspace block
inner element
navigation projection
local view
motion profile
```

И возвращать рекомендации не как DOM-инструкции, а как host-level suggestions:

```text
move/resize/collapse block
change menu state
reserve shell area
focus default component
switch local view
choose motion preset
```

Каждая рекомендация должна иметь:

- target id;
- from/to;
- reason;
- affected blocks/workspaces;
- whether user approval is required;
- rejection-safe fallback.

## Краткая карта следующих работ

Ближайший безопасный порядок:

1. Закрыть документацию handoff и versioning.
2. Продолжить перевод feature UI на shared primitives.
3. Реализовать `page-registry.ts` и `route-registry.ts` без визуального rewrite.
4. Сгенерировать shell navigation workspace из registry.
5. Добавить reserved shell area в runtime snapshot.
6. Сделать dev-only edit tabs/probe для global pages.
7. Только после этого подключать реальные V2 suggestions к sandbox.

## Итог

На текущий момент `admin-ui` уже получил основу host architecture: shared primitives, workspace contract, adapter snapshots, runtime snapshots, composition bridge, shell workspace catalog, devtools probe и большую компонентную карту. Следующий большой недостающий слой - navigation/page composition contract в коде, потому что глобальные страницы и меню должны быть управляемыми движком так же явно, как рабочие блоки калькулятора.
