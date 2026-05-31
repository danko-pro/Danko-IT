import { useCallback, useMemo, useState } from "react";
import {
  calculateHomeGoods,
  createDefaultHomeGoodsOptions,
  type HomeGoodsOptions,
  type HomeGoodsPackageLevel,
} from "../public-estimate-home-goods";
import { buildHomeGoodsSummaryItems } from "./summary";

export function useHomeGoodsEstimate({ floorArea }: { floorArea: number }) {
  const [homeGoodsOptions, setHomeGoodsOptions] = useState<HomeGoodsOptions>(() =>
    createDefaultHomeGoodsOptions(),
  );

  const homeGoodsResult = useMemo(
    () => calculateHomeGoods({ floorArea, options: homeGoodsOptions }),
    [homeGoodsOptions, floorArea],
  );

  const homeGoodsSummaryItems = buildHomeGoodsSummaryItems(homeGoodsResult);

  const updateHomeGoodsOptions = useCallback((patch: Partial<HomeGoodsOptions>) => {
    setHomeGoodsOptions((currentOptions) => ({
      ...currentOptions,
      ...patch,
    }));
  }, []);

  const onIncludeCleaningChange = useCallback(
    (checked: boolean) => {
      updateHomeGoodsOptions({ includeCleaning: checked });
    },
    [updateHomeGoodsOptions],
  );

  const onIncludeHomeGoodsChange = useCallback(
    (checked: boolean) => {
      updateHomeGoodsOptions({ includeHomeGoods: checked });
    },
    [updateHomeGoodsOptions],
  );

  const onPackageLevelChange = useCallback(
    (level: HomeGoodsPackageLevel) => {
      updateHomeGoodsOptions({ packageLevel: level });
    },
    [updateHomeGoodsOptions],
  );

  return {
    homeGoodsOptions,
    homeGoodsResult,
    homeGoodsSummaryItems,
    onIncludeCleaningChange,
    onIncludeHomeGoodsChange,
    onPackageLevelChange,
  };
}
