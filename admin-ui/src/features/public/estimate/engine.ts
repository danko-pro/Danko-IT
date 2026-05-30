import {
  calculateEstimateTotals,
  type EstimateSection,
  type PublicEstimateResult,
} from "../public-estimate-model";

export type BuildPublicEstimateResultInput = {
  warmFloorResult: { selectedArea: number; section: EstimateSection };
  flooringResult: { flooringArea: number; section: EstimateSection };
  wallsResult: { wallFinishArea: number; section: EstimateSection };
  ceilingResult: { ceilingArea: number; section: EstimateSection };
  electricResult: { section: EstimateSection };
  plumbingResult: { section: EstimateSection };
  doorsResult: { section: EstimateSection };
  completionResult: { section: EstimateSection };
  appliancesResult: { section: EstimateSection };
  looseFurnitureResult: { section: EstimateSection };
  homeGoodsResult: { section: EstimateSection };
  floorArea: number;
};

export function buildPublicEstimateResult(input: BuildPublicEstimateResultInput): PublicEstimateResult {
  const {
    warmFloorResult,
    flooringResult,
    wallsResult,
    ceilingResult,
    electricResult,
    plumbingResult,
    doorsResult,
    completionResult,
    appliancesResult,
    looseFurnitureResult,
    homeGoodsResult,
    floorArea,
  } = input;

  const sections = [
    ...(warmFloorResult.selectedArea > 0 ? [warmFloorResult.section] : []),
    ...(flooringResult.flooringArea > 0 ? [flooringResult.section] : []),
    ...(wallsResult.wallFinishArea > 0 ? [wallsResult.section] : []),
    ...(ceilingResult.ceilingArea > 0 ? [ceilingResult.section] : []),
    ...(electricResult.section.items.length > 0 ? [electricResult.section] : []),
    ...(plumbingResult.section.items.length > 0 ? [plumbingResult.section] : []),
    ...(doorsResult.section.items.length > 0 ? [doorsResult.section] : []),
    ...(completionResult.section.items.length > 0 ? [completionResult.section] : []),
    ...(appliancesResult.section.items.length > 0 ? [appliancesResult.section] : []),
    ...(looseFurnitureResult.section.items.length > 0 ? [looseFurnitureResult.section] : []),
    ...(homeGoodsResult.section.items.length > 0 ? [homeGoodsResult.section] : []),
  ];

  return {
    sections,
    totals: calculateEstimateTotals(sections, floorArea),
  };
}
