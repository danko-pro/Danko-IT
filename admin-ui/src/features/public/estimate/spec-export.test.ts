import { describe, expect, it } from "vitest";
import { createEstimateSection } from "../public-estimate-model";
import { expandFlooringSectionForSpec } from "../public-estimate-flooring-spec";
import type { EstimateSpecSection } from "../public-estimate-plumbing-zones";
import {
  buildSpecExportCsv,
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
