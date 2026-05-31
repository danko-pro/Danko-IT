import { useCallback, useMemo, useState } from "react";
import type { EstimateSection, EstimateSectionId, PublicEstimateResult } from "../public-estimate-model";
import type { PlumbingCalculationResult, PlumbingOptions } from "../public-estimate-plumbing";
import { buildEstimateSpecModalData, type EstimateSpecModalState } from "./spec";

export function useEstimateSpecModal(params: {
  allEstimateSections: EstimateSection[];
  estimateResult: PublicEstimateResult;
  plumbingOptions: PlumbingOptions;
  plumbingResult: PlumbingCalculationResult;
}) {
  const { allEstimateSections, estimateResult, plumbingOptions, plumbingResult } = params;
  const [specModal, setSpecModal] = useState<EstimateSpecModalState | null>(null);

  const specModalData = useMemo(
    () =>
      buildEstimateSpecModalData({
        specModal,
        allEstimateSections,
        estimateResult,
        plumbingOptions,
        plumbingResult,
      }),
    [allEstimateSections, estimateResult, plumbingOptions, plumbingResult, specModal],
  );

  const openSectionSpec = useCallback((sectionId: EstimateSectionId) => {
    setSpecModal({ kind: "section", sectionId });
  }, []);

  const openFullSpec = useCallback(() => {
    setSpecModal({ kind: "full" });
  }, []);

  const closeSpecModal = useCallback(() => {
    setSpecModal(null);
  }, []);

  return {
    specModalData,
    openSectionSpec,
    openFullSpec,
    closeSpecModal,
  };
}
