import type { EstimateSection, EstimateSectionId, PublicEstimateResult } from "../public-estimate-model";
import { expandFlooringSectionForSpec } from "../public-estimate-flooring-spec";
import type { FlooringCalculationResult } from "../public-estimate-flooring";
import type { FlooringProcurementLine } from "../public-estimate-flooring-procurement";
import {
  expandPlumbingSectionForSpec,
  type PlumbingCalculationResult,
  type PlumbingOptions,
} from "../public-estimate-plumbing";
import type { EstimateSpecSection, ExpandPlumbingSectionForSpecOptions } from "../public-estimate-plumbing-zones";

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
    // A8.2: мигрированные legacy-опции разворачиваются в атомарную спецификацию (без строки резерва).
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

export function mapSectionsForSpec(
  sections: EstimateSection[],
  plumbingOptions: PlumbingOptions,
  plumbingResult: PlumbingCalculationResult,
  flooringResult: Pick<FlooringCalculationResult, "specificationSection">,
): EstimateSpecSection[] {
  const expansionOptions = buildPlumbingSpecExpansionOptions(plumbingOptions, plumbingResult);

  return sections.map((section) => {
    if (section.id === "plumbing") {
      return expandPlumbingSectionForSpec(section, expansionOptions);
    }

    if (section.id === "flooring") {
      return expandFlooringSectionForSpec(section, flooringResult.specificationSection);
    }

    return section;
  });
}

export function buildEstimateSpecModalData(params: {
  specModal: EstimateSpecModalState | null;
  allEstimateSections: EstimateSection[];
  estimateResult: PublicEstimateResult;
  plumbingOptions: PlumbingOptions;
  plumbingResult: PlumbingCalculationResult;
  flooringResult: Pick<FlooringCalculationResult, "specificationSection" | "procurementLines">;
}): EstimateSpecModalData | null {
  const { specModal, allEstimateSections, estimateResult, plumbingOptions, plumbingResult, flooringResult } = params;

  if (!specModal) {
    return null;
  }

  const includeProcurement =
    specModal.kind === "full" || specModal.sectionId === "flooring";
  const procurementLines = includeProcurement ? flooringResult.procurementLines : undefined;

  if (specModal.kind === "full") {
    return {
      title: "Полная спецификация",
      subtitle: "Все разделы текущей сметы по позициям",
      sections: mapSectionsForSpec(estimateResult.sections, plumbingOptions, plumbingResult, flooringResult),
      procurementLines,
    };
  }

  const section = allEstimateSections.find((candidate) => candidate.id === specModal.sectionId);

  if (!section) {
    return null;
  }

  return {
    title: section.title,
    subtitle: section.description,
    sections: mapSectionsForSpec([section], plumbingOptions, plumbingResult, flooringResult),
    procurementLines,
  };
}
