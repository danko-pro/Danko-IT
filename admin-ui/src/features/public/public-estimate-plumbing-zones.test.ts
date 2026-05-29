import { describe, expect, it } from "vitest";
import {
  calculateDishwasherZone,
  calculateKitchenSinkZone,
  calculateKitchenSinkZoneTotal,
  expandPlumbingSectionForSpec,
  getKitchenSinkZonePackageTotal,
  getKitchenSinkZoneSpecItems,
  isSinkZoneContaminantLine,
  KITCHEN_SINK_ZONE_BASE_ATOMIC_IDS,
  KITCHEN_SINK_ZONE_PACKAGE_ATOMIC_IDS,
  sumKitchenSinkZoneSpecLines,
} from "./public-estimate-plumbing-zones";
import { calculatePlumbing } from "./public-estimate-plumbing";

const KITCHEN_ROOM = [{ roomId: "kitchen", roomName: "Кухня", roomType: "kitchen" as const, area: 12 }];

const PLUMBING_SINK_ONLY_OPTIONS = {
  includeBathroomSet: false,
  includeBath: false,
  includeHygienicShower: false,
  includeElectricTowelRail: false,
  includeKitchenSink: true,
  kitchenSinkPackageLevel: "c" as const,
  includeDishwasherOutput: false,
  dishwasherPackageLevel: "b" as const,
  includeWasherOutput: false,
  includeWaterNode: false,
  includeLeakProtection: false,
};

describe("calculateKitchenSinkZone", () => {
  it("считает базу, пакет B и резерв 6,4% по эталону catalog-editor", () => {
    const result = calculateKitchenSinkZone("b");

    expect(result.baseTotal).toBe(24612);
    expect(result.packageTotal).toBe(16300);
    expect(result.subtotal).toBe(40912);
    expect(result.riskAmount).toBe(2618);
    expect(result.total).toBe(43530);
    expect(result.sectionItem.id).toBe("kitchen-sink-zone");
    expect(result.sectionItem.total).toBe(43530);
    expect(result.specItems).toHaveLength(13);
  });

  it("даёт разные итоги для пакетов C и A", () => {
    const packageC = getKitchenSinkZonePackageTotal("c");
    const packageA = getKitchenSinkZonePackageTotal("a");

    expect(packageC).toBeLessThan(getKitchenSinkZonePackageTotal("b"));
    expect(packageA).toBeGreaterThan(getKitchenSinkZonePackageTotal("b"));
    expect(packageC).toBe(39487);
    expect(packageA).toBe(54915);
  });

  it("пакет C: subtotal 37112 (база 24612 + смеситель 6000 + мойка 6500)", () => {
    const result = calculateKitchenSinkZone("c");

    expect(result.baseTotal).toBe(24612);
    expect(result.packageTotal).toBe(12500);
    expect(result.subtotal).toBe(37112);
    expect(result.riskAmount).toBe(2375);
    expect(result.total).toBe(39487);
    expect(calculateKitchenSinkZoneTotal("c")).toBe(result.total);
  });
});

describe("getKitchenSinkZoneSpecItems", () => {
  it("возвращает 11 базовых атомов + 2 позиции пакета B без строки резерва", () => {
    const specItems = getKitchenSinkZoneSpecItems("b");

    expect(specItems).toHaveLength(13);
    expect(specItems.some((item) => item.title.toLowerCase().includes("резерв"))).toBe(false);
    expect(sumKitchenSinkZoneSpecLines(specItems)).toBe(40912);
    expect(getKitchenSinkZonePackageTotal("b")).toBe(43530);
    expect(specItems.some((item) => item.title === "Смеситель кухонный — пакет B")).toBe(true);
    expect(specItems.some((item) => item.title === "Штробление под трубу")).toBe(true);
  });

  it("для пакета B включает мойку из состава пакета (как в catalog-editor)", () => {
    const specItems = getKitchenSinkZoneSpecItems("b");
    const sink = specItems.find((item) => item.title === "Мойка кухонная — пакет B");

    expect(sink).toBeDefined();
    expect(sink?.total).toBe(0);
    expect(sink?.note).toBe("уточняется");
  });

  it("пакет C: мойка 6500, смеситель 6000, без ПММ/dishwasher", () => {
    const specItems = getKitchenSinkZoneSpecItems("c");
    const faucet = specItems.find((item) => item.title === "Смеситель для мойки — C");
    const sink = specItems.find((item) => item.title === "Кухонная мойка — C");

    expect(specItems).toHaveLength(13);
    expect(faucet).toBeDefined();
    expect(faucet?.total).toBe(6000);
    expect(faucet?.note).toBeUndefined();
    expect(sink).toBeDefined();
    expect(sink?.total).toBe(6500);
    expect(sink?.note).toBeUndefined();

    const dishwasherPattern = /пмм|посудом|dishwasher/i;
    expect(specItems.some((item) => dishwasherPattern.test(item.title))).toBe(false);
    expect(specItems.some((item) => item.id.includes("dishwasher"))).toBe(false);
    expect(specItems.every((item) => !isSinkZoneContaminantLine(item))).toBe(true);

    expect(sumKitchenSinkZoneSpecLines(specItems)).toBe(37112);
    expect(calculateKitchenSinkZoneTotal("c")).toBe(39487);
  });

  it("состав spec совпадает с seed zone-kitchen-sink", () => {
    const specItems = getKitchenSinkZoneSpecItems("c");
    const atomIds = specItems.map((item) => item.id.replace(/^kitchen-sink-zone-/, ""));

    expect(atomIds).toEqual([
      ...KITCHEN_SINK_ZONE_BASE_ATOMIC_IDS,
      ...KITCHEN_SINK_ZONE_PACKAGE_ATOMIC_IDS.c,
    ]);
  });
});

describe("expandPlumbingSectionForSpec", () => {
  it("подставляет атомы мойки и disclaimer, сохраняя итог раздела с резервом", () => {
    const result = calculatePlumbing(KITCHEN_ROOM, {
      ...PLUMBING_SINK_ONLY_OPTIONS,
      kitchenSinkPackageLevel: "b",
    });

    const expanded = expandPlumbingSectionForSpec(result.section, {
      kitchenSinkPackageLevel: "b",
      includeKitchenSink: true,
      includeDishwasher: false,
    });

    expect(expanded.specIntro).toContain("без проекта");
    expect(expanded.items.some((item) => item.title.toLowerCase().includes("резерв"))).toBe(false);
    expect(expanded.items.filter((item) => item.id.startsWith("kitchen-sink-zone-"))).toHaveLength(13);
    expect(expanded.items.some((item) => item.title === "Мойка кухонная — пакет B")).toBe(true);
    expect(expanded.totals.total).toBe(result.total);
    expect(sumKitchenSinkZoneSpecLines(expanded.items.filter((item) => item.id.startsWith("kitchen-sink-zone-")))).toBe(
      40912,
    );
  });

  it("не смешивает legacy dishwasher-output с spec зоны мойки", () => {
    const result = calculatePlumbing(KITCHEN_ROOM, {
      ...PLUMBING_SINK_ONLY_OPTIONS,
      includeDishwasherOutput: true,
    });

    const expanded = expandPlumbingSectionForSpec(result.section, {
      kitchenSinkPackageLevel: "c",
      includeKitchenSink: true,
      dishwasherPackageLevel: "b",
      includeDishwasher: true,
    });

    const sinkLines = expanded.items.filter((item) => item.id.startsWith("kitchen-sink-zone-"));
    const dishwasherPattern = /пмм|посудом|dishwasher/i;

    expect(sinkLines).toHaveLength(13);
    expect(sinkLines.some((item) => dishwasherPattern.test(item.title))).toBe(false);
    expect(expanded.items.some((item) => item.id.startsWith("dishwasher-output"))).toBe(false);
    expect(expanded.items.some((item) => item.id.startsWith("kitchen-dishwasher-zone-"))).toBe(true);
  });
});

describe("calculatePlumbing kitchen sink zone", () => {
  it("добавляет зону мойки вместо legacy-позиций кухонной мойки", () => {
    const result = calculatePlumbing(KITCHEN_ROOM, {
      ...PLUMBING_SINK_ONLY_OPTIONS,
      kitchenSinkPackageLevel: "b",
    });

    expect(result.total).toBe(43530);
    expect(result.section.items.some((item) => item.id === "kitchen-sink-zone")).toBe(true);
    expect(result.section.items.some((item) => item.id === "kitchen-sink-works")).toBe(false);
    expect(result.coldWaterPoints).toBe(1);
    expect(result.hotWaterPoints).toBe(1);
    expect(result.sewerPoints).toBe(1);
  });

  it("добавляет зону ПММ из seed вместо legacy dishwasher-output", () => {
    const result = calculatePlumbing(KITCHEN_ROOM, {
      ...PLUMBING_SINK_ONLY_OPTIONS,
      includeDishwasherOutput: true,
    });

    expect(result.section.items.some((item) => item.id === "kitchen-dishwasher-zone")).toBe(true);
    expect(result.section.items.some((item) => item.id.startsWith("dishwasher-output"))).toBe(false);
    expect(calculateDishwasherZone("b").total).toBeGreaterThan(0);
  });
});
