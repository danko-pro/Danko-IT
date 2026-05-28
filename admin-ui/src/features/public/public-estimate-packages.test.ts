import { describe, expect, it } from "vitest";
import {
  appliancePackageMultipliers,
  calculateAppliances,
  createDefaultAppliancesOptions,
  getApplianceUnitPrice,
} from "./public-estimate-appliances";
import {
  calculateLooseFurniture,
  createDefaultLooseFurnitureOptions,
  getLooseFurnitureUnitPrice,
  looseFurniturePackageMultipliers,
} from "./public-estimate-loose-furniture";
import { calculateHomeGoods, homeGoodsPackageRates } from "./public-estimate-home-goods";
import { classifyEstimatePackage, estimatePackageBenchmarks } from "./public-estimate-package";

describe("множители пакетов бытовой техники", () => {
  it("равны 1 / 1.3 / 1.7", () => {
    expect(appliancePackageMultipliers).toEqual({ c: 1, b: 1.3, a: 1.7 });
  });

  it("масштабирует цену встроенного холодильника по пакету", () => {
    expect(getApplianceUnitPrice("fridge", { packageLevel: "c", fridgeVariant: "built_in_standard" })).toBe(45000);
    expect(getApplianceUnitPrice("fridge", { packageLevel: "b", fridgeVariant: "built_in_standard" })).toBeCloseTo(
      58500,
      2,
    );
    expect(getApplianceUnitPrice("fridge", { packageLevel: "a", fridgeVariant: "built_in_standard" })).toBeCloseTo(
      76500,
      2,
    );
  });

  it("учитывает количество позиций при подсчёте раздела", () => {
    const options = createDefaultAppliancesOptions();
    options.packageLevel = "b";
    options.items.oven = { isIncluded: true, quantity: 2 };

    const result = calculateAppliances(options);

    // духовой шкаф 22000 * 1.3 * 2
    expect(result.total).toBeCloseTo(22000 * 1.3 * 2, 2);
    expect(result.includedItemCount).toBe(1);
  });
});

describe("множители пакетов свободной мебели", () => {
  it("равны 1 / 1.35 / 1.85", () => {
    expect(looseFurniturePackageMultipliers).toEqual({ c: 1, b: 1.35, a: 1.85 });
  });

  it("масштабирует цену обеденного стола по пакету", () => {
    expect(getLooseFurnitureUnitPrice("dining_table", { packageLevel: "c" })).toBe(20000);
    expect(getLooseFurnitureUnitPrice("dining_table", { packageLevel: "b" })).toBeCloseTo(27000, 2);
    expect(getLooseFurnitureUnitPrice("dining_table", { packageLevel: "a" })).toBeCloseTo(37000, 2);
  });

  it("считает раздел по выбранному количеству", () => {
    const options = createDefaultLooseFurnitureOptions();
    options.packageLevel = "a";
    options.items.dining_chair = { isIncluded: true, quantity: 4 };

    const result = calculateLooseFurniture(options);

    // стул 7000 * 1.85 * 4
    expect(result.total).toBeCloseTo(7000 * 1.85 * 4, 2);
  });
});

describe("товары для дома", () => {
  it("используют ставки 35k / 65k / 110k", () => {
    expect(homeGoodsPackageRates).toEqual({ c: 35000, b: 65000, a: 110000 });
  });

  it("считают уборку по площади и комплект по пакету", () => {
    const result = calculateHomeGoods({
      floorArea: 50,
      options: { includeCleaning: true, includeHomeGoods: true, packageLevel: "b" },
    });

    // уборка 50 * 500 + комплект B 65000
    expect(result.cleaningTotal).toBeCloseTo(25000, 2);
    expect(result.homeGoodsTotal).toBe(65000);
    expect(result.total).toBeCloseTo(90000, 2);
  });
});

describe("classifyEstimatePackage", () => {
  const [packageC, packageB, packageA] = estimatePackageBenchmarks;

  it("до заполнения предлагает ориентир C", () => {
    const result = classifyEstimatePackage(0);
    expect(result.referenceLabel).toBe("Ориентир появится после заполнения");
    expect(result.nextLabel).toBe(packageC.label);
    expect(result.nextDelta).toBe(packageC.pricePerM2);
  });

  it("ниже ориентира C не дублирует «До C» с тем же ярлыком", () => {
    const price = 30000;
    const result = classifyEstimatePackage(price);

    expect(result.referenceLabel).toBe(`Ниже ориентира «${packageC.label}»`);
    expect(result.referencePrice).toBe(0);
    expect(result.nextLabel).toBe(packageC.label);
    expect(result.nextLabel).not.toBe(result.referenceLabel);
    expect(result.nextDelta).toBeCloseTo(packageC.pricePerM2 - price, 2);
  });

  it("на границе C показывает C как ориентир и B как следующий", () => {
    const result = classifyEstimatePackage(packageC.pricePerM2);

    expect(result.referenceLabel).toBe(packageC.label);
    expect(result.referencePrice).toBe(packageC.pricePerM2);
    expect(result.nextLabel).toBe(packageB.label);
    expect(result.nextDelta).toBeCloseTo(packageB.pricePerM2 - packageC.pricePerM2, 2);
  });

  it("между B и A показывает B как ориентир и A как следующий", () => {
    const price = (packageB.pricePerM2 + packageA.pricePerM2) / 2;
    const result = classifyEstimatePackage(price);

    expect(result.referenceLabel).toBe(packageB.label);
    expect(result.nextLabel).toBe(packageA.label);
    expect(result.nextDelta).toBeCloseTo(packageA.pricePerM2 - price, 2);
  });

  it("на уровне A и выше не предлагает следующий ориентир", () => {
    const result = classifyEstimatePackage(packageA.pricePerM2 + 5000);

    expect(result.referenceLabel).toBe(packageA.label);
    expect(result.referencePrice).toBe(packageA.pricePerM2);
    expect(result.nextLabel).toBe("");
    expect(result.nextDelta).toBe(0);
  });
});
