import { useEffect } from "react";

import { useWarmFloorCatalog } from "./api/warm-floor-client";
import type { CatalogTabMeta } from "./catalog-tab-meta";
import { WarmFloorCatalogPanel } from "./WarmFloorCatalogPanel";

type WarmFloorCatalogTabProps = {
  isActive: boolean;
  onMetaChange: (meta: CatalogTabMeta) => void;
};

export function WarmFloorCatalogTab({ isActive, onMetaChange }: WarmFloorCatalogTabProps) {
  const controller = useWarmFloorCatalog();

  useEffect(() => {
    if (!isActive) {
      return;
    }

    onMetaChange({
      loading: controller.loading,
      saving: controller.saving,
      savedAt: controller.savedAt || null,
      error: controller.error,
    });
  }, [controller.error, controller.loading, controller.savedAt, controller.saving, isActive, onMetaChange]);

  return <WarmFloorCatalogPanel controller={controller} />;
}
