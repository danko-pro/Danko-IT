import { describe, expect, it, vi } from "vitest";
import { createEmptyEstimateResult, createEstimateSection } from "../public-estimate-model";
import type { FlooringCalculationResult } from "../public-estimate-flooring";
import type { PlumbingCalculationResult, PlumbingOptions } from "../public-estimate-plumbing";
import * as plumbingModule from "../public-estimate-plumbing";
import {
  buildEstimateSpecModalData,
  buildPlumbingSpecExpansionOptions,
  mapSectionsForSpec,
} from "./spec";

function emptyFlooringResult(
  overrides: Partial<FlooringCalculationResult> = {},
): Pick<FlooringCalculationResult, "specificationSection" | "procurementLines"> {
  const section = createEstimateSection("flooring", "Полы", []);
  return {
    specificationSection: section,
    procurementLines: [],
    ...overrides,
  };
}

function defaultPlumbingOptions(overrides: Partial<PlumbingOptions> = {}): PlumbingOptions {
  return {
    includeBathroomSet: true,
    includeBath: true,
    includeHygienicShower: true,
    includeElectricTowelRail: false,
    includeKitchenSink: true,
    kitchenSinkPackageLevel: "b",
    includeDishwasherOutput: true,
    dishwasherPackageLevel: "b",
    includeShowerZone: false,
    showerPackageLevel: "b",
    includeInstallRelocation: false,
    includeWasherOutput: true,
    includeWaterNode: true,
    includeLeakProtection: false,
    ...overrides,
  };
}

function emptyPlumbingResult(overrides: Partial<PlumbingCalculationResult> = {}): PlumbingCalculationResult {
  return {
    bathroomCount: 1,
    hasKitchen: true,
    hasPlumbingRooms: true,
    coldWaterPoints: 0,
    hotWaterPoints: 0,
    sewerPoints: 0,
    fixtureCount: 0,
    worksTotal: 0,
    materialsTotal: 0,
    equipmentTotal: 0,
    consumablesTotal: 0,
    total: 0,
    section: createEstimateSection("plumbing", "Сантехника", []),
    ...overrides,
  };
}

describe("buildEstimateSpecModalData", () => {
  it("возвращает null, если modal закрыт", () => {
    const result = buildEstimateSpecModalData({
      specModal: null,
      allEstimateSections: [],
      estimateResult: createEmptyEstimateResult(),
      plumbingOptions: defaultPlumbingOptions(),
      plumbingResult: emptyPlumbingResult(),
      flooringResult: emptyFlooringResult(),
    });

    expect(result).toBeNull();
  });

  it("для полной спецификации возвращает только видимые разделы estimateResult", () => {
    const wallsSection = createEstimateSection("walls", "Стены", []);
    const plumbingSection = createEstimateSection("plumbing", "Сантехника", []);
    const allEstimateSections = [wallsSection, plumbingSection];

    const result = buildEstimateSpecModalData({
      specModal: { kind: "full" },
      allEstimateSections,
      estimateResult: {
        sections: [wallsSection],
        totals: createEmptyEstimateResult().totals,
      },
      plumbingOptions: defaultPlumbingOptions(),
      plumbingResult: emptyPlumbingResult(),
      flooringResult: emptyFlooringResult(),
    });

    expect(result).toEqual({
      title: "Полная спецификация",
      subtitle: "Все разделы текущей сметы по позициям",
      sections: [wallsSection],
      procurementLines: [],
    });
  });

  it("для flooring section modal передаёт procurementLines в данные экспорта", () => {
    const flooringSection = createEstimateSection("flooring", "Полы", []);
    const procurementLines = [
      {
        aggregationKey: "svp",
        code: "svp",
        title: "СВП",
        category: "consumables" as const,
        rawQuantity: 300,
        rawUnit: "pcs",
        purchaseMode: "package" as const,
        purchaseQuantity: 1,
        purchaseUnit: "уп.",
        unitPrice: 1.2,
        packageSize: 500,
        packagePrice: 600,
        total: 600,
      },
    ];

    const result = buildEstimateSpecModalData({
      specModal: { kind: "section", sectionId: "flooring" },
      allEstimateSections: [flooringSection],
      estimateResult: createEmptyEstimateResult(),
      plumbingOptions: defaultPlumbingOptions(),
      plumbingResult: emptyPlumbingResult(),
      flooringResult: emptyFlooringResult({ procurementLines }),
    });

    expect(result?.procurementLines).toEqual(procurementLines);
  });

  it("для не-flooring section modal не передаёт procurementLines", () => {
    const wallsSection = createEstimateSection("walls", "Стены", [], "Описание стен");
    const plumbingSection = createEstimateSection("plumbing", "Сантехника", []);

    const result = buildEstimateSpecModalData({
      specModal: { kind: "section", sectionId: "walls" },
      allEstimateSections: [wallsSection, plumbingSection],
      estimateResult: createEmptyEstimateResult(),
      plumbingOptions: defaultPlumbingOptions(),
      plumbingResult: emptyPlumbingResult(),
      flooringResult: emptyFlooringResult(),
    });

    expect(result).toEqual({
      title: "Стены",
      subtitle: "Описание стен",
      sections: [wallsSection],
      procurementLines: undefined,
    });
  });

  it("возвращает null, если section modal ссылается на неизвестный раздел", () => {
    const result = buildEstimateSpecModalData({
      specModal: { kind: "section", sectionId: "walls" },
      allEstimateSections: [],
      estimateResult: createEmptyEstimateResult(),
      plumbingOptions: defaultPlumbingOptions(),
      plumbingResult: emptyPlumbingResult(),
      flooringResult: emptyFlooringResult(),
    });

    expect(result).toBeNull();
  });
});

describe("buildPlumbingSpecExpansionOptions", () => {
  it("собирает A8-опции kitchen/dishwasher/shower/legacy по plumbingOptions и plumbingResult", () => {
    const plumbingOptions = defaultPlumbingOptions({
      includeKitchenSink: true,
      kitchenSinkPackageLevel: "a",
      includeDishwasherOutput: true,
      dishwasherPackageLevel: "c",
      includeShowerZone: true,
      showerPackageLevel: "b",
      includeInstallRelocation: true,
      includeBath: true,
      includeBathroomSet: false,
      includeHygienicShower: false,
      includeElectricTowelRail: true,
      includeWasherOutput: false,
      includeWaterNode: true,
      includeLeakProtection: true,
    });
    const plumbingResult = emptyPlumbingResult({
      bathroomCount: 2,
      hasKitchen: true,
      hasPlumbingRooms: true,
    });

    expect(buildPlumbingSpecExpansionOptions(plumbingOptions, plumbingResult)).toEqual({
      kitchenSinkPackageLevel: "a",
      includeKitchenSink: true,
      dishwasherPackageLevel: "c",
      includeDishwasher: true,
      showerPackageLevel: "b",
      includeShower: true,
      includeInstallRelocation: true,
      includeBathroomSet: false,
      includeBath: false,
      includeHygienicShower: false,
      includeElectricTowelRail: true,
      includeWasherOutput: false,
      includeWaterNode: true,
      includeLeakProtection: true,
    });
  });
});

describe("mapSectionsForSpec", () => {
  it("разворачивает plumbing через expandPlumbingSectionForSpec с текущими A8-опциями", () => {
    const plumbingSection = createEstimateSection("plumbing", "Сантехника", []);
    const wallsSection = createEstimateSection("walls", "Стены", []);
    const plumbingOptions = defaultPlumbingOptions({
      includeKitchenSink: true,
      kitchenSinkPackageLevel: "b",
      includeDishwasherOutput: false,
    });
    const plumbingResult = emptyPlumbingResult({ hasKitchen: true, bathroomCount: 0 });
    const expandedSection = { ...plumbingSection, specIntro: "disclaimer" };
    const expandSpy = vi
      .spyOn(plumbingModule, "expandPlumbingSectionForSpec")
      .mockReturnValue(expandedSection);

    const result = mapSectionsForSpec(
      [wallsSection, plumbingSection],
      plumbingOptions,
      plumbingResult,
      emptyFlooringResult(),
    );

    expect(result).toEqual([wallsSection, expandedSection]);
    expect(expandSpy).toHaveBeenCalledOnce();
    expect(expandSpy).toHaveBeenCalledWith(plumbingSection, {
      kitchenSinkPackageLevel: "b",
      includeKitchenSink: true,
      dishwasherPackageLevel: "b",
      includeDishwasher: false,
      showerPackageLevel: "b",
      includeShower: false,
      includeInstallRelocation: false,
      includeBathroomSet: false,
      includeBath: false,
      includeHygienicShower: false,
      includeElectricTowelRail: false,
      includeWasherOutput: true,
      includeWaterNode: true,
      includeLeakProtection: false,
    });

    expandSpy.mockRestore();
  });

  it("разворачивает flooring через specificationSection", () => {
    const flatSection = createEstimateSection("flooring", "Полы", [
      {
        id: "flooring-material-room",
        sectionId: "flooring",
        title: "Flat",
        category: "materials",
        quantity: 1,
        unit: "m2",
        unitPrice: 100,
        total: 100,
        isIncluded: true,
      },
    ]);
    const specSection = createEstimateSection("flooring", "Полы", [
      {
        id: "flooring-spec-line",
        sectionId: "flooring",
        title: "Spec",
        category: "materials",
        quantity: 16,
        unit: "m2",
        unitPrice: 930,
        total: 14880,
        isIncluded: true,
      },
    ]);
    const wallsSection = createEstimateSection("walls", "Стены", []);

    const result = mapSectionsForSpec(
      [wallsSection, flatSection],
      defaultPlumbingOptions(),
      emptyPlumbingResult(),
      { specificationSection: specSection },
    );

    expect(result[0]).toBe(wallsSection);
    expect(result[1]?.items[0]?.id).toBe("flooring-spec-line");
    expect(result[1]?.totals.total).toBe(flatSection.totals.total);
  });
});
