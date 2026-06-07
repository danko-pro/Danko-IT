import type { EstimateSection, EstimateSectionId, PublicEstimateResult } from "../public-estimate-model";
import { expandFlooringSectionForSpec } from "../public-estimate-flooring-spec";
import type { FlooringCalculationResult } from "../public-estimate-flooring";
import {
  expandPlumbingSectionForSpec,
  type PlumbingCalculationResult,
  type PlumbingOptions,
} from "../public-estimate-plumbing";
import type { EstimateSpecSection } from "../public-estimate-plumbing-zones";
import {
  buildPlumbingSpecExpansionOptions,
  buildPublicEstimateDocument,
  documentToEstimateSpecModalData,
  type EstimateSpecModalData,
  type EstimateSpecModalState,
} from "./public-estimate-document";

export type { EstimateSpecModalData, EstimateSpecModalState } from "./public-estimate-document";
export { buildPlumbingSpecExpansionOptions } from "./public-estimate-document";

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

function resolveModalFloorArea(estimateResult: PublicEstimateResult) {
  const { total, pricePerSquareMeter } = estimateResult.totals;

  if (pricePerSquareMeter > 0) {
    return total / pricePerSquareMeter;
  }

  return 0;
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

  const includeProcurement = specModal.kind === "full" || specModal.sectionId === "flooring";
  const documentContext = {
    floorArea: resolveModalFloorArea(estimateResult),
    flooringResult,
    plumbingOptions,
    plumbingResult,
    modalState: specModal,
  };

  if (specModal.kind === "full") {
    const document = buildPublicEstimateDocument({
      result: estimateResult,
      context: documentContext,
    });

    return documentToEstimateSpecModalData(document, {
      subtitle: "Все разделы текущей сметы по позициям",
      legacySections: estimateResult.sections,
      includeProcurement,
    });
  }

  const section = allEstimateSections.find((candidate) => candidate.id === specModal.sectionId);

  if (!section) {
    return null;
  }

  const document = buildPublicEstimateDocument({
    result: { sections: [section], totals: estimateResult.totals },
    context: documentContext,
  });

  return documentToEstimateSpecModalData(document, {
    subtitle: section.description,
    legacySections: [section],
    includeProcurement,
  });
}
