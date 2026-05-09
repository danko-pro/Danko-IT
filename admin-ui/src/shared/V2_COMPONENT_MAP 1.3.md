# V2 Component Map 1.3 для admin-ui

Дата снимка: 2026-05-09.

Этот файл нужен как handoff для V2 adaptive layer. Он описывает, какие UI-слои, parent-блоки, workspace-блоки, primitives и feature-компоненты уже есть в `admin-ui`, чтобы V2 понимал не хаотичный JSX, а карту host-проекта.

## Главный контракт

V2 не должен учиться на DOM как на единственном источнике правды. Для `admin-ui` правильная цепочка такая:

```text
feature model/state
-> workspace registry / component map
-> workspace adapter snapshot
-> adaptive-engine V1 наблюдение/проверка
-> V2 recommendations
-> host adapter
-> React UI
```

V1 остается строгим layout kernel. V2 может наблюдать, группировать, рекомендовать, но не должен молча менять настоящий layout без явного режима и adapter boundary.

## Слои проекта

| Слой | Путь | Назначение для V2 |
|---|---|---|
| App shell | `src/shell` | Верхний каркас приложения, маршрутизация экранов, header/sidebar/footer. |
| Shared UI | `src/shared/controls`, `src/shared/ui*` | Переиспользуемые элементы: кнопки, dropdown, fields, dense rows, cards, chips, status, popovers. |
| Workspace contract | `src/shared/workspace-contract` | Язык описания host UI: components, elements, capabilities, area, relationships. |
| Workspace adapter | `src/shared/workspace-adapter` | Host-side snapshot без импорта движка: validation, layoutItems, constraints, meta. |
| Feature screens | `src/features/*/screen.tsx` | Верхние экраны доменов. |
| Feature model/state/api | `src/features/*/{model,state,api}` | Данные и бизнес-операции. V2 должен видеть через `dataKey`, не управлять напрямую. |
| Calculator slices | `src/features/calculator/*` | Основная будущая workspace-зона калькулятора. |
| Dashboard accounting | `src/features/dashboard/accounting` | Сложная workspace-зона ledger/table/popover controls. |

## Глобальное parent tree

```text
App
└─ AppShell
   ├─ AppShellHeader
   ├─ AppShellSidebar
   ├─ AppScreenRouter
   │  ├─ DashboardScreen
   │  ├─ RequestsScreen
   │  ├─ MaterialsScreen
   │  ├─ CalculatorScreen
   │  ├─ SettingsScreen
   │  └─ EditorScreen
   └─ AppShellFooter
```

`AppScreenRouter` лениво грузит экраны. V2 не должен пытаться управлять hidden screens одновременно: активной рабочей областью считается только текущий routed screen.

## Shared primitives

Эти элементы являются базовыми building blocks. Feature-компоненты должны использовать их вместо локальных one-off реализаций.

### Controls

| Component | Type for V2 | Role |
|---|---|---|
| `Button` | `button` | Общая кнопка действия. |
| `IconButton` | `button` | Icon-only action. |
| `AddButton` | `button` | Добавление строк/позиций. |
| `DeleteButton` | `button` | Danger/delete action. |
| `InlineAddButton` | `button` | Compact inline add. |
| `ConfirmDeleteContent` | `confirm` | Подтверждение удаления. |
| `DropdownRoot` | `dropdown` | Корень dropdown/select shell. |
| `DropdownTrigger` | `button` | Открывает dropdown. |
| `DropdownChevron` | `icon` | Визуальный indicator dropdown. |
| `DropdownCheck` | `status` | Selected marker внутри option. |

### Fields

| Component | Type for V2 | Role |
|---|---|---|
| `Field` / calculator alias `TextField` | `input` | Текстовое поле. |
| `SelectField` | `select` | Select field. |
| `TimeField` | `input` | Time input. |
| `TextAreaField` | `textarea` | Многострочное поле. |

### Cards/status/popovers

| Component | Type for V2 | Role |
|---|---|---|
| `InfoCard` | `card` | Простая информационная карточка. |
| `DenseRow` | `list-item` | Повторяемая плотная строка списка с optional active state. |
| `MetricCard` | `metric` | Карточка метрики. |
| `SettingCard` | `card` | Настройка/значение. |
| `StatusBadge` | `status` | Badge состояния. |
| `SignalChip` | `chip` | Compact signal. |
| `StatChip` | `chip` | Compact metric/attribute chip внутри dense rows и summary blocks. |
| `PanelResizeHandle` | `resize-handle` | Resize affordance для panel/popover. |
| `useResizablePersistentPanel` | `interaction-hook` | Resize state/persistence, не visual component. |

### Calculator feature facade

| Component | Type for V2 | Role |
|---|---|---|
| `CalculatorStageSectionHeader` | `header` | Единый заголовок calculator stage section: kicker/title/note/actions. |
| `CalculatorStageEmptyState` | `empty-state` | Единое пустое состояние calculator stage section. |

## Workspace contract primitives

Source files:

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
| `WorkspaceComponentSchema` | Parent/block-level component for V2 and adapter. |
| `parentId` | Explicit parent component id. V2 should use it for hierarchy before reading DOM nesting. |
| `WorkspaceElementSchema` | Inner element: button/input/select/dropdown/metric/status/etc. |
| `WorkspaceManifest` | Набор registries одной рабочей области. |
| `WorkspaceArea` | Grid area `{ x, y, w, h }`, V1-compatible. |
| `WorkspaceCapabilityMap` | movable/resizable/deletable/copyable/collapsible. |
| `WorkspaceRelationship` | Связи между блоками: controls/summarizes/depends-on/etc. |
| `layoutParticipation` | `always`, `conditional`, `none`; conditional не отправляется в layout projection по умолчанию. |

## Workspace adapter snapshot

Source files:

```text
src/shared/workspace-adapter/snapshot.ts
src/shared/workspace-adapter/runtime-snapshot.ts
src/shared/workspace-adapter/rejection.ts
src/shared/workspace-adapter/types.ts
```

Snapshot shape:

```ts
{
  id,
  title,
  behaviorMode: "off" | "suggest" | "auto",
  manifest,
  validation,
  layoutItems,
  constraints,
  meta: {
    source: "host-manifest",
    registryIds,
    componentCount,
    elementCount,
    valid
  }
}
```

Это вход для будущего host adapter. Engine import здесь запрещен.

## Формализованные workspace manifests

## Composition runtime snapshot

Source files:

```text
src/shared/workspace-adapter/runtime-snapshot.ts
src/shared/workspace-adapter/types.ts
```

Runtime shape for active V2/composition zone:

```ts
{
  workspaceId,
  activeRoute,
  metrics: { columns, rows },
  components: [
    {
      id,
      parentId,
      type,
      area,
      dataKey,
      capabilities,
      layoutParticipation
    }
  ],
  elements: [
    {
      id,
      parentId,
      type,
      role,
      dataKey
    }
  ],
  relationships: [
    {
      sourceId,
      targetId,
      type
    }
  ]
}
```

Mapping rule:

```text
WorkspaceAdapterSnapshot is the full host contract.
WorkspaceRuntimeSnapshot is the compact active-zone payload for composition-engine V2.
Parent components stay in components.
Inner children stay in elements.
Component and element relationships are flattened to sourceId/targetId/type.
Conditional components are excluded unless the caller explicitly passes includeConditional.
```

## Composition input bridge

Source files:

```text
src/shared/workspace-adapter/composition-input.ts
src/shell/workspace-catalog.ts
```

Exports:

```text
createWorkspaceCompositionInput(runtimeSnapshot, options)
getAppWorkspaceCompositionInput(id, runtimeOptions, compositionOptions)
```

Bridge target:

```ts
{
  mode,
  metrics,
  sourceMetrics,
  items,
  contentSchemas,
  dependencies
}
```

Mapping rule:

```text
runtime components with area -> composition items
runtime component type/title/id -> composition contentSchemas
runtime relationships -> composition dependencies
inner elements never become composition items
capabilities/layoutParticipation are preserved in item.meta and contentSchemas
```

This is the compatibility layer for the current composition-engine input. It lets admin-ui keep the richer runtime snapshot while still calling the current V2 `resolveCompositionPlan` shape.

## Safe workspace devtools

Source:

```text
src/shell/workspace-devtools.ts
```

Runtime availability:

```text
development only
window.__ADMIN_UI_WORKSPACE__
```

Commands:

```ts
window.__ADMIN_UI_WORKSPACE__.list()
window.__ADMIN_UI_WORKSPACE__.adapter("shell-workspace")
window.__ADMIN_UI_WORKSPACE__.runtime("shell-workspace", { activeRoute: "calculator", includeConditional: true })
window.__ADMIN_UI_WORKSPACE__.composition("shell-workspace", { activeRoute: "calculator" }, { mode: "suggest" })
window.__ADMIN_UI_WORKSPACE__.shellCalculator()
window.__ADMIN_UI_WORKSPACE__.calculator()
```

Safety rule:

```text
devtools do not import the engine, do not call V2, do not mutate React state, and do not install in production.
They only expose cloned admin-ui snapshots/inputs for inspection.
```

## Host workspace catalog

Source:

```text
src/shell/workspace-catalog.ts
```

Exports:

```text
appWorkspaceManifests
appWorkspaceAdapterSnapshots
getAppWorkspaceAdapterSnapshot(id)
getAppWorkspaceRuntimeSnapshot(id, options)
getAppWorkspaceCompositionInput(id, runtimeOptions, compositionOptions)
```

Rule:

```text
shared owns schemas/adapters only.
features own concrete workspace manifests.
shell owns the cross-feature catalog.
```

This keeps `shared` independent from feature imports while still giving V2 one stable facade for all host-managed workspaces.

### Shell workspace

Source:

```text
src/shell/workspace-manifest.ts
src/shell/workspace-registry.ts
```

Exports:

```text
shellWorkspaceManifest
shellWorkspaceAdapterSnapshot
shellWorkspaceLayoutItems
shellWorkspaceLayoutConstraints
shellWorkspaceValidationReport
```

#### Parent blocks

| id | parent | type | area | dataKey | capabilities | source |
|---|---|---|---|---|---|---|
| `shell.root` | `shell` | `workspace` | none | `shell` | parent-only | `App.tsx` |
| `shell.frame` | `shell.root` | `workspace` | `1,1,32,30` | `shell.frame` | resizable | `App.tsx` |
| `shell.sidebar` | `shell.frame` | `panel` | `1,1,5,26` | `shell.navigation` | movable, resizable, collapsible | `sidebar.tsx` |
| `shell.sidebar.calculator-projects` | `shell.sidebar` | `list` | `1,8,5,11` | `calculator.projects[]` | conditional, resizable, collapsible | `sidebar.tsx` |
| `shell.header` | `shell.frame` | `toolbar` | `6,1,27,4` | `shell.header` | movable, resizable, collapsible | `header.tsx` |
| `shell.screen-router` | `shell.frame` | `stage` | `6,5,27,22` | `shell.screen` | movable, resizable | `screen-router.tsx` |
| `shell.footer` | `shell.frame` | `toolbar` | `1,27,32,3` | `shell.footer` | movable, resizable, collapsible | `footer.tsx` |
| `shell.auth-gate` | `shell.frame` | `form` | `1,1,32,26` | `shell.auth` | conditional, resizable | `auth/screen.tsx` |

#### Inner elements

| parent | element id | type | role | dataKey |
|---|---|---|---|---|
| `shell.sidebar` | `shell.sidebar.brand` | `status` | `summary` | `shell.brand` |
| `shell.sidebar` | `shell.sidebar.nav.dashboard` | `button` | `navigation` | `shell.screen.dashboard` |
| `shell.sidebar` | `shell.sidebar.nav.requests` | `button` | `navigation` | `shell.screen.requests` |
| `shell.sidebar` | `shell.sidebar.nav.materials` | `button` | `navigation` | `shell.screen.materials` |
| `shell.sidebar` | `shell.sidebar.nav.calculator` | `button` | `navigation` | `shell.screen.calculator` |
| `shell.sidebar` | `shell.sidebar.nav.settings` | `button` | `navigation` | `shell.screen.settings` |
| `shell.sidebar.calculator-projects` | `shell.sidebar.calculator-project` | `list-item` | `navigation` | `calculator.projects[]` |
| `shell.sidebar.calculator-projects` | `shell.sidebar.calculator-project.add` | `button` | `primary-action` | `calculator.project.create` |
| `shell.header` | `shell.header.title` | `status` | `summary` | `shell.activeScreenTitle` |
| `shell.header` | `shell.header.terms` | `metric` | `summary` | `summary.new_unknown_terms_count` |
| `shell.header` | `shell.header.success` | `status` | `status` | `shell.successMessage` |
| `shell.screen-router` | `shell.route.dashboard` | `status` | `navigation` | `workspaceCatalog.dashboard` |
| `shell.screen-router` | `shell.route.requests` | `status` | `navigation` | `requests-workspace` |
| `shell.screen-router` | `shell.route.materials` | `status` | `navigation` | `materials-workspace` |
| `shell.screen-router` | `shell.route.calculator` | `status` | `navigation` | `calculator.workspace` |
| `shell.footer` | `shell.footer.api-status` | `status` | `status` | `shell.loading` |
| `shell.footer` | `shell.footer.auth-status` | `status` | `status` | `shell.authSession` |
| `shell.footer` | `shell.footer.logout` | `button` | `secondary-action` | `shell.auth.logout` |

#### Relationships

```text
shell.frame controls shell.sidebar
shell.frame controls shell.header
shell.frame controls shell.screen-router
shell.frame controls shell.footer
shell.sidebar selects shell.screen-router
shell.sidebar controls shell.sidebar.calculator-projects
shell.sidebar.nav.dashboard selects shell.route.dashboard
shell.sidebar.nav.requests selects shell.route.requests
shell.sidebar.nav.materials selects shell.route.materials
shell.sidebar.nav.calculator selects shell.route.calculator
shell.sidebar.nav.settings selects shell.route.settings
shell.sidebar.calculator-projects selects shell.screen-router
shell.header summarizes shell.screen-router
shell.screen-router depends-on shell.sidebar
shell.screen-router depends-on shell.header
shell.auth-gate controls shell.screen-router
```

### Calculator workspace

Source:

```text
src/features/calculator/app/workspace-manifest.ts
src/features/calculator/stage/workspace-registry.ts
src/features/calculator/project/workspace-registry.ts
src/features/calculator/rooms/workspace-registry.ts
src/features/calculator/flooring/workspace-registry.ts
src/features/calculator/wall-finish/workspace-registry.ts
src/features/calculator/warm-floor/workspace-registry.ts
src/features/calculator/doors-workbench/workspace-registry.ts
```

Exports:

```text
calculatorWorkspaceManifest
calculatorWorkspaceAdapterSnapshot
calculatorWorkspaceLayoutItems
calculatorWorkspaceLayoutConstraints
calculatorWorkspaceValidationReport
```

#### Parent blocks

| id | parent | type | area | dataKey | capabilities | source |
|---|---|---|---|---|---|---|
| `calculator.stage.header` | `calculator.workspace` | `toolbar` | `1,1,30,3` | `calculator.activeStage` | fixed, not collapsible | `calculator/stage/shell.tsx` |
| `calculator.stage.main` | `calculator.workspace` | `stage` | `1,4,20,22` | `calculator.activeStage.content` | resizable | `calculator/stage/right-panel-layout.tsx` |
| `calculator.stage.side-panel` | `calculator.workspace` | `panel` | `21,4,10,22` | `calculator.activeStage.sidePanel` | resizable, collapsible | `calculator/stage/right-panel-layout.tsx` |
| `calculator.stage.empty` | `calculator.workspace` | `panel` | `1,4,30,8` | `calculator.stage.isReady` | conditional layout | `calculator/stage/shell.tsx` |
| `calculator.project.root` | `calculator.workspace` | `workspace` | none | `calculator.project` | parent-only | `calculator/project/stage.tsx` |
| `calculator.project.identity` | `calculator.project.root` | `form` | none | `calculator.project.identity` | copyable | `calculator/screen/header-form.tsx` |
| `calculator.project.access` | `calculator.project.root` | `form` | none | `calculator.project.access` | copyable | `calculator/screen/header-form.tsx` |
| `calculator.project.workspace` | `calculator.project.root` | `workspace` | `1,1,30,22` | `calculator.project.workspaceDraft` | resizable, copyable | `calculator/project/workspace.tsx` |
| `calculator.project.tabs` | `calculator.project.workspace` | `toolbar` | none | `calculator.project.activeTab` | fixed | `calculator/project/workspace.tsx` |
| `calculator.project.contacts` | `calculator.project.workspace` | `form` | none | `calculator.project.workspaceDraft.contacts` | copyable | `calculator/project/contacts.tsx` |
| `calculator.project.materials` | `calculator.project.workspace` | `form` | none | `calculator.project.workspaceDraft.materials` | copyable | `calculator/project/materials.tsx` |
| `calculator.project.design` | `calculator.project.workspace` | `form` | none | `calculator.project.workspaceDraft.design` | copyable | `calculator/project/design.tsx` |
| `calculator.project.montage` | `calculator.project.workspace` | `form` | none | `calculator.project.workspaceDraft.montage` | copyable | `calculator/project/montage.tsx` |
| `calculator.project.kp` | `calculator.project.workspace` | `form` | none | `calculator.project.workspaceDraft.kp` | copyable | `calculator/project/kp.tsx` |
| `calculator.project.kp-table` | `calculator.project.kp` | `table` | none | `calculator.project.kpRows` | copyable | `calculator/project/table.tsx` |
| `calculator.rooms.workspace` | `calculator.stage.main` | `workspace` | none | `calculator.rooms` | parent-only | `calculator/rooms/project/flow.tsx` |
| `calculator.rooms.sidebar` | `calculator.rooms.workspace` | `list` | `1,1,9,22` | `calculator.project.rooms` | resizable, collapsible | `calculator/rooms/sidebar.tsx` |
| `calculator.rooms.create` | `calculator.rooms.sidebar` | `form` | none | `calculator.rooms.createRoom` | collapsible | `calculator/rooms/create.tsx` |
| `calculator.rooms.editor` | `calculator.rooms.workspace` | `editor` | `10,1,21,22` | `calculator.rooms.selectedRoom` | resizable, copyable | `calculator/rooms/editor.tsx` |
| `calculator.rooms.primary` | `calculator.rooms.editor` | `form` | none | `calculator.rooms.selectedRoom.primary` | copyable | `calculator/rooms/primary.tsx` |
| `calculator.rooms.stats` | `calculator.rooms.editor` | `summary` | none | `calculator.rooms.selectedRoom.stats` | copyable | `calculator/room/stats.tsx` |
| `calculator.rooms.walls` | `calculator.rooms.editor` | `list` | none | `calculator.rooms.selectedRoom.walls_m` | copyable, collapsible | `calculator/room/walls.tsx` |
| `calculator.rooms.floor-sections` | `calculator.rooms.editor` | `list` | none | `calculator.rooms.selectedRoom.floor_sections` | copyable, collapsible | `calculator/room/floors.tsx` |
| `calculator.rooms.openings` | `calculator.rooms.editor` | `list` | none | `calculator.rooms.selectedRoom.openings` | copyable, collapsible | `calculator/room/openings.tsx` |
| `calculator.flooring.workspace` | `calculator.stage.main` | `workspace` | none | `calculator.flooring` | parent-only | `calculator/flooring/stage.tsx` |
| `calculator.flooring.mode-tabs` | `calculator.flooring.workspace` | `toolbar` | none | `calculator.flooring.panelMode` | fixed | `calculator/flooring/stage.tsx` |
| `calculator.flooring.rooms` | `calculator.flooring.workspace` | `list` | `1,1,20,22` | `calculator.flooring.preview.rooms` | resizable, collapsible | `calculator/flooring/rooms.tsx` |
| `calculator.flooring.side-panel` | `calculator.flooring.workspace` | `panel` | `21,1,10,22` | `calculator.flooring.panelMode` | resizable, collapsible | `calculator/flooring/summary.tsx` |
| `calculator.flooring.room-parameters` | `calculator.flooring.side-panel` | `form` | none | `calculator.flooring.state.rooms[].zones` | copyable, collapsible | `calculator/flooring/room-parameters.tsx` |
| `calculator.flooring.settings` | `calculator.flooring.side-panel` | `form` | none | `calculator.flooring.state` | copyable, collapsible | `calculator/flooring/settings.tsx` |
| `calculator.flooring.techmap` | `calculator.flooring.side-panel` | `panel` | none | `calculator.flooring.techmapMode` | collapsible | `calculator/flooring/summary.tsx` |
| `calculator.flooring.coverings-catalog` | `calculator.flooring.techmap` | `form` | none | `calculator.flooring.detail.coverings` | copyable | `calculator/flooring/covering.tsx` |
| `calculator.flooring.preparations-catalog` | `calculator.flooring.techmap` | `form` | none | `calculator.flooring.detail.preparations` | copyable | `calculator/flooring/prepare.tsx` |
| `calculator.flooring.layouts-catalog` | `calculator.flooring.techmap` | `form` | none | `calculator.flooring.detail.layouts` | copyable | `calculator/flooring/layout.tsx` |
| `calculator.flooring.summary` | `calculator.flooring.side-panel` | `summary` | none | `calculator.flooring.preview.summary` | copyable, collapsible | `calculator/flooring/summary.tsx` |
| `calculator.flooring.estimate` | `calculator.flooring.side-panel` | `table` | none | `calculator.flooring.preview.specification` | copyable, collapsible | `calculator/flooring/estimate.tsx` |
| `calculator.wall-finish.workspace` | `calculator.stage.main` | `workspace` | none | `calculator.wallFinish` | parent-only | `calculator/wall-finish/stage.tsx` |
| `calculator.wall-finish.mode-tabs` | `calculator.wall-finish.workspace` | `toolbar` | none | `calculator.wallFinish.panelMode` | fixed | `calculator/wall-finish/stage.tsx` |
| `calculator.wall-finish.rooms` | `calculator.wall-finish.workspace` | `list` | `1,1,20,22` | `calculator.wallFinish.preview.rooms` | resizable, collapsible | `calculator/wall-finish/rooms.tsx` |
| `calculator.wall-finish.side-panel` | `calculator.wall-finish.workspace` | `panel` | `21,1,10,22` | `calculator.wallFinish.panelMode` | resizable, collapsible | `calculator/wall-finish/summary.tsx` |
| `calculator.wall-finish.room-parameters` | `calculator.wall-finish.side-panel` | `form` | none | `calculator.wallFinish.state.rooms[].zones` | copyable, collapsible | `calculator/wall-finish/room-parameters.tsx` |
| `calculator.wall-finish.settings` | `calculator.wall-finish.side-panel` | `form` | none | `calculator.wallFinish.state` | copyable, collapsible | `calculator/wall-finish/settings.tsx` |
| `calculator.wall-finish.techmap` | `calculator.wall-finish.side-panel` | `panel` | none | `calculator.wallFinish.techmapMode` | collapsible | `calculator/wall-finish/summary.tsx` |
| `calculator.wall-finish.coverings-catalog` | `calculator.wall-finish.techmap` | `form` | none | `calculator.wallFinish.detail.coverings` | copyable | `calculator/wall-finish/covering.tsx` |
| `calculator.wall-finish.preparations-catalog` | `calculator.wall-finish.techmap` | `form` | none | `calculator.wallFinish.detail.preparations` | copyable | `calculator/wall-finish/prepare.tsx` |
| `calculator.wall-finish.layouts-catalog` | `calculator.wall-finish.techmap` | `form` | none | `calculator.wallFinish.detail.layouts` | copyable | `calculator/wall-finish/layout.tsx` |
| `calculator.wall-finish.summary` | `calculator.wall-finish.side-panel` | `summary` | none | `calculator.wallFinish.preview.summary` | copyable, collapsible | `calculator/wall-finish/summary.tsx` |
| `calculator.wall-finish.estimate` | `calculator.wall-finish.side-panel` | `table` | none | `calculator.wallFinish.preview.specification` | copyable, collapsible | `calculator/wall-finish/estimate.tsx` |
| `calculator.warm-floor.workspace` | `calculator.stage.main` | `workspace` | none | `calculator.warmFloor` | parent-only | `calculator/warm-floor/stage.tsx` |
| `calculator.warm-floor.mode-tabs` | `calculator.warm-floor.workspace` | `toolbar` | none | `calculator.warmFloor.panelMode` | fixed | `calculator/warm-floor/stage.tsx` |
| `calculator.warm-floor.rooms` | `calculator.warm-floor.workspace` | `list` | `1,1,20,22` | `calculator.warmFloor.preview.rooms` | resizable, collapsible | `calculator/warm-floor/edit.tsx` |
| `calculator.warm-floor.side-panel` | `calculator.warm-floor.workspace` | `panel` | `21,1,10,22` | `calculator.warmFloor.panelMode` | resizable, collapsible | `calculator/warm-floor/summary.tsx` |
| `calculator.warm-floor.settings` | `calculator.warm-floor.side-panel` | `form` | none | `calculator.warmFloor.state` | copyable, collapsible | `calculator/warm-floor/settings.tsx` |
| `calculator.warm-floor.summary` | `calculator.warm-floor.side-panel` | `summary` | none | `calculator.warmFloor.preview.summary` | copyable, collapsible | `calculator/warm-floor/summary.tsx` |
| `calculator.warm-floor.estimate` | `calculator.warm-floor.side-panel` | `table` | none | `calculator.warmFloor.preview.specification` | copyable, collapsible | `calculator/warm-floor/summary.tsx` |
| `doors-workbench.queue` | `calculator.stage.main` | `list` | `1,1,8,18` | `calculator.doors.projectDoors` | resizable, collapsible | `doors-workbench/queue.tsx` |
| `doors-workbench.editor` | `calculator.stage.main` | `editor` | `9,1,14,18` | `calculator.doors.selectedDoor` | resizable, copyable | `doors-workbench/composers.tsx` |
| `doors-workbench.components` | `calculator.stage.main` | `list` | `23,1,8,18` | `calculator.doors.selectedDoor.components` | resizable, collapsible | `doors-workbench/focus.tsx` |
| `doors-workbench.summary` | `calculator.stage.main` | `summary` | `1,19,30,5` | `calculator.doors.selectedDoor.summary` | resizable, collapsible | `doors-workbench/stage.tsx` |

#### Inner elements

| parent | element id | type | role | dataKey |
|---|---|---|---|---|
| `calculator.stage.header` | `calculator.stage.settings-toggle` | `button` | `secondary-action` | `calculator.stage.settingsOpen` |
| `calculator.stage.header` | `calculator.stage.actions` | `button` | `primary-action` | none |
| `calculator.stage.side-panel` | `calculator.stage.side-panel.toggle` | `button` | `secondary-action` | `calculator.stage.panelOpen` |
| `calculator.project.identity` | `calculator.project.identity.name` | `input` | `field` | `calculator.project.projectName` |
| `calculator.project.identity` | `calculator.project.identity.address` | `input` | `field` | `calculator.project.projectAddress` |
| `calculator.project.access` | `calculator.project.access.lift` | `select` | `selector` | `calculator.project.liftType` |
| `calculator.project.access` | `calculator.project.access.responsible` | `input` | `field` | `calculator.project.responsiblePerson` |
| `calculator.project.tabs` | `calculator.project.tabs.contacts` | `button` | `navigation` | `calculator.project.activeTab.contacts` |
| `calculator.project.contacts` | `calculator.project.contacts.client` | `input` | `field` | `calculator.project.workspaceDraft.clientName` |
| `calculator.project.materials` | `calculator.project.materials.comment` | `textarea` | `field` | `calculator.project.workspaceDraft.materialsComment` |
| `calculator.project.kp-table` | `calculator.project.kp-table.row` | `list-item` | `field` | `calculator.project.kpRows[]` |
| `calculator.project.kp-table` | `calculator.project.kp-table.total` | `metric` | `summary` | `calculator.project.kpRows.total` |
| `calculator.rooms.sidebar` | `calculator.rooms.sidebar.room-row` | `list-item` | `navigation` | `calculator.project.rooms[]` |
| `calculator.rooms.sidebar` | `calculator.rooms.sidebar.delete-room` | `confirm` | `danger-action` | `calculator.project.rooms[]` |
| `calculator.rooms.create` | `calculator.rooms.create.submit` | `button` | `submit-action` | none |
| `calculator.rooms.editor` | `calculator.rooms.editor.autosave` | `status` | `status` | `calculator.rooms.autosaveState` |
| `calculator.rooms.primary` | `calculator.rooms.primary.name` | `input` | `field` | `calculator.rooms.selectedRoom.name` |
| `calculator.rooms.primary` | `calculator.rooms.primary.manual-floor-area` | `input` | `field` | `calculator.rooms.selectedRoom.manual_floor_area_m2` |
| `calculator.rooms.stats` | `calculator.rooms.stats.wall-net` | `metric` | `summary` | `calculator.rooms.selectedRoom.stats.wall_area_net_m2` |
| `calculator.rooms.walls` | `calculator.rooms.walls.row` | `list-item` | `field` | `calculator.rooms.selectedRoom.walls_m[]` |
| `calculator.rooms.floor-sections` | `calculator.rooms.floor-sections.row` | `list-item` | `field` | `calculator.rooms.selectedRoom.floor_sections[]` |
| `calculator.rooms.openings` | `calculator.rooms.openings.row` | `list-item` | `field` | `calculator.rooms.selectedRoom.openings[]` |
| `calculator.flooring.mode-tabs` | `calculator.flooring.mode-tabs.summary` | `button` | `navigation` | `calculator.flooring.panelMode.summary` |
| `calculator.flooring.rooms` | `calculator.flooring.rooms.card` | `list-item` | `navigation` | `calculator.flooring.preview.rooms[]` |
| `calculator.flooring.rooms` | `calculator.flooring.rooms.selected` | `input` | `field` | `calculator.flooring.state.rooms[].selected` |
| `calculator.flooring.room-parameters` | `calculator.flooring.room-parameters.zone-row` | `list-item` | `field` | `calculator.flooring.state.rooms[].zones[]` |
| `calculator.flooring.room-parameters` | `calculator.flooring.room-parameters.covering` | `select` | `selector` | `calculator.flooring.state.rooms[].zones[].covering_id` |
| `calculator.flooring.settings` | `calculator.flooring.settings.global-item` | `list-item` | `field` | `calculator.flooring.state.global_items[]` |
| `calculator.flooring.techmap` | `calculator.flooring.techmap.coverings-tab` | `button` | `navigation` | none |
| `calculator.flooring.coverings-catalog` | `calculator.flooring.coverings-catalog.submit` | `button` | `submit-action` | none |
| `calculator.flooring.summary` | `calculator.flooring.summary.grand-total` | `metric` | `summary` | `calculator.flooring.preview.summary.grand_total` |
| `calculator.flooring.estimate` | `calculator.flooring.estimate.total` | `metric` | `summary` | `calculator.flooring.preview.specification.total` |
| `calculator.wall-finish.mode-tabs` | `calculator.wall-finish.mode-tabs.summary` | `button` | `navigation` | `calculator.wallFinish.panelMode.summary` |
| `calculator.wall-finish.rooms` | `calculator.wall-finish.rooms.card` | `list-item` | `navigation` | `calculator.wallFinish.preview.rooms[]` |
| `calculator.wall-finish.rooms` | `calculator.wall-finish.rooms.selected` | `input` | `field` | `calculator.wallFinish.state.rooms[].selected` |
| `calculator.wall-finish.room-parameters` | `calculator.wall-finish.room-parameters.zone-row` | `list-item` | `field` | `calculator.wallFinish.state.rooms[].zones[]` |
| `calculator.wall-finish.room-parameters` | `calculator.wall-finish.room-parameters.covering` | `select` | `selector` | `calculator.wallFinish.state.rooms[].zones[].covering_id` |
| `calculator.wall-finish.settings` | `calculator.wall-finish.settings.demolition-rate` | `input` | `field` | `calculator.wallFinish.state.demolition_price_per_m2` |
| `calculator.wall-finish.techmap` | `calculator.wall-finish.techmap.coverings-tab` | `button` | `navigation` | none |
| `calculator.wall-finish.coverings-catalog` | `calculator.wall-finish.coverings-catalog.submit` | `button` | `submit-action` | none |
| `calculator.wall-finish.summary` | `calculator.wall-finish.summary.grand-total` | `metric` | `summary` | `calculator.wallFinish.preview.summary.grand_total` |
| `calculator.wall-finish.estimate` | `calculator.wall-finish.estimate.total` | `metric` | `summary` | `calculator.wallFinish.preview.specification.total` |
| `calculator.warm-floor.mode-tabs` | `calculator.warm-floor.mode-tabs.summary` | `button` | `navigation` | `calculator.warmFloor.panelMode.summary` |
| `calculator.warm-floor.rooms` | `calculator.warm-floor.rooms.card` | `list-item` | `navigation` | `calculator.warmFloor.preview.rooms[]` |
| `calculator.warm-floor.rooms` | `calculator.warm-floor.rooms.area-override` | `input` | `field` | `calculator.warmFloor.state.rooms[].area_m2_override` |
| `calculator.warm-floor.settings` | `calculator.warm-floor.settings.pipe-rate` | `input` | `field` | `calculator.warmFloor.state.pipe_m_per_m2` |
| `calculator.warm-floor.settings` | `calculator.warm-floor.settings.consumable-item` | `list-item` | `field` | `calculator.warmFloor.state.consumable_material_items[]` |
| `calculator.warm-floor.summary` | `calculator.warm-floor.summary.total-pipe` | `metric` | `summary` | `calculator.warmFloor.preview.summary.total_pipe_m` |
| `calculator.warm-floor.estimate` | `calculator.warm-floor.estimate.total` | `metric` | `summary` | `calculator.warmFloor.preview.specification.total` |
| `doors-workbench.queue` | `doors-workbench.queue.select-door` | `button` | `navigation` | `calculator.doors.selectedDoorId` |
| `doors-workbench.queue` | `doors-workbench.queue.delete-door` | `button` | `danger-action` | `calculator.doors.projectDoors` |
| `doors-workbench.editor` | `doors-workbench.editor.title` | `input` | `field` | `calculator.doors.selectedDoor.title` |
| `doors-workbench.editor` | `doors-workbench.editor.kind` | `select` | `selector` | `calculator.doors.selectedDoor.kind` |
| `doors-workbench.editor` | `doors-workbench.editor.dimensions` | `input` | `field` | `calculator.doors.selectedDoor.dimensions` |
| `doors-workbench.editor` | `doors-workbench.editor.save` | `button` | `submit-action` | none |
| `doors-workbench.components` | `doors-workbench.components.quick-kit` | `chip` | `primary-action` | `calculator.doors.selectedDoor.components` |
| `doors-workbench.components` | `doors-workbench.components.delete-component` | `button` | `danger-action` | `calculator.doors.selectedDoor.components` |
| `doors-workbench.summary` | `doors-workbench.summary.total` | `metric` | `summary` | `calculator.doors.selectedDoor.total` |

#### Relationships

```text
calculator.stage.main controls calculator.stage.side-panel
calculator.project.workspace controls calculator.project.tabs
calculator.project.tabs controls calculator.project.contacts/materials/design/montage/kp
calculator.project.kp controls calculator.project.kp-table
calculator.rooms.sidebar controls calculator.rooms.editor
calculator.rooms.sidebar controls calculator.rooms.create
calculator.rooms.editor controls calculator.rooms.primary
calculator.rooms.editor summarizes calculator.rooms.stats
calculator.rooms.editor controls calculator.rooms.walls
calculator.rooms.editor controls calculator.rooms.floor-sections
calculator.rooms.editor controls calculator.rooms.openings
calculator.flooring.mode-tabs controls calculator.flooring.side-panel
calculator.flooring.rooms controls calculator.flooring.room-parameters
calculator.flooring.rooms summarizes calculator.flooring.summary
calculator.flooring.side-panel controls calculator.flooring.room-parameters/settings/techmap/summary/estimate
calculator.flooring.techmap controls calculator.flooring.coverings-catalog/preparations-catalog/layouts-catalog
calculator.flooring.room-parameters writes calculator.flooring.summary
calculator.flooring.settings writes calculator.flooring.summary
calculator.flooring.coverings-catalog writes calculator.flooring.room-parameters
calculator.flooring.estimate summarizes calculator.flooring.summary
calculator.wall-finish.mode-tabs controls calculator.wall-finish.side-panel
calculator.wall-finish.rooms controls calculator.wall-finish.room-parameters
calculator.wall-finish.rooms summarizes calculator.wall-finish.summary
calculator.wall-finish.side-panel controls calculator.wall-finish.room-parameters/settings/techmap/summary/estimate
calculator.wall-finish.techmap controls calculator.wall-finish.coverings-catalog/preparations-catalog/layouts-catalog
calculator.wall-finish.room-parameters writes calculator.wall-finish.summary
calculator.wall-finish.settings writes calculator.wall-finish.summary
calculator.wall-finish.coverings-catalog writes calculator.wall-finish.room-parameters
calculator.wall-finish.estimate summarizes calculator.wall-finish.summary
calculator.warm-floor.mode-tabs controls calculator.warm-floor.side-panel
calculator.warm-floor.rooms writes calculator.warm-floor.summary
calculator.warm-floor.side-panel controls calculator.warm-floor.settings/summary/estimate
calculator.warm-floor.settings writes calculator.warm-floor.summary
calculator.warm-floor.estimate summarizes calculator.warm-floor.summary
doors-workbench.editor controls doors-workbench.components
doors-workbench.editor summarizes doors-workbench.summary
```

### Dashboard accounting workspace

Source:

```text
src/features/dashboard/accounting/workspace-manifest.ts
src/features/dashboard/accounting/workspace-registry.ts
```

Exports:

```text
dashboardAccountingWorkspaceManifest
dashboardAccountingWorkspaceAdapterSnapshot
dashboardAccountingWorkspaceLayoutItems
dashboardAccountingWorkspaceLayoutConstraints
dashboardAccountingWorkspaceValidationReport
```

#### Parent blocks

| id | parent | type | area | dataKey | capabilities | source |
|---|---|---|---|---|---|---|
| `dashboard.ledger.scene-switch` | `dashboard.accounting-workspace` | `toolbar` | `1,1,30,3` | `dashboard.activeView` | fixed | `project-accounting-workspace.tsx` |
| `dashboard.ledger.summary-strip` | `dashboard.accounting-workspace` | `summary` | `1,4,22,6` | `dashboard.project.accountingSummary` | resizable, collapsible | `project-accounting-summary-strip.tsx` |
| `dashboard.ledger.status-summary` | `dashboard.accounting-workspace` | `summary` | `23,4,8,6` | `dashboard.project.ledgerEntries.statusGroups` | resizable, collapsible | `project-accounting-status-summary.tsx` |
| `dashboard.ledger.table` | `dashboard.accounting-workspace` | `table` | `1,10,30,18` | `dashboard.project.ledgerEntries` | resizable | `project-accounting-ledger-table.tsx` |

#### Inner elements

| parent | element id | type | role | dataKey |
|---|---|---|---|---|
| `dashboard.ledger.scene-switch` | `dashboard.ledger.scene-switch.button` | `button` | `navigation` | `dashboard.activeView` |
| `dashboard.ledger.summary-strip` | `dashboard.ledger.summary.contract` | `metric` | `summary` | `dashboard.project.contract.amount` |
| `dashboard.ledger.summary-strip` | `dashboard.ledger.summary.plan` | `metric` | `summary` | `dashboard.project.plannedTotal` |
| `dashboard.ledger.summary-strip` | `dashboard.ledger.summary.actual` | `metric` | `summary` | `dashboard.project.actualTotal` |
| `dashboard.ledger.status-summary` | `dashboard.ledger.status.invoice` | `status` | `status` | `dashboard.project.ledgerEntries.invoiceTotal` |
| `dashboard.ledger.status-summary` | `dashboard.ledger.status.paid` | `status` | `status` | `dashboard.project.ledgerEntries.paidTotal` |
| `dashboard.ledger.table` | `dashboard.ledger.table.add-row` | `button` | `primary-action` | `dashboard.project.ledgerEntries` |
| `dashboard.ledger.table` | `dashboard.ledger.table.delete-row` | `confirm` | `danger-action` | `dashboard.project.ledgerEntries` |
| `dashboard.ledger.table` | `dashboard.ledger.table.category` | `dropdown` | `selector` | `dashboard.project.ledgerEntries.category` |
| `dashboard.ledger.table` | `dashboard.ledger.table.counterparty` | `dropdown` | `selector` | `dashboard.project.ledgerEntries.counterparty` |
| `dashboard.ledger.table` | `dashboard.ledger.table.status` | `dropdown` | `selector` | `dashboard.project.ledgerEntries.status` |
| `dashboard.ledger.table` | `dashboard.ledger.table.document` | `dropdown` | `selector` | `dashboard.project.ledgerEntries.documents` |

#### Relationships

```text
dashboard.ledger.table summarizes dashboard.ledger.summary-strip
dashboard.ledger.table summarizes dashboard.ledger.status-summary
```

### Dashboard contract workspace

Source:

```text
src/features/dashboard/contract/workspace-manifest.ts
src/features/dashboard/contract/workspace-registry.ts
```

Exports:

```text
dashboardContractWorkspaceManifest
dashboardContractWorkspaceAdapterSnapshot
dashboardContractWorkspaceLayoutItems
dashboardContractWorkspaceLayoutConstraints
dashboardContractWorkspaceValidationReport
```

#### Parent blocks

| id | parent | type | area | dataKey | capabilities | source |
|---|---|---|---|---|---|---|
| `dashboard.contract.root` | `dashboard.finance` | `workspace` | none | `dashboard.project.finance` | parent-only | `dashboard-finance-scene.tsx` |
| `dashboard.contract.finance-scene` | `dashboard.contract.root` | `workspace` | `1,1,30,24` | `dashboard.project.financeScene` | resizable | `dashboard-finance-scene.tsx` |
| `dashboard.contract.expenses` | `dashboard.contract.finance-scene` | `summary` | `1,1,10,22` | `dashboard.project.expenses` | resizable, collapsible | `project-card-expenses-panel.tsx` |
| `dashboard.contract.advances` | `dashboard.contract.finance-scene` | `list` | `11,1,20,7` | `dashboard.project.advances` | resizable, collapsible | `project-card-advances-panel.tsx` |
| `dashboard.contract.panel` | `dashboard.contract.finance-scene` | `panel` | `11,8,20,15` | `dashboard.project.contract` | resizable, collapsible, copyable | `project-card-contract-panel.tsx` |
| `dashboard.contract.editor` | `dashboard.contract.panel` | `form` | none | `dashboard.project.contractDraft` | copyable, collapsible | `project-card-contract-editor.tsx` |
| `dashboard.contract.content` | `dashboard.contract.panel` | `summary` | none | `dashboard.project.contract` | copyable | `project-card-contract-content.tsx` |
| `dashboard.contract.milestones` | `dashboard.contract.panel` | `list` | none | `dashboard.project.contract.milestones` | copyable, collapsible | `project-card-contract-milestones.tsx` |

#### Inner elements

| parent | element id | type | role | dataKey |
|---|---|---|---|---|
| `dashboard.contract.advances` | `dashboard.contract.advances.row` | `list-item` | `summary` | `dashboard.project.advances[]` |
| `dashboard.contract.advances` | `dashboard.contract.advances.submit` | `button` | `submit-action` | none |
| `dashboard.contract.panel` | `dashboard.contract.panel.upload` | `button` | `primary-action` | none |
| `dashboard.contract.panel` | `dashboard.contract.panel.extract` | `button` | `primary-action` | none |
| `dashboard.contract.panel` | `dashboard.contract.panel.sync` | `status` | `status` | `dashboard.project.contractSyncState` |
| `dashboard.contract.editor` | `dashboard.contract.editor.title` | `input` | `field` | `dashboard.project.contractDraft.title` |
| `dashboard.contract.editor` | `dashboard.contract.editor.amount` | `input` | `field` | `dashboard.project.contractDraft.amount` |
| `dashboard.contract.editor` | `dashboard.contract.editor.delete` | `confirm` | `danger-action` | `dashboard.project.contract` |
| `dashboard.contract.content` | `dashboard.contract.content.amount` | `metric` | `summary` | `dashboard.project.contract.amount` |
| `dashboard.contract.milestones` | `dashboard.contract.milestones.row` | `list-item` | `summary` | `dashboard.project.contract.milestones[]` |
| `dashboard.contract.milestones` | `dashboard.contract.milestones.complete` | `button` | `primary-action` | none |

#### Relationships

```text
dashboard.contract.finance-scene controls dashboard.contract.expenses
dashboard.contract.finance-scene controls dashboard.contract.advances
dashboard.contract.finance-scene controls dashboard.contract.panel
dashboard.contract.advances writes dashboard.contract.panel
dashboard.contract.panel controls dashboard.contract.editor
dashboard.contract.panel controls dashboard.contract.content
dashboard.contract.panel summarizes dashboard.contract.milestones
dashboard.contract.editor writes dashboard.contract.content
dashboard.contract.editor writes dashboard.contract.milestones
dashboard.contract.content summarizes dashboard.contract.milestones
dashboard.contract.milestones writes dashboard.contract.panel
```

### Dashboard passport workspace

Source:

```text
src/features/dashboard/passport/workspace-manifest.ts
src/features/dashboard/passport/workspace-registry.ts
```

Exports:

```text
dashboardPassportWorkspaceManifest
dashboardPassportWorkspaceAdapterSnapshot
dashboardPassportWorkspaceLayoutItems
dashboardPassportWorkspaceLayoutConstraints
dashboardPassportWorkspaceValidationReport
```

#### Parent blocks

| id | parent | type | area | dataKey | capabilities | source |
|---|---|---|---|---|---|---|
| `dashboard.passport.root` | `dashboard.passport` | `workspace` | none | `dashboard.project.passport` | parent-only | `dashboard-passport-scene.tsx` |
| `dashboard.passport.scene` | `dashboard.passport.root` | `workspace` | `1,1,30,22` | `dashboard.project.passportDraft` | resizable | `dashboard-passport-scene.tsx` |
| `dashboard.passport.identity` | `dashboard.passport.scene` | `form` | `1,1,20,9` | `dashboard.project.passport.identity` | resizable, copyable | `dashboard-passport-identity-section.tsx` |
| `dashboard.passport.access` | `dashboard.passport.scene` | `form` | `1,10,20,10` | `dashboard.project.passport.access` | resizable, copyable | `dashboard-passport-access-section.tsx` |
| `dashboard.passport.metrics` | `dashboard.passport.scene` | `form` | `21,1,10,12` | `dashboard.project.passport.metrics` | resizable, collapsible, copyable | `dashboard-passport-metrics-section.tsx` |
| `dashboard.passport.actions` | `dashboard.passport.scene` | `toolbar` | `21,14,10,6` | `dashboard.project.passportSaveState` | resizable | `dashboard-passport-actions.tsx` |

#### Inner elements

| parent | element id | type | role | dataKey |
|---|---|---|---|---|
| `dashboard.passport.identity` | `dashboard.passport.identity.code` | `input` | `field` | `dashboard.project.passportDraft.code` |
| `dashboard.passport.identity` | `dashboard.passport.identity.name` | `input` | `field` | `dashboard.project.passportDraft.name` |
| `dashboard.passport.identity` | `dashboard.passport.identity.address` | `input` | `field` | `dashboard.project.passportDraft.address` |
| `dashboard.passport.identity` | `dashboard.passport.identity.entrance` | `input` | `field` | `dashboard.project.passportDraft.entranceSection` |
| `dashboard.passport.identity` | `dashboard.passport.identity.apartment` | `input` | `field` | `dashboard.project.passportDraft.apartment` |
| `dashboard.passport.identity` | `dashboard.passport.identity.floor` | `input` | `field` | `dashboard.project.passportDraft.floor` |
| `dashboard.passport.access` | `dashboard.passport.access.elevator` | `input` | `field` | `dashboard.project.passportDraft.hasElevator` |
| `dashboard.passport.access` | `dashboard.passport.access.hours` | `input` | `field` | `dashboard.project.passportDraft.accessHours` |
| `dashboard.passport.access` | `dashboard.passport.access.site` | `input` | `field` | `dashboard.project.passportDraft.siteAccess` |
| `dashboard.passport.access` | `dashboard.passport.access.intercom` | `input` | `field` | `dashboard.project.passportDraft.intercomCode` |
| `dashboard.passport.access` | `dashboard.passport.access.responsible` | `input` | `field` | `dashboard.project.passportDraft.responsiblePerson` |
| `dashboard.passport.access` | `dashboard.passport.access.comment` | `textarea` | `field` | `dashboard.project.passportDraft.comment` |
| `dashboard.passport.metrics` | `dashboard.passport.metrics.area` | `input` | `field` | `dashboard.project.passportDraft.areaM2` |
| `dashboard.passport.metrics` | `dashboard.passport.metrics.rooms` | `input` | `field` | `dashboard.project.passportDraft.roomCount` |
| `dashboard.passport.metrics` | `dashboard.passport.metrics.ceiling` | `input` | `field` | `dashboard.project.passportDraft.ceilingHeightM` |
| `dashboard.passport.metrics` | `dashboard.passport.metrics.margin` | `input` | `field` | `dashboard.project.passportDraft.plannedMarginPercent` |
| `dashboard.passport.actions` | `dashboard.passport.actions.status` | `status` | `status` | `dashboard.project.passportSaveState` |
| `dashboard.passport.actions` | `dashboard.passport.actions.save` | `button` | `submit-action` | none |

#### Relationships

```text
dashboard.passport.scene controls dashboard.passport.identity
dashboard.passport.scene controls dashboard.passport.access
dashboard.passport.scene controls dashboard.passport.metrics
dashboard.passport.scene controls dashboard.passport.actions
dashboard.passport.identity writes dashboard.passport.actions
dashboard.passport.access writes dashboard.passport.actions
dashboard.passport.metrics writes dashboard.passport.actions
dashboard.passport.actions writes dashboard.passport.scene
```

### Requests workspace

Source:

```text
src/features/requests/workspace-manifest.ts
src/features/requests/workspace-registry.ts
```

Exports:

```text
requestsWorkspaceManifest
requestsWorkspaceAdapterSnapshot
requestsWorkspaceLayoutItems
requestsWorkspaceLayoutConstraints
requestsWorkspaceValidationReport
```

#### Parent blocks

| id | parent | type | area | dataKey | capabilities | source |
|---|---|---|---|---|---|---|
| `requests.root` | `requests` | `workspace` | none | `requests` | parent-only | `screen.tsx` |
| `requests.overview` | `requests.root` | `workspace` | `1,1,30,10` | `requests.overview` | resizable, collapsible | `overview-panel.tsx` |
| `requests.overview.summary` | `requests.overview` | `summary` | `1,1,30,4` | `requests.summary` | resizable, copyable | `overview-summary-section.tsx` |
| `requests.overview.priority` | `requests.overview` | `list` | `1,5,18,5` | `requests.prioritized[]` | resizable, collapsible | `overview-priority-requests-section.tsx` |
| `requests.overview.side` | `requests.overview` | `summary` | `19,5,12,5` | `requests.sideOverview` | resizable, collapsible | `overview-side-sections.tsx` |
| `requests.list` | `requests.root` | `list` | `1,12,12,18` | `requests.recent[]` | resizable, collapsible | `list-panel.tsx` |
| `requests.detail` | `requests.root` | `panel` | `13,12,18,18` | `requests.requestDetail` | resizable, collapsible, copyable | `detail-panel.tsx` |
| `requests.detail.delivery` | `requests.detail` | `form` | none | `requests.requestDetail.delivery` | copyable | `detail-delivery.tsx` |
| `requests.detail.items` | `requests.detail` | `list` | none | `requests.requestDetail.items[]` | collapsible, copyable | `detail-items.tsx` |
| `requests.detail.item-editor` | `requests.detail` | `form` | none | `requests.itemForm` | copyable | `item-editor.tsx` |

#### Inner elements

| parent | element id | type | role | dataKey |
|---|---|---|---|---|
| `requests.overview` | `requests.overview.reload` | `button` | `secondary-action` | none |
| `requests.overview` | `requests.overview.error` | `status` | `status` | `requests.overviewError` |
| `requests.overview.summary` | `requests.summary.active-drafts` | `metric` | `summary` | `requests.summary.active_drafts_count` |
| `requests.overview.summary` | `requests.summary.awaiting` | `metric` | `summary` | `requests.status.awaiting_confirmation` |
| `requests.overview.summary` | `requests.summary.confirmed-today` | `metric` | `summary` | `requests.summary.confirmed_today_count` |
| `requests.overview.priority` | `requests.priority.row` | `list-item` | `summary` | `requests.prioritized[]` |
| `requests.overview.priority` | `requests.priority.status` | `status` | `status` | `requests.prioritized[].status` |
| `requests.overview.side` | `requests.side.group-row` | `list-item` | `summary` | `requests.groups[]` |
| `requests.overview.side` | `requests.side.family-row` | `list-item` | `summary` | `requests.families[]` |
| `requests.list` | `requests.list.reload` | `button` | `secondary-action` | none |
| `requests.list` | `requests.list.row` | `list-item` | `navigation` | `requests.recent[]` |
| `requests.list` | `requests.list.status-action` | `button` | `primary-action` | none |
| `requests.list` | `requests.list.delete` | `confirm` | `danger-action` | `requests.recent[]` |
| `requests.detail` | `requests.detail.status` | `status` | `status` | `requests.requestDetail.draft.status` |
| `requests.detail.delivery` | `requests.delivery.date` | `input` | `field` | `requests.deliveryEditForm.delivery_date` |
| `requests.detail.delivery` | `requests.delivery.time` | `input` | `field` | `requests.deliveryEditForm.delivery_time` |
| `requests.detail.delivery` | `requests.delivery.save` | `button` | `submit-action` | none |
| `requests.detail.items` | `requests.items.row` | `list-item` | `summary` | `requests.requestDetail.items[]` |
| `requests.detail.items` | `requests.items.edit` | `button` | `secondary-action` | none |
| `requests.detail.items` | `requests.items.delete` | `confirm` | `danger-action` | `requests.requestDetail.items[]` |
| `requests.detail.item-editor` | `requests.item-editor.title` | `input` | `field` | `requests.itemForm.title` |
| `requests.detail.item-editor` | `requests.item-editor.submit` | `button` | `submit-action` | none |

#### Relationships

```text
requests.overview controls requests.overview.summary
requests.overview controls requests.overview.priority
requests.overview controls requests.overview.side
requests.overview.priority summarizes requests.list
requests.list selects requests.detail
requests.list writes requests.overview.summary
requests.detail controls requests.detail.delivery
requests.detail controls requests.detail.items
requests.detail controls requests.detail.item-editor
requests.detail.delivery writes requests.detail
requests.detail.delivery writes requests.list
requests.detail.items controls requests.detail.item-editor
requests.detail.items writes requests.list
requests.detail.item-editor writes requests.detail.items
requests.detail.item-editor writes requests.list
```

### Materials workspace

Source:

```text
src/features/materials/workspace-manifest.ts
src/features/materials/workspace-registry.ts
```

Exports:

```text
materialsWorkspaceManifest
materialsWorkspaceAdapterSnapshot
materialsWorkspaceLayoutItems
materialsWorkspaceLayoutConstraints
materialsWorkspaceValidationReport
```

#### Parent blocks

| id | parent | type | area | dataKey | capabilities | source |
|---|---|---|---|---|---|---|
| `materials.root` | `materials` | `workspace` | none | `materials` | parent-only | `screen.tsx` |
| `materials.catalog` | `materials.root` | `list` | `1,1,11,28` | `materials.families[]` | resizable, collapsible | `catalog-panel.tsx` |
| `materials.family-create` | `materials.catalog` | `form` | none | `materials.familyForm` | copyable | `catalog-panel.tsx` |
| `materials.detail` | `materials.root` | `panel` | `12,1,19,28` | `materials.familyDetail` | resizable, collapsible, copyable | `detail-panel.tsx` |
| `materials.detail.variants` | `materials.detail` | `list` | `12,8,8,7` | `materials.familyDetail.variants[]` | resizable, collapsible, copyable | `detail-variants-section.tsx` |
| `materials.detail.aliases` | `materials.detail` | `list` | `20,8,11,7` | `materials.familyDetail.aliases[]` | resizable, collapsible, copyable | `detail-aliases-section.tsx` |
| `materials.detail.skus` | `materials.detail` | `table` | `12,16,19,6` | `materials.familyDetail.skus[]` | resizable, collapsible, copyable | `detail-skus-section.tsx` |
| `materials.detail.sku-form` | `materials.detail` | `form` | `12,23,19,7` | `materials.skuForm` | resizable, collapsible, copyable | `detail-sku-form-section.tsx` |

#### Inner elements

| parent | element id | type | role | dataKey |
|---|---|---|---|---|
| `materials.catalog` | `materials.catalog.reload` | `button` | `secondary-action` | none |
| `materials.catalog` | `materials.catalog.error` | `status` | `status` | `materials.error` |
| `materials.catalog` | `materials.catalog.search` | `input` | `field` | `materials.catalogQuery` |
| `materials.catalog` | `materials.catalog.search-result` | `list-item` | `navigation` | `materials.searchResults[]` |
| `materials.catalog` | `materials.catalog.family-row` | `list-item` | `navigation` | `materials.families[]` |
| `materials.family-create` | `materials.family-create.name` | `input` | `field` | `materials.familyForm.canonical_name` |
| `materials.family-create` | `materials.family-create.unit` | `input` | `field` | `materials.familyForm.default_unit` |
| `materials.family-create` | `materials.family-create.dialog-field` | `chip` | `selector` | `materials.familyForm.dialog_fields[]` |
| `materials.family-create` | `materials.family-create.submit` | `button` | `submit-action` | none |
| `materials.detail` | `materials.detail.name` | `metric` | `summary` | `materials.familyDetail.family.canonical_name` |
| `materials.detail` | `materials.detail.unit` | `metric` | `summary` | `materials.familyDetail.family.default_unit` |
| `materials.detail.variants` | `materials.variants.row` | `list-item` | `summary` | `materials.familyDetail.variants[]` |
| `materials.detail.variants` | `materials.variants.display-name` | `input` | `field` | `materials.variantForm.display_name` |
| `materials.detail.variants` | `materials.variants.submit` | `button` | `submit-action` | none |
| `materials.detail.aliases` | `materials.aliases.row` | `list-item` | `summary` | `materials.familyDetail.aliases[]` |
| `materials.detail.aliases` | `materials.aliases.alias` | `input` | `field` | `materials.aliasForm.alias` |
| `materials.detail.aliases` | `materials.aliases.target-type` | `select` | `selector` | `materials.aliasForm.target` |
| `materials.detail.aliases` | `materials.aliases.target-id` | `select` | `selector` | `materials.aliasForm.target_id` |
| `materials.detail.skus` | `materials.skus.row` | `list-item` | `summary` | `materials.familyDetail.skus[]` |
| `materials.detail.sku-form` | `materials.sku-form.title` | `input` | `field` | `materials.skuForm.title` |
| `materials.detail.sku-form` | `materials.sku-form.variant` | `select` | `selector` | `materials.skuForm.variant_id` |
| `materials.detail.sku-form` | `materials.sku-form.submit` | `button` | `submit-action` | none |

#### Relationships

```text
materials.catalog selects materials.detail
materials.catalog controls materials.family-create
materials.family-create writes materials.catalog
materials.family-create writes materials.detail
materials.detail controls materials.detail.variants
materials.detail controls materials.detail.aliases
materials.detail controls materials.detail.skus
materials.detail controls materials.detail.sku-form
materials.detail.variants writes materials.detail
materials.detail.variants writes materials.catalog
materials.detail.aliases writes materials.detail
materials.detail.aliases writes materials.catalog
materials.detail.skus summarizes materials.detail
materials.detail.sku-form writes materials.detail.skus
materials.detail.sku-form writes materials.detail
materials.detail.sku-form writes materials.catalog
```

## Feature component inventory

Эта секция перечисляет текущие React components, которые V2 должен знать как потенциальные blocks/elements. Не все они уже оформлены в `WorkspaceRegistry`; формализованные перечислены выше.

### Shell

```text
AppShellHeader
AppShellSidebar
AppScreenRouter
AppShellFooter
```

### Calculator top level

```text
CalculatorScreen
CalculatorScreenContent
CalculatorHeaderSection
ObjectIdentityCard
ObjectAccessCard
AnimatedHeaderGroup
CalculatorEstimateStagesFacade
CalculatorStageShell
CalculatorStageRightPanelLayout
CalculatorProjectRoomsStage
ProjectStageSection
ProjectStageWorkspace
ProjectStagePane
ProjectKp
ProjectMontage
ProjectDesign
ProjectMaterials
ProjectContacts
ProjectStageKpTable
```

### Calculator rooms/room editor

```text
RoomsStageSidebarSection
RoomsStageSidebarRow
RoomsStageCreatePanel
RoomsCreateForm
RoomsStageEditorSection
RoomsEditorContent
RoomsEditorPrimary
RoomsEditorForm
RoomStatsSummary
RoomWallsPanel
RoomFloorSectionsPanel
RoomOpeningsPanel
RoomOpeningCard
```

Parent model:

```text
CalculatorProjectRoomsStage
├─ RoomsStageSidebarSection
│  ├─ RoomsStageSidebarRow[]
│  └─ RoomsStageCreatePanel
└─ RoomsStageEditorSection
   ├─ RoomsEditorContent
   ├─ RoomStatsSummary
   ├─ RoomWallsPanel
   ├─ RoomFloorSectionsPanel
   └─ RoomOpeningsPanel
      └─ RoomOpeningCard[]
```

### Calculator doors legacy stage

```text
DoorsStageSection
DoorsProjectPanel
DoorsProjectList
DoorsProjectDoorForm
DoorsProjectComponentsPanel
DoorsProjectComponentsHeader
DoorsProjectComponentsList
DoorsProjectComponentsForm
DoorsProjectSummary
DoorsCatalogPanel
DoorsDoorCatalogPanel
DoorsComponentCatalogPanel
```

### Calculator doors workbench

```text
DoorsWorkbenchStage
DoorWorkbenchQueue
DoorWorkbenchFocus
DoorWorkbenchDock
DoorWorkbenchDoorComposer
DoorWorkbenchComponentComposer
DoorActionMenu
DoorKitPills
EditorSection
SummaryCell
```

Parent model:

```text
DoorsWorkbenchStage
├─ DoorWorkbenchQueue
│  └─ DoorQueueItem[]
├─ DoorWorkbenchFocus
│  ├─ DoorVisual
│  ├─ DoorWorkbenchComponentList
│  │  └─ ComponentRow[]
│  ├─ DoorActionMenu
│  └─ DoorKitPills
├─ DoorWorkbenchDoorComposer
├─ DoorWorkbenchComponentComposer
└─ DoorWorkbenchDock
   ├─ DoorWorkbenchSummary
   ├─ DoorCatalogForm
   └─ ComponentCatalogForm
```

### Warm floor

```text
WarmFloorStageSection
WarmFloorStageEditorColumn
WarmFloorRoomCard
WarmFloorStageSummaryColumn
WarmFloorSettingsPanel
```

### Flooring

```text
FlooringStageSection
FlooringStageEditorColumn
FlooringStageRoomsPanel
FlooringRoomCard
FlooringRoomParametersPanel
FlooringStageTechMap
FlooringEstimatePanel
FlooringStageSummaryColumn
FlooringStageCatalogsPanel
FlooringStageCoveringsCatalog
FlooringStageCoveringCatalog
CoveringConsumablesEditor
FlooringStagePreparationCatalog
FlooringStageLayoutCatalog
FlooringStageSpecification
FlooringSettingsPanel
```

Parent model:

```text
FlooringStageSection
├─ CalculatorStageShell
└─ CalculatorStageRightPanelLayout
   ├─ main
   │  ├─ FlooringStageRoomsPanel
   │  ├─ FlooringStageTechMap
   │  ├─ FlooringEstimatePanel
   │  └─ FlooringStageSummaryColumn
   └─ side-panel
      ├─ FlooringRoomParametersPanel
      ├─ FlooringSettingsPanel
      └─ FlooringStageCatalogsPanel
```

### Wall finish

```text
WallFinishStageSection
WallFinishStageEditorColumn
WallFinishStageRoomsPanel
WallFinishRoomCard
WallFinishRoomParametersPanel
WallFinishStageTechMap
WallFinishEstimatePanel
WallFinishStageSummaryColumn
WallFinishStageCatalogsPanel
WallFinishStageCoveringCatalog
WallFinishCoveringConsumablesEditor
WallFinishStagePreparationCatalog
WallFinishStageLayoutCatalog
WallFinishTechmapHeader
WallFinishTechmapStep
WallFinishStageSpecification
WallFinishSettingsPanel
```

### Dashboard top level

```text
DashboardScreen
DashboardProjectSwitcher
DashboardSceneSwitch
DashboardSceneChrome
DashboardOverviewScene
DashboardFinanceScene
DashboardPassportScene
DashboardPassportIdentitySection
DashboardPassportMetricsSection
DashboardPassportAccessSection
DashboardPassportMetricField
DashboardPassportActions
ProjectCard
ProjectCardHeader
ProjectCardOverview
ProjectSceneSignalsHeader
SummaryMetric
SideMetric
SignalChip
```

### Dashboard contract/advances

```text
ProjectCardAdvancesPanel
ProjectCardAdvanceForm
ProjectCardAdvanceList
ProjectCardContractPanel
ProjectCardContractPanelHead
ProjectCardContractContent
ProjectCardContractHero
ProjectCardContractCollapsedProgress
ProjectCardContractEditor
ProjectCardContractEditorFields
ProjectCardContractDeleteZone
ProjectCardContractMilestones
ProjectCardContractSignal
ProjectCardExpensesPanel
ProjectCardFinanceSettingsPanel
```

### Dashboard accounting

```text
ProjectAccountingWorkspace
ProjectAccountingSummaryStrip
ProjectAccountingStatusSummary
ProjectAccountingLedgerTable
ProjectAccountingLedgerEntryBuilder
ProjectAccountingLedgerEntryGrid
ProjectAccountingLedgerBuilderColumn
ProjectAccountingLedgerOptionPicker
ProjectAccountingLedgerCounterpartyPicker
ProjectAccountingLedgerStatusPicker
ProjectAccountingLedgerDocumentPicker
ProjectAccountingLedgerDeleteAction
ProjectAccountingLedgerBuilderPopover
ProjectAccountingLedgerPopoverShell
ProjectAccountingLedgerPopoverResizeHandles
```

Parent model:

```text
ProjectAccountingWorkspace
├─ DashboardSceneChrome
├─ ProjectAccountingSummaryStrip
│  └─ ProjectAccountingStatusSummary
└─ ProjectAccountingLedgerTable
   ├─ ProjectAccountingLedgerEntryBuilder[]
   │  ├─ ProjectAccountingLedgerEntryGrid
   │  ├─ ProjectAccountingLedgerOptionPicker
   │  ├─ ProjectAccountingLedgerCounterpartyPicker
   │  ├─ ProjectAccountingLedgerStatusPicker
   │  ├─ ProjectAccountingLedgerDocumentPicker
   │  └─ ProjectAccountingLedgerDeleteAction
   └─ AddButton
```

### Requests

```text
RequestsScreen
RequestsOverviewPanel
RequestsOverviewSummarySection
RequestsOverviewPriorityRequestsSection
RequestsOverviewSideSections
RequestsListPanel
RequestsDetailPanel
RequestsDetailDelivery
RequestsDetailItems
RequestItemEditor
```

### Materials

```text
MaterialsScreen
MaterialsCatalogPanel
MaterialsDetailPanel
MaterialsDetailAliasesSection
MaterialsDetailVariantsSection
MaterialsDetailSkusSection
MaterialsDetailSkuFormSection
```

### Auth/settings

```text
AdminAuthScreen
SettingsScreen
```

## State/model/controller layers

V2 должен отличать visual components от logic/data layers.

### Calculator logic

```text
useAdminCalculatorController
createAdminCalculatorLoadersController
createAdminCalculatorProjectActionsController
createAdminCalculatorRoomActionsController
createAdminCalculatorDoorsController
createAdminCalculatorFinishesController
useCalculatorScreenController
useCalculatorStageController
useCalculatorProjectController
useCalculatorRoomController
useCalculatorDoorsController
useCalculatorWarmFloorController
useCalculatorFlooringController
useCalculatorWallFinishController
```

Calculation/payload helpers live in `calculator/{flooring,wall-finish,warm-floor,doors,room}/calc|payload|preview-*`. V2 should treat them as data/model providers, not layout blocks.

### Dashboard logic

```text
useDashboardProjectState
useDashboardProjectContractSync
useDashboardProjectLedgerSync
createProjectStateLoaders
project mutation/merge/sync helpers
project accounting logic/formatters
```

### Requests/materials logic

```text
useAdminRequestsController
useAdminMaterialsController
materials api functions
request formatting helpers
```

## Current V2 training interpretation

V2 can safely learn these rules now:

1. `workspace manifest` is the highest-level map of a managed area.
2. `registry components` are parent blocks that may become V1 layout items.
3. `children` inside a component are semantic UI elements, not separate layout items unless later promoted.
4. `area` is grid-based and V1-compatible.
5. `capabilities` are behavioral constraints for move/resize/delete/copy/collapse.
6. `relationships` explain semantic dependencies between blocks.
7. `layoutParticipation: conditional` means the block is real UI but not part of default layout projection.
8. `shared/controls` and `shared/ui` are canonical element implementations.
9. Feature-specific CSS is visual density/tone/layout override, not component identity.
10. Controllers, payload builders, formatters and API helpers are data/logic layers, not blocks V2 should move.

## Gaps to complete before V2 can manage everything

No top-level workspaces from the current inventory remain unformalized.

Recommended next refinement order:

1. Promote remaining nested one-off controls into shared primitives where they repeat.
2. Add runtime manifest loading for the workspaces that should be visible to the engine test screen.
3. Split high-density registries only when V2 needs a smaller ownership boundary.

## Do not infer

V2 should not infer these from visual DOM alone:

- whether delete is allowed;
- whether a panel may collapse;
- whether a block can resize;
- whether a metric is critical;
- whether a form field writes to project state;
- whether a block is conditional;
- whether a list item should become a layout item.

These must come from registry/manifest/adapter metadata.
