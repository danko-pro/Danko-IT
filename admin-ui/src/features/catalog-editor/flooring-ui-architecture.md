# Catalog Editor UI Architecture

This file fixes the UI boundaries for the catalog editor so future compact UI work does not turn back into a monolith.

## Reusable UI Content

Keep short labels, button text, compact column labels, tooltips, empty-state copy, and visual grouping rules near the component that owns the view until the same content is needed in a second place.

When the same UI content appears in more than one category, extract it into a small UI-only module or component. That module may export labels, section titles, helper text, display metadata, and layout wrappers. It must not import REST clients, mappers that persist data, or save/update helpers.

## UI-only mechanics

Reusable UI mechanics are allowed when they are visual or interaction-only: column resizing, column text alignment, segmented controls, card metric rendering, compact table presentation, and icon action affordances.

Put reusable mechanics in small components or hooks. A UI mechanic must receive data and callbacks through props. Do not move pricing or persistence logic into UI mechanics. Calculations that affect saved catalog values stay in the existing domain helpers and controller modules.

Current reusable mechanics:

- `CatalogViewTabs.tsx` for page-level view tabs such as zones/catalog-library switches.
- `CatalogSegmentedControl.tsx` for compact segmented mode switches.
- `CatalogIconAction.tsx` for compact icon-only actions such as edit, delete, and add.
- `CatalogLibraryPanel.tsx` for the shared library shell used by flooring and plumbing libraries.
- `CatalogManagedTableHeaderCell.tsx` for reusable table column controls.
- `WarmFloorRateTable.tsx` for compact warm-floor rate tables with shared managed columns.
- `useCatalogTableColumns.ts` for UI-only column width and text alignment state.
- `useCatalogPersistedState.ts` for resilient UI state that survives reloads.

## Persisted UI State

Persist only UI preferences: active catalog section, active category view, open or collapsed groups, selected UI filters, and table column width/alignment. Use explicit storage keys under the catalog editor prefix.

Do not persist catalog rows, prices, formulas, material rates, REST snapshots, draft form values, or any value that changes the saved catalog result. Persisted UI state must be optional and safe to ignore if storage is empty, blocked, or malformed.

## CSS Boundaries

Flooring CSS is split by surface:

- `catalog-editor.library.css` for shared library shells, metrics, and compact library tables.
- `catalog-editor.managed-table.css` for shared managed table controls.
- `catalog-editor.flooring.shell.css` for the floor page shell, toolbar, and meta.
- `catalog-editor.flooring.tables.css` for generic flooring tables.
- `catalog-editor.flooring.forms.css` for edit forms and form-only content.
- `catalog-editor.flooring.workspace.css` for the left catalog cards and right detail frame.
- `catalog-editor.flooring.consumables.css` for the standard consumables table.
- `catalog-editor.flooring.assembly.css` for the assembly builder.
- `catalog-editor.flooring.responsive.css` for breakpoints that coordinate multiple surfaces.
- `catalog-editor.warm-floor.css` for the warm-floor rate grid and compact rate table overrides.

Domain library CSS files should only keep category-specific dimensions and small overrides. New CSS should go into the closest existing file. Create a new CSS file only when a new reusable surface appears and the existing file would cross its boundary.

## Hard Rules

- Do not move pricing or persistence logic into UI components.
- Do not import flooring REST clients from shell or presentational components.
- Keep new UI components below the architecture test budgets unless the budget is deliberately updated with a clear reason.
- Prefer a small dedicated component over adding another large section to `FlooringCatalogEditForms.tsx` or `FlooringAssemblyBlock.tsx`.
