import { useCallback, useEffect, useState } from "react";

import { fetchJson } from "../../../shared/utils";
import type { PublicWarmFloorConfigDto, PublicWarmFloorRateField, WarmFloorSnapshotPreview } from "./types";

const WARM_FLOOR_API = "/api/calculator/warm-floor";

export type WarmFloorCatalogController = {
  config: PublicWarmFloorConfigDto | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  savedAt: string;
  preview: WarmFloorSnapshotPreview | null;
  previewLoading: boolean;
  previewError: string | null;
  updateField: (field: PublicWarmFloorRateField, value: string) => void;
  save: () => Promise<void>;
  reload: () => Promise<void>;
  loadPreview: () => Promise<void>;
};

export function useWarmFloorCatalog(): WarmFloorCatalogController {
  const [config, setConfig] = useState<PublicWarmFloorConfigDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState("");
  const [preview, setPreview] = useState<WarmFloorSnapshotPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setConfig(await fetchJson<PublicWarmFloorConfigDto>(`${WARM_FLOOR_API}/config`));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить тарифы теплого пола");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const updateField = useCallback((field: PublicWarmFloorRateField, value: string) => {
    const parsed = value === "" ? 0 : Number(value.replace(",", "."));
    if (!Number.isFinite(parsed)) return;
    setConfig((current) => (current ? { ...current, [field]: parsed } : current));
  }, []);

  const save = useCallback(async () => {
    if (!config) return;
    try {
      setSaving(true);
      setError(null);
      const saved = await fetchJson<PublicWarmFloorConfigDto>(`${WARM_FLOOR_API}/config`, {
        method: "PATCH",
        body: JSON.stringify(config),
      });
      setConfig(saved);
      setSavedAt(new Date().toLocaleTimeString("ru-RU"));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Не удалось сохранить тарифы теплого пола");
    } finally {
      setSaving(false);
    }
  }, [config]);

  const loadPreview = useCallback(async () => {
    try {
      setPreviewLoading(true);
      setPreviewError(null);
      await save();
      setPreview(await fetchJson<WarmFloorSnapshotPreview>(`${WARM_FLOOR_API}/snapshot/preview`));
    } catch (loadError) {
      setPreviewError(loadError instanceof Error ? loadError.message : "Не удалось получить preview теплого пола");
    } finally {
      setPreviewLoading(false);
    }
  }, [save]);

  return {
    config,
    loading,
    saving,
    error,
    savedAt,
    preview,
    previewLoading,
    previewError,
    updateField,
    save,
    reload,
    loadPreview,
  };
}
