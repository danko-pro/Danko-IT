import type { FlooringSnapshotDisplayRow } from "./api/flooring-types";

export function resolveCatalogEditItem<T extends { id: number; title: string }>(
  catalog: T[],
  row: FlooringSnapshotDisplayRow,
): T | undefined {
  if (row.catalogId) {
    return catalog.find((entry) => entry.id === row.catalogId);
  }
  const normalized = row.title.trim().toLowerCase();
  return catalog.find((item) => item.title.trim().toLowerCase() === normalized);
}
