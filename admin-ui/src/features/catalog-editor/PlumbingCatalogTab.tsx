import { useEffect } from "react";

import { usePlumbingCatalog } from "./api/client";
import type { CatalogTabMeta } from "./catalog-tab-meta";
import { PlumbingCatalogPanel } from "./PlumbingCatalogPanel";

type PlumbingCatalogTabProps = {
  isActive: boolean;
  onMetaChange: (meta: CatalogTabMeta) => void;
};

export function PlumbingCatalogTab({ isActive, onMetaChange }: PlumbingCatalogTabProps) {
  const catalog = usePlumbingCatalog();

  useEffect(() => {
    if (!isActive) {
      return;
    }

    onMetaChange({
      loading: catalog.loading,
      saving: catalog.saving,
      savedAt: catalog.savedAt || null,
      error: catalog.error,
    });
  }, [catalog.error, catalog.loading, catalog.savedAt, catalog.saving, isActive, onMetaChange]);

  return <PlumbingCatalogPanel catalog={catalog} />;
}
