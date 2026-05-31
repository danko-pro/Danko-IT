// @ts-nocheck — vitest node runtime reads public.css from disk
import { createRequire } from "module";
import { describe, expect, it } from "vitest";
import publicLandingSource from "./PublicLanding.tsx?raw";

const require = createRequire(import.meta.url);
const publicCssSource = require("fs").readFileSync(
  require("path").join(require("path").dirname(require("url").fileURLToPath(import.meta.url)), "public.css"),
  "utf8",
) as string;

const REQUIRED_LANDING_COMPONENTS = [
  "PublicHeader.tsx",
  "PublicHero.tsx",
  "PublicServicesSection.tsx",
  "PublicPricingSection.tsx",
  "PublicProjectsSection.tsx",
  "PublicProcessSection.tsx",
  "PublicContactsSection.tsx",
] as const;

const REQUIRED_LANDING_HOOKS = [
  "usePublicHeaderVisibility.ts",
  "usePublicContourRoute.ts",
  "usePublicProcessSteps.ts",
  "useLeadFormDraft.ts",
] as const;

const REQUIRED_CSS_MARKERS = [
  "public-base",
  "public-header",
  "public-hero",
  "public-services",
  "public-pricing",
  "public-process",
  "public-contacts",
  "public-estimate-ux",
  "public-responsive",
] as const;

const landingComponentModulePaths = Object.keys(
  import.meta.glob([
    "./components/PublicHeader.tsx",
    "./components/PublicHero.tsx",
    "./components/PublicServicesSection.tsx",
    "./components/PublicPricingSection.tsx",
    "./components/PublicProjectsSection.tsx",
    "./components/PublicProcessSection.tsx",
    "./components/PublicContactsSection.tsx",
  ]),
);

const landingHookModulePaths = Object.keys(
  import.meta.glob([
    "./hooks/usePublicHeaderVisibility.ts",
    "./hooks/usePublicContourRoute.ts",
    "./hooks/usePublicProcessSteps.ts",
    "./hooks/useLeadFormDraft.ts",
  ]),
);

function publicLandingLines(source: string): string[] {
  return source.split("\n");
}

describe("public landing architecture (L0)", () => {
  const lines = publicLandingLines(publicLandingSource);

  it("keeps PublicLanding.tsx shell within line budget", () => {
    expect(lines.length).toBeLessThanOrEqual(80);
  });

  it("does not use React state/effect hooks in PublicLanding.tsx", () => {
    expect(publicLandingSource).not.toMatch(/\buseState\b/);
    expect(publicLandingSource).not.toMatch(/\buseEffect\b/);
    expect(publicLandingSource).not.toMatch(/\buseMemo\b/);
    expect(publicLandingSource).not.toMatch(/\buseCallback\b/);
  });

  it("has landing section components under components/", () => {
    for (const componentFile of REQUIRED_LANDING_COMPONENTS) {
      expect(landingComponentModulePaths).toContain(`./components/${componentFile}`);
    }
  });

  it("has landing interactivity hooks under hooks/", () => {
    for (const hookFile of REQUIRED_LANDING_HOOKS) {
      expect(landingHookModulePaths).toContain(`./hooks/${hookFile}`);
    }
  });

  it("keeps public.css section marker comments", () => {
    const missingMarkers = REQUIRED_CSS_MARKERS.filter(
      (marker) => !publicCssSource.includes(marker),
    );

    expect(missingMarkers).toEqual([]);
  });
});
