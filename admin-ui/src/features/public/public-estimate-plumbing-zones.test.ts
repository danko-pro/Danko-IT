import { describe, expect, it } from "vitest";
import {
  calculateKitchenSinkZone,
  expandPlumbingSectionForSpec,
  getKitchenSinkZonePackageTotal,
  getKitchenSinkZoneSpecItems,
  sumKitchenSinkZoneSpecLines,
} from "./public-estimate-plumbing-zones";
import { calculatePlumbing } from "./public-estimate-plumbing";

describe("calculateKitchenSinkZone", () => {
  it("считает базу, пакет B и резерв 6,4% по эталону catalog-editor", () => {
    const result = calculateKitchenSinkZone("b");

    expect(result.baseTotal).toBe(24600);
    expect(result.packageTotal).toBe(16300);
    expect(result.subtotal).toBe(40900);
    expect(result.riskAmount).toBe(2618);
    expect(result.total).toBe(43518);
    expect(result.sectionItem.id).toBe("kitchen-sink-zone");
    expect(result.sectionItem.total).toBe(43518);
    expect(result.specItems).toHaveLength(13);
  });

  it("даёт разные итоги для пакетов C и A", () => {
    const packageC = getKitchenSinkZonePackageTotal("c");
    const packageA = getKitchenSinkZonePackageTotal("a");

    expect(packageC).toBeLessThan(getKitchenSinkZonePackageTotal("b"));
    expect(packageA).toBeGreaterThan(getKitchenSinkZonePackageTotal("b"));
    expect(packageC).toBe(38410);
    expect(packageA).toBe(54902);
  });
});

describe("getKitchenSinkZoneSpecItems", () => {
  it("возвращает полный состав без строки резерва 6,4%", () => {
    const specItems = getKitchenSinkZoneSpecItems("b");

    expect(specItems).toHaveLength(13);
    expect(specItems.some((item) => item.title.toLowerCase().includes("резерв"))).toBe(false);
    expect(sumKitchenSinkZoneSpecLines(specItems)).toBe(40900);
    expect(getKitchenSinkZonePackageTotal("b")).toBe(43518);
    expect(specItems.some((item) => item.title === "Смеситель кухонный — пакет B")).toBe(true);
    expect(specItems.some((item) => item.title === "Штробление под трубу")).toBe(true);
  });
});

describe("expandPlumbingSectionForSpec", () => {
  it("подставляет атомы и disclaimer, сохраняя итог раздела с резервом", () => {
    const result = calculatePlumbing(
      [{ roomId: "kitchen", roomName: "Кухня", roomType: "kitchen", area: 12 }],
      {
        includeBathroomSet: false,
        includeBath: false,
        includeHygienicShower: false,
        includeElectricTowelRail: false,
        includeKitchenSink: true,
        kitchenSinkPackageLevel: "b",
        includeDishwasherOutput: false,
        includeWasherOutput: false,
        includeWaterNode: false,
        includeLeakProtection: false,
      },
    );

    const expanded = expandPlumbingSectionForSpec(result.section, "b", true);

    expect(expanded.specIntro).toContain("без проекта");
    expect(expanded.items.some((item) => item.title.toLowerCase().includes("резерв"))).toBe(false);
    expect(expanded.items.filter((item) => item.id.startsWith("kitchen-sink-zone-"))).toHaveLength(13);
    expect(expanded.totals.total).toBe(result.total);
    expect(sumKitchenSinkZoneSpecLines(expanded.items.filter((item) => item.id.startsWith("kitchen-sink-zone-")))).toBe(
      40900,
    );
  });
});

describe("calculatePlumbing kitchen sink zone", () => {
  it("добавляет зону мойки вместо legacy-позиций кухонной мойки", () => {
    const result = calculatePlumbing(
      [{ roomId: "kitchen", roomName: "Кухня", roomType: "kitchen", area: 12 }],
      {
        includeBathroomSet: false,
        includeBath: false,
        includeHygienicShower: false,
        includeElectricTowelRail: false,
        includeKitchenSink: true,
        kitchenSinkPackageLevel: "b",
        includeDishwasherOutput: false,
        includeWasherOutput: false,
        includeWaterNode: false,
        includeLeakProtection: false,
      },
    );

    expect(result.total).toBe(43518);
    expect(result.section.items.some((item) => item.id === "kitchen-sink-zone")).toBe(true);
    expect(result.section.items.some((item) => item.id === "kitchen-sink-works")).toBe(false);
    expect(result.coldWaterPoints).toBe(1);
    expect(result.hotWaterPoints).toBe(1);
    expect(result.sewerPoints).toBe(1);
  });
});
