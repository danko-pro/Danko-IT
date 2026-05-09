# Shared UI Architecture 1.1

Дата снимка: 2026-05-09.

`shared` is the frontend foundation layer. It is reusable across `features`, `shell`, and `editor`.

## Public Facades

- `shared/index.ts` is the public facade for common app code.
- `shared/controls` owns user actions: buttons, icon buttons, inline add controls.
- `shared/ui` owns visual primitives: fields, cards, dense rows, status/stat chips.
- `shared/formatters` owns display formatting.
- `shared/interactions` owns reusable interaction hooks without feature knowledge.
- `shared/workspace-contract` owns descriptive host UI schemas for future adapter/engine mapping.
- `shared/workspace-adapter` owns host-side projection from workspace manifests to adapter snapshots, without importing engine internals.

Feature code should prefer these facades over importing individual implementation files.
Feature-level facades may wrap shared primitives when a visual language is specific to one domain. Example: `features/calculator/shared/stage-section.tsx` owns calculator stage headers and empty states while reusing shared CSS groups.

## Ownership Rules

- Shared code must not import from `features`, `shell`, or `editor`.
- A component used by more than one feature belongs in `shared`.
- A one-off component should either stay private to the feature or be replaced by an existing shared primitive.
- Shared primitives expose behavior and structure. Feature-specific density, layout, and color overrides stay in scoped feature CSS.
- Animation helpers and interaction state must have one owner. Do not duplicate resize, expansion, or autosave-state patterns inside feature components when a shared hook or control exists.
- Workspace contract types describe host UI only. They must not import engine internals, React components, or feature modules.
- Workspace manifests must validate themselves before they become adapter input. Broken ids, invalid grid areas, missing parents, and missing relationship targets are contract problems, not rendering details.
- Workspace adapter snapshots are the only prepared input for future engine integration. Feature JSX must not call engine APIs directly.
- Workspace runtime snapshots are the compact active-zone payload for composition V2: flattened components, elements, relationships and inferred grid metrics.
- Workspace composition input is a compatibility bridge from runtime snapshots to the current V2 `{ items, contentSchemas, dependencies }` shape.
- Cross-feature workspace discovery belongs to `shell/workspace-catalog.ts`, not `shared`, because `shared` cannot import feature manifests.
- Shell navigation is a managed workspace block. Sidebar/header/router/footer may have engine-visible layout constraints instead of being treated as fixed UI outside the workspace.
- Workspace devtools may expose snapshots in development only. They must not call the engine, mutate UI state, or install in production builds.

## Style Groups

Shared CSS is grouped by responsibility:

- `components-primitives.css`: surfaces, panels, rows, section text.
- `components-actions.css`: buttons, icon buttons, micro actions, inline add controls, danger action tone.
- `components-confirm-delete.css`: reusable delete confirmation copy/actions/buttons.
- `components-dropdown.css`: reusable dropdown/select root, trigger, option, check and chevron structure.
- `components-forms.css`: labels, inputs, textareas, selects, field help anchors.
- `components-tooltips.css`: tooltip anchors and tooltip positioning only.
- `components-resizable.css`: resize handles and panel resizing visuals.
- `components-feedback.css`: badges, chips, status and metric pills.
- `components-motion.css`: stage tabs, details summaries, shared panel entrance motion.

Feature CSS may scope overrides under its own feature class, but base classes should have one source in the shared group files.

## Migration Rule

When touching UI code, first check whether the local element is already expressible through:

1. `Button`, `IconButton`, `AddButton`, `DeleteButton`, or `ConfirmDeleteContent`
2. `DropdownRoot`, `DropdownTrigger`, `DropdownChevron`, or `DropdownCheck`
3. `Field`, `SelectField`, `TimeField`, or `TextAreaField`
4. `DenseRow`, `InfoCard`, `MetricCard`, `SettingCard`, `StatusBadge`, `SignalChip`, or `StatChip`
5. `shared/interactions` hooks
6. `shared/workspace-contract` schemas when a block is part of an engine-managed workspace

If yes, use the shared primitive and keep feature CSS scoped.
