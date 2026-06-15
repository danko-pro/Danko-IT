export const READY_CATALOG_TAB_IDS = ["plumbing", "floors", "warm-floor"] as const;

export type ReadyCatalogTabId = (typeof READY_CATALOG_TAB_IDS)[number];

export type CatalogTabMeta = {
  loading: boolean;
  saving: boolean;
  savedAt: string | null;
  error: string | null;
};

export const DEFAULT_CATALOG_TAB_META: CatalogTabMeta = {
  loading: false,
  saving: false,
  savedAt: null,
  error: null,
};

export function isReadyCatalogTabId(tabId: string): tabId is ReadyCatalogTabId {
  return (READY_CATALOG_TAB_IDS as readonly string[]).includes(tabId);
}
