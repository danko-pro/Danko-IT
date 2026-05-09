# UI Stop Line для adaptive-engine host

Этот документ фиксирует, что нужно довести в `admin-ui`, прежде чем подключать `adaptive-engine` к реальным рабочим областям калькулятора.

## Цель

`admin-ui` должен стать понятным host-проектом:

```text
feature data
-> component schema
-> host adapter
-> adaptive-engine V1
-> host adapter
-> React UI
```

Движок не должен угадывать JSX, CSS-классы или бизнес-смысл калькулятора. UI должен сам отдать карту блоков, элементов, действий, ограничений и связей.

## Границы

- V1 управляет только геометрией, layout items, operations, constraints, rejections и diagnostics.
- V2 пока не внедряется в рабочий UI.
- Host adapter не является React-компонентом.
- Feature JSX не должен импортировать внутренности движка напрямую.
- Визуальные различия остаются в scoped feature CSS, но структура и поведение повторяемых controls идут через `shared`.

## Stop Line

UI-слой можно считать готовым к ограниченной интеграции движка, когда выполнены пункты ниже.

1. Shared facade стабилен:
   - `shared/controls` содержит повторяемые actions, add/delete, dropdown, confirm.
   - `shared/ui` содержит поля, cards, status/chip primitives.
   - `shared/interactions` содержит reusable hooks для popover/resize/selection behavior.
   - Feature code не создает локальные аналоги этих primitives без причины.

2. CSS сгруппирован по ответственности:
   - actions;
   - forms;
   - dropdown;
   - feedback;
   - motion;
   - resizable;
   - feature CSS хранит только layout/density/tone overrides.

3. Компоненты описывают себя:
   - стабильный `id`;
   - `parentId` для явной иерархии блоков;
   - `type`;
   - человекочитаемый `title`;
   - `dataKey`;
   - `area` или будущий layout slot;
   - `minArea`/`maxArea`;
   - `capabilities`;
   - `children` как список значимых внутренних элементов.

4. Feature registry существует минимум для первой рабочей области:
   - shell workspace;
   - doors/workbench;
   - calculator project workspace;
   - calculator rooms;
   - calculator flooring;
   - calculator wall-finish;
   - calculator warm-floor;
   - calculator stage shell;
   - dashboard contract;
   - dashboard passport;
   - dashboard ledger;
   - requests workspace;
   - materials workspace.

5. Adapter boundary зафиксирован:
   - shell navigation is an engine-managed workspace block, not a fixed out-of-band menu;
   - feature registry -> host adapter mapping;
   - adapter mapping -> engine layout item;
   - engine rejection -> user-facing message;
   - shell workspace catalog -> V2/engine discovery facade;
   - adapter snapshot -> compact runtime snapshot for active composition zone;
   - runtime snapshot -> current composition-engine input bridge;
   - no direct engine imports from feature JSX.

6. Проверки проходят:
   - `npm run build`;
   - `python tools/project_guard.py frontend`;
   - smoke UI по ключевому сценарию калькулятора.

## Порядок работ

1. Добить shared UI primitives: actions, fields, dropdowns, popovers, menus, chips.
2. Убрать локальные one-off controls из feature JSX.
3. Ввести `shared/workspace-contract` как типизированный язык описания host UI.
4. Описать doors/workbench registry первым, потому что это будущая рабочая зона для калькулятора дверей.
5. Описать calculator stage shell и правые панели.
6. Описать dashboard ledger как вторую сложную workspace-зону.
7. Научить registry отдавать V1-compatible layout items и constraints без импорта движка.
8. Добавить validation/report для registry и manifest: дубли id, невалидные area, битые parentId/relationships.
9. Завести host adapter skeleton без подключения к engine runtime: manifest validation, layout item projection, constraints projection, rejection shell.
10. Подключить engine только к ограниченной sandbox/workspace области.
11. Проверить V1 strict flow: valid operation applies, invalid operation rejects, UI keeps previous state.
12. Только после этого обсуждать V2 composition layer.

## Что не делать до stop line

- Не подключать V2 auto behavior.
- Не хранить геометрию только в CSS.
- Не завязывать engine на React-компоненты.
- Не импортировать engine assistants напрямую.
- Не делать adapter частью JSX-компонента.
- Не позволять каждому feature-блоку самому решать move/resize/collapse правила.
