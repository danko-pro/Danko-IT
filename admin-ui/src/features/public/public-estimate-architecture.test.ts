import { createRequire } from "module";
import { describe, expect, it } from "vitest";
import publicEstimateSource from "./PublicEstimate.tsx?raw";
import estimateRailSource from "./components/estimate/EstimateRail.tsx?raw";

const require = createRequire(import.meta.url);
const publicCssSource = require("fs").readFileSync(
  require("path").join(require("path").dirname(require("url").fileURLToPath(import.meta.url)), "public.css"),
  "utf8",
) as string;

const REQUIRED_SECTION_HOOKS = [
  "useEstimateRooms.ts",
  "useWarmFloorEstimate.ts",
  "useFlooringEstimate.ts",
  "useWallsEstimate.ts",
  "useCeilingEstimate.ts",
  "useElectricEstimate.ts",
  "usePlumbingEstimate.ts",
  "useDoorsEstimate.ts",
  "useCompletionEstimate.ts",
  "useAppliancesEstimate.ts",
  "useLooseFurnitureEstimate.ts",
  "useHomeGoodsEstimate.ts",
] as const;

// Orchestration hooks (not required here): useEstimateObjectMeta, useEstimateSpecModal,
// useEstimatePrintActions, useEstimateNavigation.

const estimateHookModulePaths = Object.keys(
  import.meta.glob([
    "./estimate/useEstimateRooms.ts",
    "./estimate/useWarmFloorEstimate.ts",
    "./estimate/useFlooringEstimate.ts",
    "./estimate/useWallsEstimate.ts",
    "./estimate/useCeilingEstimate.ts",
    "./estimate/useElectricEstimate.ts",
    "./estimate/usePlumbingEstimate.ts",
    "./estimate/useDoorsEstimate.ts",
    "./estimate/useCompletionEstimate.ts",
    "./estimate/useAppliancesEstimate.ts",
    "./estimate/useLooseFurnitureEstimate.ts",
    "./estimate/useHomeGoodsEstimate.ts",
  ]),
);

function publicEstimateLines(source: string): string[] {
  return source.split("\n");
}

function importLines(source: string): string[] {
  return source
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("import "));
}

describe("public estimate architecture (A9.8)", () => {
  const lines = publicEstimateLines(publicEstimateSource);

  it("keeps PublicEstimate.tsx shell within line budget", () => {
    expect(lines.length).toBeLessThanOrEqual(650);
  });

  it("does not import calculate* from public-estimate modules", () => {
    const violatingImports = importLines(publicEstimateSource).filter((line) => {
      if (!/calculate/i.test(line)) {
        return false;
      }
      return /public-estimate/i.test(line);
    });

    expect(violatingImports).toEqual([]);
  });

  it("does not use useState in PublicEstimate.tsx", () => {
    expect(publicEstimateSource).not.toMatch(/\buseState\b/);
  });

  it("does not define local function update* handlers in PublicEstimate.tsx", () => {
    expect(publicEstimateSource).not.toMatch(/function\s+update/i);
  });

  it("has section controller hooks under estimate/", () => {
    for (const hookFile of REQUIRED_SECTION_HOOKS) {
      expect(estimateHookModulePaths).toContain(`./estimate/${hookFile}`);
    }
  });

  it("keeps rail and mobile volumes states accessible", () => {
    expect(estimateRailSource).toContain('aria-current={isActive ? "location" : undefined}');
    expect(estimateRailSource).toContain('aria-controls="public-estimate-mobile-volumes"');
    expect(publicCssSource).toContain("public estimate — audited interaction states");
    expect(publicCssSource).toContain(':disabled');
    expect(publicCssSource).toContain('[aria-pressed="true"]');
    expect(publicCssSource).toContain('[aria-current="location"]');
  });
});
