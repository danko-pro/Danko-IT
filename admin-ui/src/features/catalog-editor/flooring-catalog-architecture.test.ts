import { describe, expect, it } from "vitest";

import flooringAssemblyBlockSource from "./FlooringAssemblyBlock.tsx?raw";
import flooringAssemblyLibraryPanelSource from "./FlooringAssemblyLibraryPanel.tsx?raw";
import flooringCatalogEditFormsSource from "./FlooringCatalogEditForms.tsx?raw";
import flooringCatalogModelSource from "./flooring-catalog-model.ts?raw";
import flooringCatalogPanelSource from "./FlooringCatalogPanel.tsx?raw";
import flooringCatalogSectionsSource from "./FlooringCatalogSections.tsx?raw";
import flooringCatalogAssemblyCreateRowSource from "./flooring-catalog-assembly-create-row.ts?raw";
import useFlooringCatalogPanelSource from "./useFlooringCatalogPanel.ts?raw";

const REQUIRED_FLOORING_CATALOG_MODULES = [
  "FlooringAssemblyBlock.tsx",
  "FlooringAssemblyLibraryPanel.tsx",
  "FlooringCatalogSections.tsx",
  "FlooringCatalogEditForms.tsx",
  "flooring-catalog-model.ts",
  "useFlooringCatalogPanel.ts",
] as const;

const flooringCatalogModulePaths = Object.keys(
  import.meta.glob([
    "./FlooringAssemblyBlock.tsx",
    "./FlooringAssemblyLibraryPanel.tsx",
    "./FlooringCatalogSections.tsx",
    "./FlooringCatalogEditForms.tsx",
    "./flooring-catalog-model.ts",
    "./useFlooringCatalogPanel.ts",
  ]),
);

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
  });

  it("keeps flooring catalog submodules present", () => {
    for (const moduleFile of REQUIRED_FLOORING_CATALOG_MODULES) {
      expect(flooringCatalogModulePaths).toContain(`./${moduleFile}`);
    }
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

  it("keeps assembly builder, library, tables, and edit forms separated", () => {
    expect(flooringAssemblyBlockSource).toContain("export function FlooringAssemblyBlock");
    expect(flooringAssemblyLibraryPanelSource).toContain("export function FlooringAssemblyLibraryPanel");
    expect(flooringCatalogSectionsSource).toContain("export function FlooringCoveringsSection");
    expect(flooringCatalogSectionsSource).toContain("export function FlooringPreparationsSection");
    expect(flooringCatalogSectionsSource).toContain("export function FlooringLayoutsSection");
    expect(flooringCatalogEditFormsSource).toContain("export function FlooringCoveringEditForm");
    expect(flooringCatalogEditFormsSource).toContain("export function FlooringPreparationEditForm");
    expect(flooringCatalogEditFormsSource).toContain("export function FlooringLayoutEditForm");
  });
});
