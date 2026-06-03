import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import flooringAssemblyBlockSource from "./FlooringAssemblyBlock.tsx?raw";
import flooringAssemblyLibraryPanelSource from "./FlooringAssemblyLibraryPanel.tsx?raw";
import flooringCatalogEditFormsSource from "./FlooringCatalogEditForms.tsx?raw";
import flooringCatalogModelSource from "./flooring-catalog-model.ts?raw";
import flooringCatalogPanelSource from "./FlooringCatalogPanel.tsx?raw";
import flooringCatalogWorkspaceSource from "./FlooringCatalogWorkspace.tsx?raw";
import flooringConsumablesTableSource from "./FlooringConsumablesTable.tsx?raw";
import flooringCatalogAssemblyCreateRowSource from "./flooring-catalog-assembly-create-row.ts?raw";
import flooringUiArchitectureSource from "./flooring-ui-architecture.md?raw";
import useFlooringCatalogPanelSource from "./useFlooringCatalogPanel.ts?raw";
import catalogSegmentedControlSource from "./CatalogSegmentedControl.tsx?raw";
import catalogViewTabsSource from "./CatalogViewTabs.tsx?raw";

const FEATURE_DIR = dirname(fileURLToPath(import.meta.url));

function readFeatureFile(path: string): string {
  return readFileSync(join(FEATURE_DIR, path), "utf8");
}

const flooringCssSource = readFeatureFile("styles/catalog-editor.flooring.css");
const flooringAssemblyCssSource = readFeatureFile("styles/catalog-editor.flooring.assembly.css");
const flooringConsumablesCssSource = readFeatureFile("styles/catalog-editor.flooring.consumables.css");
const flooringFormsCssSource = readFeatureFile("styles/catalog-editor.flooring.forms.css");
const flooringResponsiveCssSource = readFeatureFile("styles/catalog-editor.flooring.responsive.css");
const flooringShellCssSource = readFeatureFile("styles/catalog-editor.flooring.shell.css");
const flooringTablesCssSource = readFeatureFile("styles/catalog-editor.flooring.tables.css");
const flooringWorkspaceCssSource = readFeatureFile("styles/catalog-editor.flooring.workspace.css");

const REQUIRED_FLOORING_CATALOG_MODULES = [
  "CatalogSegmentedControl.tsx",
  "CatalogViewTabs.tsx",
  "FlooringAssemblyBlock.tsx",
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
  "catalog-editor.flooring.responsive.css",
  "catalog-editor.flooring.shell.css",
  "catalog-editor.flooring.tables.css",
  "catalog-editor.flooring.workspace.css",
] as const;

const flooringCatalogModulePaths = Object.keys(
  import.meta.glob([
    "./FlooringAssemblyBlock.tsx",
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

const flooringCssModulePaths = Object.keys(
  import.meta.glob([
    "./styles/catalog-editor.flooring.css",
    "./styles/catalog-editor.flooring.assembly.css",
    "./styles/catalog-editor.flooring.consumables.css",
    "./styles/catalog-editor.flooring.forms.css",
    "./styles/catalog-editor.flooring.responsive.css",
    "./styles/catalog-editor.flooring.shell.css",
    "./styles/catalog-editor.flooring.tables.css",
    "./styles/catalog-editor.flooring.workspace.css",
  ]),
);

const flooringCssSources: Array<[string, string, number]> = [
  ["catalog-editor.flooring.css", flooringCssSource, 20],
  ["catalog-editor.flooring.assembly.css", flooringAssemblyCssSource, 360],
  ["catalog-editor.flooring.consumables.css", flooringConsumablesCssSource, 320],
  ["catalog-editor.flooring.forms.css", flooringFormsCssSource, 240],
  ["catalog-editor.flooring.responsive.css", flooringResponsiveCssSource, 120],
  ["catalog-editor.flooring.shell.css", flooringShellCssSource, 120],
  ["catalog-editor.flooring.tables.css", flooringTablesCssSource, 140],
  ["catalog-editor.flooring.workspace.css", flooringWorkspaceCssSource, 320],
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

describe("flooring catalog editor architecture", () => {
  it("keeps FlooringCatalogPanel.tsx as a small shell", () => {
    expect(sourceLines(flooringCatalogPanelSource).length).toBeLessThanOrEqual(260);
  });

  it("keeps flooring catalog controller and assembly builder within module budgets", () => {
    expect(sourceLines(useFlooringCatalogPanelSource).length).toBeLessThanOrEqual(620);
    expect(sourceLines(flooringAssemblyBlockSource).length).toBeLessThanOrEqual(650);
    expect(sourceLines(flooringCatalogWorkspaceSource).length).toBeLessThanOrEqual(260);
    expect(sourceLines(flooringConsumablesTableSource).length).toBeLessThanOrEqual(260);
    expect(sourceLines(catalogSegmentedControlSource).length).toBeLessThanOrEqual(80);
    expect(sourceLines(catalogViewTabsSource).length).toBeLessThanOrEqual(80);
  });

  it("keeps flooring catalog submodules present", () => {
    for (const moduleFile of REQUIRED_FLOORING_CATALOG_MODULES) {
      expect(flooringCatalogModulePaths).toContain(`./${moduleFile}`);
    }
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
