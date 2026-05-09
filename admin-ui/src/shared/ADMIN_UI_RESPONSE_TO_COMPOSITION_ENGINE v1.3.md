# Ответ admin-ui для composition-engine v1.3

Дата: 2026-05-09.

Этот документ можно передать стороне движка как обратную аналитику после чтения:

```text
COMPOSITION_ENGINE_RESPONSE_TO_ADMIN_UI v1.2.md
```

Цель документа - зафиксировать фактическое состояние интеграции `admin-ui` и проекта движка, показать обнаруженные несовпадения контрактов и предложить следующий безопасный технический шаг.

## Короткий вывод

Архитектурное направление подтверждено с обеих сторон:

```text
feature model/state
-> workspace registry / component map
-> workspace adapter snapshot
-> compact runtime snapshot
-> composition-engine V2
-> host adapter
-> React UI
```

`admin-ui` уже готовит UI не через DOM-угадывание, а через явные:

- `WorkspaceManifest`;
- `WorkspaceRegistry`;
- `WorkspaceComponentSchema`;
- `WorkspaceElementSchema`;
- `capabilities`;
- `relationships`;
- `layoutParticipation`;
- `dataKey`;
- `WorkspaceAdapterSnapshot`;
- `WorkspaceRuntimeSnapshot`.

Главный текущий разрыв: `admin-ui` уже умеет формировать более богатый compact runtime snapshot, а текущий `composition-engine` пока принимает более старую и узкую форму:

```js
{
  mode,
  metrics,
  items,
  contentSchemas,
  dependencies
}
```

Поэтому следующий шаг - не включать `auto`, а использовать bridge:

```text
WorkspaceRuntimeSnapshot -> composition input
```

## Что было проверено в проекте движка

Проверенный проект:

```text
g:\Мой диск\DANKO\09. DATA\05. Движок проекта\Проект движок редактора
```

Структура проекта корректно разделена:

| Зона | Назначение |
|---|---|
| `adaptive-engine/` | V1 layout kernel: сетка, area, операции, отказы, layout validation, snapshots, diagnostics. |
| `engine-adapter/` | Мост между UI/host и V1/V2: команды, selection, layout map, safety projection, behavior boundary. |
| `composition-engine/` | V2 semantic observer: roles, workspace zones, relations, diagnostics, proposals. |
| `src/` | Тестовый React/Vite UI для ручной проверки движка. |
| `safety-system/` | Проверка импортов, структуры, freeze, guardrails и тестов. |

`.env` не раскрывался. Проверялся только состав ключей. Он совпадает с `.env.example`:

```text
OPENAI_API_KEY
OPENAI_MODEL
```

## Результат проверки движка

Был запущен:

```bash
npm run check
```

Фактически прошли:

- проверка границ импортов;
- проверка структуры движка;
- проверка engine freeze;
- V1 guardrails;
- все тесты V1 area/fitting/grid/layout/operations/rejections/selection;
- adapter fit tests;
- adapter behavior handoff tests;
- composition-engine tests.

Провалился только последний шаг - сборка тестового UI.

Причина не в логике движка, а в окружении:

```text
Node.js v20.11.0
vite@8.0.10 требует Node 20.19+ или 22.12+
```

Ошибка сборки:

```text
node:util does not provide export styleText
```

Вывод: V1, adapter и V2 tests живые. Чтобы `npm run check` полностью проходил, нужно либо обновить Node, либо зафиксировать версии Vite/React toolchain вместо `latest`.

## Что сейчас ожидает composition-engine

Текущий вход V2:

```js
resolveCompositionPlan({
  mode: "suggest",
  metrics: { columns, rows },
  items: [
    { id, x, y, w, h, meta }
  ],
  contentSchemas: {
    [id]: { type, value }
  },
  dependencies: {
    [id]: [targetId]
  }
})
```

Текущие content types:

```text
header
content
sidebar
control
warning
unknown
```

Текущие relation types:

```text
header-to-workspace
content-with-sidebar
control-for-content
warning-for-content
unknown-needs-role
```

Это рабочий минимальный слой. Но карта `admin-ui` уже шире.

## Что уже есть в admin-ui

`admin-ui` формализовал верхние рабочие области:

- `shell-workspace`;
- `calculator.workspace`;
- `dashboard.accounting-workspace`;
- `dashboard.contract-workspace`;
- `dashboard.passport-workspace`;
- `requests-workspace`;
- `materials-workspace`.

Точка сборки:

```text
admin-ui/src/shell/workspace-catalog.ts
```

Экспорты:

```ts
appWorkspaceManifests
appWorkspaceAdapterSnapshots
getAppWorkspaceAdapterSnapshot(id)
getAppWorkspaceRuntimeSnapshot(id, options)
```

`shell` теперь тоже управляемая workspace-зона, а не фиксированное меню вне движка:

- `shell.sidebar`;
- `shell.header`;
- `shell.screen-router`;
- `shell.footer`;
- `shell.auth-gate`;
- `shell.sidebar.calculator-projects`.

Это важно для полной гибкости рабочей области: навигация, route outlet и workspace content должны описываться одним контрактным языком.

## Новый compact runtime snapshot в admin-ui

Добавлен слой:

```text
admin-ui/src/shared/workspace-adapter/runtime-snapshot.ts
```

Он формирует компактный payload активной зоны:

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
      title,
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
      dataKey,
      critical
    }
  ],
  relationships: [
    {
      sourceId,
      targetId,
      type,
      note
    }
  ]
}
```

Правила:

- parent components остаются в `components`;
- inner children остаются в `elements`;
- component relationships и element relationships разворачиваются в плоский список;
- `conditional` components исключаются по умолчанию;
- `conditional` components включаются только при явном `includeConditional`;
- `metrics` можно передать явно или вывести по максимальным `area`.

Это ровно тот формат, который удобно передавать V2 без JSX/DOM.

## Главный несовпадающий контракт

Сейчас между сторонами есть такой разрыв:

```text
admin-ui:
WorkspaceRuntimeSnapshot {
  components,
  elements,
  relationships,
  capabilities,
  layoutParticipation
}

composition-engine:
CompositionInput {
  items,
  contentSchemas,
  dependencies
}
```

Это не критичная ошибка. Это означает, что нужен промежуточный bridge.

## Реализованный bridge на стороне admin-ui

После первичного анализа bridge был добавлен в `admin-ui`.

Source:

```text
admin-ui/src/shared/workspace-adapter/composition-input.ts
admin-ui/src/shell/workspace-catalog.ts
```

Public API:

```ts
createWorkspaceCompositionInput(runtimeSnapshot, options)
getAppWorkspaceCompositionInput(id, runtimeOptions, compositionOptions)
```

Фактическая форма функции:

```ts
function createWorkspaceCompositionInput(snapshot, options) {
  return {
    mode: options.mode ?? "suggest",
    metrics: snapshot.metrics,
    sourceMetrics: snapshot.metrics,
    items: snapshot.components
      .filter((component) => component.area)
      .map((component) => ({
        id: component.id,
        x: component.area.x,
        y: component.area.y,
        w: component.area.w,
        h: component.area.h,
        type: component.type,
        meta: {
          title: component.title,
          dataKey: component.dataKey,
          capabilities: component.capabilities,
          layoutParticipation: component.layoutParticipation
        }
      })),
    contentSchemas: Object.fromEntries(
      snapshot.components.map((component) => [
        component.id,
        {
          type: mapWorkspaceTypeToCompositionType(component.type),
          sourceType: component.type,
          title: component.title,
          dataKey: component.dataKey,
          capabilities: component.capabilities,
          layoutParticipation: component.layoutParticipation
        }
      ])
    ),
    dependencies: relationshipsToDependencies(snapshot.relationships)
  };
}
```

Первый mapping типов может быть консервативным:

| WorkspaceComponentSchema.type | composition content type |
|---|---|
| `toolbar` | `header` или `control`, по позиции/role |
| `stage` | `content` |
| `workspace` | `content` или служебный parent-only |
| `panel` | `sidebar` или `content`, по позиции |
| `form` | `control` |
| `list` | `content` |
| `table` | `content` |
| `summary` | `content` |
| `editor` | `control` |

Для `shell-workspace` mapping можно уточнить явно:

| Component | composition content type |
|---|---|
| `shell.header` | `header` |
| `shell.sidebar` | `sidebar` |
| `shell.screen-router` | `content` |
| `shell.footer` | `control` |
| `shell.auth-gate` | `control` |
| `shell.sidebar.calculator-projects` | `sidebar` |

## Почему нельзя сразу передать runtime snapshot в V2

Текущий V2 не читает поля:

- `components`;
- `elements`;
- `relationships`;
- `capabilities`;
- `layoutParticipation`;
- `parentId`;
- `critical`;
- `role`.

Если передать их напрямую, V2 потеряет часть смысла или пометит блоки как `unknown`.

Поэтому сейчас правильный путь:

```text
WorkspaceRuntimeSnapshot
-> adapter bridge
-> resolveCompositionPlan(input)
```

Позже V2 можно расширить, чтобы он принимал `components/elements/relationships` напрямую.

## Что нужно расширить в composition-engine

### 1. Block/content types

Текущий набор:

```text
header
content
sidebar
control
warning
unknown
```

`admin-ui` уже использует:

```text
workspace
stage
panel
toolbar
form
list
table
summary
editor
metric
navigation
popover
```

Рекомендация: расширять V2 не как цвета, а как смысловые роли. Цвет должен оставаться UI-решением host.

### 2. Relationship types

`admin-ui` использует:

```text
reads
writes
selects
controls
depends-on
summarizes
```

Их стоит перенести в V2 как отдельный словарь relation types или принимать через bridge.

Минимальный bridge на текущий момент:

| admin-ui relationship | V2 dependency behavior |
|---|---|
| `controls` | source depends/controls target |
| `selects` | source selects target route/content |
| `writes` | source changes target data/block |
| `summarizes` | source summarizes target |
| `depends-on` | source depends on target |

В старом поле `dependencies` можно временно хранить только `targetId[]`, но V2 в будущем должен видеть тип связи, иначе теряется смысл.

### 3. Capabilities

V2 не должен предлагать то, что host не разрешает.

Нужные поля:

```text
movable
resizable
deletable
copyable
collapsible
fixed
conditional
parent-only
```

В `admin-ui` это уже есть через:

```text
capabilities
layoutParticipation
area presence
```

### 4. Inner elements

V1 layout items должны строиться из parent components, а не из каждого `button/input`.

Inner elements нужны V2 для понимания состава блока:

- какие поля внутри формы;
- какие кнопки являются primary/danger/submit;
- какие элементы критичны;
- какие dataKey записываются;
- есть ли navigation/selector/status/metric.

Автоматически превращать inner element в layout item нельзя.

## Безопасный порядок следующей проверки

Режим:

```text
suggest
```

Не включать:

```text
auto
```

Первый тест:

```ts
const snapshot = getAppWorkspaceRuntimeSnapshot("shell-workspace", {
  activeRoute: "calculator",
  includeConditional: true
});

const input = runtimeSnapshotToCompositionInput(snapshot, {
  mode: "suggest"
});

const plan = resolveCompositionPlan(input);
```

Ожидаем:

- V2 видит `shell.sidebar` как `sidebar`;
- V2 видит `shell.screen-router` как `content`;
- V2 видит `shell.header` как `header`;
- V2 видит `shell.footer` как `control`;
- V2 не предлагает delete для неделимых shell-блоков;
- V2 не превращает nav buttons в layout items;
- V2 видит relationships от sidebar к route outlet.

Второй тест:

```ts
getAppWorkspaceRuntimeSnapshot("calculator.workspace", {
  activeRoute: "calculator"
});
```

Проверять:

- stage/header/side panel;
- calculator project/rooms/flooring/wall-finish/warm-floor/doors-workbench registries;
- что `layoutParticipation: none` не попадает в V1/V2 layout items;
- что `conditional` включается только явно.

## Отдельное замечание по окружению движка

В `package.json` проекта движка сейчас:

```json
"vite": "latest",
"@vitejs/plugin-react": "latest",
"react": "latest",
"react-dom": "latest"
```

Это делает сборку нестабильной во времени. На текущей машине подтянулся:

```text
vite@8.0.10
@vitejs/plugin-react@6.0.1
react@19.2.5
react-dom@19.2.5
```

При Node `20.11.0` сборка падает.

Рекомендации:

1. Обновить Node до `20.19+` или `22.12+`.
2. Или закрепить версии Vite/toolchain, совместимые с текущим Node.
3. Не держать `latest` для engine test UI, если `npm run check` должен быть воспроизводимым.

## Что не делать сейчас

Не нужно:

- включать `auto`;
- позволять V2 применять изменения напрямую к React UI;
- смешивать V2 внутрь V1;
- читать DOM как источник истины;
- делать каждый inner element отдельным layout item;
- игнорировать `capabilities`;
- игнорировать `layoutParticipation`;
- выкидывать `relationships`, потому что без них V2 теряет смысл host UI.

## Итог

Сторона `admin-ui` уже подготовила правильный контрактный слой:

```text
manifest
-> adapter snapshot
-> compact runtime snapshot
```

Сторона движка уже имеет рабочий:

```text
composition-engine suggest plan
```

Текущий разрыв между ними небольшой и понятный:

```text
runtime snapshot -> composition input bridge
```

Этот bridge закрывает ближайший разрыв контрактов на стороне `admin-ui`. После него можно безопасно прогонять реальные зоны `shell-workspace` и `calculator.workspace` через V2 в режиме `suggest`, не ломая рабочий UI и не включая автоматическое управление.
