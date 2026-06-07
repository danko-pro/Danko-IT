import type { FlooringPackageSpecLine } from "./public-flooring-snapshot";
import {
  computeFlooringSpecLineRawQuantity,
  type FlooringRoomForSpecification,
  type FlooringSpecCatalogSource,
  type FlooringSpecificationCategory,
} from "./public-estimate-flooring-spec";

export type FlooringProcurementLine = {
  aggregationKey: string;
  code: string;
  title: string;
  category: FlooringSpecificationCategory;
  rawQuantity: number;
  rawUnit: string;
  purchaseMode: "raw" | "package";
  purchaseQuantity: number;
  purchaseUnit: string;
  unitPrice: number;
  packageSize?: number;
  packagePrice?: number;
  total: number;
  calculationNote?: string;
  note?: string;
};

type RoomProcurementEntry = {
  roomId: string;
  line: FlooringPackageSpecLine;
  rawQuantity: number;
};

function safeNumber(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function resolveAggregationKey(line: FlooringPackageSpecLine): string {
  return line.aggregationKey?.trim() || line.code || `${line.title}|${line.unit}`;
}

function resolvePurchaseMode(line: FlooringPackageSpecLine): "raw" | "package" {
  return line.purchaseMode === "package" ? "package" : "raw";
}

function resolvePurchaseAggregation(line: FlooringPackageSpecLine): "room" | "project" {
  if (line.purchaseAggregation === "room" || line.purchaseAggregation === "project") {
    return line.purchaseAggregation;
  }

  return line.category === "works" ? "room" : "project";
}

function collectRoomProcurementEntries(params: {
  room: FlooringRoomForSpecification;
  source: FlooringSpecCatalogSource;
  sourceKind: "covering" | "preparation" | "layout";
}): RoomProcurementEntry[] {
  const { room, source, sourceKind } = params;
  const specLines = source.specLines;

  if (!specLines?.length || !room.isIncluded || room.area <= 0) {
    return [];
  }

  const purchaseArea = safeNumber(room.purchaseArea ?? room.area);

  return specLines.map((line) => ({
    roomId: room.roomId,
    line,
    rawQuantity: computeFlooringSpecLineRawQuantity({
      line,
      area: room.area,
      purchaseArea,
      sourceKind,
      layoutLaborFactor: source.laborFactor,
    }),
  }));
}

function aggregatePurchaseQuantity(
  entries: RoomProcurementEntry[],
  line: FlooringPackageSpecLine,
  packageSize: number,
  purchaseAggregation: "room" | "project",
): number {
  if (purchaseAggregation === "project") {
    const sumRaw = entries.reduce((sum, entry) => sum + entry.rawQuantity, 0);
    return Math.ceil(sumRaw / packageSize);
  }

  const byRoom = new Map<string, number>();

  for (const entry of entries) {
    byRoom.set(entry.roomId, (byRoom.get(entry.roomId) ?? 0) + entry.rawQuantity);
  }

  let purchaseQuantity = 0;

  for (const rawQuantity of byRoom.values()) {
    purchaseQuantity += Math.ceil(rawQuantity / packageSize);
  }

  return purchaseQuantity;
}

function buildProcurementLineFromEntries(
  aggregationKey: string,
  entries: RoomProcurementEntry[],
): FlooringProcurementLine {
  const line = entries[0]!.line;
  const purchaseMode = resolvePurchaseMode(line);
  const purchaseAggregation = resolvePurchaseAggregation(line);
  const unitPrice = safeNumber(line.unitPrice);
  const rawQuantity = entries.reduce((sum, entry) => sum + entry.rawQuantity, 0);
  const packageSize = safeNumber(line.packageSize ?? 0);
  const packagePrice = safeNumber(line.packagePrice ?? 0);
  const canUsePackage = purchaseMode === "package" && packageSize > 0 && packagePrice > 0;

  if (canUsePackage) {
    const purchaseQuantity = aggregatePurchaseQuantity(entries, line, packageSize, purchaseAggregation);
    const purchaseUnit = "уп.";

    return {
      aggregationKey,
      code: line.code,
      title: line.title,
      category: line.category,
      rawQuantity,
      rawUnit: line.unit,
      purchaseMode: "package",
      purchaseQuantity,
      purchaseUnit,
      unitPrice,
      packageSize,
      packagePrice,
      total: purchaseQuantity * packagePrice,
      calculationNote: line.calculationNote,
    };
  }

  const note =
    purchaseMode === "package" && (packageSize <= 0 || packagePrice <= 0)
      ? "Нет данных упаковки — расчёт в исходных единицах"
      : undefined;

  return {
    aggregationKey,
    code: line.code,
    title: line.title,
    category: line.category,
    rawQuantity,
    rawUnit: line.unit,
    purchaseMode: "raw",
    purchaseQuantity: rawQuantity,
    purchaseUnit: line.unit,
    unitPrice,
    total: rawQuantity * unitPrice,
    calculationNote: line.calculationNote,
    note,
  };
}

export function buildFlooringProcurementSummary(input: {
  roomResults: FlooringRoomForSpecification[];
  coveringByCode: Record<string, FlooringSpecCatalogSource>;
  preparationByCode: Record<string, FlooringSpecCatalogSource>;
  layoutByCode: Record<string, FlooringSpecCatalogSource>;
}): FlooringProcurementLine[] {
  const { roomResults, coveringByCode, preparationByCode, layoutByCode } = input;
  const includedRooms = roomResults.filter((room) => room.isIncluded && room.area > 0);
  const entriesByAggregationKey = new Map<string, RoomProcurementEntry[]>();

  for (const room of includedRooms) {
    const sources: Array<{
      source: FlooringSpecCatalogSource | undefined;
      sourceKind: "covering" | "preparation" | "layout";
    }> = [
      { source: coveringByCode[room.coveringType], sourceKind: "covering" },
      { source: preparationByCode[room.preparationType], sourceKind: "preparation" },
      { source: layoutByCode[room.layoutType], sourceKind: "layout" },
    ];

    for (const { source, sourceKind } of sources) {
      if (!source) {
        continue;
      }

      for (const entry of collectRoomProcurementEntries({ room, source, sourceKind })) {
        const aggregationKey = resolveAggregationKey(entry.line);
        const bucket = entriesByAggregationKey.get(aggregationKey) ?? [];
        bucket.push(entry);
        entriesByAggregationKey.set(aggregationKey, bucket);
      }
    }
  }

  if (entriesByAggregationKey.size === 0) {
    return [];
  }

  return [...entriesByAggregationKey.entries()]
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey, "ru"))
    .map(([aggregationKey, entries]) => buildProcurementLineFromEntries(aggregationKey, entries));
}
