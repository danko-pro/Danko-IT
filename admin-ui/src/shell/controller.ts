import { type FormEvent, useEffect, useState } from "react";
import type { DeliverySettings, GroupProfile, ScreenKey, Summary } from "../shared/types";
import { useAdminCalculatorController } from "../features/calculator/controller";
import { useAdminMaterialsController } from "../features/materials/controller";
import { useAdminRequestsController } from "../features/requests/controller";
import { fetchJson } from "../shared/utils";

// Основной orchestration-слой admin UI: shell, overview и сборка доменных hooks.
export function useAdminAppController() {
  const [screen, setScreen] = useState<ScreenKey>("dashboard");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [groups, setGroups] = useState<GroupProfile[]>([]);
  const [deliverySettings, setDeliverySettings] = useState<DeliverySettings | null>(null);
  const [deliveryForm, setDeliveryForm] = useState<DeliverySettings>({
    delivery_start: "09:00",
    delivery_end: "18:00",
    delivery_fallback: "16:00",
  });

  const [loading, setLoading] = useState(true);
  const [savingDelivery, setSavingDelivery] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const requestsController = useAdminRequestsController({ setSuccessMessage });
  const materialsController = useAdminMaterialsController({
    setScreen,
    setSuccessMessage,
  });
  const calculatorController = useAdminCalculatorController({
    screen,
    setScreen,
    setSuccessMessage,
  });

  useEffect(() => {
    void loadOverview();
  }, []);

  useEffect(() => {
    if (deliverySettings) {
      setDeliveryForm(deliverySettings);
    }
  }, [deliverySettings]);

  useEffect(() => {
    if (!successMessage) {
      return;
    }
    const timerId = window.setTimeout(() => {
      setSuccessMessage(null);
    }, 4200);
    return () => window.clearTimeout(timerId);
  }, [successMessage]);

  async function loadOverview() {
    try {
      setLoading(true);
      const [summaryData, groupsData, deliveryData] = await Promise.all([
        fetchJson<Summary>("/api/dashboard/summary"),
        fetchJson<GroupProfile[]>("/api/groups?limit=12"),
        fetchJson<DeliverySettings>("/api/settings/delivery"),
        requestsController.loadRequests(),
        materialsController.loadFamilies(),
      ]);

      setSummary(summaryData);
      setGroups(groupsData);
      setDeliverySettings(deliveryData);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить панель");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveDeliverySettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setSavingDelivery(true);
      const updated = await fetchJson<DeliverySettings>("/api/settings/delivery", {
        method: "PATCH",
        body: JSON.stringify(deliveryForm),
      });
      setDeliverySettings(updated);
      setSettingsError(null);
      setSuccessMessage("Окно доставки обновлено.");
    } catch (saveError) {
      setSettingsError(saveError instanceof Error ? saveError.message : "Не удалось обновить окно доставки");
    } finally {
      setSavingDelivery(false);
    }
  }

  return {
    screen,
    setScreen,
    summary,
    groups,
    deliverySettings,
    deliveryForm,
    setDeliveryForm,
    loading,
    savingDelivery,
    error,
    settingsError,
    successMessage,
    setSuccessMessage,
    loadOverview,
    handleSaveDeliverySettings,
    ...requestsController,
    ...materialsController,
    ...calculatorController,
  };
}

export type AdminAppController = ReturnType<typeof useAdminAppController>;

