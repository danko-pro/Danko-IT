import { describe, expect, it } from "vitest";
import { createEstimateSection } from "../public-estimate-model";
import { expandFlooringSectionForSpec } from "../public-estimate-flooring-spec";
import type { EstimateSpecSection } from "../public-estimate-plumbing-zones";
import {
  buildProcurementExportCsvSection,
  buildSpecExportCsv,
  buildSpecExportCsvWithProcurement,
  buildSpecExportFilename,
  escapeCsvCell,
  formatEstimateCategoryLabel,
} from "./spec-export";
import { mapSectionsForSpec } from "./spec";
import type { PlumbingCalculationResult, PlumbingOptions } from "../public-estimate-plumbing";

function parseCsvRows(csv: string): string[][] {
  const text = csv.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          current += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(current);
      current = "";
    } else if (char === "\n") {
      row.push(current);
      rows.push(row);
      row = [];
      current = "";
    } else if (char === "\r") {
      continue;
    } else {
      current += char;
    }
  }

  row.push(current);
  if (row.some((cell) => cell.length > 0) || rows.length > 0) {
    rows.push(row);
  }

  return rows;
}

function defaultPlumbingOptions(): PlumbingOptions {
  return {
    includeBathroomSet: false,
    includeBath: false,
    includeHygienicShower: false,
    includeElectricTowelRail: false,
    includeKitchenSink: false,
    kitchenSinkPackageLevel: "b",
    includeDishwasherOutput: false,
    dishwasherPackageLevel: "b",
    includeShowerZone: false,
    showerPackageLevel: "b",
    includeInstallRelocation: false,
    includeWasherOutput: false,
    includeWaterNode: false,
    includeLeakProtection: false,
  };
}

function emptyPlumbingResult(): PlumbingCalculationResult {
  return {
    bathroomCount: 0,
    hasKitchen: false,
    hasPlumbingRooms: false,
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
  };
}

describe("escapeCsvCell", () => {
  it("экранирует запятые, кавычки и переводы строк", () => {
    expect(escapeCsvCell("plain")).toBe("plain");
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvCell("a,b")).toBe('"a,b"');
    expect(escapeCsvCell("line1\nline2")).toBe('"line1\nline2"');
  });
});

describe("buildSpecExportCsv", () => {
  it("экспортирует real qty/unit/price для flooring specLines, не effective m2", () => {
    const flatSection = createEstimateSection("flooring", "Полы", [
      {
        id: "flooring-adhesive-room-1",
        sectionId: "flooring",
        title: "Flat glue",
        category: "consumables",
        quantity: 7.15,
        unit: "м²",
        unitPrice: 1260,
        total: 9009,
        isIncluded: true,
      },
    ]);
    const area = 6.5;
    const wasteFactor = 1.1;
    const quantityPerBasis = 45;
    const unitPrice = 28;
    const realQuantity = area * quantityPerBasis * wasteFactor;
    const realTotal = realQuantity * unitPrice;

    const specSection = createEstimateSection("flooring", "Полы", [
      {
        id: "flooring-spec-covering-porcelain-adhesive-room-1",
        sectionId: "flooring",
        title: "Клей плиточный — Комната",
        category: "consumables",
        quantity: realQuantity,
        unit: "kg",
        unitPrice,
        total: realTotal,
        isIncluded: true,
        note: "Покрытие: Плитка",
      },
    ]);
    specSection.totals.total = flatSection.totals.total;

    const sections: EstimateSpecSection[] = [expandFlooringSectionForSpec(flatSection, specSection)];
    const rows = parseCsvRows(buildSpecExportCsv(sections));
    const dataRow = rows[1]!;

    expect(Number(dataRow[3])).toBeCloseTo(realQuantity, 2);
    expect(dataRow[4]).toBe("kg");
    expect(Number(dataRow[5])).toBe(unitPrice);
    expect(Number(dataRow[6])).toBeCloseTo(realTotal, 2);
    expect(dataRow[7]).toBe("Покрытие: Плитка");
  });

  it("экспортирует развёрнутые flooring specLines с источником", () => {
    const flatSection = createEstimateSection("flooring", "Полы", [
      {
        id: "flooring-material-room-1",
        sectionId: "flooring",
        title: "Flat covering",
        category: "materials",
        quantity: 16,
        unit: "м²",
        unitPrice: 100,
        total: 1600,
        isIncluded: true,
      },
    ]);
    const specSection = createEstimateSection("flooring", "Полы", [
      {
        id: "flooring-spec-covering-laminate-tile-room-1",
        sectionId: "flooring",
        title: "Ламинат — Комната",
        category: "materials",
        quantity: 16,
        unit: "м²",
        unitPrice: 930,
        total: 14880,
        isIncluded: true,
        note: "Покрытие: Ламинат",
      },
      {
        id: "flooring-spec-covering-laminate-work-room-1",
        sectionId: "flooring",
        title: "Укладка ламината — Комната",
        category: "works",
        quantity: 16,
        unit: "м²",
        unitPrice: 1100,
        total: 17600,
        isIncluded: true,
        note: "Укладка: Прямая",
      },
    ]);
    specSection.totals.total = flatSection.totals.total;

    const sections: EstimateSpecSection[] = [
      expandFlooringSectionForSpec(flatSection, specSection),
    ];
    const rows = parseCsvRows(buildSpecExportCsv(sections));
    const dataRows = rows.slice(1);

    expect(dataRows).toHaveLength(2);
    expect(dataRows[0]?.[1]).toBe("Ламинат — Комната");
    expect(dataRows[0]?.[7]).toBe("Покрытие: Ламинат");
    expect(dataRows[1]?.[1]).toBe("Укладка ламината — Комната");
    expect(Number(dataRows[1]?.[8])).toBe(flatSection.totals.total);
    expect(Number(dataRows[1]?.[9])).toBe(flatSection.totals.total);
  });

  it("при отсутствии specLines экспортирует flat позиции", () => {
    const flatSection = createEstimateSection("flooring", "Полы", [
      {
        id: "flooring-material-room-1",
        sectionId: "flooring",
        title: "Flat covering",
        category: "materials",
        quantity: 16,
        unit: "м²",
        unitPrice: 100,
        total: 1600,
        isIncluded: true,
      },
    ]);
    const sections = [expandFlooringSectionForSpec(flatSection, flatSection)];
    const rows = parseCsvRows(buildSpecExportCsv(sections));

    expect(rows[1]?.[1]).toBe("Flat covering");
    expect(rows[1]?.[7]).toBe("");
    expect(Number(rows[1]?.[8])).toBe(1600);
  });

  it("итоги по разделу и общий итог совпадают с section.totals", () => {
    const plumbing = createEstimateSection("plumbing", "Сантехника", [
      {
        id: "plumbing-line-1",
        sectionId: "plumbing",
        title: "Смеситель",
        category: "materials",
        quantity: 2,
        unit: "шт",
        unitPrice: 5000,
        total: 10000,
        isIncluded: true,
      },
    ]);
    const walls = createEstimateSection("walls", "Стены", [
      {
        id: "walls-line-1",
        sectionId: "walls",
        title: "Штукатурка",
        category: "works",
        quantity: 40,
        unit: "м²",
        unitPrice: 800,
        total: 32000,
        isIncluded: true,
      },
    ]);

    const rows = parseCsvRows(buildSpecExportCsv([plumbing, walls]));
    expect(Number(rows[1]?.[8])).toBe(plumbing.totals.total);
    expect(rows[1]?.[9]).toBe("");
    expect(Number(rows[2]?.[8])).toBe(walls.totals.total);
    expect(Number(rows[2]?.[9])).toBe(plumbing.totals.total + walls.totals.total);
  });

  it("plumbing через mapSectionsForSpec не ломает экспорт позиций", () => {
    const plumbingSection = createEstimateSection("plumbing", "Сантехника", [
      {
        id: "plumbing-water-node",
        sectionId: "plumbing",
        title: "Узел водоснабжения",
        category: "materials",
        quantity: 1,
        unit: "компл",
        unitPrice: 12000,
        total: 12000,
        isIncluded: true,
      },
    ]);

    const mapped = mapSectionsForSpec(
      [plumbingSection],
      defaultPlumbingOptions(),
      emptyPlumbingResult(),
      { specificationSection: createEstimateSection("flooring", "Полы", []) },
    );

    const rows = parseCsvRows(buildSpecExportCsv(mapped));
    expect(rows[1]?.[0]).toBe("Сантехника");
    expect(rows[1]?.[1]).toBe("Узел водоснабжения");
    expect(rows[1]?.[2]).toBe(formatEstimateCategoryLabel("materials"));
    expect(Number(rows[1]?.[8])).toBe(plumbingSection.totals.total);
  });

  it("сохраняет примечания с запятыми и переводами строк в CSV", () => {
    const section = createEstimateSection("walls", "Стены", [
      {
        id: "walls-note",
        sectionId: "walls",
        title: 'Позиция "А"',
        category: "works",
        quantity: 1,
        unit: "м²",
        unitPrice: 100,
        total: 100,
        isIncluded: true,
        note: "источник, зона\nдополнительно",
      },
    ]);

    const csv = buildSpecExportCsv([section]);
    expect(csv).toContain('"источник, зона\nдополнительно"');
    const rows = parseCsvRows(csv);
    expect(rows[1]?.[7]).toBe("источник, зона\nдополнительно");
  });
});

describe("buildSpecExportFilename", () => {
  it("строит безопасное имя файла из заголовка модалки", () => {
    expect(buildSpecExportFilename("Полная спецификация")).toBe("Полная-спецификация.csv");
  });
});

describe("buildSpecExportCsvWithProcurement", () => {
  it("без procurementLines CSV совпадает с обычным экспортом", () => {
    const section = createEstimateSection("flooring", "Полы", [
      {
        id: "flooring-material-room-1",
        sectionId: "flooring",
        title: "Flat covering",
        category: "materials",
        quantity: 16,
        unit: "м²",
        unitPrice: 100,
        total: 1600,
        isIncluded: true,
      },
    ]);

    const baseCsv = buildSpecExportCsv([section]);
    expect(buildSpecExportCsvWithProcurement([section])).toBe(baseCsv);
    expect(buildSpecExportCsvWithProcurement([section], [])).toBe(baseCsv);
  });

  it("добавляет информационный блок закупки после спецификации", () => {
    const section = createEstimateSection("flooring", "Полы", [
      {
        id: "flooring-material-room-1",
        sectionId: "flooring",
        title: "Flat covering",
        category: "materials",
        quantity: 16,
        unit: "м²",
        unitPrice: 100,
        total: 1600,
        isIncluded: true,
      },
    ]);

    const csv = buildSpecExportCsvWithProcurement([section], [
      {
        aggregationKey: "svp",
        code: "svp",
        title: "СВП",
        category: "consumables",
        rawQuantity: 300,
        rawUnit: "pcs",
        purchaseMode: "package",
        purchaseQuantity: 1,
        purchaseUnit: "уп.",
        unitPrice: 1.2,
        packageSize: 500,
        packagePrice: 600,
        total: 600,
      },
    ]);
    const rows = parseCsvRows(csv);

    expect(rows.some((row) => row[0] === "Полы — ориентировочная закупка материалов")).toBe(true);
    expect(rows.some((row) => row[0] === "СВП" && row[2] === "300" && row[4] === "1")).toBe(true);
    expect(rows.some((row) => row[1] === "Flat covering")).toBe(true);
  });

  it("не меняет общий итог основной спецификации при добавлении закупки", () => {
    const section = createEstimateSection("flooring", "Полы", [
      {
        id: "flooring-material-room-1",
        sectionId: "flooring",
        title: "Flat covering",
        category: "materials",
        quantity: 16,
        unit: "м²",
        unitPrice: 100,
        total: 1600,
        isIncluded: true,
      },
    ]);

    const baseRows = parseCsvRows(buildSpecExportCsv([section]));
    const withProcurementRows = parseCsvRows(
      buildSpecExportCsvWithProcurement([section], [
        {
          aggregationKey: "svp",
          code: "svp",
          title: "СВП",
          category: "consumables",
          rawQuantity: 300,
          rawUnit: "pcs",
          purchaseMode: "package",
          purchaseQuantity: 1,
          purchaseUnit: "уп.",
          unitPrice: 1.2,
          packageSize: 500,
          packagePrice: 600,
          total: 600,
        },
      ]),
    );

    expect(withProcurementRows[1]?.[9]).toBe(baseRows[1]?.[9]);
    expect(Number(withProcurementRows[1]?.[8])).toBe(Number(baseRows[1]?.[8]));
  });

  it("строка клея: raw kg, количество упаковок и цена упаковки", () => {
    const section = createEstimateSection("flooring", "Полы", []);
    const rawQuantity = 247.5;
    const packageSize = 25;
    const packagePrice = 500;
    const purchaseQuantity = Math.ceil(rawQuantity / packageSize);

    const csv = buildSpecExportCsvWithProcurement([section], [
      {
        aggregationKey: "glue",
        code: "glue",
        title: "Клей плиточный",
        category: "consumables",
        rawQuantity,
        rawUnit: "kg",
        purchaseMode: "package",
        purchaseQuantity,
        purchaseUnit: "уп.",
        unitPrice: packagePrice / packageSize,
        packageSize,
        packagePrice,
        total: purchaseQuantity * packagePrice,
        calculationNote: "9 kg/m²",
      },
    ]);
    const rows = parseCsvRows(csv);
    const glueRow = rows.find((row) => row[0] === "Клей плиточный");

    expect(glueRow?.[2]).toBe(String(rawQuantity));
    expect(glueRow?.[3]).toBe("kg");
    expect(glueRow?.[4]).toBe(String(purchaseQuantity));
    expect(glueRow?.[6]).toBe(String(packagePrice));
    expect(Number(glueRow?.[7])).toBe(purchaseQuantity * packagePrice);
    expect(glueRow?.[8]).toContain("9 kg/m²");
  });

  it("строка СВП: raw pcs и количество упаковок", () => {
    const section = createEstimateSection("flooring", "Полы", []);
    const rawQuantity = 300;
    const purchaseQuantity = 1;
    const packagePrice = 600;

    const csv = buildSpecExportCsvWithProcurement([section], [
      {
        aggregationKey: "svp",
        code: "svp",
        title: "СВП",
        category: "consumables",
        rawQuantity,
        rawUnit: "pcs",
        purchaseMode: "package",
        purchaseQuantity,
        purchaseUnit: "уп.",
        unitPrice: packagePrice / 500,
        packageSize: 500,
        packagePrice,
        total: purchaseQuantity * packagePrice,
      },
    ]);
    const rows = parseCsvRows(csv);
    const svpRow = rows.find((row) => row[0] === "СВП");

    expect(svpRow?.[2]).toBe(String(rawQuantity));
    expect(svpRow?.[3]).toBe("pcs");
    expect(svpRow?.[4]).toBe(String(purchaseQuantity));
    expect(Number(svpRow?.[7])).toBe(packagePrice);
  });

  it("buildProcurementExportCsvSection возвращает пустую строку без строк закупки", () => {
    expect(buildProcurementExportCsvSection([])).toBe("");
    expect(buildSpecExportCsvWithProcurement([createEstimateSection("flooring", "Полы", [])])).toBe(
      buildSpecExportCsv([createEstimateSection("flooring", "Полы", [])]),
    );
  });
});
