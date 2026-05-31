// @ts-nocheck — vitest node runtime reads public.css from disk
import { createRequire } from "module";
import { describe, expect, it } from "vitest";
import publicLandingSource from "./PublicLanding.tsx?raw";
import publicHeroSource from "./components/PublicHero.tsx?raw";
import publicServicesSectionSource from "./components/PublicServicesSection.tsx?raw";
import publicProjectsSectionSource from "./components/PublicProjectsSection.tsx?raw";
import publicContactsSectionSource from "./components/PublicContactsSection.tsx?raw";
import publicPricingSectionSource from "./components/PublicPricingSection.tsx?raw";
import publicProcessSectionSource from "./components/PublicProcessSection.tsx?raw";

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
  "usePublicServicesExplorer.ts",
  "usePublicProjectsShowcase.ts",
] as const;

const REQUIRED_HERO_SUBCOMPONENTS = [
  "PublicHeroActions.tsx",
  "PublicHeroFacts.tsx",
  "PublicHeroVisual.tsx",
] as const;

const REQUIRED_SERVICES_SUBCOMPONENTS = [
  "PublicServiceVisualIcon.tsx",
  "PublicServicesTabs.tsx",
  "PublicServiceDetail.tsx",
  "PublicServicesAccordion.tsx",
  "PublicServiceVisualList.tsx",
] as const;

const REQUIRED_PROJECTS_SUBCOMPONENTS = [
  "publicProjectModel.ts",
  "PublicProjectShowcaseInfo.tsx",
  "PublicProjectShowcaseMedia.tsx",
  "PublicProjectSwitcher.tsx",
  "PublicProjectScope.tsx",
] as const;

const REQUIRED_CONTACTS_SUBCOMPONENTS = [
  "PublicLeadForm.tsx",
  "PublicContactsSideCard.tsx",
] as const;

const REQUIRED_PRICING_SUBCOMPONENTS = [
  "PublicPricingCard.tsx",
  "PublicPricingCards.tsx",
] as const;

const REQUIRED_PROCESS_SUBCOMPONENTS = ["PublicProcessSteps.tsx"] as const;

const SECTION_SHELL_LINE_BUDGETS = {
  PublicServicesSection: { source: () => publicServicesSectionSource, maxLines: 80 },
  PublicProjectsSection: { source: () => publicProjectsSectionSource, maxLines: 90 },
  PublicContactsSection: { source: () => publicContactsSectionSource, maxLines: 80 },
  PublicHero: { source: () => publicHeroSource, maxLines: 90 },
  PublicPricingSection: { source: () => publicPricingSectionSource, maxLines: 60 },
  PublicProcessSection: { source: () => publicProcessSectionSource, maxLines: 70 },
} as const;

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
    "./hooks/usePublicServicesExplorer.ts",
    "./hooks/usePublicProjectsShowcase.ts",
  ]),
);

const heroSubcomponentModulePaths = Object.keys(import.meta.glob(["./components/hero/*"]));
const servicesSubcomponentModulePaths = Object.keys(import.meta.glob(["./components/services/*"]));
const projectsSubcomponentModulePaths = Object.keys(import.meta.glob(["./components/projects/*"]));
const contactsSubcomponentModulePaths = Object.keys(import.meta.glob(["./components/contacts/*"]));
const pricingSubcomponentModulePaths = Object.keys(import.meta.glob(["./components/pricing/*"]));
const processSubcomponentModulePaths = Object.keys(import.meta.glob(["./components/process/*"]));

function sourceLines(source: string): string[] {
  return source.split("\n");
}

function subcomponentPath(folder: string, fileName: string): string {
  return `./components/${folder}/${fileName}`;
}

describe("public landing architecture (L0)", () => {
  const lines = sourceLines(publicLandingSource);

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

describe("public landing architecture (L7 as-built)", () => {
  it("has hero subcomponents under components/hero/", () => {
    for (const fileName of REQUIRED_HERO_SUBCOMPONENTS) {
      expect(heroSubcomponentModulePaths).toContain(subcomponentPath("hero", fileName));
    }
  });

  it("has services subcomponents under components/services/", () => {
    for (const fileName of REQUIRED_SERVICES_SUBCOMPONENTS) {
      expect(servicesSubcomponentModulePaths).toContain(subcomponentPath("services", fileName));
    }
  });

  it("has projects subcomponents under components/projects/", () => {
    for (const fileName of REQUIRED_PROJECTS_SUBCOMPONENTS) {
      expect(projectsSubcomponentModulePaths).toContain(subcomponentPath("projects", fileName));
    }
  });

  it("has contacts subcomponents under components/contacts/", () => {
    for (const fileName of REQUIRED_CONTACTS_SUBCOMPONENTS) {
      expect(contactsSubcomponentModulePaths).toContain(subcomponentPath("contacts", fileName));
    }
  });

  it("has pricing subcomponents under components/pricing/", () => {
    for (const fileName of REQUIRED_PRICING_SUBCOMPONENTS) {
      expect(pricingSubcomponentModulePaths).toContain(subcomponentPath("pricing", fileName));
    }
  });

  it("has process subcomponents under components/process/", () => {
    for (const fileName of REQUIRED_PROCESS_SUBCOMPONENTS) {
      expect(processSubcomponentModulePaths).toContain(subcomponentPath("process", fileName));
    }
  });

  for (const [sectionName, { source, maxLines }] of Object.entries(SECTION_SHELL_LINE_BUDGETS)) {
    it(`keeps ${sectionName} section shell within line budget (≤ ${maxLines})`, () => {
      expect(sourceLines(source()).length).toBeLessThanOrEqual(maxLines);
    });
  }
});
