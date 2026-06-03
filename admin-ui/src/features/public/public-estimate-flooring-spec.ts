import {
  calculateSectionTotals,
  type EstimateCategoryTotals,
  type EstimateCostCategory,
  type EstimateLineItem,
  type EstimateSection,
} from "./public-estimate-model";
import type { FlooringPackageSpecLine } from "./public-flooring-snapshot";

export type FlooringSpecificationCategory = FlooringPackageSpecLine["category"];

export type FlooringRoomForSpecification = {
  roomId: string;
  roomName: string;
  area: number;
  isIncluded: boolean;
  coveringType: string;
  preparationType: string;
  layoutType: string;
  /** Purchase area incl. catalog waste; defaults to `area` when omitted. */
  purchaseArea?: number;
};

export type FlooringSpecificationLine = {
  id: string;
  title: string;
  category: FlooringSpecificationCategory;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  sourceLabel: string;
  roomName?: string;
};

export type FlooringSpecCatalogSource = {
  code: string;
  title: string;
  specLines?: FlooringPackageSpecLine[];
  /** Layout catalog labor multiplier applied to work spec lines. */
  laborFactor?: number;
};

const COVERING_FLAT_PREFIXES = [
  "flooring-material",
  "flooring-underlay",
  "flooring-adhesive",
  "flooring-primer",
  "flooring-svp",
  "flooring-grout",
  "flooring-tools",
] as const;

const PREPARATION_FLAT_PREFIXES = ["flooring-preparation-labor", "flooring-preparation-material"] as const;

const LAYOUT_FLAT_PREFIXES = ["flooring-installation"] as const;

const GLOBAL_FLAT_IDS = new Set([
  "flooring-plinth-material",
  "flooring-plinth-labor",
  "flooring-thresholds",
  "flooring-demolition",
]);

function safeNumber(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function mapSpecificationCategoryToEstimateCategory(
  category: FlooringSpecificationCategory,
): EstimateCostCategory {
  return category === "tools" ? "consumables" : category;
}

function isRoomFlatItem(item: EstimateLineItem, roomId: string, prefixes: readonly string[]) {
  return prefixes.some((prefix) => item.id === `${prefix}-${roomId}`);
}

function isGlobalFlatItem(item: EstimateLineItem) {
  return GLOBAL_FLAT_IDS.has(item.id);
}

function coveringLineUsesPurchaseArea(category: FlooringPackageSpecLine["category"]) {
  return category === "materials" || category === "consumables";
}

function expandSpecLinesForRoom(params: {
  room: FlooringRoomForSpecification;
  source: FlooringSpecCatalogSource;
  sourceKind: "covering" | "preparation" | "layout";
  area: number;
}): FlooringSpecificationLine[] {
  const { room, source, sourceKind, area } = params;
  const specLines = source.specLines;

  if (!specLines?.length) {
    return [];
  }

  const safeArea = safeNumber(area);
  const purchaseArea = safeNumber(room.purchaseArea ?? area);
  const wasteFactor = safeArea > 0 ? purchaseArea / safeArea : 1;
  const layoutLaborFactor = safeNumber(source.laborFactor ?? 1);

  const sourceLabel =
    sourceKind === "covering"
      ? `Покрытие: ${source.title}`
      : sourceKind === "preparation"
        ? `Подготовка: ${source.title}`
        : `Укладка: ${source.title}`;

  return specLines.map((line) => {
    const quantity = safeArea;
    const unitPrice = safeNumber(line.unitPrice);
    const quantityPerBasis = safeNumber(line.quantityPerBasis);
    let effectiveQuantityPerBasis = quantityPerBasis;

    if (sourceKind === "covering" && coveringLineUsesPurchaseArea(line.category)) {
      effectiveQuantityPerBasis *= wasteFactor;
    } else if (sourceKind === "layout" && line.category === "works") {
      effectiveQuantityPerBasis *= layoutLaborFactor;
    }

    const total = quantity * unitPrice * effectiveQuantityPerBasis;

    return {
      id: `flooring-spec-${sourceKind}-${source.code}-${line.code}-${room.roomId}`,
      title: `${line.title} — ${room.roomName}`,
      category: line.category,
      quantity,
      unit: line.unit,
      unitPrice,
      total,
      sourceLabel,
      roomName: room.roomName,
    };
  });
}

function specificationLineToEstimateLineItem(line: FlooringSpecificationLine): EstimateLineItem {
  const quantity = line.quantity;
  const effectiveUnitPrice = quantity > 0 ? line.total / quantity : line.unitPrice;

  return {
    id: line.id,
    sectionId: "flooring",
    title: line.title,
    category: mapSpecificationCategoryToEstimateCategory(line.category),
    quantity,
    unit: line.unit,
    unitPrice: effectiveUnitPrice,
    total: line.total,
    isIncluded: true,
    note: line.sourceLabel,
  };
}

export function buildFlooringSpecification(params: {
  roomResults: FlooringRoomForSpecification[];
  flatSection: EstimateSection;
  coveringByCode: Record<string, FlooringSpecCatalogSource>;
  preparationByCode: Record<string, FlooringSpecCatalogSource>;
  layoutByCode: Record<string, FlooringSpecCatalogSource>;
}): { specificationLines: FlooringSpecificationLine[]; specificationSection: EstimateSection } {
  const { roomResults, flatSection, coveringByCode, preparationByCode, layoutByCode } = params;
  const includedRooms = roomResults.filter((room) => room.isIncluded && room.area > 0);
  const specificationLines: FlooringSpecificationLine[] = [];
  const skippedFlatItemIds = new Set<string>();

  for (const room of includedRooms) {
    const covering = coveringByCode[room.coveringType];
    const preparation = preparationByCode[room.preparationType];
    const layout = layoutByCode[room.layoutType];

    if (covering?.specLines?.length) {
      specificationLines.push(
        ...expandSpecLinesForRoom({ room, source: covering, sourceKind: "covering", area: room.area }),
      );
      for (const prefix of COVERING_FLAT_PREFIXES) {
        skippedFlatItemIds.add(`${prefix}-${room.roomId}`);
      }
    }

    if (preparation?.specLines?.length) {
      specificationLines.push(
        ...expandSpecLinesForRoom({ room, source: preparation, sourceKind: "preparation", area: room.area }),
      );
      for (const prefix of PREPARATION_FLAT_PREFIXES) {
        skippedFlatItemIds.add(`${prefix}-${room.roomId}`);
      }
    }

    if (layout?.specLines?.length) {
      specificationLines.push(
        ...expandSpecLinesForRoom({ room, source: layout, sourceKind: "layout", area: room.area }),
      );
      for (const prefix of LAYOUT_FLAT_PREFIXES) {
        skippedFlatItemIds.add(`${prefix}-${room.roomId}`);
      }
    }
  }

  if (specificationLines.length === 0) {
    return {
      specificationLines: [],
      specificationSection: flatSection,
    };
  }

  const fallbackFlatItems = flatSection.items.filter((item) => {
    if (skippedFlatItemIds.has(item.id)) {
      return false;
    }

    if (isGlobalFlatItem(item)) {
      return true;
    }

    return includedRooms.some(
      (room) =>
        isRoomFlatItem(item, room.roomId, COVERING_FLAT_PREFIXES) ||
        isRoomFlatItem(item, room.roomId, PREPARATION_FLAT_PREFIXES) ||
        isRoomFlatItem(item, room.roomId, LAYOUT_FLAT_PREFIXES),
    );
  });

  const specificationItems = [
    ...specificationLines.map(specificationLineToEstimateLineItem),
    ...fallbackFlatItems,
  ];

  return {
    specificationLines,
    specificationSection: {
      ...flatSection,
      items: specificationItems,
    },
  };
}

export function expandFlooringSectionForSpec(
  section: EstimateSection,
  specificationSection: EstimateSection,
): EstimateSection {
  if (specificationSection.items === section.items) {
    return section;
  }

  return {
    ...section,
    items: specificationSection.items,
  };
}

/** Sum included line totals by category (ignores section.totals copied from flat). */
export function calculateSpecificationSectionItemTotals(section: EstimateSection): EstimateCategoryTotals {
  return calculateSectionTotals(section.items);
}
