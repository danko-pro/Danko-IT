import type { FlooringProcurementLine } from "../public-estimate-flooring-procurement";
import type { FlooringSpecificationCategory } from "../public-estimate-flooring-spec";
import type { EstimateCostCategory } from "../public-estimate-model";
import {
  calculateDocumentLineTotals,
  type EstimateDocumentLine,
  type EstimateDocumentTotals,
} from "./public-estimate-document";

const ROOM_SUFFIX_SEPARATOR = " — ";

const GLOBAL_MATERIAL_LINE_IDS = new Set(["flooring-plinth-material", "flooring-thresholds"]);

const MATERIAL_DOCUMENT_CATEGORIES = new Set<EstimateCostCategory>([
  "materials",
  "consumables",
  "equipment",
]);

export type AggregatedClientLineSource = {
  roomName?: string;
  packageCode?: string;
  procurementCode?: string;
  lineId?: string;
};

export type AggregatedClientLine = EstimateDocumentLine & {
  sources?: AggregatedClientLineSource[];
};

export type EstimatePresentationGroupKind = "works" | "materials" | "detail";

export type EstimatePresentationGroup = {
  kind: EstimatePresentationGroupKind;
  title: string;
  lines: AggregatedClientLine[];
  totals: EstimateDocumentTotals;
};

export type AggregatedClientPresentation = {
  workLines: AggregatedClientLine[];
  materialLines: AggregatedClientLine[];
  workTotals: EstimateDocumentTotals;
  materialTotals: EstimateDocumentTotals;
  presentationGroups?: EstimatePresentationGroup[];
};

export type BuildAggregatedClientPresentationInput = {
  lines: EstimateDocumentLine[];
  procurement?: FlooringProcurementLine[];
};

function safeMoney(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function roundMoney(value: number) {
  return Math.round(safeMoney(value) * 100) / 100;
}

function lineTotal(quantity: number, unitPrice: number) {
  return roundMoney(safeMoney(quantity) * safeMoney(unitPrice));
}

export function stripRoomSuffix(title: string): string {
  const separatorIndex = title.lastIndexOf(ROOM_SUFFIX_SEPARATOR);

  if (separatorIndex <= 0) {
    return title.trim();
  }

  return title.slice(0, separatorIndex).trim();
}

function workAggregationKey(line: EstimateDocumentLine): string {
  return [
    stripRoomSuffix(line.title),
    line.category,
    line.unit,
    line.unitPrice,
  ].join("|");
}

function documentMaterialAggregationKey(line: EstimateDocumentLine): string {
  return [
    stripRoomSuffix(line.title),
    line.category,
    line.unit,
    line.unitPrice,
  ].join("|");
}

function stableAggregatedId(prefix: string, key: string): string {
  return `aggregated-${prefix}-${key.replace(/\|/g, "--")}`;
}

function pushSource(
  sources: AggregatedClientLineSource[] | undefined,
  source: AggregatedClientLineSource,
): AggregatedClientLineSource[] {
  return [...(sources ?? []), source];
}

function aggregateLinesByKey(
  lines: EstimateDocumentLine[],
  resolveKey: (line: EstimateDocumentLine) => string,
  idPrefix: string,
  mapSource: (line: EstimateDocumentLine) => AggregatedClientLineSource,
): AggregatedClientLine[] {
  const buckets = new Map<string, AggregatedClientLine>();

  for (const line of lines) {
    if (!line.isIncluded) {
      continue;
    }

    const key = resolveKey(line);
    const existing = buckets.get(key);

    if (!existing) {
      const baseTitle = stripRoomSuffix(line.title);

      buckets.set(key, {
        id: stableAggregatedId(idPrefix, key),
        title: baseTitle,
        category: line.category,
        quantity: safeMoney(line.quantity),
        unit: line.unit,
        unitPrice: line.unitPrice,
        total: lineTotal(line.quantity, line.unitPrice),
        isIncluded: true,
        note: line.note,
        roomName: line.roomName,
        packageCode: line.packageCode,
        targetKind: line.targetKind,
        sources: [mapSource(line)],
      });
      continue;
    }

    const quantity = safeMoney(existing.quantity) + safeMoney(line.quantity);

    buckets.set(key, {
      ...existing,
      quantity,
      total: lineTotal(quantity, existing.unitPrice),
      sources: pushSource(existing.sources, mapSource(line)),
    });
  }

  return [...buckets.values()];
}

export function aggregateWorkLines(lines: EstimateDocumentLine[]): AggregatedClientLine[] {
  const workLines = lines.filter((line) => line.category === "works");

  return aggregateLinesByKey(
    workLines,
    workAggregationKey,
    "work",
    (line) => ({
      roomName: line.roomName,
      packageCode: line.packageCode,
      lineId: line.id,
    }),
  );
}

function mapProcurementCategoryToEstimateCategory(
  category: FlooringSpecificationCategory,
): EstimateCostCategory {
  return category === "tools" ? "consumables" : category;
}

function procurementLineToAggregatedLine(line: FlooringProcurementLine): AggregatedClientLine {
  const category = mapProcurementCategoryToEstimateCategory(line.category);
  const unitPrice =
    line.purchaseMode === "package" && line.packagePrice !== undefined
      ? line.packagePrice
      : line.unitPrice;

  return {
    id: stableAggregatedId("procurement", line.aggregationKey),
    title: line.title,
    category,
    quantity: line.purchaseQuantity,
    unit: line.purchaseUnit,
    unitPrice,
    total: line.total,
    isIncluded: true,
    note: line.calculationNote ?? line.note,
    sources: [{ procurementCode: line.code }],
  };
}

function isGlobalMaterialLine(line: EstimateDocumentLine): boolean {
  return line.isIncluded && GLOBAL_MATERIAL_LINE_IDS.has(line.id);
}

export function materialLinesFromProcurement(
  procurement: FlooringProcurementLine[],
  globalMaterialLines: EstimateDocumentLine[] = [],
): AggregatedClientLine[] {
  const materialProcurement = procurement.filter((line) => line.category !== "works");
  const procurementKeys = new Set(materialProcurement.map((line) => line.aggregationKey));
  const materialLines = materialProcurement.map(procurementLineToAggregatedLine);

  for (const globalLine of globalMaterialLines) {
    if (!isGlobalMaterialLine(globalLine)) {
      continue;
    }

    if (procurementKeys.has(globalLine.id) || procurementKeys.has(stripRoomSuffix(globalLine.title))) {
      continue;
    }

    materialLines.push({
      id: globalLine.id,
      title: stripRoomSuffix(globalLine.title),
      category: globalLine.category,
      quantity: globalLine.quantity,
      unit: globalLine.unit,
      unitPrice: globalLine.unitPrice,
      total: lineTotal(globalLine.quantity, globalLine.unitPrice),
      isIncluded: true,
      note: globalLine.note,
      sources: [{ lineId: globalLine.id }],
    });
  }

  return materialLines;
}

export function aggregateMaterialLinesFromDocumentLines(
  lines: EstimateDocumentLine[],
): AggregatedClientLine[] {
  const materialLines = lines.filter((line) => MATERIAL_DOCUMENT_CATEGORIES.has(line.category));

  return aggregateLinesByKey(
    materialLines,
    documentMaterialAggregationKey,
    "material",
    (line) => ({
      roomName: line.roomName,
      packageCode: line.packageCode,
      lineId: line.id,
    }),
  );
}

export function buildAggregatedClientPresentation(
  input: BuildAggregatedClientPresentationInput,
): AggregatedClientPresentation {
  const workLines = aggregateWorkLines(input.lines);
  const globalMaterialLines = input.lines.filter(isGlobalMaterialLine);
  const materialLines =
    input.procurement && input.procurement.length > 0
      ? materialLinesFromProcurement(input.procurement, globalMaterialLines)
      : aggregateMaterialLinesFromDocumentLines(input.lines);

  const workTotals = calculateDocumentLineTotals(workLines);
  const materialTotals = calculateDocumentLineTotals(materialLines);

  const presentationGroups: EstimatePresentationGroup[] = [
    { kind: "works", title: "Работы", lines: workLines, totals: workTotals },
    {
      kind: "materials",
      title: "Материалы и расходники",
      lines: materialLines,
      totals: materialTotals,
    },
  ];

  return {
    workLines,
    materialLines,
    workTotals,
    materialTotals,
    presentationGroups,
  };
}
