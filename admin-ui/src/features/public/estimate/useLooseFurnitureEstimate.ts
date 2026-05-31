import { useCallback, useMemo, useState } from "react";
import {
  calculateLooseFurniture,
  createDefaultLooseFurnitureOptions,
  getLooseFurnitureUnitPrice,
  looseFurnitureItemCatalog,
  type LooseFurnitureItemKey,
  type LooseFurnitureOptions,
  type LooseFurniturePackageLevel,
} from "../public-estimate-loose-furniture";
import { parseEstimateInteger } from "../public-estimate-geometry";
import {
  normalizeEstimateQuantityOnBlur,
  sanitizeEstimateIntegerInput,
} from "../public-estimate-input";
import { normalizeLooseFurnitureOptionsDraft, type LooseFurnitureOptionsDraft } from "./context";
import { buildLooseFurnitureSummaryItems } from "./summary";

function createDefaultLooseFurnitureOptionsDraft(): LooseFurnitureOptionsDraft {
  const base = createDefaultLooseFurnitureOptions();
  const items = {} as LooseFurnitureOptionsDraft["items"];

  for (const item of looseFurnitureItemCatalog) {
    items[item.key] = {
      isIncluded: base.items[item.key].isIncluded,
      quantity: String(base.items[item.key].quantity),
    };
  }

  return { packageLevel: base.packageLevel, items };
}

export function useLooseFurnitureEstimate() {
  const [looseFurnitureOptions, setLooseFurnitureOptions] = useState<LooseFurnitureOptionsDraft>(() =>
    createDefaultLooseFurnitureOptionsDraft(),
  );

  const normalizedLooseFurnitureOptions = useMemo(
    () => normalizeLooseFurnitureOptionsDraft(looseFurnitureOptions),
    [looseFurnitureOptions],
  );

  const looseFurnitureResult = useMemo(
    () => calculateLooseFurniture(normalizedLooseFurnitureOptions),
    [normalizedLooseFurnitureOptions],
  );

  const looseFurnitureSummaryItems = buildLooseFurnitureSummaryItems(looseFurnitureResult);

  const updateLooseFurnitureOptions = useCallback(
    (patch: Partial<Pick<LooseFurnitureOptions, "packageLevel">>) => {
      setLooseFurnitureOptions((currentOptions) => ({
        ...currentOptions,
        ...patch,
      }));
    },
    [],
  );

  const updateLooseFurnitureItem = useCallback(
    (key: LooseFurnitureItemKey, patch: Partial<{ isIncluded: boolean; quantity: string }>) => {
      setLooseFurnitureOptions((currentOptions) => ({
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

  const getLooseFurnitureUnitPriceForKey = useCallback(
    (key: LooseFurnitureItemKey) => getLooseFurnitureUnitPrice(key, looseFurnitureOptions),
    [looseFurnitureOptions],
  );

  const getLooseFurnitureLineTotal = useCallback(
    (key: LooseFurnitureItemKey, isIncluded: boolean, quantity: string) => {
      const unitPrice = getLooseFurnitureUnitPrice(key, looseFurnitureOptions);
      return isIncluded ? unitPrice * Math.max(1, parseEstimateInteger(quantity)) : 0;
    },
    [looseFurnitureOptions],
  );

  const onPackageLevelChange = useCallback(
    (level: LooseFurniturePackageLevel) => {
      updateLooseFurnitureOptions({ packageLevel: level });
    },
    [updateLooseFurnitureOptions],
  );

  const onLooseFurnitureIncludeChange = useCallback(
    (key: LooseFurnitureItemKey, checked: boolean) => {
      updateLooseFurnitureItem(key, { isIncluded: checked });
    },
    [updateLooseFurnitureItem],
  );

  const onQuantityChange = useCallback(
    (key: LooseFurnitureItemKey, value: string) => {
      updateLooseFurnitureItem(key, { quantity: sanitizeEstimateIntegerInput(value) });
    },
    [updateLooseFurnitureItem],
  );

  const onQuantityBlur = useCallback(
    (key: LooseFurnitureItemKey, value: string) => {
      updateLooseFurnitureItem(key, { quantity: normalizeEstimateQuantityOnBlur(value) });
    },
    [updateLooseFurnitureItem],
  );

  return {
    looseFurnitureOptions,
    looseFurnitureResult,
    looseFurnitureSummaryItems,
    getLooseFurnitureUnitPriceForKey,
    getLooseFurnitureLineTotal,
    onPackageLevelChange,
    onLooseFurnitureIncludeChange,
    onQuantityChange,
    onQuantityBlur,
  };
}
