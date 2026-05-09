# ADMIN UI V3 Navigation Host Contract v1.0

Документ фиксирует первый host-side слой `admin-ui` под `navigation-engine V3`.

## Граница

`admin-ui` пока не импортирует `navigation-engine` и не дает движку управлять React Router напрямую.

Текущая задача host side:

```text
page registry
-> route registry
-> navigation projection
-> shell state
-> reserved area
-> V3 input snapshot
```

Дальше этот snapshot можно будет отдать реальному `navigation-engine`.

## Что добавлено

```text
src/shell/route-registry.ts
src/shell/navigation-engine/types.ts
src/shell/navigation-engine/shell-state.ts
src/shell/navigation-engine/reserved-area.ts
src/shell/navigation-engine/input.ts
src/shell/navigation-engine/index.ts
```

`src/shell/workspace-devtools.ts` получил новый метод:

```ts
window.__ADMIN_UI_WORKSPACE__.navigation(options)
```

В probe panel появился вывод `v3 navigation input`.

## Текущий V3 Input

Builder `createNavigationEngineInput()` собирает:

- `metrics`;
- `activePageId`;
- `activeRouteId`;
- `activeWorkspaceId`;
- `pages`;
- `routes`;
- `workspaces`;
- `navigation`;
- `shell.reservedArea`;
- `usableWorkspace`.

## Shell State

Поддержаны состояния меню:

- `pinned`;
- `collapsed`;
- `overlay`;
- `hidden`.

Поддержаны placement:

- `left`;
- `right`;
- `top`;
- `bottom`.

На текущий момент дефолт:

```ts
{
  menuState: "pinned",
  placement: "left",
  scope: "global",
  pinnedSize: 5,
  collapsedSize: 2
}
```

Размер `5` выбран по текущему shell registry: sidebar занимает 5 grid columns, router начинается с `x = 6`.

## Reserved Area

`resolveReservedWorkspaceArea()` считает область, которую shell забирает у workspace.

Правила:

- `pinned` резервирует `pinnedSize`;
- `collapsed` резервирует `collapsedSize`;
- `overlay` не резервирует место;
- `hidden` не резервирует место.

`resolveUsableWorkspace()` возвращает область, которую дальше можно передавать V2/V1.

## Важная договоренность

Global navigation не считается обычным content block для V2.

Правильная цепочка:

```text
V3 определяет active workspace и usable workspace.
V2 анализирует блоки только внутри usable workspace.
V1 валидирует координаты и операции внутри этой области.
```

## Что еще нужно

1. Подключить реальные runtime metrics вместо дефолтных `32 x 30`.
2. Сформировать V3 relation projection: `selects`, `mounts`, `focuses`, `projects`, `constrains`.
3. Добавить V3 validation report до подключения реального движка.
4. Позже заменить host-side preview на вызов `navigation-engine`.
5. Не смешивать global navigation, workspace navigation и block navigation.
