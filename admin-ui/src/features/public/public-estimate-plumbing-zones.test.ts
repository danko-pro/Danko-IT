import { describe, expect, it } from "vitest";
import { calculateKitchenSinkZone, getKitchenSinkZonePackageTotal } from "./public-estimate-plumbing-zones";
import { calculatePlumbing } from "./public-estimate-plumbing";

describe("calculateKitchenSinkZone", () => {
  it("считает базу, пакет B и резерв 6,4% по эталону catalog-editor", () => {
    const result = calculateKitchenSinkZone("b");

    expect(result.baseTotal).toBe(24600);
    expect(result.packageTotal).toBe(16300);
    expect(result.subtotal).toBe(40900);
    expect(result.riskAmount).toBe(2618);
    expect(result.total).toBe(43518);
    expect(result.items).toHaveLength(3);
    expect(result.items[0]?.title).toContain("базовый состав");
    expect(result.items[1]?.title).toContain("Пакет B");
    expect(result.items[2]?.title).toContain("резерв");
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
    expect(result.section.items.some((item) => item.id.startsWith("kitchen-sink-zone-"))).toBe(true);
    expect(result.section.items.some((item) => item.id === "kitchen-sink-works")).toBe(false);
    expect(result.coldWaterPoints).toBe(1);
    expect(result.hotWaterPoints).toBe(1);
    expect(result.sewerPoints).toBe(1);
  });
});
