import {
  buildAggregatedClientPresentation,
  type AggregatedClientPresentation,
} from "./aggregate-client-lines";
import type { EstimateObjectMeta } from "./context";
import type { FlooringCalculationResult } from "../public-estimate-flooring";
import type { FlooringProcurementLine } from "../public-estimate-flooring-procurement";
import type { PlumbingCalculationResult, PlumbingOptions } from "../public-estimate-plumbing";
import {
  expandPlumbingSectionForSpec,
  type EstimateSpecSection,
  type ExpandPlumbingSectionForSpecOptions,
} from "../public-estimate-plumbing-zones";
import {
  type EstimateCategoryTotals,
  type EstimateCostCategory,
  type EstimateLineItem,
  type EstimateSection,
  type EstimateSectionId,
  type PublicEstimateResult,
} from "../public-estimate-model";

export type EstimateDocumentTotals = EstimateCategoryTotals & {
  pricePerSquareMeter?: number;
};

export type EstimateDocumentLine = {
  id: string;
  title: string;
  category: EstimateCostCategory;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  isIncluded: boolean;
  note?: string;
  roomName?: string;
  packageCode?: string;
  targetKind?: "covering" | "preparation" | "layout" | string;
};

export type EstimateSelectedPackage = {
  packageCode: string;
  title: string;
  targetKind: string;
  lines: EstimateDocumentLine[];
  procurementLines?: FlooringProcurementLine[];
  totals: EstimateDocumentTotals;
};

export type EstimateDocumentGroup = {
  scopeLabel: string;
  selectedPackages: EstimateSelectedPackage[];
  totals: EstimateDocumentTotals;
};

export type EstimateDocumentSection = {
  sectionId: EstimateSectionId;
  title: string;
  description?: string;
  specIntro?: string;
  groups: EstimateDocumentGroup[];
  flatLines?: EstimateDocumentLine[];
  totals: EstimateDocumentTotals;
};

export type PublicEstimateDocument = {
  meta: {
    generatedAt: string;
    title: string;
    estimateId?: string;
    object?: EstimateObjectMeta;
    brand?: { logoUrl: string; name: string; subtitle?: string };
    floorArea?: number;
  };
  sections: EstimateDocumentSection[];
  appendices?: {
    procurement?: FlooringProcurementLine[];
    disclaimers?: string[];
  };
  totals: EstimateDocumentTotals;
};

export type EstimateSpecModalState = {
  kind: "section" | "full";
  sectionId?: EstimateSectionId;
};

export type EstimateSpecModalData = {
  title: string;
  subtitle?: string;
  sections: EstimateSpecSection[];
  procurementLines?: FlooringProcurementLine[];
};

export type BuildPublicEstimateDocumentContext = {
  floorArea: number;
  objectMeta?: EstimateObjectMeta;
  brand?: PublicEstimateDocument["meta"]["brand"];
  title?: string;
  estimateId?: string;
  flooringResult?: Pick<FlooringCalculationResult, "specificationSection" | "procurementLines">;
  plumbingOptions?: PlumbingOptions;
  plumbingResult?: PlumbingCalculationResult;
  modalState?: EstimateSpecModalState;
};

export type BuildPublicEstimateDocumentInput = {
  result: PublicEstimateResult;
  context: BuildPublicEstimateDocumentContext;
};

export type DocumentToEstimateSpecModalOptions = {
  subtitle?: string;
  legacySections: EstimateSection[];
  includeProcurement: boolean;
};

export function buildPlumbingSpecExpansionOptions(
  plumbingOptions: PlumbingOptions,
  plumbingResult: PlumbingCalculationResult,
): ExpandPlumbingSectionForSpecOptions {
  return {
    kitchenSinkPackageLevel: plumbingOptions.kitchenSinkPackageLevel,
    includeKitchenSink: plumbingResult.hasKitchen && plumbingOptions.includeKitchenSink,
    dishwasherPackageLevel: plumbingOptions.dishwasherPackageLevel,
    includeDishwasher: plumbingResult.hasKitchen && plumbingOptions.includeDishwasherOutput,
    showerPackageLevel: plumbingOptions.showerPackageLevel,
    includeShower: plumbingResult.bathroomCount > 0 && plumbingOptions.includeShowerZone,
    includeInstallRelocation: plumbingResult.bathroomCount > 0 && plumbingOptions.includeInstallRelocation,
    includeBathroomSet: plumbingResult.bathroomCount > 0 && plumbingOptions.includeBathroomSet,
    includeBath:
      plumbingResult.bathroomCount > 0 &&
      plumbingOptions.includeBath &&
      !plumbingOptions.includeShowerZone,
    includeHygienicShower: plumbingResult.bathroomCount > 0 && plumbingOptions.includeHygienicShower,
    includeElectricTowelRail: plumbingResult.bathroomCount > 0 && plumbingOptions.includeElectricTowelRail,
    includeWasherOutput: plumbingOptions.includeWasherOutput,
    includeWaterNode: plumbingOptions.includeWaterNode && plumbingResult.hasPlumbingRooms,
    includeLeakProtection:
      plumbingOptions.includeWaterNode &&
      plumbingResult.hasPlumbingRooms &&
      plumbingOptions.includeLeakProtection,
  };
}

function documentLineToEstimateLineItem(line: EstimateDocumentLine, sectionId: EstimateSectionId): EstimateLineItem {
  return {
    id: line.id,
    sectionId,
    title: line.title,
    category: line.category,
    quantity: line.quantity,
    unit: line.unit,
    unitPrice: line.unitPrice,
    total: line.total,
    isIncluded: line.isIncluded,
    note: line.note,
  };
}

export function documentToEstimateSpecSections(
  document: PublicEstimateDocument,
  legacySections: EstimateSection[],
): EstimateSpecSection[] {
  const legacyById = new Map(legacySections.map((section) => [section.id, section]));

  return document.sections.map((documentSection) => {
    const legacy = legacyById.get(documentSection.sectionId);
    const items = collectDocumentSectionLines(documentSection).map((line) =>
      documentLineToEstimateLineItem(line, documentSection.sectionId),
    );
    const section: EstimateSpecSection = {
      id: documentSection.sectionId,
      title: documentSection.title,
      description: documentSection.description,
      items,
      totals: legacy?.totals ?? documentSection.totals,
    };

    if (documentSection.specIntro) {
      section.specIntro = documentSection.specIntro;
    }

    return section;
  });
}

export function documentToEstimateSpecModalData(
  document: PublicEstimateDocument,
  options: DocumentToEstimateSpecModalOptions,
): EstimateSpecModalData {
  return {
    title: document.meta.title,
    subtitle: options.subtitle,
    sections: documentToEstimateSpecSections(document, options.legacySections),
    procurementLines: options.includeProcurement ? (document.appendices?.procurement ?? []) : undefined,
  };
}

const DEFAULT_BRAND: NonNullable<PublicEstimateDocument["meta"]["brand"]> = {
  name: "DANKO BUILTECH",
  logoUrl: "/brand/danko-logo-mark.png",
};

const emptyCategoryTotals: EstimateCategoryTotals = {
  works: 0,
  materials: 0,
  equipment: 0,
  consumables: 0,
  total: 0,
};

function safeMoney(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function roundMoney(value: number) {
  return Math.round(safeMoney(value) * 100) / 100;
}

function createEmptyCategoryTotals(): EstimateCategoryTotals {
  return { ...emptyCategoryTotals };
}

function calculateDocumentLineTotal(line: EstimateDocumentLine) {
  if (!line.isIncluded) {
    return 0;
  }

  return roundMoney(safeMoney(line.quantity) * safeMoney(line.unitPrice));
}

export function estimateLineItemToDocumentLine(item: EstimateLineItem): EstimateDocumentLine {
  return {
    id: item.id,
    title: item.title,
    category: item.category,
    quantity: item.quantity,
    unit: item.unit,
    unitPrice: item.unitPrice,
    total: item.total,
    isIncluded: item.isIncluded,
    note: item.note,
  };
}

export function calculateDocumentLineTotals(lines: EstimateDocumentLine[]): EstimateDocumentTotals {
  return lines.reduce<EstimateCategoryTotals>((totals, line) => {
    const lineTotal = calculateDocumentLineTotal(line);

    return {
      ...totals,
      [line.category]: totals[line.category] + lineTotal,
      total: totals.total + lineTotal,
    };
  }, createEmptyCategoryTotals());
}

export function collectDocumentSectionLines(section: EstimateDocumentSection): EstimateDocumentLine[] {
  const packageLines = section.groups.flatMap((group) =>
    group.selectedPackages.flatMap((selectedPackage) => selectedPackage.lines),
  );

  return [...packageLines, ...(section.flatLines ?? [])];
}

/** Shadow PF5c1: aggregated client presentation; not used by modal/PDF. */
export function getAggregatedPresentationForSection(
  document: PublicEstimateDocument,
  sectionId: EstimateSectionId,
): AggregatedClientPresentation | undefined {
  if (sectionId !== "flooring") {
    return undefined;
  }

  const section = document.sections.find((candidate) => candidate.sectionId === sectionId);

  if (!section) {
    return undefined;
  }

  return buildAggregatedClientPresentation({
    lines: collectDocumentSectionLines(section),
    procurement: document.appendices?.procurement,
  });
}

export function calculateDocumentSectionTotals(section: EstimateDocumentSection): EstimateDocumentTotals {
  return calculateDocumentLineTotals(collectDocumentSectionLines(section));
}

export function calculateDocumentTotals(
  sections: EstimateDocumentSection[],
  floorArea: number,
): EstimateDocumentTotals {
  const totals = sections.reduce<EstimateCategoryTotals>((currentTotals, section) => {
    const sectionTotals = section.totals;

    return {
      works: currentTotals.works + sectionTotals.works,
      materials: currentTotals.materials + sectionTotals.materials,
      equipment: currentTotals.equipment + sectionTotals.equipment,
      consumables: currentTotals.consumables + sectionTotals.consumables,
      total: currentTotals.total + sectionTotals.total,
    };
  }, createEmptyCategoryTotals());

  const safeFloorArea = safeMoney(floorArea);

  return {
    ...totals,
    pricePerSquareMeter: safeFloorArea > 0 ? totals.total / safeFloorArea : 0,
  };
}

export function buildFlatDocumentSection(section: EstimateSection): EstimateDocumentSection {
  const flatLines = section.items.map(estimateLineItemToDocumentLine);
  const totals = calculateDocumentLineTotals(flatLines);

  return {
    sectionId: section.id,
    title: section.title,
    description: section.description,
    groups: [
      {
        scopeLabel: section.title,
        selectedPackages: [],
        totals,
      },
    ],
    flatLines,
    totals,
  };
}

function buildFlooringDocumentSection(specificationSection: EstimateSection): EstimateDocumentSection {
  const flatLines = specificationSection.items.map(estimateLineItemToDocumentLine);
  const totals = calculateDocumentLineTotals(flatLines);

  return {
    sectionId: specificationSection.id,
    title: specificationSection.title,
    description: specificationSection.description,
    groups: [
      {
        scopeLabel: specificationSection.title,
        selectedPackages: [],
        totals,
      },
    ],
    flatLines,
    totals,
  };
}

function buildPlumbingDocumentSection(
  section: EstimateSection,
  plumbingOptions: PlumbingOptions,
  plumbingResult: PlumbingCalculationResult,
): EstimateDocumentSection {
  const expansionOptions = buildPlumbingSpecExpansionOptions(plumbingOptions, plumbingResult);
  const expanded = expandPlumbingSectionForSpec(section, expansionOptions);
  const documentSection = buildFlatDocumentSection(expanded);

  if (expanded.specIntro) {
    return { ...documentSection, specIntro: expanded.specIntro };
  }

  return documentSection;
}

function resolveDocumentTitle(
  context: BuildPublicEstimateDocumentContext,
  result: PublicEstimateResult,
): string {
  if (context.title) {
    return context.title;
  }

  if (context.modalState?.kind === "full") {
    return "Полная спецификация";
  }

  if (context.modalState?.sectionId) {
    const section = result.sections.find((candidate) => candidate.id === context.modalState?.sectionId);
    if (section) {
      return section.title;
    }
  }

  return "Смета";
}

export function buildPublicEstimateDocument(input: BuildPublicEstimateDocumentInput): PublicEstimateDocument {
  const { result, context } = input;
  const disclaimers: string[] = [];

  const sections = result.sections.map((section) => {
    if (section.id === "flooring" && context.flooringResult) {
      return buildFlooringDocumentSection(context.flooringResult.specificationSection);
    }

    if (section.id === "plumbing" && context.plumbingOptions && context.plumbingResult) {
      const documentSection = buildPlumbingDocumentSection(
        section,
        context.plumbingOptions,
        context.plumbingResult,
      );

      if (documentSection.specIntro) {
        disclaimers.push(documentSection.specIntro);
      }

      return documentSection;
    }

    return buildFlatDocumentSection(section);
  });

  const appendices: NonNullable<PublicEstimateDocument["appendices"]> = {};

  if (context.flooringResult?.procurementLines && context.flooringResult.procurementLines.length > 0) {
    appendices.procurement = context.flooringResult.procurementLines;
  }

  if (disclaimers.length > 0) {
    appendices.disclaimers = disclaimers;
  }

  const hasAppendices = appendices.procurement !== undefined || appendices.disclaimers !== undefined;

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      title: resolveDocumentTitle(context, result),
      estimateId: context.estimateId,
      object: context.objectMeta,
      brand: context.brand ?? DEFAULT_BRAND,
      floorArea: context.floorArea,
    },
    sections,
    appendices: hasAppendices ? appendices : undefined,
    totals: calculateDocumentTotals(sections, context.floorArea),
  };
}
