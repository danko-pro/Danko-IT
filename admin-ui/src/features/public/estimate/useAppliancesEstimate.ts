import { useCallback, useMemo, useState } from "react";
import {
  applianceItemCatalog,
  calculateAppliances,
  createDefaultAppliancesOptions,
  getApplianceUnitPrice,
  type ApplianceItemKey,
  type AppliancePackageLevel,
  type AppliancesOptions,
  type FridgeVariant,
} from "../public-estimate-appliances";
import { parseEstimateInteger } from "../public-estimate-geometry";
import {
  normalizeEstimateQuantityOnBlur,
  sanitizeEstimateIntegerInput,
} from "../public-estimate-input";
import { normalizeAppliancesOptionsDraft, type AppliancesOptionsDraft } from "./context";
import { buildAppliancesSummaryItems } from "./summary";

function createDefaultAppliancesOptionsDraft(): AppliancesOptionsDraft {
  const base = createDefaultAppliancesOptions();
  const items = {} as AppliancesOptionsDraft["items"];

  for (const item of applianceItemCatalog) {
    items[item.key] = {
      isIncluded: base.items[item.key].isIncluded,
      quantity: String(base.items[item.key].quantity),
    };
  }

  return { packageLevel: base.packageLevel, fridgeVariant: base.fridgeVariant, items };
}

export function useAppliancesEstimate() {
  const [appliancesOptions, setAppliancesOptions] = useState<AppliancesOptionsDraft>(() =>
    createDefaultAppliancesOptionsDraft(),
  );

  const normalizedAppliancesOptions = useMemo(
    () => normalizeAppliancesOptionsDraft(appliancesOptions),
    [appliancesOptions],
  );

  const appliancesResult = useMemo(
    () => calculateAppliances(normalizedAppliancesOptions),
    [normalizedAppliancesOptions],
  );

  const appliancesSummaryItems = buildAppliancesSummaryItems(appliancesResult);

  const updateAppliancesOptions = useCallback(
    (patch: Partial<Pick<AppliancesOptions, "packageLevel" | "fridgeVariant">>) => {
      setAppliancesOptions((currentOptions) => ({
        ...currentOptions,
        ...patch,
      }));
    },
    [],
  );

  const updateApplianceItem = useCallback(
    (key: ApplianceItemKey, patch: Partial<{ isIncluded: boolean; quantity: string }>) => {
      setAppliancesOptions((currentOptions) => ({
        ...currentOptions,
        items: {
          ...currentOptions.items,
          [key]: {
            ...currentOptions.items[key],
            ...patch,
          },
        },
      }));
    },
    [],
  );

  const getApplianceUnitPriceForKey = useCallback(
    (key: ApplianceItemKey) => getApplianceUnitPrice(key, appliancesOptions),
    [appliancesOptions],
  );

  const getApplianceLineTotal = useCallback(
    (key: ApplianceItemKey, isIncluded: boolean, quantity: string) => {
      const unitPrice = getApplianceUnitPrice(key, appliancesOptions);
      return isIncluded ? unitPrice * Math.max(1, parseEstimateInteger(quantity)) : 0;
    },
    [appliancesOptions],
  );

  const onPackageLevelChange = useCallback(
    (level: AppliancePackageLevel) => {
      updateAppliancesOptions({ packageLevel: level });
    },
    [updateAppliancesOptions],
  );

  const onFridgeVariantChange = useCallback(
    (variant: FridgeVariant) => {
      updateAppliancesOptions({ fridgeVariant: variant });
    },
    [updateAppliancesOptions],
  );

  const onApplianceIncludeChange = useCallback(
    (key: ApplianceItemKey, checked: boolean) => {
      updateApplianceItem(key, { isIncluded: checked });
    },
    [updateApplianceItem],
  );

  const onQuantityChange = useCallback(
    (key: ApplianceItemKey, value: string) => {
      updateApplianceItem(key, { quantity: sanitizeEstimateIntegerInput(value) });
    },
    [updateApplianceItem],
  );

  const onQuantityBlur = useCallback(
    (key: ApplianceItemKey, value: string) => {
      updateApplianceItem(key, { quantity: normalizeEstimateQuantityOnBlur(value) });
    },
    [updateApplianceItem],
  );

  return {
    appliancesOptions,
    appliancesResult,
    appliancesSummaryItems,
    getApplianceUnitPriceForKey,
    getApplianceLineTotal,
    onPackageLevelChange,
    onFridgeVariantChange,
    onApplianceIncludeChange,
    onQuantityChange,
    onQuantityBlur,
  };
}
