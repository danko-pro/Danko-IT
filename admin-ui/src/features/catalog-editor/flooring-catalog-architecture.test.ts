import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import catalogEditorSource from "./CatalogEditor.tsx?raw";
import catalogDisclosureCardSource from "./CatalogDisclosureCard.tsx?raw";
import catalogIconActionSource from "./CatalogIconAction.tsx?raw";
import catalogLibraryPanelSource from "./CatalogLibraryPanel.tsx?raw";
import flooringAssemblyBlockSource from "./FlooringAssemblyBlock.tsx?raw";
import flooringAssemblyLibraryCatalogTableSource from "./FlooringAssemblyLibraryCatalogTable.tsx?raw";
import flooringAssemblyLibraryColumnsSource from "./FlooringAssemblyLibraryColumns.ts?raw";
import flooringAssemblyLibraryFormTableSource from "./FlooringAssemblyLibraryFormTable.tsx?raw";
import flooringAssemblyLibraryPanelSource from "./FlooringAssemblyLibraryPanel.tsx?raw";
import flooringCatalogEditFormsSource from "./FlooringCatalogEditForms.tsx?raw";
import flooringCatalogModelSource from "./flooring-catalog-model.ts?raw";
import flooringCatalogPanelSource from "./FlooringCatalogPanel.tsx?raw";
import flooringCatalogWorkspaceSource from "./FlooringCatalogWorkspace.tsx?raw";
import flooringConsumablesTableSource from "./FlooringConsumablesTable.tsx?raw";
import flooringCatalogAssemblyCreateRowSource from "./flooring-catalog-assembly-create-row.ts?raw";
import flooringUiArchitectureSource from "./flooring-ui-architecture.md?raw";
import useFlooringAssemblyEditLoadSource from "./useFlooringAssemblyEditLoad.ts?raw";
import useFlooringCatalogPanelSource from "./useFlooringCatalogPanel.ts?raw";
import catalogManagedTableHeaderCellSource from "./CatalogManagedTableHeaderCell.tsx?raw";
import catalogSegmentedControlSource from "./CatalogSegmentedControl.tsx?raw";
import catalogViewTabsSource from "./CatalogViewTabs.tsx?raw";
import plumbingCatalogModelSource from "./plumbing-catalog-model.ts?raw";
import plumbingCatalogPanelSource from "./PlumbingCatalogPanel.tsx?raw";
import plumbingLibraryColumnsSource from "./PlumbingLibraryColumns.ts?raw";
import plumbingLibraryRowsSource from "./PlumbingLibraryRows.tsx?raw";
import plumbingLibraryViewSource from "./PlumbingLibraryView.tsx?raw";
import plumbingPreviewPanelSource from "./PlumbingPreviewPanel.tsx?raw";
import plumbingZoneCardSource from "./PlumbingZoneCard.tsx?raw";
import plumbingZoneCompositionColumnsSource from "./PlumbingZoneCompositionColumns.ts?raw";
import plumbingZoneCompositionRowsSource from "./PlumbingZoneCompositionRows.tsx?raw";
import plumbingZoneCompositionTableSource from "./PlumbingZoneCompositionTable.tsx?raw";
import plumbingZoneSidebarSource from "./PlumbingZoneSidebar.tsx?raw";
import plumbingZonesViewSource from "./PlumbingZonesView.tsx?raw";
import useCatalogPersistedStateSource from "./useCatalogPersistedState.ts?raw";
import useCatalogTableColumnsSource from "./useCatalogTableColumns.ts?raw";
import usePlumbingCatalogPanelSource from "./usePlumbingCatalogPanel.ts?raw";
import warmFloorCatalogPanelSource from "./WarmFloorCatalogPanel.tsx?raw";
import warmFloorRateFieldsSource from "./warm-floor-rate-fields.ts?raw";
import warmFloorRateCardSource from "./WarmFloorRateCard.tsx?raw";
import warmFloorRateTableSource from "./WarmFloorRateTable.tsx?raw";
import warmFloorRateTableColumnsSource from "./WarmFloorRateTableColumns.ts?raw";
import warmFloorSnapshotPreviewPanelSource from "./WarmFloorSnapshotPreviewPanel.tsx?raw";

const FEATURE_DIR = dirname(fileURLToPath(import.meta.url));

function readFeatureFile(path: string): string {
  return readFileSync(join(FEATURE_DIR, path), "utf8");
}

const flooringCssSource = readFeatureFile("styles/catalog-editor.flooring.css");
const cardsCssSource = readFeatureFile("styles/catalog-editor.cards.css");
const flooringAssemblyCssSource = readFeatureFile("styles/catalog-editor.flooring.assembly.css");
const flooringConsumablesCssSource = readFeatureFile("styles/catalog-editor.flooring.consumables.css");
const flooringFormsCssSource = readFeatureFile("styles/catalog-editor.flooring.forms.css");
const flooringLibraryCssSource = readFeatureFile("styles/catalog-editor.flooring.library.css");
const flooringResponsiveCssSource = readFeatureFile("styles/catalog-editor.flooring.responsive.css");
const flooringShellCssSource = readFeatureFile("styles/catalog-editor.flooring.shell.css");
const flooringTablesCssSource = readFeatureFile("styles/catalog-editor.flooring.tables.css");
const flooringWorkspaceCssSource = readFeatureFile("styles/catalog-editor.flooring.workspace.css");
const libraryCssSource = readFeatureFile("styles/catalog-editor.library.css");
const managedTableCssSource = readFeatureFile("styles/catalog-editor.managed-table.css");
const plumbingCssSource = readFeatureFile("styles/catalog-editor.plumbing.css");
const plumbingCompositionCssSource = readFeatureFile("styles/catalog-editor.plumbing.composition.css");
const plumbingLibraryCssSource = readFeatureFile("styles/catalog-editor.plumbing.library.css");
const plumbingNotesCssSource = readFeatureFile("styles/catalog-editor.plumbing.notes.css");
const plumbingResponsiveCssSource = readFeatureFile("styles/catalog-editor.plumbing.responsive.css");
const plumbingTableAdaptiveCssSource = readFeatureFile("styles/catalog-editor.plumbing.table-adaptive.css");
const plumbingTableCssSource = readFeatureFile("styles/catalog-editor.plumbing.table.css");
const plumbingZoneWorkspaceCssSource = readFeatureFile("styles/catalog-editor.plumbing.zone-workspace.css");
const plumbingZonesCssSource = readFeatureFile("styles/catalog-editor.plumbing.zones.css");
const warmFloorCssSource = readFeatureFile("styles/catalog-editor.warm-floor.css");

const REQUIRED_FLOORING_CATALOG_MODULES = [
  "CatalogSegmentedControl.tsx",
  "CatalogViewTabs.tsx",
  "FlooringAssemblyBlock.tsx",
  "FlooringAssemblyLibraryCatalogTable.tsx",
  "FlooringAssemblyLibraryColumns.ts",
  "FlooringAssemblyLibraryFormTable.tsx",
  "FlooringAssemblyLibraryPanel.tsx",
  "FlooringCatalogWorkspace.tsx",
  "FlooringConsumablesTable.tsx",
  "FlooringCatalogEditForms.tsx",
  "flooring-catalog-model.ts",
  "useFlooringCatalogPanel.ts",
] as const;

const REQUIRED_FLOORING_CSS_MODULES = [
  "catalog-editor.flooring.css",
  "catalog-editor.flooring.assembly.css",
  "catalog-editor.flooring.consumables.css",
  "catalog-editor.flooring.forms.css",
  "catalog-editor.flooring.library.css",
  "catalog-editor.flooring.responsive.css",
  "catalog-editor.flooring.shell.css",
  "catalog-editor.flooring.tables.css",
  "catalog-editor.flooring.workspace.css",
] as const;

const REQUIRED_PLUMBING_CSS_MODULES = [
  "catalog-editor.plumbing.css",
  "catalog-editor.plumbing.composition.css",
  "catalog-editor.plumbing.library.css",
  "catalog-editor.plumbing.notes.css",
  "catalog-editor.plumbing.responsive.css",
  "catalog-editor.plumbing.table-adaptive.css",
  "catalog-editor.plumbing.table.css",
  "catalog-editor.plumbing.zone-workspace.css",
  "catalog-editor.plumbing.zones.css",
] as const;

const REQUIRED_PLUMBING_CATALOG_MODULES = [
  "PlumbingCatalogPanel.tsx",
  "PlumbingLibraryColumns.ts",
  "PlumbingLibraryRows.tsx",
  "PlumbingLibraryView.tsx",
  "PlumbingPreviewPanel.tsx",
  "PlumbingZoneCard.tsx",
  "PlumbingZoneCompositionColumns.ts",
  "PlumbingZoneCompositionRows.tsx",
  "PlumbingZoneCompositionTable.tsx",
  "PlumbingZoneSidebar.tsx",
  "PlumbingZonesView.tsx",
  "plumbing-catalog-model.ts",
  "usePlumbingCatalogPanel.ts",
] as const;

const REQUIRED_WARM_FLOOR_CATALOG_MODULES = [
  "WarmFloorCatalogPanel.tsx",
  "WarmFloorRateCard.tsx",
  "WarmFloorRateTable.tsx",
  "WarmFloorRateTableColumns.ts",
  "WarmFloorSnapshotPreviewPanel.tsx",
  "warm-floor-rate-fields.ts",
] as const;

const REQUIRED_SHARED_CATALOG_MODULES = [
  "CatalogDisclosureCard.tsx",
  "CatalogIconAction.tsx",
  "CatalogLibraryPanel.tsx",
  "CatalogManagedTableHeaderCell.tsx",
  "useCatalogPersistedState.ts",
  "useCatalogTableColumns.ts",
] as const;

const REQUIRED_SHARED_CSS_MODULES = [
  "catalog-editor.cards.css",
  "catalog-editor.library.css",
  "catalog-editor.managed-table.css",
] as const;

const REQUIRED_WARM_FLOOR_CSS_MODULES = ["catalog-editor.warm-floor.css"] as const;

const flooringCatalogModulePaths = Object.keys(
  import.meta.glob([
    "./FlooringAssemblyBlock.tsx",
    "./FlooringAssemblyLibraryCatalogTable.tsx",
    "./FlooringAssemblyLibraryColumns.ts",
    "./FlooringAssemblyLibraryFormTable.tsx",
    "./CatalogSegmentedControl.tsx",
    "./CatalogViewTabs.tsx",
    "./FlooringAssemblyLibraryPanel.tsx",
    "./FlooringCatalogWorkspace.tsx",
    "./FlooringConsumablesTable.tsx",
    "./FlooringCatalogEditForms.tsx",
    "./flooring-catalog-model.ts",
    "./useFlooringCatalogPanel.ts",
  ]),
);

const plumbingCatalogModulePaths = Object.keys(
  import.meta.glob([
    "./PlumbingCatalogPanel.tsx",
    "./PlumbingLibraryColumns.ts",
    "./PlumbingLibraryRows.tsx",
    "./PlumbingLibraryView.tsx",
    "./PlumbingPreviewPanel.tsx",
    "./PlumbingZoneCard.tsx",
    "./PlumbingZoneCompositionColumns.ts",
    "./PlumbingZoneCompositionRows.tsx",
    "./PlumbingZoneCompositionTable.tsx",
    "./PlumbingZoneSidebar.tsx",
    "./PlumbingZonesView.tsx",
    "./plumbing-catalog-model.ts",
    "./usePlumbingCatalogPanel.ts",
  ]),
);

const sharedCatalogModulePaths = Object.keys(
  import.meta.glob([
    "./CatalogDisclosureCard.tsx",
    "./CatalogIconAction.tsx",
    "./CatalogManagedTableHeaderCell.tsx",
    "./CatalogLibraryPanel.tsx",
    "./useCatalogPersistedState.ts",
    "./useCatalogTableColumns.ts",
  ]),
);

const warmFloorCatalogModulePaths = Object.keys(
  import.meta.glob([
    "./WarmFloorCatalogPanel.tsx",
    "./WarmFloorRateCard.tsx",
    "./WarmFloorRateTable.tsx",
    "./WarmFloorRateTableColumns.ts",
    "./WarmFloorSnapshotPreviewPanel.tsx",
    "./warm-floor-rate-fields.ts",
  ]),
);

const flooringCssModulePaths = Object.keys(
  import.meta.glob([
    "./styles/catalog-editor.flooring.css",
    "./styles/catalog-editor.flooring.assembly.css",
    "./styles/catalog-editor.flooring.consumables.css",
    "./styles/catalog-editor.flooring.forms.css",
    "./styles/catalog-editor.flooring.library.css",
    "./styles/catalog-editor.flooring.responsive.css",
    "./styles/catalog-editor.flooring.shell.css",
    "./styles/catalog-editor.flooring.tables.css",
    "./styles/catalog-editor.flooring.workspace.css",
  ]),
);

const plumbingCssModulePaths = Object.keys(
  import.meta.glob([
    "./styles/catalog-editor.plumbing.css",
    "./styles/catalog-editor.plumbing.composition.css",
    "./styles/catalog-editor.plumbing.library.css",
    "./styles/catalog-editor.plumbing.notes.css",
    "./styles/catalog-editor.plumbing.responsive.css",
    "./styles/catalog-editor.plumbing.table-adaptive.css",
    "./styles/catalog-editor.plumbing.table.css",
    "./styles/catalog-editor.plumbing.zone-workspace.css",
    "./styles/catalog-editor.plumbing.zones.css",
  ]),
);

const sharedCssModulePaths = Object.keys(
  import.meta.glob([
    "./styles/catalog-editor.cards.css",
    "./styles/catalog-editor.library.css",
    "./styles/catalog-editor.managed-table.css",
  ]),
);

const warmFloorCssModulePaths = Object.keys(
  import.meta.glob(["./styles/catalog-editor.warm-floor.css"]),
);

const flooringCssSources: Array<[string, string, number]> = [
  ["catalog-editor.flooring.css", flooringCssSource, 20],
  ["catalog-editor.flooring.assembly.css", flooringAssemblyCssSource, 360],
  ["catalog-editor.flooring.consumables.css", flooringConsumablesCssSource, 320],
  ["catalog-editor.flooring.forms.css", flooringFormsCssSource, 240],
  ["catalog-editor.flooring.library.css", flooringLibraryCssSource, 80],
  ["catalog-editor.flooring.responsive.css", flooringResponsiveCssSource, 120],
  ["catalog-editor.flooring.shell.css", flooringShellCssSource, 120],
  ["catalog-editor.flooring.tables.css", flooringTablesCssSource, 140],
  ["catalog-editor.flooring.workspace.css", flooringWorkspaceCssSource, 320],
];

const plumbingCssSources: Array<[string, string, number]> = [
  ["catalog-editor.plumbing.css", plumbingCssSource, 20],
  ["catalog-editor.plumbing.composition.css", plumbingCompositionCssSource, 140],
  ["catalog-editor.plumbing.library.css", plumbingLibraryCssSource, 80],
  ["catalog-editor.plumbing.notes.css", plumbingNotesCssSource, 40],
  ["catalog-editor.plumbing.responsive.css", plumbingResponsiveCssSource, 60],
  ["catalog-editor.plumbing.table-adaptive.css", plumbingTableAdaptiveCssSource, 100],
  ["catalog-editor.plumbing.table.css", plumbingTableCssSource, 140],
  ["catalog-editor.plumbing.zone-workspace.css", plumbingZoneWorkspaceCssSource, 240],
  ["catalog-editor.plumbing.zones.css", plumbingZonesCssSource, 220],
];

const sharedCssSources: Array<[string, string, number]> = [
  ["catalog-editor.cards.css", cardsCssSource, 80],
  ["catalog-editor.library.css", libraryCssSource, 120],
  ["catalog-editor.managed-table.css", managedTableCssSource, 160],
];

const warmFloorCssSources: Array<[string, string, number]> = [
  ["catalog-editor.warm-floor.css", warmFloorCssSource, 110],
];

function sourceLines(source: string): string[] {
  return source.split("\n");
}

function importLines(source: string): string[] {
  return source
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("import "));
}

describe("catalog editor architecture", () => {
  it("keeps CatalogEditor.tsx as a section shell", () => {
    expect(sourceLines(catalogEditorSource).length).toBeLessThanOrEqual(140);
    expect(catalogEditorSource).toContain("<PlumbingCatalogPanel catalog={plumbingCatalog} />");
    expect(catalogEditorSource).toContain("<FlooringCatalogPanel />");
    expect(catalogEditorSource).toContain('hidden={activeSectionId !== "floors"}');
    expect(catalogEditorSource).not.toContain("function ZoneCard");
    expect(catalogEditorSource).not.toContain("function LibraryView");
    expect(catalogEditorSource).not.toContain("CatalogViewTabs");
    expect(catalogEditorSource).not.toContain("setItems");
    expect(catalogEditorSource).not.toContain("setZones");
  });

  it("keeps FlooringCatalogPanel.tsx as a small shell", () => {
    expect(sourceLines(flooringCatalogPanelSource).length).toBeLessThanOrEqual(260);
  });

  it("keeps flooring catalog controller and assembly builder within module budgets", () => {
    expect(sourceLines(useFlooringCatalogPanelSource).length).toBeLessThanOrEqual(620);
    expect(sourceLines(flooringAssemblyBlockSource).length).toBeLessThanOrEqual(650);
    expect(sourceLines(flooringAssemblyLibraryCatalogTableSource).length).toBeLessThanOrEqual(180);
    expect(sourceLines(flooringAssemblyLibraryColumnsSource).length).toBeLessThanOrEqual(140);
    expect(sourceLines(flooringAssemblyLibraryFormTableSource).length).toBeLessThanOrEqual(240);
    expect(sourceLines(flooringAssemblyLibraryPanelSource).length).toBeLessThanOrEqual(120);
    expect(sourceLines(flooringCatalogWorkspaceSource).length).toBeLessThanOrEqual(260);
    expect(sourceLines(flooringConsumablesTableSource).length).toBeLessThanOrEqual(260);
    expect(sourceLines(catalogSegmentedControlSource).length).toBeLessThanOrEqual(80);
    expect(sourceLines(catalogViewTabsSource).length).toBeLessThanOrEqual(80);
  });

  it("keeps flooring assembly edit loading visually stable", () => {
    const loadIndex = useFlooringAssemblyEditLoadSource.indexOf("const result = await loadAssemblyForEditorEdit");
    const resetIndex = useFlooringAssemblyEditLoadSource.indexOf("setAssemblyResetKey(assemblyEditResetKey(target, targetId));");

    expect(flooringAssemblyBlockSource).toContain("aria-busy={loadingAssembly}");
    expect(flooringAssemblyBlockSource).not.toContain("ce-flooring-assembly-hint");
    expect(resetIndex).toBeGreaterThan(loadIndex);
  });

  it("keeps flooring catalog submodules present", () => {
    for (const moduleFile of REQUIRED_FLOORING_CATALOG_MODULES) {
      expect(flooringCatalogModulePaths).toContain(`./${moduleFile}`);
    }
  });

  it("keeps plumbing catalog submodules present", () => {
    for (const moduleFile of REQUIRED_PLUMBING_CATALOG_MODULES) {
      expect(plumbingCatalogModulePaths).toContain(`./${moduleFile}`);
    }
  });

  it("keeps warm floor catalog submodules present", () => {
    for (const moduleFile of REQUIRED_WARM_FLOOR_CATALOG_MODULES) {
      expect(warmFloorCatalogModulePaths).toContain(`./${moduleFile}`);
    }
  });

  it("keeps shared catalog table controls reusable", () => {
    for (const moduleFile of REQUIRED_SHARED_CATALOG_MODULES) {
      expect(sharedCatalogModulePaths).toContain(`./${moduleFile}`);
    }

    expect(sourceLines(useCatalogTableColumnsSource).length).toBeLessThanOrEqual(140);
    expect(sourceLines(useCatalogPersistedStateSource).length).toBeLessThanOrEqual(80);
    expect(sourceLines(catalogDisclosureCardSource).length).toBeLessThanOrEqual(70);
    expect(sourceLines(catalogIconActionSource).length).toBeLessThanOrEqual(60);
    expect(sourceLines(catalogLibraryPanelSource).length).toBeLessThanOrEqual(80);
    expect(sourceLines(catalogManagedTableHeaderCellSource).length).toBeLessThanOrEqual(100);
    expect(catalogDisclosureCardSource).toContain("ce-catalog-disclosure-card");
    expect(catalogDisclosureCardSource).toContain("aria-expanded={!collapsed}");
    expect(catalogIconActionSource).toContain("ce-icon-action");
    expect(catalogIconActionSource).toContain("ce-icon-action-${variant}");
    expect(catalogEditorSource).toContain("useCatalogPersistedState");
    expect(catalogEditorSource).toContain('"section-tab"');
    expect(useFlooringCatalogPanelSource).toContain('"flooring:view"');
    expect(useFlooringCatalogPanelSource).toContain('"flooring:assembly-target"');
    expect(usePlumbingCatalogPanelSource).toContain('"plumbing:view"');
    expect(usePlumbingCatalogPanelSource).toContain('"plumbing:library-group"');
    expect(usePlumbingCatalogPanelSource).toContain('"plumbing:collapsed-subgroups"');
    expect(usePlumbingCatalogPanelSource).toContain('"plumbing:collapsed-zones"');
    expect(plumbingLibraryViewSource).toContain("CatalogLibraryPanel");
    expect(flooringAssemblyLibraryPanelSource).toContain("CatalogLibraryPanel");
    expect(flooringConsumablesTableSource).toContain("useCatalogTableColumns");
    expect(flooringConsumablesTableSource).toContain('"flooring:consumables-columns"');
    expect(flooringConsumablesTableSource).toContain("CatalogManagedTableHeaderCell");
    expect(flooringAssemblyLibraryPanelSource).toContain("useCatalogTableColumns");
    expect(flooringAssemblyLibraryPanelSource).toContain('"flooring:assembly-library-columns"');
    expect(flooringAssemblyLibraryCatalogTableSource).toContain("CatalogManagedTableHeaderCell");
    expect(flooringAssemblyLibraryCatalogTableSource).toContain("EditIcon");
    expect(flooringAssemblyLibraryCatalogTableSource).toContain("TrashIcon");
    expect(flooringAssemblyLibraryCatalogTableSource).toContain("CatalogIconAction");
    expect(flooringCatalogWorkspaceSource).toContain("CatalogIconAction");
    expect(plumbingZoneCardSource).toContain("CatalogIconAction");
    expect(plumbingZoneCardSource).toContain("CatalogDisclosureCard");
    expect(plumbingZoneSidebarSource).toContain("CatalogIconAction");
    expect(flooringAssemblyLibraryCatalogTableSource).not.toContain("ce-icon-action");
    expect(flooringAssemblyLibraryCatalogTableSource).not.toContain('className="ce-row-action"');
    expect(plumbingZoneCompositionTableSource).toContain("useCatalogTableColumns");
    expect(plumbingZoneCompositionTableSource).toContain('"plumbing:zone-composition-columns"');
    expect(plumbingZoneCompositionTableSource).toContain("CatalogManagedTableHeaderCell");
    expect(plumbingLibraryViewSource).toContain("useCatalogTableColumns");
    expect(plumbingLibraryViewSource).toContain('"plumbing:library-columns"');
    expect(plumbingLibraryViewSource).toContain("CatalogManagedTableHeaderCell");
  });

  it("keeps warm floor tables compact, managed, and UI-only", () => {
    expect(sourceLines(warmFloorCatalogPanelSource).length).toBeLessThanOrEqual(170);
    expect(sourceLines(warmFloorRateFieldsSource).length).toBeLessThanOrEqual(50);
    expect(sourceLines(warmFloorRateCardSource).length).toBeLessThanOrEqual(60);
    expect(sourceLines(warmFloorRateTableSource).length).toBeLessThanOrEqual(110);
    expect(sourceLines(warmFloorRateTableColumnsSource).length).toBeLessThanOrEqual(80);
    expect(sourceLines(warmFloorSnapshotPreviewPanelSource).length).toBeLessThanOrEqual(40);
    expect(warmFloorCatalogPanelSource).toContain("WarmFloorRateCard");
    expect(warmFloorCatalogPanelSource).toContain("useCatalogPersistedStringSet");
    expect(warmFloorCatalogPanelSource).toContain("useCatalogTableColumns");
    expect(warmFloorCatalogPanelSource).toContain('"warm-floor:rate-columns"');
    expect(warmFloorCatalogPanelSource).toContain('"warm-floor:collapsed-rate-cards"');
    expect(warmFloorRateCardSource).toContain("CatalogDisclosureCard");
    expect(warmFloorRateCardSource).toContain("WarmFloorRateTable");
    expect(warmFloorRateTableSource).toContain("CatalogManagedTableHeaderCell");
    expect(warmFloorRateTableSource).toContain("ce-warm-floor-rate-table");
    expect(warmFloorCatalogPanelSource).not.toContain("function renderRows");
    expect(warmFloorCatalogPanelSource).not.toContain("style={{");
    expect(warmFloorRateTableSource).not.toContain("style={{");
  });

  it("keeps plumbing catalog UI, controller, and pure model separated", () => {
    expect(sourceLines(plumbingCatalogPanelSource).length).toBeLessThanOrEqual(220);
    expect(sourceLines(usePlumbingCatalogPanelSource).length).toBeLessThanOrEqual(420);
    expect(sourceLines(plumbingZonesViewSource).length).toBeLessThanOrEqual(150);
    expect(sourceLines(plumbingZoneSidebarSource).length).toBeLessThanOrEqual(120);
    expect(sourceLines(plumbingZoneCardSource).length).toBeLessThanOrEqual(260);
    expect(sourceLines(plumbingZoneCompositionTableSource).length).toBeLessThanOrEqual(170);
    expect(sourceLines(plumbingZoneCompositionColumnsSource).length).toBeLessThanOrEqual(120);
    expect(sourceLines(plumbingZoneCompositionRowsSource).length).toBeLessThanOrEqual(150);
    expect(sourceLines(plumbingLibraryColumnsSource).length).toBeLessThanOrEqual(150);
    expect(sourceLines(plumbingLibraryRowsSource).length).toBeLessThanOrEqual(190);
    expect(sourceLines(plumbingLibraryViewSource).length).toBeLessThanOrEqual(170);
    expect(sourceLines(plumbingPreviewPanelSource).length).toBeLessThanOrEqual(100);
    expect(sourceLines(plumbingCatalogModelSource).length).toBeLessThanOrEqual(260);
    expect(plumbingCatalogPanelSource).toContain("CatalogViewTabs");
    expect(plumbingCatalogPanelSource).toContain("ce-plumbing-guidance-note");
    expect(plumbingCatalogPanelSource).toContain("ce-plumbing-guidance-note-warn");
    expect(usePlumbingCatalogPanelSource).toContain("setItems");
    expect(usePlumbingCatalogPanelSource).toContain("setZones");
    expect(plumbingCatalogModelSource).toContain("export function itemUnitPrice");
    expect(plumbingCatalogModelSource).toContain("export function normalizeZone");
    expect(plumbingZonesViewSource).toContain("PlumbingZoneCard");
    expect(plumbingZonesViewSource).toContain("PlumbingZoneSidebar");
    expect(plumbingZoneCardSource).toContain("PlumbingZoneCompositionTable");
    expect(plumbingZoneCompositionTableSource).toContain("PlumbingZoneCompositionRows");
  });

  it("keeps flooring CSS split by UI area", () => {
    for (const moduleFile of REQUIRED_FLOORING_CSS_MODULES) {
      expect(flooringCssModulePaths).toContain(`./styles/${moduleFile}`);
    }

    for (const moduleFile of REQUIRED_FLOORING_CSS_MODULES.filter(
      (moduleFile) => moduleFile !== "catalog-editor.flooring.css",
    )) {
      expect(flooringCssSource).toContain(`@import "./${moduleFile}";`);
    }

    for (const [moduleFile, source, maxLines] of flooringCssSources) {
      expect(sourceLines(source).length, moduleFile).toBeLessThanOrEqual(maxLines);
    }
  });

  it("keeps plumbing CSS split by UI area", () => {
    for (const moduleFile of REQUIRED_PLUMBING_CSS_MODULES) {
      expect(plumbingCssModulePaths).toContain(`./styles/${moduleFile}`);
    }

    for (const moduleFile of REQUIRED_PLUMBING_CSS_MODULES.filter(
      (moduleFile) => moduleFile !== "catalog-editor.plumbing.css",
    )) {
      expect(plumbingCssSource).toContain(`@import "./${moduleFile}";`);
    }

    for (const [moduleFile, source, maxLines] of plumbingCssSources) {
      expect(sourceLines(source).length, moduleFile).toBeLessThanOrEqual(maxLines);
    }
  });

  it("keeps shared catalog CSS split from domain CSS", () => {
    for (const moduleFile of REQUIRED_SHARED_CSS_MODULES) {
      expect(sharedCssModulePaths).toContain(`./styles/${moduleFile}`);
    }

    for (const moduleFile of REQUIRED_SHARED_CSS_MODULES) {
      expect(readFeatureFile("styles/catalog-editor.css")).toContain(`@import "./${moduleFile}";`);
    }

    for (const [moduleFile, source, maxLines] of sharedCssSources) {
      expect(sourceLines(source).length, moduleFile).toBeLessThanOrEqual(maxLines);
    }
  });

  it("keeps warm floor CSS split by UI area", () => {
    for (const moduleFile of REQUIRED_WARM_FLOOR_CSS_MODULES) {
      expect(warmFloorCssModulePaths).toContain(`./styles/${moduleFile}`);
      expect(readFeatureFile("styles/catalog-editor.css")).toContain(`@import "./${moduleFile}";`);
    }

    for (const [moduleFile, source, maxLines] of warmFloorCssSources) {
      expect(sourceLines(source).length, moduleFile).toBeLessThanOrEqual(maxLines);
    }
  });

  it("documents reusable flooring UI boundaries", () => {
    expect(flooringUiArchitectureSource).toContain("Reusable UI Content");
    expect(flooringUiArchitectureSource).toContain("UI-only mechanics");
    expect(flooringUiArchitectureSource).toContain("Do not move pricing or persistence logic");
  });

  it("does not import flooring API client from the shell component", () => {
    const violatingImports = importLines(flooringCatalogPanelSource).filter((line) =>
      line.includes("./api/flooring-client"),
    );

    expect(violatingImports).toEqual([]);
  });

  it("keeps data/API orchestration in useFlooringCatalogPanel", () => {
    expect(useFlooringCatalogPanelSource).toContain("fetchFlooringSnapshot");
    expect(useFlooringCatalogPanelSource).toContain("listFlooringAssemblyItems");
    expect(useFlooringCatalogPanelSource).toContain("createFlooringCatalogRowFromAssembly");
    expect(useFlooringCatalogPanelSource).toContain("updateFlooringLayout");
    expect(flooringCatalogAssemblyCreateRowSource).toContain("createFlooringCovering");
  });

  it("keeps pure catalog helpers in flooring-catalog-model", () => {
    expect(flooringCatalogModelSource).toContain("export function emptyCoveringDraft");
    expect(flooringCatalogModelSource).toContain("export function snapshotRatesMatchRow");
    expect(flooringCatalogModelSource).toContain("export function consumablesSummaryPerM2");
  });

  it("keeps assembly builder, library, workspace, and edit forms separated", () => {
    expect(flooringAssemblyBlockSource).toContain("export function FlooringAssemblyBlock");
    expect(catalogSegmentedControlSource).toContain("export function CatalogSegmentedControl");
    expect(catalogViewTabsSource).toContain("export function CatalogViewTabs");
    expect(flooringAssemblyBlockSource).toContain("CatalogSegmentedControl");
    expect(flooringAssemblyLibraryPanelSource).toContain("export function FlooringAssemblyLibraryPanel");
    expect(flooringCatalogWorkspaceSource).toContain("export function FlooringCatalogWorkspace");
    expect(flooringConsumablesTableSource).toContain("export function FlooringConsumablesTable");
    expect(flooringCatalogWorkspaceSource).toContain("function FlooringCatalogSidebarSection");
    expect(flooringCatalogWorkspaceSource).toContain("function FlooringCatalogCard");
    expect(flooringCatalogEditFormsSource).toContain("export function FlooringCoveringEditForm");
    expect(flooringCatalogEditFormsSource).toContain("export function FlooringPreparationEditForm");
    expect(flooringCatalogEditFormsSource).toContain("export function FlooringLayoutEditForm");
  });
});
