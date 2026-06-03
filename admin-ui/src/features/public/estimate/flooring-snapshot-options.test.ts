import { describe, expect, it, vi } from "vitest";
import * as flooringSnapshotModule from "../public-flooring-snapshot";
import {
  FALLBACK_FLOORING_COVERING_OPTIONS,
  getDefaultFlooringCovering,
  getDefaultFlooringLayout,
  getDefaultFlooringPreparation,
  getFlooringCoveringOptions,
  getFlooringLayoutOptions,
} from "./flooring-snapshot-options";

describe("flooring snapshot options", () => {
  it("includes custom active coverings from snapshot", () => {
    const loadSpy = vi.spyOn(flooringSnapshotModule, "loadFlooringSnapshot").mockReturnValue({
      version: "flooring-v2",
      coverings: [
        ...FALLBACK_FLOORING_COVERING_OPTIONS.map((option) => ({
          code: option.value,
          title: option.label,
          materialPricePerM2: 1,
          baseWastePercent: 0,
          underlayPricePerM2: 0,
          adhesivePricePerM2: 0,
          primerPricePerM2: 0,
          svpPricePerM2: 0,
          groutPricePerM2: 0,
          toolConsumablesPerM2: 0,
        })),
        {
          code: "custom_covering",
          title: "Кастомное покрытие",
          materialPricePerM2: 0,
          baseWastePercent: 0,
          underlayPricePerM2: 0,
          adhesivePricePerM2: 0,
          primerPricePerM2: 0,
          svpPricePerM2: 0,
          groutPricePerM2: 0,
          toolConsumablesPerM2: 0,
        },
      ],
      preparations: [{ code: "none", title: "Без", laborPricePerM2: 0, materialPricePerM2: 0 }],
      layouts: [{ code: "straight", title: "Прямая", laborFactor: 1, additionalWastePercent: 0 }],
      plinthTypes: [{ code: "none", title: "Без", materialPricePerMeter: 0, laborPricePerMeter: 0, factor: 1 }],
      globalAddons: { thresholdPrice: 0, demolitionPricePerM2: 0 },
    });

    const options = getFlooringCoveringOptions();
    const codes = options.map((option) => option.value);

    expect(codes).toContain("custom_covering");
    expect(options.find((option) => option.value === "custom_covering")?.label).toBe("Кастомное покрытие");

    loadSpy.mockRestore();
  });

  it("falls back to hardcoded covering options when snapshot load fails", () => {
    const loadSpy = vi.spyOn(flooringSnapshotModule, "loadFlooringSnapshot").mockImplementation(() => {
      throw new Error("invalid snapshot");
    });

    expect(getFlooringCoveringOptions()).toEqual(FALLBACK_FLOORING_COVERING_OPTIONS);

    loadSpy.mockRestore();
  });

  it("uses first available covering when room heuristic is missing from snapshot", () => {
    const loadSpy = vi.spyOn(flooringSnapshotModule, "loadFlooringSnapshot").mockReturnValue({
      version: "flooring-v2",
      coverings: [{ code: "custom_only", title: "Только кастом", materialPricePerM2: 1, baseWastePercent: 0, underlayPricePerM2: 0, adhesivePricePerM2: 0, primerPricePerM2: 0, svpPricePerM2: 0, groutPricePerM2: 0, toolConsumablesPerM2: 0 }],
      preparations: [{ code: "primer", title: "Грунт", laborPricePerM2: 1, materialPricePerM2: 0 }],
      layouts: [{ code: "straight", title: "Прямая", laborFactor: 1, additionalWastePercent: 0 }],
      plinthTypes: [{ code: "none", title: "Без", materialPricePerMeter: 0, laborPricePerMeter: 0, factor: 1 }],
      globalAddons: { thresholdPrice: 0, demolitionPricePerM2: 0 },
    });

    expect(getDefaultFlooringCovering("kitchen")).toBe("custom_only");

    loadSpy.mockRestore();
  });

  it("picks large format layout for tile-like custom covering when available", () => {
    const loadSpy = vi.spyOn(flooringSnapshotModule, "loadFlooringSnapshot").mockReturnValue({
      version: "flooring-v2",
      coverings: [{ code: "keram_test", title: "Керамика", materialPricePerM2: 1, baseWastePercent: 0, underlayPricePerM2: 0, adhesivePricePerM2: 0, primerPricePerM2: 0, svpPricePerM2: 0, groutPricePerM2: 0, toolConsumablesPerM2: 0 }],
      preparations: [{ code: "none", title: "Без", laborPricePerM2: 0, materialPricePerM2: 0 }],
      layouts: [
        { code: "straight", title: "Прямая", laborFactor: 1, additionalWastePercent: 0 },
        { code: "large_format_straight", title: "Крупный", laborFactor: 1, additionalWastePercent: 0 },
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
      coverings: [{ code: "laminate", title: "Ламинат", materialPricePerM2: 1, baseWastePercent: 0, underlayPricePerM2: 0, adhesivePricePerM2: 0, primerPricePerM2: 0, svpPricePerM2: 0, groutPricePerM2: 0, toolConsumablesPerM2: 0 }],
      preparations: [{ code: "primer", title: "Грунт", laborPricePerM2: 1, materialPricePerM2: 0 }],
      layouts: [{ code: "custom_layout", title: "Кастом", laborFactor: 1, additionalWastePercent: 0 }],
      plinthTypes: [{ code: "none", title: "Без", materialPricePerMeter: 0, laborPricePerMeter: 0, factor: 1 }],
      globalAddons: { thresholdPrice: 0, demolitionPricePerM2: 0 },
    });

    expect(getDefaultFlooringLayout("laminate")).toBe("custom_layout");
    expect(getFlooringLayoutOptions().map((option) => option.value)).toEqual(["custom_layout"]);

    loadSpy.mockRestore();
  });
});
