# Admin UI Navigation Composition Contract v1.0

Дата снимка: 2026-05-09.

Документ описывает, как `admin-ui` должен связывать глобальные страницы, меню, вкладки режима редактирования, рабочие области и V2 composition/adaptive engine. Цель: меню должно быть управляемым блоком, но смысл страниц и переходов не должен зависеть от того, где визуально стоит меню.

## Ключевая идея

Меню не является источником страниц. Меню является визуальной проекцией списка глобальных страниц.

Правильная цепочка:

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

Глобальная страница создается не кнопкой меню, а записью в `Page Registry`. Меню, нижние вкладки режима редактирования, breadcrumbs, command palette и mobile bottom bar читают один и тот же registry и показывают разные проекции.

## Термины

| Термин | Значение |
|---|---|
| `CompositionBook` | Вся книга интерфейса admin-ui: глобальные страницы, shell-блоки, navigation-блоки, workspace snapshots. |
| `Global Page` | Верхнеуровневая рабочая область: `calculator`, `requests`, `materials`, `settings`, будущие страницы пользователя. |
| `Page Registry` | Единый источник правды о глобальных страницах. |
| `Navigation Projection` | Визуальное отображение страниц: sidebar, topbar, bottom tabs, overlay drawer, collapsed rail. |
| `Workspace` | Управляемая область конкретной глобальной страницы. |
| `Navigation Block` | UI-блок меню. Его можно перемещать/скрывать/сжимать, но он не владеет страницами. |
| `Local Block Navigation` | Внутреннее меню блока: tabs внутри калькулятора, режимы `Сводка/Техкарта/Смета`, переключатели внутри `doors`. |

## Глобальная модель

```text
CompositionBook
├─ ShellWorkspace
│  ├─ GlobalNavigationBlock
│  ├─ Header
│  ├─ ScreenRouter
│  ├─ Footer
│  └─ AuthGate
└─ Pages[]
   ├─ page.dashboard -> dashboard.workspace
   ├─ page.requests -> requests-workspace
   ├─ page.materials -> materials-workspace
   ├─ page.calculator -> calculator.workspace
   └─ page.custom.* -> generated workspace
```

В режиме редактирования под сеткой появляется нижний слой глобальных вкладок:

```text
[ Дашборд ] [ Логистика ] [ Материалы ] [ Калькулятор ] [ + ]
```

Эти вкладки не заменяют меню. Они редактируют `Page Registry`:

- `+` создает новую глобальную страницу;
- переименование вкладки меняет `page.title`;
- порядок вкладок меняет `page.order`;
- удаление/скрытие вкладки меняет статус страницы;
- активная вкладка выбирает `activePageId`.

## Page Registry

Предлагаемый shape:

```ts
type CompositionPage = {
  id: string;                 // "page.calculator"
  title: string;              // "Калькулятор"
  slug: string;               // "calculator"
  routeId: string;            // "route.calculator"
  workspaceId: string;        // "calculator.workspace"
  defaultComponentId?: string; // "calculator.stage.main"
  icon?: string;
  order: number;
  status: "active" | "hidden" | "archived";
  visibility: "authenticated" | "local" | "always";
  source: "system" | "user";
};
```

Добавление новой глобальной вкладки должно создавать минимум:

```text
page.custom.sales
route.custom.sales
workspace.custom.sales
default layout profile
navigation target relationships
```

Страница может быть системной или пользовательской. Системную страницу нельзя удалить без явного migration/developer режима, но можно скрыть из меню, если это разрешено.

## Navigation Block

Глобальное меню должно быть описано как shell-level workspace component:

```ts
{
  id: "shell.global-navigation",
  parentId: "shell.frame",
  type: "navigation",
  title: "Global navigation",
  dataKey: "pageRegistry.active",
  sourcePages: "page-registry",
  fixedAcrossPages: true,
  placement: "left",
  state: "pinned",
  capabilities: {
    movable: true,
    resizable: true,
    collapsible: true,
    deletable: false,
    copyable: false
  }
}
```

Меню фиксируется для всех глобальных страниц не через DOM-копии, а через `scope: "global"` и `fixedAcrossPages: true`.

## Navigation Item

Пункт меню является element, а не страницей:

```ts
{
  id: "shell.global-navigation.item.calculator",
  type: "button",
  role: "navigation",
  label: "Калькулятор",
  dataKey: "page.calculator",
  routeId: "route.calculator",
  targetPageId: "page.calculator",
  targetWorkspaceId: "calculator.workspace",
  targetComponentId: "calculator.stage.main",
  relationships: [
    { type: "selects", targetId: "route.calculator" },
    { type: "mounts", targetId: "calculator.workspace" },
    { type: "focuses", targetId: "calculator.stage.main" }
  ]
}
```

Текущий `WorkspaceRelationshipType` уже поддерживает `selects`, `controls`, `depends-on`, `summarizes`. Для полного navigation contract нужно добавить или разрешить через string-extension:

| Relationship | Значение |
|---|---|
| `selects` | Пункт меню выбирает route/page/local view. |
| `mounts` | Route активирует workspace. |
| `focuses` | После перехода фокус идет в главный block. |
| `projects` | Navigation block отображает Page Registry. |
| `constrains` | Menu state влияет на usable workspace area. |

## Состояния глобального меню

Нужно отработать 4 базовых состояния. Все они читают один `Page Registry`, но по-разному участвуют в layout.

### 1. Pinned Integrated

Меню является постоянной частью UI и влияет на блоки.

Примеры:

- левый sidebar;
- верхняя nav-полоса;
- нижняя nav-полоса;
- правый dock.

Свойства:

```ts
{
  state: "pinned",
  placement: "left" | "top" | "right" | "bottom",
  layoutParticipation: "always",
  affectsWorkspaceArea: true,
  zLayer: "shell",
  fixedAcrossPages: true
}
```

Поведение:

- menu area вычитается из рабочей области;
- V2 пересчитывает active workspace с учетом menu constraints;
- блоки страницы не должны залезать под меню;
- при смене страницы меню остается на месте;
- изменение ширины/высоты меню запускает reflow active page.

Когда использовать:

- desktop/admin workflow;
- постоянная навигация;
- частые переходы между глобальными страницами.

### 2. Overlay Drawer

Меню открывается как шторка поверх рабочей области, как у маркетплейсов и мобильных интерфейсов.

Примеры:

- левая шторка поверх всего;
- верхняя шторка из header;
- fullscreen command navigation на мобильном.

Свойства:

```ts
{
  state: "overlay",
  placement: "left" | "top" | "right" | "bottom",
  layoutParticipation: "none",
  affectsWorkspaceArea: false,
  zLayer: "overlay",
  modalBehavior: "dismissible",
  backdrop: true
}
```

Поведение:

- рабочая область не перестраивается;
- меню перекрывает UI на верхнем слое;
- V2 не должен решать коллизии блоков страницы с overlay menu;
- закрытие возвращает прежнюю композицию без пересчета layout;
- keyboard/focus trap обязателен в modal-режиме.

Когда использовать:

- mobile;
- временная навигация;
- когда нужно сохранить максимум места на экране.

### 3. Collapsed Rail

Меню остается постоянным, но занимает минимальную площадь.

Примеры:

- узкая левая иконная рейка;
- compact top icon strip;
- mini bottom dock.

Свойства:

```ts
{
  state: "collapsed",
  placement: "left" | "top" | "bottom",
  layoutParticipation: "always",
  affectsWorkspaceArea: true,
  collapsedSize: { w: 2 },
  expandMode: "hover" | "click" | "none"
}
```

Поведение:

- рабочая область расширяется, но не до полного размера;
- menu сохраняет active page indicator;
- labels могут быть скрыты, но aria-label остается;
- hover/click expansion может быть overlay, чтобы не дергать рабочие блоки.

Когда использовать:

- плотные desktop-сценарии;
- пользователь хочет сохранить навигацию, но освободить место.

### 4. Hidden / Command Only

Меню скрыто, рабочая область занимает максимум места.

Свойства:

```ts
{
  state: "hidden",
  layoutParticipation: "none",
  affectsWorkspaceArea: false,
  fallbackNavigation: ["edit-tabs", "command-palette", "hotkeys"]
}
```

Поведение:

- navigation block остается в registry, но не рендерится;
- рабочая область пересчитывается на полный размер;
- переходы доступны через нижние edit tabs, command palette или keyboard shortcuts;
- V2 должен понимать, что отсутствие меню не удаляет Page Registry.

Когда использовать:

- focus mode;
- презентация/демонстрация;
- маленький экран;
- пользователь явно спрятал меню.

## Header Embedded Variant

Верхнее меню в header не является отдельным смысловым типом. Это `Pinned Integrated` или `Collapsed Rail`, размещенный в слоте header.

Важно:

```text
Header owns visual slot.
Navigation Block owns page projection.
Page Registry owns page meaning.
```

Если меню встроено в header:

- `parentId` может быть `shell.header`;
- `fixedAcrossPages` остается true;
- header height becomes layout constraint;
- active workspace получает доступную область ниже header.

## Layout constraints при смене состояния меню

При каждом изменении состояния меню host adapter должен пересчитать `usableWorkspaceArea`.

```ts
type UsableWorkspaceArea = {
  columns: number;
  rows: number;
  reserved: {
    left?: number;
    right?: number;
    top?: number;
    bottom?: number;
  };
};
```

Пример:

```text
pinned left sidebar:
reserved.left = 5
workspace starts at x = 6

collapsed rail:
reserved.left = 2
workspace starts at x = 3

overlay drawer:
reserved.left = 0
workspace starts at x = 1

hidden:
reserved.left = 0
workspace starts at x = 1
```

V2 должен получать не только `items`, но и сведения о reserved shell areas. Иначе он будет считать рабочую сетку полной, хотя часть занята фиксированным меню.

## Переход между глобальными страницами

```text
User selects navigation item
-> NavigationController sets activePageId
-> RouteController mounts page.routeId
-> WorkspaceCatalog resolves page.workspaceId
-> RuntimeSnapshot created for active workspace
-> CompositionInput sent to V2
-> V2 suggests layout for active workspace within usable area
-> HostAdapter applies only accepted suggestion
```

V2 не должен напрямую менять route. Route меняет host application. V2 может рекомендовать:

- скрыть/сжать меню;
- переместить меню;
- переключить menu state под viewport;
- изменить layout active workspace после изменения menu constraints.

## Local Block Navigation

Внутри глобальной страницы блоки могут иметь собственное меню. Это не глобальные страницы.

Пример:

```text
page.calculator
└─ calculator.workspace
   ├─ calculator.stage-tabs
   │  ├─ rooms
   │  ├─ flooring
   │  ├─ wall-finish
   │  ├─ warm-floor
   │  └─ doors
   └─ doors-workbench
      ├─ queue
      ├─ focus
      └─ dock
```

Local navigation shape:

```ts
{
  id: "calculator.stage-tabs.doors",
  type: "button",
  role: "navigation",
  targetViewId: "calculator.view.doors",
  targetComponentId: "doors-workbench.root",
  scope: "workspace",
  relationships: [
    { type: "selects", targetId: "calculator.view.doors" },
    { type: "focuses", targetId: "doors-workbench.root" }
  ]
}
```

Отличие:

| Level | Что меняет | Пример |
|---|---|---|
| Global navigation | Активную страницу/workspace | `Материалы -> materials-workspace` |
| Workspace navigation | Активный stage/view внутри workspace | `Калькулятор -> Двери` |
| Block navigation | Child-view внутри блока | `Двери -> Комплектация` |

## Режим редактирования

В edit/composition mode появляется дополнительный слой:

```text
┌──────────────────────── workspace grid ────────────────────────┐
│ blocks / menu / headers / panels                                │
└─────────────────────────────────────────────────────────────────┘
  [ page.dashboard ] [ page.calculator ] [ page.materials ] [ + ]
```

Нижние вкладки:

- всегда управляют `Page Registry`;
- могут быть скрыты вне edit mode;
- не заменяют global menu в production mode;
- показывают системные и пользовательские страницы;
- дают быстрый доступ к созданию/переименованию/порядку.

Операции:

| Действие | Результат |
|---|---|
| Add tab | Создать page + route + workspace draft. |
| Rename tab | Изменить `page.title`; navigation labels обновляются автоматически. |
| Reorder tab | Изменить `page.order`; меню и tabs сортируются одинаково. |
| Hide tab from menu | `page.hiddenInNavigation = true`, но tab остается доступен в edit mode. |
| Delete user tab | Удалить/архивировать page и workspace после проверки зависимостей. |

## Поведение при responsive/adaptive

Меню должно иметь policy:

```ts
type NavigationResponsivePolicy = {
  desktop: "pinned-left" | "pinned-top" | "collapsed-left";
  tablet: "collapsed-left" | "pinned-top" | "overlay-left";
  mobile: "overlay-left" | "bottom-tabs" | "hidden";
};
```

V2 может рекомендовать policy, но host должен валидировать:

- есть ли место для `pinned`;
- не нарушает ли меню `minArea` активных блоков;
- доступна ли fallback navigation;
- не скрывается ли critical navigation без альтернативы.

## Motion для меню

Меню не должно получать произвольные CSS-анимации от V2. Только motion presets:

```ts
type NavigationMotionProfile = {
  open: "drawer-slide-left" | "top-drop" | "fade";
  close: "drawer-slide-out" | "fade";
  reflow: "layout-shift-soft";
  collapse: "rail-collapse";
  expand: "rail-expand";
  reducedMotionFallback: "instant" | "fade";
};
```

Правила:

- overlay может анимировать transform/opacity;
- pinned/collapsed может анимировать width/height только через host-safe layout transition;
- reflow active workspace должен быть отдельным transition, не `transition: all`;
- reduced motion обязателен.

## Что уже есть сейчас

Текущее состояние `admin-ui`:

```text
src/shell/navigation.ts
src/shell/sidebar.tsx
src/shell/screen-router.tsx
src/shell/workspace-registry.ts
src/shell/workspace-catalog.ts
src/shared/workspace-contract
src/shared/workspace-adapter
```

Уже есть:

- shell как workspace;
- sidebar/header/router/footer/auth gate как engine-visible blocks;
- route elements внутри `shell.screen-router`;
- navigation buttons внутри `shell.sidebar`;
- relationships `nav -> route` через `selects`;
- runtime snapshot и composition input bridge.

Чего не хватает:

- отдельного `Page Registry`;
- единого `Route Registry`;
- `Navigation Projection` как first-class contract;
- menu states: `pinned`, `overlay`, `collapsed`, `hidden`;
- reserved shell areas в runtime/composition input;
- relationships `mounts`, `focuses`, `projects`, `constrains`;
- edit-mode bottom tabs для управления global pages.

## Предлагаемые файлы для реализации

```text
src/shell/page-registry.ts
src/shell/route-registry.ts
src/shell/navigation-registry.ts
src/shell/navigation-adapter.ts
src/shell/navigation-state.ts
src/shell/navigation-workspace.ts
```

Назначение:

| File | Responsibility |
|---|---|
| `page-registry.ts` | Список глобальных страниц и page metadata. |
| `route-registry.ts` | Lazy screen loaders, route id, screen key, workspace id. |
| `navigation-registry.ts` | Navigation blocks/projections/items. |
| `navigation-adapter.ts` | Превращает pages/routes/navigation в workspace components/elements/relationships. |
| `navigation-state.ts` | Active page, menu state, placement, collapsed/hidden flags. |
| `navigation-workspace.ts` | Shell workspace registry generation from navigation contract. |

## MVP стоп-линия

Для первой интеграции с движком достаточно:

1. Описать системные страницы в `Page Registry`.
2. Сгенерировать nav items из registry, а не руками в `sidebar.tsx`.
3. Сохранить существующий UI sidebar без визуального rewrite.
4. Добавить menu state: `pinned-left`, `overlay-left`, `collapsed-left`, `hidden`.
5. Передавать в runtime snapshot `reservedShellArea`.
6. Добавить relationships:
   - `nav item selects route`;
   - `route mounts workspace`;
   - `route focuses default component`;
   - `navigation projects page registry`;
   - `navigation constrains screen router`.
7. В edit mode показать bottom page tabs как debug/dev UI.

Не нужно в MVP:

- визуальный page builder;
- drag-and-drop меню;
- пользовательское создание страниц в production;
- auto mode без подтверждения;
- генерация React-компонентов движком.

## Правила безопасности

- V2 не меняет route напрямую.
- V2 не удаляет системные страницы.
- V2 не скрывает все navigation projections без fallback.
- Overlay menu не участвует в layout collision checks.
- Pinned/collapsed menu всегда создает reserved shell area.
- Global navigation и local navigation должны иметь разные scopes.
- User-created page должна иметь workspace draft и validation report до появления в меню.

## Контракт для команды движка

Движку нужно научиться различать:

```text
page registry entity
navigation projection block
navigation item element
route outlet
mounted workspace
local view switcher
```

И не смешивать:

```text
menu button != page
page != workspace component
route != visual block
overlay menu != layout participant
local tabs != global pages
```

Основная просьба к V2:

1. Принимать active page + menu state + reserved shell areas.
2. Давать рекомендации отдельно для shell/navigation и active workspace.
3. Не раскладывать hidden routes как активные blocks.
4. Поддерживать menu state suggestions:
   - `keep pinned`;
   - `collapse navigation`;
   - `switch to overlay`;
   - `hide navigation with fallback`.
5. Возвращать объяснение, какие блоки выиграли/потеряли место после изменения menu state.

## Пример V2 input extension

```ts
{
  mode: "suggest",
  activePageId: "page.calculator",
  activeWorkspaceId: "calculator.workspace",
  shell: {
    navigation: {
      id: "shell.global-navigation",
      state: "pinned",
      placement: "left",
      fixedAcrossPages: true,
      source: "page-registry"
    },
    reservedArea: {
      left: 5,
      right: 0,
      top: 4,
      bottom: 3
    }
  },
  pages: [
    {
      id: "page.calculator",
      title: "Калькулятор",
      routeId: "route.calculator",
      workspaceId: "calculator.workspace",
      defaultComponentId: "calculator.stage.main"
    }
  ],
  items: [],
  contentSchemas: [],
  dependencies: []
}
```

## Пример V2 suggestion

```ts
{
  type: "navigation-state-suggestion",
  targetId: "shell.global-navigation",
  from: {
    state: "pinned",
    placement: "left"
  },
  to: {
    state: "collapsed",
    placement: "left"
  },
  reason: "Active workspace has two dense panels and current sidebar width leaves less than minArea for calculator.stage.side-panel.",
  expectedReservedArea: {
    left: 2,
    top: 4,
    bottom: 3
  },
  affectedWorkspaces: ["calculator.workspace"],
  requiresUserApproval: true
}
```

## Открытые решения

Нужно отдельно согласовать:

1. Можно ли пользовательским страницам иметь собственный route slug в production.
2. Как хранить page registry: backend, local storage или проектный JSON.
3. Нужно ли versioning для layout profiles каждой страницы.
4. Какой fallback navigation обязателен, если global menu hidden.
5. Какие menu states разрешены по умолчанию на desktop/tablet/mobile.
6. Как показывать conflicts: отдельная панель, toast или overlay markers.

## Итоговая позиция

Глобальное меню должно стать управляемым shell-блоком, который можно поставить слева, сверху, снизу, свернуть в rail, открыть overlay-шторкой или скрыть. Но страницы должны жить в `Page Registry`, а не внутри меню. Тогда V2 сможет гибко управлять композицией, не ломая маршруты, рабочие области и смысл переходов.
