import type { EstimateSection, EstimateSectionId, PublicEstimateResult } from "../public-estimate-model";
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
): EstimateSpecSection[] {
  const expansionOptions = buildPlumbingSpecExpansionOptions(plumbingOptions, plumbingResult);

  return sections.map((section) => {
    if (section.id !== "plumbing") {
      return section;
    }

    return expandPlumbingSectionForSpec(section, expansionOptions);
  });
}

export function buildEstimateSpecModalData(params: {
  specModal: EstimateSpecModalState | null;
  allEstimateSections: EstimateSection[];
  estimateResult: PublicEstimateResult;
  plumbingOptions: PlumbingOptions;
  plumbingResult: PlumbingCalculationResult;
}): EstimateSpecModalData | null {
  const { specModal, allEstimateSections, estimateResult, plumbingOptions, plumbingResult } = params;

  if (!specModal) {
    return null;
  }

  if (specModal.kind === "full") {
    return {
      title: "Полная спецификация",
      subtitle: "Все разделы текущей сметы по позициям",
      sections: mapSectionsForSpec(estimateResult.sections, plumbingOptions, plumbingResult),
    };
  }

  const section = allEstimateSections.find((candidate) => candidate.id === specModal.sectionId);

  if (!section) {
    return null;
  }

  return {
    title: section.title,
    subtitle: section.description,
    sections: mapSectionsForSpec([section], plumbingOptions, plumbingResult),
  };
}
