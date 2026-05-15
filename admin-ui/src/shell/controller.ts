import { type FormEvent, useEffect, useState } from "react";
import { useAdminCalculatorController } from "../features/calculator/app/use";
import { useAdminMaterialsController } from "../features/materials/controller";
import { useAdminRequestsController } from "../features/requests/controller";
import type { AdminAuthSession, DeliverySettings, GroupProfile, ScreenKey, Summary } from "../shared/types";
import { ApiError, fetchJson, isAuthenticatedSession } from "../shared/utils";

// Основной orchestration-слой admin UI: shell, auth, overview и сборка доменных hooks.
export function useAdminAppController() {
  const [screen, setScreen] = useState<ScreenKey>("dashboard");
  const [authSession, setAuthSession] = useState<AdminAuthSession | null>(null);
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
  const [authLoading, setAuthLoading] = useState(true);
  const [authPending, setAuthPending] = useState(false);

  const [authError, setAuthError] = useState<string | null>(null);
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
    void bootstrapAdminApp();
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

  async function bootstrapAdminApp() {
    try {
      setAuthLoading(true);
      setAuthError(null);
      const session = await fetchJson<AdminAuthSession>("/api/auth/session");
      setAuthSession(session);

      if (isAuthenticatedSession(session)) {
        await loadOverview();
        return;
      }

      setLoading(false);
    } catch (loadError) {
      setAuthError(loadError instanceof Error ? loadError.message : "Не удалось проверить сессию доступа");
      setLoading(false);
    } finally {
      setAuthLoading(false);
    }
  }

  async function loadOverview() {
    try {
      setLoading(true);
      const [summaryData, groupsData, deliveryData] = await Promise.all([
        fetchJson<Summary>("/api/dashboard/summary"),
        fetchJson<GroupProfile[]>("/api/groups?limit=12"),
        fetchJson<DeliverySettings>("/api/settings/delivery"),
        requestsController.loadRequests(),
        requestsController.loadTelegramNotifications(),
        materialsController.loadFamilies(),
      ]);

      setSummary(summaryData);
      setGroups(groupsData);
      setDeliverySettings(deliveryData);
      setError(null);
    } catch (loadError) {
      if (loadError instanceof ApiError && loadError.status === 401) {
        setAuthSession((current) =>
          current
            ? {
                ...current,
                authenticated: false,
                user: null,
                expires_at: null,
              }
            : {
                auth_enabled: true,
                authenticated: false,
                mode: "session",
                user: null,
                expires_at: null,
              },
        );
        setAuthError("Сессия доступа завершена. Войдите снова.");
        setLoading(false);
        return;
      }
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

  async function handleLogin(email: string, password: string) {
    try {
      setAuthPending(true);
      setAuthError(null);
      const session = await fetchJson<AdminAuthSession>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setAuthSession(session);

      if (isAuthenticatedSession(session)) {
        await loadOverview();
      }
    } catch (loginError) {
      if (loginError instanceof ApiError && loginError.status === 401) {
        setAuthError("Неверная почта или пароль.");
        return;
      }
      setAuthError(loginError instanceof Error ? loginError.message : "Не удалось войти");
    } finally {
      setAuthPending(false);
    }
  }

  async function handleRegister(displayName: string, email: string, password: string) {
    try {
      setAuthPending(true);
      setAuthError(null);
      const session = await fetchJson<AdminAuthSession>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ display_name: displayName, email, password }),
      });
      setAuthSession(session);

      if (isAuthenticatedSession(session)) {
        await loadOverview();
      }
    } catch (registerError) {
      if (registerError instanceof ApiError && registerError.status === 409) {
        setAuthError("Этот email уже зарегистрирован.");
        return;
      }
      setAuthError(registerError instanceof Error ? registerError.message : "Не удалось зарегистрироваться");
    } finally {
      setAuthPending(false);
    }
  }

  async function handleLogout() {
    try {
      setAuthPending(true);
      const session = await fetchJson<AdminAuthSession>("/api/auth/logout", {
        method: "POST",
      });
      setAuthSession(session);
      setScreen("dashboard");
      setSuccessMessage(null);
      setError(null);
      setSettingsError(null);
      setLoading(false);
    } catch (logoutError) {
      setAuthError(logoutError instanceof Error ? logoutError.message : "Не удалось завершить сессию доступа");
    } finally {
      setAuthPending(false);
    }
  }

  return {
    authSession,
    authLoading,
    authPending,
    authError,
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
    bootstrapAdminApp,
    loadOverview,
    handleLogin,
    handleRegister,
    handleLogout,
    handleSaveDeliverySettings,
    ...requestsController,
    ...materialsController,
    ...calculatorController,
  };
}

export type AdminAppController = ReturnType<typeof useAdminAppController>;
