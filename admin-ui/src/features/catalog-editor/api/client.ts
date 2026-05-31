// React-контроллер каталога сантехники поверх REST API (/api/calculator/plumbing/*).
// Паттерн — как features/calculator/app/ceilings.ts: fetchJson, busy/error/success состояния.
// Загрузка атомов+зон при mount; персист — debounced diff-синхронизация (planCatalogSync):
// create/update/delete атома, create/update/delete зоны, replace состава и пакетов зоны.

import { useCallback, useEffect, useRef, useState } from "react";

import { fetchJson } from "../../../shared/utils";
import type { CatalogItem, CatalogZone } from "../plumbing-seed";
import {
  catalogItemToPayload,
  dtoToCatalogItem,
  dtoZoneToCatalogZone,
  isEmptyPlan,
  planCatalogSync,
  zoneItemsToPayload,
  zonePackagesToPayload,
  zoneToPayload,
  type CatalogSnapshot,
} from "./mappers";
import type {
  PlumbingCatalogItemDto,
  PlumbingSnapshotPreview,
  PlumbingZoneDto,
} from "./types";

const PLUMBING_API = "/api/calculator/plumbing";
const SYNC_DEBOUNCE_MS = 900;

type LoadResult = {
  items: CatalogItem[];
  zones: CatalogZone[];
  idBySourceCode: Map<string, number>;
  zoneIdByCode: Map<string, number>;
};

async function loadCatalogFromApi(): Promise<LoadResult> {
  const [itemDtos, zoneSummaries] = await Promise.all([
    fetchJson<PlumbingCatalogItemDto[]>(`${PLUMBING_API}/catalog-items`),
    fetchJson<PlumbingZoneDto[]>(`${PLUMBING_API}/zones`),
  ]);

  const idBySourceCode = new Map<string, number>();
  const items = itemDtos.map((dto) => {
    idBySourceCode.set(dto.source_code, dto.id);
    return dtoToCatalogItem(dto);
  });

  // Состав/пакеты приходят только в detail-ответе, поэтому подгружаем каждую зону отдельно.
  const zoneDetails = await Promise.all(
    zoneSummaries.map((summary) => fetchJson<PlumbingZoneDto>(`${PLUMBING_API}/zones/${summary.id}`)),
  );

  const zoneIdByCode = new Map<string, number>();
  const zones = zoneDetails.map((dto) => {
    zoneIdByCode.set(dto.zone_code, dto.id);
    return dtoZoneToCatalogZone(dto);
  });

  return { items, zones, idBySourceCode, zoneIdByCode };
}

function snapshotEquals(a: CatalogSnapshot, b: CatalogSnapshot): boolean {
  return isEmptyPlan(planCatalogSync(a, b)) && isEmptyPlan(planCatalogSync(b, a));
}

export type PlumbingCatalogController = {
  items: CatalogItem[];
  zones: CatalogZone[];
  setItems: React.Dispatch<React.SetStateAction<CatalogItem[]>>;
  setZones: React.Dispatch<React.SetStateAction<CatalogZone[]>>;
  loading: boolean;
  saving: boolean;
  error: string | null;
  savedAt: string;
  reload: () => Promise<void>;
  preview: PlumbingSnapshotPreview | null;
  previewLoading: boolean;
  previewError: string | null;
  loadPreview: () => Promise<void>;
};

export function usePlumbingCatalog(): PlumbingCatalogController {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [zones, setZones] = useState<CatalogZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState("");

  const [preview, setPreview] = useState<PlumbingSnapshotPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const idBySourceCodeRef = useRef<Map<string, number>>(new Map());
  const zoneIdByCodeRef = useRef<Map<string, number>>(new Map());
  const syncedRef = useRef<CatalogSnapshot | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushingRef = useRef(false);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await loadCatalogFromApi();
      idBySourceCodeRef.current = result.idBySourceCode;
      zoneIdByCodeRef.current = result.zoneIdByCode;
      syncedRef.current = { items: result.items, zones: result.zones };
      setItems(result.items);
      setZones(result.zones);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить каталог сантехники");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const flush = useCallback(async () => {
    if (flushingRef.current || syncedRef.current === null) {
      return;
    }
    const previous = syncedRef.current;
    const next: CatalogSnapshot = { items, zones };
    const plan = planCatalogSync(previous, next);
    if (isEmptyPlan(plan)) {
      return;
    }

    flushingRef.current = true;
    setSaving(true);
    const failures: string[] = [];
    const idMap = idBySourceCodeRef.current;
    const zoneIdMap = zoneIdByCodeRef.current;

    async function runOp(label: string, op: () => Promise<void>): Promise<void> {
      try {
        await op();
      } catch (opError) {
        failures.push(`${label}: ${opError instanceof Error ? opError.message : "ошибка"}`);
      }
    }

    // 1. Атомы: сначала create (нужны id для состава зон), затем update, затем delete.
    for (const item of plan.itemsToCreate) {
      await runOp(`создание «${item.publicTitle || item.id}»`, async () => {
        const created = await fetchJson<PlumbingCatalogItemDto>(`${PLUMBING_API}/catalog-items`, {
          method: "POST",
          body: JSON.stringify(catalogItemToPayload(item)),
        });
        idMap.set(created.source_code, created.id);
      });
    }
    for (const item of plan.itemsToUpdate) {
      const itemId = idMap.get(item.id);
      if (itemId === undefined) {
        await runOp(`обновление «${item.publicTitle || item.id}»`, async () => {
          const created = await fetchJson<PlumbingCatalogItemDto>(`${PLUMBING_API}/catalog-items`, {
            method: "POST",
            body: JSON.stringify(catalogItemToPayload(item)),
          });
          idMap.set(created.source_code, created.id);
        });
        continue;
      }
      await runOp(`обновление «${item.publicTitle || item.id}»`, async () => {
        await fetchJson<PlumbingCatalogItemDto>(`${PLUMBING_API}/catalog-items/${itemId}`, {
          method: "PATCH",
          body: JSON.stringify(catalogItemToPayload(item)),
        });
      });
    }
    for (const sourceCode of plan.itemSourceCodesToDelete) {
      const itemId = idMap.get(sourceCode);
      if (itemId === undefined) {
        continue;
      }
      await runOp(`удаление «${sourceCode}»`, async () => {
        await fetchJson(`${PLUMBING_API}/catalog-items/${itemId}`, { method: "DELETE" });
        idMap.delete(sourceCode);
      });
    }

    // 2. Зоны: create (+ состав/пакеты), update meta, replace items/packages, delete.
    for (const zone of plan.zonesToCreate) {
      await runOp(`создание зоны «${zone.title}»`, async () => {
        const created = await fetchJson<PlumbingZoneDto>(`${PLUMBING_API}/zones`, {
          method: "POST",
          body: JSON.stringify(zoneToPayload(zone)),
        });
        zoneIdMap.set(created.zone_code, created.id);
        await fetchJson<PlumbingZoneDto>(`${PLUMBING_API}/zones/${created.id}/items`, {
          method: "PUT",
          body: JSON.stringify(zoneItemsToPayload(zone, idMap)),
        });
        await fetchJson<PlumbingZoneDto>(`${PLUMBING_API}/zones/${created.id}/packages`, {
          method: "PUT",
          body: JSON.stringify(zonePackagesToPayload(zone, idMap)),
        });
      });
    }
    for (const zone of plan.zonesToUpdateMeta) {
      const zoneId = zoneIdMap.get(zone.id);
      if (zoneId === undefined) continue;
      await runOp(`обновление зоны «${zone.title}»`, async () => {
        await fetchJson<PlumbingZoneDto>(`${PLUMBING_API}/zones/${zoneId}`, {
          method: "PATCH",
          body: JSON.stringify(zoneToPayload(zone)),
        });
      });
    }
    for (const zone of plan.zonesToReplaceItems) {
      const zoneId = zoneIdMap.get(zone.id);
      if (zoneId === undefined) continue;
      await runOp(`состав зоны «${zone.title}»`, async () => {
        await fetchJson<PlumbingZoneDto>(`${PLUMBING_API}/zones/${zoneId}/items`, {
          method: "PUT",
          body: JSON.stringify(zoneItemsToPayload(zone, idMap)),
        });
      });
    }
    for (const zone of plan.zonesToReplacePackages) {
      const zoneId = zoneIdMap.get(zone.id);
      if (zoneId === undefined) continue;
      await runOp(`пакеты зоны «${zone.title}»`, async () => {
        await fetchJson<PlumbingZoneDto>(`${PLUMBING_API}/zones/${zoneId}/packages`, {
          method: "PUT",
          body: JSON.stringify(zonePackagesToPayload(zone, idMap)),
        });
      });
    }
    for (const zoneCode of plan.zoneCodesToDelete) {
      const zoneId = zoneIdMap.get(zoneCode);
      if (zoneId === undefined) continue;
      await runOp(`удаление зоны «${zoneCode}»`, async () => {
        await fetchJson(`${PLUMBING_API}/zones/${zoneId}`, { method: "DELETE" });
        zoneIdMap.delete(zoneCode);
      });
    }

    // Сдвигаем «сохранённое» состояние на снимок, который синхронизировали (не на текущий —
    // во время await пользователь мог внести новые правки; их подхватит следующий debounce).
    syncedRef.current = next;
    if (failures.length > 0) {
      setError(`Часть изменений не сохранена. ${failures.join("; ")}`);
    } else {
      setError(null);
    }
    setSavedAt(new Date().toLocaleTimeString("ru-RU"));
    setSaving(false);
    flushingRef.current = false;
  }, [items, zones]);

  useEffect(() => {
    if (loading || syncedRef.current === null) {
      return;
    }
    if (snapshotEquals(syncedRef.current, { items, zones })) {
      return;
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      void flush();
    }, SYNC_DEBOUNCE_MS);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [items, zones, loading, flush]);

  const loadPreview = useCallback(async () => {
    try {
      setPreviewLoading(true);
      setPreviewError(null);
      // Превью читает из БД, поэтому сначала пытаемся дослать незавершённые правки.
      await flush();
      const payload = await fetchJson<PlumbingSnapshotPreview>(`${PLUMBING_API}/snapshot/preview`);
      setPreview(payload);
    } catch (loadError) {
      setPreviewError(loadError instanceof Error ? loadError.message : "Не удалось получить превью цены");
    } finally {
      setPreviewLoading(false);
    }
  }, [flush]);

  return {
    items,
    zones,
    setItems,
    setZones,
    loading,
    saving,
    error,
    savedAt,
    reload,
    preview,
    previewLoading,
    previewError,
    loadPreview,
  };
}
