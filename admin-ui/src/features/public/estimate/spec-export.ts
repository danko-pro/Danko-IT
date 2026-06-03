import type { EstimateCostCategory } from "../public-estimate-model";
import type { EstimateSpecSection } from "../public-estimate-plumbing-zones";

const CSV_HEADERS = [
  "Раздел",
  "Позиция",
  "Категория",
  "Количество",
  "Ед. изм.",
  "Цена за ед.",
  "Сумма",
  "Источник / примечание",
  "Итого по разделу",
  "Итого",
] as const;

const CATEGORY_LABELS: Record<EstimateCostCategory, string> = {
  works: "Работы",
  materials: "Материалы",
  equipment: "Оборудование",
  consumables: "Расходники",
};

export function formatEstimateCategoryLabel(category: EstimateCostCategory): string {
  return CATEGORY_LABELS[category];
}

export function escapeCsvCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

function formatExportNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return "";
  }

  const rounded = Math.round(value * 100) / 100;
  return String(rounded);
}

function buildCsvRow(cells: string[]): string {
  return cells.map(escapeCsvCell).join(",");
}

export function buildSpecExportFilename(title: string): string {
  const safe =
    title
      .trim()
      .replace(/[^\w\u0400-\u04FF-]+/gi, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "") || "specification";

  return `${safe}.csv`;
}

export function buildSpecExportCsv(sections: EstimateSpecSection[]): string {
  const rows: string[] = [buildCsvRow([...CSV_HEADERS])];
  const grandTotal = sections.reduce((sum, section) => sum + section.totals.total, 0);

  sections.forEach((section, sectionIndex) => {
    const isLastSection = sectionIndex === sections.length - 1;

    if (section.items.length === 0) {
      rows.push(
        buildCsvRow([
          section.title,
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          formatExportNumber(section.totals.total),
          isLastSection ? formatExportNumber(grandTotal) : "",
        ]),
      );
      return;
    }

    section.items.forEach((item, itemIndex) => {
      const pricePending = item.note === "уточняется";
      const isLastItemInSection = itemIndex === section.items.length - 1;
      const isLastRow = isLastSection && isLastItemInSection;

      rows.push(
        buildCsvRow([
          section.title,
          item.title,
          formatEstimateCategoryLabel(item.category),
          formatExportNumber(item.quantity),
          item.unit,
          pricePending ? "" : formatExportNumber(item.unitPrice),
          pricePending ? "" : formatExportNumber(item.total),
          item.note ?? "",
          isLastItemInSection ? formatExportNumber(section.totals.total) : "",
          isLastRow ? formatExportNumber(grandTotal) : "",
        ]),
      );
    });
  });

  return rows.join("\r\n");
}

export function downloadSpecExportCsv(sections: EstimateSpecSection[], filename?: string): void {
  const csv = buildSpecExportCsv(sections);
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename ?? "specification.csv";
  anchor.rel = "noopener";
  anchor.click();
  URL.revokeObjectURL(url);
}
