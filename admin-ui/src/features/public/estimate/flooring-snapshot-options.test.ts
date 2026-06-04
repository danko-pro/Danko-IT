import { describe, expect, it, vi } from "vitest";
import * as flooringSnapshotModule from "../public-flooring-snapshot";
import {
  FALLBACK_FLOORING_COVERING_OPTIONS,
  getDefaultFlooringCovering,
  getDefaultFlooringLayout,
  getDefaultFlooringPreparation,
  getFlooringCoveringOptions,
  getFlooringLayoutOptions,
  getFlooringPreparationOptions,
} from "./flooring-snapshot-options";

const minimalSpecLine = {
  code: "line",
  title: "Line",
  category: "materials" as const,
  basis: "area" as const,
  unit: "m2",
  quantityPerBasis: 1,
  unitPrice: 1,
};

function packageBackedCovering(code: string, title: string) {
  return {
    code,
    title,
    materialPricePerM2: 1,
    baseWastePercent: 0,
    underlayPricePerM2: 0,
    adhesivePricePerM2: 0,
    primerPricePerM2: 0,
    svpPricePerM2: 0,
    groutPricePerM2: 0,
    toolConsumablesPerM2: 0,
    specLines: [minimalSpecLine],
  };
}

describe("flooring snapshot options", () => {
  it("dropdown options come only from package-backed snapshot rows", () => {
    const loadSpy = vi.spyOn(flooringSnapshotModule, "loadFlooringSnapshot").mockReturnValue({
      version: "flooring-v2",
      coverings: [
        packageBackedCovering("with_package", "С пакетом"),
        {
          code: "without_package",
          title: "Без пакета",
          materialPricePerM2: 1,
          baseWastePercent: 0,
          underlayPricePerM2: 0,
          adhesivePricePerM2: 0,
          primerPricePerM2: 0,
          svpPricePerM2: 0,
          groutPricePerM2: 0,
          toolConsumablesPerM2: 0,
          specLines: [],
        },
      ],
      preparations: [
        {
          code: "primer",
          title: "Грунт",
          laborPricePerM2: 1,
          materialPricePerM2: 0,
          specLines: [minimalSpecLine],
        },
        { code: "no_spec", title: "Без spec", laborPricePerM2: 0, materialPricePerM2: 0, specLines: [] },
      ],
      layouts: [
        { code: "straight", title: "Прямая", laborFactor: 1, additionalWastePercent: 0, specLines: [minimalSpecLine] },
        { code: "no_layout_spec", title: "Без spec", laborFactor: 1, additionalWastePercent: 0, specLines: [] },
      ],
      plinthTypes: [{ code: "none", title: "Без", materialPricePerMeter: 0, laborPricePerMeter: 0, factor: 1 }],
      globalAddons: { thresholdPrice: 0, demolitionPricePerM2: 0 },
    });

    expect(getFlooringCoveringOptions().map((option) => option.value)).toEqual(["with_package"]);
    expect(getFlooringPreparationOptions().map((option) => option.value)).toEqual(["primer"]);
    expect(getFlooringLayoutOptions().map((option) => option.value)).toEqual(["straight"]);

    loadSpy.mockRestore();
  });

  it("includes custom active coverings from snapshot when package-backed", () => {
    const loadSpy = vi.spyOn(flooringSnapshotModule, "loadFlooringSnapshot").mockReturnValue({
      version: "flooring-v2",
      coverings: [
        packageBackedCovering("laminate", "Ламинат"),
        packageBackedCovering("custom_covering", "Кастомное покрытие"),
      ],
      preparations: [
        {
          code: "none",
          title: "Без",
          laborPricePerM2: 0,
          materialPricePerM2: 0,
          specLines: [minimalSpecLine],
        },
      ],
      layouts: [
        { code: "straight", title: "Прямая", laborFactor: 1, additionalWastePercent: 0, specLines: [minimalSpecLine] },
      ],
      plinthTypes: [{ code: "none", title: "Без", materialPricePerMeter: 0, laborPricePerMeter: 0, factor: 1 }],
      globalAddons: { thresholdPrice: 0, demolitionPricePerM2: 0 },
    });

    const options = getFlooringCoveringOptions();
    const codes = options.map((option) => option.value);

    expect(codes).toContain("custom_covering");
    expect(options.find((option) => option.value === "custom_covering")?.label).toBe("Кастомное покрытие");

    loadSpy.mockRestore();
  });

  it("returns empty covering options when snapshot load fails (package-first default)", () => {
    const loadSpy = vi.spyOn(flooringSnapshotModule, "loadFlooringSnapshot").mockImplementation(() => {
      throw new Error("invalid snapshot");
    });

    expect(getFlooringCoveringOptions()).toEqual([]);

    loadSpy.mockRestore();
  });

  it("flooring-v1 uses hardcoded covering options when snapshot is empty", () => {
    const loadSpy = vi.spyOn(flooringSnapshotModule, "loadFlooringSnapshot").mockReturnValue({
      version: "flooring-v1",
      coverings: [],
      preparations: [],
      layouts: [],
      plinthTypes: [{ code: "none", title: "Без", materialPricePerMeter: 0, laborPricePerMeter: 0, factor: 1 }],
      globalAddons: { thresholdPrice: 0, demolitionPricePerM2: 0 },
    });

    expect(getFlooringCoveringOptions()).toEqual(FALLBACK_FLOORING_COVERING_OPTIONS);

    loadSpy.mockRestore();
  });

  it("flooring-v2 empty package-backed sections yield empty options", () => {
    const loadSpy = vi.spyOn(flooringSnapshotModule, "loadFlooringSnapshot").mockReturnValue({
      version: "flooring-v2",
      coverings: [],
      preparations: [],
      layouts: [],
      plinthTypes: [{ code: "none", title: "Без", materialPricePerMeter: 0, laborPricePerMeter: 0, factor: 1 }],
      globalAddons: { thresholdPrice: 0, demolitionPricePerM2: 0 },
    });

    expect(getFlooringCoveringOptions()).toEqual([]);
    expect(getFlooringPreparationOptions()).toEqual([]);
    expect(getFlooringLayoutOptions()).toEqual([]);

    loadSpy.mockRestore();
  });

  it("uses first available covering when room heuristic is missing from snapshot", () => {
    const loadSpy = vi.spyOn(flooringSnapshotModule, "loadFlooringSnapshot").mockReturnValue({
      version: "flooring-v2",
      coverings: [packageBackedCovering("custom_only", "Только кастом")],
      preparations: [
        {
          code: "primer",
          title: "Грунт",
          laborPricePerM2: 1,
          materialPricePerM2: 0,
          specLines: [minimalSpecLine],
        },
      ],
      layouts: [
        { code: "straight", title: "Прямая", laborFactor: 1, additionalWastePercent: 0, specLines: [minimalSpecLine] },
      ],
      plinthTypes: [{ code: "none", title: "Без", materialPricePerMeter: 0, laborPricePerMeter: 0, factor: 1 }],
      globalAddons: { thresholdPrice: 0, demolitionPricePerM2: 0 },
    });

    expect(getDefaultFlooringCovering("kitchen")).toBe("custom_only");

    loadSpy.mockRestore();
  });

  it("picks large format layout for tile-like custom covering when available", () => {
    const loadSpy = vi.spyOn(flooringSnapshotModule, "loadFlooringSnapshot").mockReturnValue({
      version: "flooring-v2",
      coverings: [packageBackedCovering("keram_test", "Керамика")],
      preparations: [
        { code: "none", title: "Без", laborPricePerM2: 0, materialPricePerM2: 0, specLines: [minimalSpecLine] },
      ],
      layouts: [
        { code: "straight", title: "Прямая", laborFactor: 1, additionalWastePercent: 0, specLines: [minimalSpecLine] },
        {
          code: "large_format_straight",
          title: "Крупный",
          laborFactor: 1,
          additionalWastePercent: 0,
          specLines: [minimalSpecLine],
        },
      ],
      plinthTypes: [{ code: "none", title: "Без", materialPricePerMeter: 0, laborPricePerMeter: 0, factor: 1 }],
      globalAddons: { thresholdPrice: 0, demolitionPricePerM2: 0 },
    });

    expect(getDefaultFlooringLayout("keram_test")).toBe("large_format_straight");
    expect(getDefaultFlooringPreparation("bathroom")).toBe("none");

    loadSpy.mockRestore();
  });

  it("falls back to first layout when preferred layout code is absent", () => {
    const loadSpy = vi.spyOn(flooringSnapshotModule, "loadFlooringSnapshot").mockReturnValue({
      version: "flooring-v2",
      coverings: [packageBackedCovering("laminate", "Ламинат")],
      preparations: [
        {
          code: "primer",
          title: "Грунт",
          laborPricePerM2: 1,
          materialPricePerM2: 0,
          specLines: [minimalSpecLine],
        },
      ],
      layouts: [
        {
          code: "custom_layout",
          title: "Кастом",
          laborFactor: 1,
          additionalWastePercent: 0,
          specLines: [minimalSpecLine],
        },
      ],
      plinthTypes: [{ code: "none", title: "Без", materialPricePerMeter: 0, laborPricePerMeter: 0, factor: 1 }],
      globalAddons: { thresholdPrice: 0, demolitionPricePerM2: 0 },
    });

    expect(getDefaultFlooringLayout("laminate")).toBe("custom_layout");
    expect(getFlooringLayoutOptions().map((option) => option.value)).toEqual(["custom_layout"]);

    loadSpy.mockRestore();
  });
});
