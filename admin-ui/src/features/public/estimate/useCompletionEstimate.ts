import { useCallback, useMemo, useState } from "react";
import { calculateCompletion } from "../public-estimate-completion";
import { parseEstimateDecimal } from "../public-estimate-geometry";
import {
  normalizeEstimateDecimalOnBlur,
  sanitizeEstimateDecimalInput,
} from "../public-estimate-input";
import { type CompletionOptionsDraft } from "./context";
import { buildCompletionSummaryItems } from "./summary";

export function useCompletionEstimate() {
  const [completionOptions, setCompletionOptions] = useState<CompletionOptionsDraft>({
    includeKitchenBase: false,
    kitchenLengthMeters: "5",
    includeKitchenAppliancePenal: false,
    includeKitchenFridgePenal: false,
    includeWardrobe: false,
    includeBathroomFurniture: false,
  });

  const completionResult = useMemo(
    () =>
      calculateCompletion({
        ...completionOptions,
        kitchenLengthMeters: parseEstimateDecimal(completionOptions.kitchenLengthMeters),
      }),
    [completionOptions],
  );

  const completionSummaryItems = buildCompletionSummaryItems(completionResult);

  const updateCompletionOptions = useCallback((patch: Partial<CompletionOptionsDraft>) => {
    setCompletionOptions((currentOptions) => ({
      ...currentOptions,
      ...patch,
    }));
  }, []);

  const onIncludeKitchenBaseChange = useCallback(
    (checked: boolean) => {
      updateCompletionOptions({ includeKitchenBase: checked });
    },
    [updateCompletionOptions],
  );

  const onKitchenLengthMetersChange = useCallback(
    (value: string) => {
      updateCompletionOptions({ kitchenLengthMeters: sanitizeEstimateDecimalInput(value) });
    },
    [updateCompletionOptions],
  );

  const onKitchenLengthMetersBlur = useCallback(
    (value: string) => {
      updateCompletionOptions({ kitchenLengthMeters: normalizeEstimateDecimalOnBlur(value) });
    },
    [updateCompletionOptions],
  );

  const onIncludeKitchenAppliancePenalChange = useCallback(
    (checked: boolean) => {
      updateCompletionOptions({ includeKitchenAppliancePenal: checked });
    },
    [updateCompletionOptions],
  );

  const onIncludeKitchenFridgePenalChange = useCallback(
    (checked: boolean) => {
      updateCompletionOptions({ includeKitchenFridgePenal: checked });
    },
    [updateCompletionOptions],
  );

  const onIncludeWardrobeChange = useCallback(
    (checked: boolean) => {
      updateCompletionOptions({ includeWardrobe: checked });
    },
    [updateCompletionOptions],
  );

  const onIncludeBathroomFurnitureChange = useCallback(
    (checked: boolean) => {
      updateCompletionOptions({ includeBathroomFurniture: checked });
    },
    [updateCompletionOptions],
  );

  return {
    completionOptions,
    completionResult,
    completionSummaryItems,
    onIncludeKitchenBaseChange,
    onKitchenLengthMetersChange,
    onKitchenLengthMetersBlur,
    onIncludeKitchenAppliancePenalChange,
    onIncludeKitchenFridgePenalChange,
    onIncludeWardrobeChange,
    onIncludeBathroomFurnitureChange,
  };
}
