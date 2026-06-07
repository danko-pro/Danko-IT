import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  calculateFlooring,
  type FlooringOptions,
  type FlooringRoomInput,
} from "./public-estimate-flooring";
import {
  FLOORING_GOLDEN_LAMINATE_PURCHASE_AREA,
  FLOORING_GOLDEN_SNAPSHOT,
  FLOORING_GOLDEN_TOTAL,
  getFlooringGoldenSnapshotCatalog,
  getFlooringGoldenSnapshotCatalogWithoutSpecLines,
  getFlooringGoldenSnapshotRates,
} from "./flooring-golden.fixture";
import { buildFlooringProcurementSummary } from "./public-estimate-flooring-procurement";
import type { FlooringRoomForSpecification } from "./public-estimate-flooring-spec";
import * as flooringSnapshotModule from "./public-flooring-snapshot";

const room: FlooringRoomInput = {
  roomId: "room",
  roomName: "Комната",
  area: 16,
  perimeter: 16.8,
  plinthLength: 15.9,
  coveringType: "laminate",
  preparationType: "none",
  layoutType: "straight",
  isIncluded: true,
};

const options: FlooringOptions = {
  includePlinth: true,
  plinthType: "duropolymer",
  includeThresholds: false,
  thresholdCount: 0,
  includeDemolition: false,
};

function installFlooringGoldenSnapshotMocks() {
  vi.spyOn(flooringSnapshotModule, "getFlooringSnapshotRates").mockReturnValue(
    getFlooringGoldenSnapshotRates(),
  );
  vi.spyOn(flooringSnapshotModule, "getFlooringSnapshotCatalog").mockReturnValue(
    getFlooringGoldenSnapshotCatalog(),
  );
}

function roomForProcurement(overrides: Partial<FlooringRoomForSpecification> = {}): FlooringRoomForSpecification {
  return {
    roomId: "room-1",
    roomName: "Комната",
    area: 25,
    purchaseArea: 25,
    isIncluded: true,
    coveringType: "porcelain",
    preparationType: "none",
    layoutType: "straight",
    ...overrides,
  };
}

describe("buildFlooringProcurementSummary", () => {
  it("glue package: area × qtyPerBasis × waste → ceil(raw/packageSize) bags", () => {
    const area = 25;
    const purchaseArea = 27.5;
    const quantityPerBasis = 9;
    const packageSize = 25;
    const packagePrice = 500;
    const unitPrice = packagePrice / packageSize;

    const lines = buildFlooringProcurementSummary({
      roomResults: [roomForProcurement({ area, purchaseArea })],
      coveringByCode: {
        porcelain: {
          code: "porcelain",
          title: "Плитка",
          specLines: [
            {
              code: "glue",
              title: "Клей плиточный",
              category: "consumables",
              basis: "area",
              unit: "kg",
              quantityPerBasis,
              unitPrice,
              packageSize,
              packageUnit: "kg",
              packagePrice,
              purchaseMode: "package",
              purchaseAggregation: "project",
              aggregationKey: "glue",
              calculationNote: "9 kg/m²",
            },
          ],
        },
      },
      preparationByCode: { none: { code: "none", title: "Без подготовки" } },
      layoutByCode: { straight: { code: "straight", title: "Прямая" } },
    });

    expect(lines).toHaveLength(1);
    const line = lines[0]!;
    const rawQuantity = area * quantityPerBasis * (purchaseArea / area);
    expect(line.rawQuantity).toBeCloseTo(rawQuantity, 6);
    expect(line.purchaseQuantity).toBe(Math.ceil(rawQuantity / packageSize));
    expect(line.purchaseUnit).toBe("уп.");
    expect(line.total).toBe(line.purchaseQuantity * packagePrice);
    expect(line.purchaseMode).toBe("package");
  });

  it("SVP package: 25m² × 12 pcs/m² → 1 pack of 500 pcs @ 600₽", () => {
    const area = 25;
    const quantityPerBasis = 12;
    const packageSize = 500;
    const packagePrice = 600;
    const unitPrice = packagePrice / packageSize;

    const lines = buildFlooringProcurementSummary({
      roomResults: [roomForProcurement({ area, purchaseArea: area })],
      coveringByCode: {
        porcelain: {
          code: "porcelain",
          title: "Плитка",
          specLines: [
            {
              code: "svp",
              title: "СВП",
              category: "consumables",
              basis: "area",
              unit: "pcs",
              quantityPerBasis,
              unitPrice,
              packageSize,
              packageUnit: "pcs",
              packagePrice,
              purchaseMode: "package",
              purchaseAggregation: "project",
              aggregationKey: "svp",
            },
          ],
        },
      },
      preparationByCode: { none: { code: "none", title: "Без подготовки" } },
      layoutByCode: { straight: { code: "straight", title: "Прямая" } },
    });

    const line = lines[0]!;
    expect(line.rawQuantity).toBeCloseTo(300, 6);
    expect(line.purchaseQuantity).toBe(1);
    expect(line.total).toBe(600);
  });

  it("two rooms same SKU with project aggregation → one pack, not two", () => {
    const area = 10;
    const quantityPerBasis = 12;
    const packageSize = 500;
    const packagePrice = 600;
    const unitPrice = packagePrice / packageSize;

    const lines = buildFlooringProcurementSummary({
      roomResults: [
        roomForProcurement({ roomId: "room-a", roomName: "Комната A", area, purchaseArea: area }),
        roomForProcurement({ roomId: "room-b", roomName: "Комната B", area, purchaseArea: area }),
      ],
      coveringByCode: {
        porcelain: {
          code: "porcelain",
          title: "Плитка",
          specLines: [
            {
              code: "svp",
              title: "СВП",
              category: "consumables",
              basis: "area",
              unit: "pcs",
              quantityPerBasis,
              unitPrice,
              packageSize,
              packageUnit: "pcs",
              packagePrice,
              purchaseMode: "package",
              purchaseAggregation: "project",
              aggregationKey: "svp",
            },
          ],
        },
      },
      preparationByCode: { none: { code: "none", title: "Без подготовки" } },
      layoutByCode: { straight: { code: "straight", title: "Прямая" } },
    });

    const line = lines[0]!;
    expect(line.rawQuantity).toBeCloseTo(240, 6);
    expect(line.purchaseQuantity).toBe(1);
    expect(line.total).toBe(600);
  });

  it("room aggregation sums per-room package counts", () => {
    const area = 10;
    const quantityPerBasis = 12;
    const packageSize = 500;
    const packagePrice = 600;
    const unitPrice = packagePrice / packageSize;

    const lines = buildFlooringProcurementSummary({
      roomResults: [
        roomForProcurement({ roomId: "room-a", roomName: "Комната A", area, purchaseArea: area }),
        roomForProcurement({ roomId: "room-b", roomName: "Комната B", area, purchaseArea: area }),
      ],
      coveringByCode: {
        porcelain: {
          code: "porcelain",
          title: "Плитка",
          specLines: [
            {
              code: "svp",
              title: "СВП",
              category: "consumables",
              basis: "area",
              unit: "pcs",
              quantityPerBasis,
              unitPrice,
              packageSize,
              packageUnit: "pcs",
              packagePrice,
              purchaseMode: "package",
              purchaseAggregation: "room",
              aggregationKey: "svp",
            },
          ],
        },
      },
      preparationByCode: { none: { code: "none", title: "Без подготовки" } },
      layoutByCode: { straight: { code: "straight", title: "Прямая" } },
    });

    const line = lines[0]!;
    expect(line.purchaseQuantity).toBe(2);
    expect(line.total).toBe(1200);
  });

  it("raw mode keeps linear purchase quantity and total", () => {
    const area = 16;
    const purchaseArea = 18.4;
    const unitPrice = 930;

    const lines = buildFlooringProcurementSummary({
      roomResults: [roomForProcurement({ area, purchaseArea, coveringType: "laminate" })],
      coveringByCode: {
        laminate: {
          code: "laminate",
          title: "Ламинат",
          specLines: [
            {
              code: "board",
              title: "Ламинат доска",
              category: "materials",
              basis: "area",
              unit: "m2",
              quantityPerBasis: 1,
              unitPrice,
            },
          ],
        },
      },
      preparationByCode: { none: { code: "none", title: "Без подготовки" } },
      layoutByCode: { straight: { code: "straight", title: "Прямая" } },
    });

    const line = lines[0]!;
    expect(line.purchaseMode).toBe("raw");
    expect(line.rawQuantity).toBeCloseTo(purchaseArea, 6);
    expect(line.purchaseQuantity).toBeCloseTo(purchaseArea, 6);
    expect(line.purchaseUnit).toBe("m2");
    expect(line.total).toBeCloseTo(purchaseArea * unitPrice, 2);
  });

  it("package mode without package data falls back to raw with note", () => {
    const lines = buildFlooringProcurementSummary({
      roomResults: [roomForProcurement()],
      coveringByCode: {
        porcelain: {
          code: "porcelain",
          title: "Плитка",
          specLines: [
            {
              code: "glue",
              title: "Клей",
              category: "consumables",
              basis: "area",
              unit: "kg",
              quantityPerBasis: 9,
              unitPrice: 20,
              purchaseMode: "package",
            },
          ],
        },
      },
      preparationByCode: { none: { code: "none", title: "Без подготовки" } },
      layoutByCode: { straight: { code: "straight", title: "Прямая" } },
    });

    const line = lines[0]!;
    expect(line.purchaseMode).toBe("raw");
    expect(line.note).toContain("упаковки");
  });

  it("returns empty array when catalog has no specLines", () => {
    expect(
      buildFlooringProcurementSummary({
        roomResults: [roomForProcurement({ coveringType: "laminate" })],
        coveringByCode: { laminate: { code: "laminate", title: "Ламинат" } },
        preparationByCode: { none: { code: "none", title: "Без подготовки" } },
        layoutByCode: { straight: { code: "straight", title: "Прямая" } },
      }),
    ).toEqual([]);
  });
});

describe("calculateFlooring procurement integration", () => {
  beforeEach(() => {
    installFlooringGoldenSnapshotMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("flat calculator golden total remains 60510", () => {
    const result = calculateFlooring([room], options);
    expect(result.total).toBeCloseTo(FLOORING_GOLDEN_TOTAL, 2);
  });

  it("populates procurementLines from catalog specLines without changing flat totals", () => {
    const laminate = FLOORING_GOLDEN_SNAPSHOT.coverings.find((item) => item.code === "laminate")!;
    const noSpecCatalog = getFlooringGoldenSnapshotCatalogWithoutSpecLines();

    vi.spyOn(flooringSnapshotModule, "getFlooringSnapshotCatalog").mockReturnValue({
      coverings: {
        ...getFlooringGoldenSnapshotCatalog().coverings,
        laminate: {
          ...laminate,
          specLines: [
            {
              code: "laminate-board",
              title: "Ламинат доска",
              category: "materials",
              basis: "area",
              unit: "m2",
              quantityPerBasis: 1,
              unitPrice: laminate.materialPricePerM2,
            },
            {
              code: "underlay",
              title: "Подложка",
              category: "consumables",
              basis: "area",
              unit: "m2",
              quantityPerBasis: 1,
              unitPrice: laminate.underlayPricePerM2,
              packageSize: 10,
              packageUnit: "m2",
              packagePrice: 2200,
              purchaseMode: "package",
              purchaseAggregation: "project",
              aggregationKey: "underlay",
            },
          ],
        },
      },
      preparations: noSpecCatalog.preparations,
      layouts: noSpecCatalog.layouts,
    });

    const result = calculateFlooring([room], options);

    expect(result.total).toBeCloseTo(FLOORING_GOLDEN_TOTAL, 2);
    expect(result.procurementLines).toHaveLength(2);
    expect(result.procurementLines[0]?.rawQuantity).toBeCloseTo(FLOORING_GOLDEN_LAMINATE_PURCHASE_AREA, 6);
    expect(result.specificationSection.totals.total).toBe(result.section.totals.total);
  });

  it("without specLines procurementLines is empty", () => {
    vi.spyOn(flooringSnapshotModule, "getFlooringSnapshotCatalog").mockReturnValue(
      getFlooringGoldenSnapshotCatalogWithoutSpecLines(),
    );

    const result = calculateFlooring([room], options);
    expect(result.procurementLines).toEqual([]);
  });
});
