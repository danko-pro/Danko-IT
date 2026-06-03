import { useEffect, useState } from "react";

export const CATALOG_UI_STORAGE_PREFIX = "catalog-editor";

function storageKey(key: string): string {
  return `${CATALOG_UI_STORAGE_PREFIX}:${key}`;
}

export function readCatalogStoredValue<TValue>(key: string, fallback: TValue): TValue {
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(storageKey(key));
    return raw === null ? fallback : (JSON.parse(raw) as TValue);
  } catch {
    return fallback;
  }
}

export function writeCatalogStoredValue<TValue>(key: string, value: TValue) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(storageKey(key), JSON.stringify(value));
  } catch {
    // UI preferences are optional; quota/private-mode failures must not break editing.
  }
}

export function useCatalogPersistedState<TValue>(key: string, fallback: TValue) {
  const [value, setValue] = useState<TValue>(() => readCatalogStoredValue(key, fallback));

  useEffect(() => {
    writeCatalogStoredValue(key, value);
  }, [key, value]);

  return [value, setValue] as const;
}

export function useCatalogPersistedStringSet(key: string) {
  const [values, setValues] = useCatalogPersistedState<string[]>(key, []);

  return [
    new Set(values),
    (updater: (current: Set<string>) => Set<string>) => {
      setValues((current) => Array.from(updater(new Set(current))));
    },
  ] as const;
}
