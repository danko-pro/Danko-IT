// @ts-nocheck - vitest node runtime reads CSS from disk.
import { createRequire } from "module";
import { describe, expect, it } from "vitest";
import publicLandingSource from "./PublicLanding.tsx?raw";
import publicApproachSource from "./components/redesign/PublicApproachSection.tsx?raw";
import publicContactsSource from "./components/redesign/PublicContactsSection.tsx?raw";
import publicFooterSource from "./components/redesign/PublicFooter.tsx?raw";
import publicHeaderSource from "./components/redesign/PublicHeader.tsx?raw";
import publicHeroSource from "./components/redesign/PublicHero.tsx?raw";
import publicMarqueeSource from "./components/redesign/PublicMarquee.tsx?raw";
import publicPricingSource from "./components/redesign/PublicPricingSection.tsx?raw";
import publicProjectsSource from "./components/redesign/PublicProjectsSection.tsx?raw";
import publicRevealObserverSource from "./components/redesign/PublicRevealObserver.tsx?raw";

const require = createRequire(import.meta.url);
const publicRedesignCssSource = require("fs").readFileSync(
  require("path").join(
    require("path").dirname(require("url").fileURLToPath(import.meta.url)),
    "public-redesign.css",
  ),
  "utf8",
) as string;

const REQUIRED_REDESIGN_COMPONENTS = [
  "PublicHeader.tsx",
  "PublicHero.tsx",
  "PublicMarquee.tsx",
  "PublicProjectsSection.tsx",
  "PublicApproachSection.tsx",
  "PublicPricingSection.tsx",
  "PublicContactsSection.tsx",
  "PublicFooter.tsx",
  "PublicRevealObserver.tsx",
] as const;

const REQUIRED_RETAINED_MODULES = [
  "./hooks/useLeadFormDraft.ts",
  "./hooks/usePublicHeaderVisibility.ts",
  "./hooks/usePublicProjectsShowcase.ts",
  "./components/projects/publicProjectModel.ts",
] as const;

const REQUIRED_CSS_MARKERS = [
  "layout helpers",
  "header",
  "hero",
  "marquee",
  "projects",
  "approach",
  "pricing",
  "conversion",
  "footer",
  "responsive",
] as const;

const SECTION_LINE_BUDGETS = {
  PublicHeader: { source: () => publicHeaderSource, maxLines: 80 },
  PublicHero: { source: () => publicHeroSource, maxLines: 60 },
  PublicMarquee: { source: () => publicMarqueeSource, maxLines: 35 },
  PublicProjectsSection: { source: () => publicProjectsSource, maxLines: 130 },
  PublicApproachSection: { source: () => publicApproachSource, maxLines: 70 },
  PublicPricingSection: { source: () => publicPricingSource, maxLines: 85 },
  PublicContactsSection: { source: () => publicContactsSource, maxLines: 210 },
  PublicFooter: { source: () => publicFooterSource, maxLines: 60 },
  PublicRevealObserver: { source: () => publicRevealObserverSource, maxLines: 45 },
} as const;

const redesignComponentModulePaths = Object.keys(import.meta.glob(["./components/redesign/*.tsx"]));
const retainedModulePaths = Object.keys(
  import.meta.glob([
    "./hooks/useLeadFormDraft.ts",
    "./hooks/usePublicHeaderVisibility.ts",
    "./hooks/usePublicProjectsShowcase.ts",
    "./components/projects/publicProjectModel.ts",
  ]),
);

function sourceLines(source: string): string[] {
  return source.split("\n");
}

describe("public landing redesign architecture", () => {
  it("keeps PublicLanding.tsx as a thin composition shell", () => {
    expect(sourceLines(publicLandingSource).length).toBeLessThanOrEqual(45);
    expect(publicLandingSource).toContain('import "./public-redesign.css"');
    expect(publicLandingSource).not.toMatch(/\buseState\b/);
    expect(publicLandingSource).not.toMatch(/\buseEffect\b/);
    expect(publicLandingSource).not.toMatch(/\buseMemo\b/);
    expect(publicLandingSource).not.toMatch(/\buseCallback\b/);
  });

  it("has the complete redesign component set under components/redesign", () => {
    for (const componentFile of REQUIRED_REDESIGN_COMPONENTS) {
      expect(redesignComponentModulePaths).toContain(`./components/redesign/${componentFile}`);
      expect(publicLandingSource).toContain(componentFile.replace(".tsx", ""));
    }
  });

  it("keeps the runtime modules reused by the redesign", () => {
    for (const modulePath of REQUIRED_RETAINED_MODULES) {
      expect(retainedModulePaths).toContain(modulePath);
    }
  });

  it("keeps production lead submission wired through useLeadFormDraft", () => {
    expect(publicContactsSource).toContain("useLeadFormDraft");
    expect(publicContactsSource).toContain('name="website"');
    expect(publicContactsSource).toContain('name="personalDataConsent"');
    expect(publicContactsSource).toContain('href="/privacy"');
  });

  it("keeps header and gallery behavior wired through existing hooks", () => {
    expect(publicHeaderSource).toContain("usePublicHeaderVisibility");
    expect(publicHeaderSource).toContain('href="/estimate"');
    expect(publicProjectsSource).toContain("usePublicProjectsShowcase");
    expect(publicProjectsSource).toContain("publicProjectModel");
  });

  it("keeps public-redesign.css section marker comments", () => {
    const missingMarkers = REQUIRED_CSS_MARKERS.filter((marker) => !publicRedesignCssSource.includes(marker));

    expect(missingMarkers).toEqual([]);
  });

  it("keeps reveal content visible by default when JS or screenshot capture does not scroll", () => {
    expect(publicRedesignCssSource).toContain(".dk-reveal {\n  opacity: 1;");
    expect(publicRevealObserverSource).toContain("IntersectionObserver");
  });

  it("keeps project gallery shrink-safe on narrow mobile screens", () => {
    expect(publicRedesignCssSource).toContain(".dk-media {\n  display: grid;\n  gap: 0.7rem;\n  min-width: 0;");
    expect(publicRedesignCssSource).toContain(".dk-proj-info {\n  display: flex;\n  flex-direction: column;");
    expect(publicRedesignCssSource).toContain("  min-width: 0;\n}");
    expect(publicRedesignCssSource).toContain("overflow-x: auto;");
    expect(publicRedesignCssSource).toContain("grid-auto-columns: minmax(64px, 74px);");
    expect(publicRedesignCssSource).toContain("height: clamp(220px, 72vw, 320px);");
  });

  for (const [sectionName, { source, maxLines }] of Object.entries(SECTION_LINE_BUDGETS)) {
    it(`keeps ${sectionName} within line budget`, () => {
      expect(sourceLines(source()).length).toBeLessThanOrEqual(maxLines);
    });
  }
});
