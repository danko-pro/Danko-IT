import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import type {
  RequestDeliveryFormState,
  RequestDetail,
  RequestItem,
  RequestItemFormState,
  RecentRequest,
  TelegramNotification,
} from "../../shared/types";
import { formatStatus } from "../../shared/utils";
import {
  createRequestItem,
  deleteRequest,
  deleteRequestItem,
  expireStaleRequests,
  fetchRecentRequests,
  fetchRequestDetail,
  fetchTelegramNotifications,
  flushTelegramNotifications,
  saveRequestDelivery,
  updateRequestItem,
  updateRequestStatus,
} from "./api";

type RequestsControllerOptions = {
  setSuccessMessage: Dispatch<SetStateAction<string | null>>;
};

// Контур заявок: список, активная карточка и CRUD по доставке/позициям.
export function useAdminRequestsController(props: RequestsControllerOptions) {
  const [requests, setRequests] = useState<RecentRequest[]>([]);
  const [telegramNotifications, setTelegramNotifications] = useState<TelegramNotification[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [requestDetail, setRequestDetail] = useState<RequestDetail | null>(null);

  const [requestsLoading, setRequestsLoading] = useState(false);
  const [telegramNotificationsLoading, setTelegramNotificationsLoading] = useState(false);
  const [telegramNotificationsFlushing, setTelegramNotificationsFlushing] = useState(false);
  const [requestDetailLoading, setRequestDetailLoading] = useState(false);
  const [requestActionId, setRequestActionId] = useState<number | null>(null);
  const [requestDetailBusyKey, setRequestDetailBusyKey] = useState<string | null>(null);
  const [requestMaintenanceLoading, setRequestMaintenanceLoading] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  useEffect(() => {
    if (requests.length && selectedRequestId === null) {
      setSelectedRequestId(requests[0].id);
    }
  }, [requests, selectedRequestId]);

  useEffect(() => {
    if (selectedRequestId !== null) {
      void loadRequestDetail(selectedRequestId);
    }
  }, [selectedRequestId]);

  async function loadRequests() {
    try {
      setRequestsLoading(true);
      const data = await fetchRecentRequests();
      setRequests(data);
      setRequestError(null);
    } catch (loadError) {
      setRequestError(loadError instanceof Error ? loadError.message : "Не удалось загрузить заявки");
    } finally {
      setRequestsLoading(false);
    }
  }

  async function loadRequestDetail(draftId: number) {
    try {
      setRequestDetailLoading(true);
      const data = await fetchRequestDetail(draftId);
      setRequestDetail(data);
      setRequestError(null);
    } catch (loadError) {
      setRequestDetail(null);
      setRequestError(loadError instanceof Error ? loadError.message : "Не удалось загрузить карточку заявки");
    } finally {
      setRequestDetailLoading(false);
    }
  }

  async function handleRequestStatusAction(draftId: number, status: string) {
    try {
      setRequestActionId(draftId);
      const result = await updateRequestStatus(draftId, status);
      await loadRequests();
      if (selectedRequestId === draftId) {
        await loadRequestDetail(draftId);
      }
      const baseMessage = `Заявка #${draftId}: статус "${formatStatus(result.status)}" сохранён.`;
      props.setSuccessMessage(
        result.notification_error
          ? `${baseMessage} Но сообщение в Telegram не отправилось: ${result.notification_error}`
          : baseMessage,
      );
      setRequestError(null);
    } catch (actionError) {
      setRequestError(actionError instanceof Error ? actionError.message : "Не удалось изменить статус заявки");
    } finally {
      setRequestActionId(null);
    }
  }

  async function handleDeleteRequest(draftId: number) {
    const confirmed = window.confirm(`Удалить заявку #${draftId}? Это действие лучше использовать только для черновиков.`);
    if (!confirmed) {
      return;
    }

    try {
      setRequestActionId(draftId);
      await deleteRequest(draftId);
      await loadRequests();
      if (selectedRequestId === draftId) {
        setSelectedRequestId(null);
        setRequestDetail(null);
      }
      props.setSuccessMessage(`Заявка #${draftId} удалена.`);
      setRequestError(null);
    } catch (actionError) {
      setRequestError(actionError instanceof Error ? actionError.message : "Не удалось удалить заявку");
    } finally {
      setRequestActionId(null);
    }
  }

  async function loadTelegramNotifications() {
    try {
      setTelegramNotificationsLoading(true);
      const data = await fetchTelegramNotifications();
      setTelegramNotifications(data);
      setRequestError(null);
    } catch (loadError) {
      setRequestError(loadError instanceof Error ? loadError.message : "Не удалось загрузить очередь Telegram");
    } finally {
      setTelegramNotificationsLoading(false);
    }
  }

  async function handleExpireStaleRequests() {
    const confirmed = window.confirm(
      "Сбросить зависшие черновики заявок старше настроенного лимита? Свежие активные заявки останутся без изменений.",
    );
    if (!confirmed) {
      return;
    }

    const currentSelectedRequestId = selectedRequestId;
    try {
      setRequestMaintenanceLoading(true);
      const result = await expireStaleRequests();
      await loadRequests();
      if (currentSelectedRequestId !== null) {
        await loadRequestDetail(currentSelectedRequestId);
      }
      props.setSuccessMessage(
        result.expired_count
          ? `Сброшено зависших черновиков: ${result.expired_count}.`
          : "Зависших черновиков для сброса нет.",
      );
      setRequestError(null);
    } catch (actionError) {
      setRequestError(actionError instanceof Error ? actionError.message : "Не удалось сбросить зависшие черновики");
    } finally {
      setRequestMaintenanceLoading(false);
    }
  }

  async function handleFlushTelegramNotifications() {
    try {
      setTelegramNotificationsFlushing(true);
      const result = await flushTelegramNotifications();
      await loadTelegramNotifications();
      props.setSuccessMessage(
        result.failed_count
          ? `Telegram: отправлено ${result.delivered_count}, осталось с ошибкой ${result.failed_count}.`
          : `Telegram: отправлено из очереди ${result.delivered_count}.`,
      );
      setRequestError(null);
    } catch (actionError) {
      setRequestError(actionError instanceof Error ? actionError.message : "Не удалось отправить очередь Telegram");
    } finally {
      setTelegramNotificationsFlushing(false);
    }
  }

  async function handleSaveRequestDelivery(draftId: number, form: RequestDeliveryFormState): Promise<boolean> {
    try {
      setRequestDetailBusyKey(`delivery-${draftId}`);
      const updated = await saveRequestDelivery(draftId, form);
      setRequestDetail(updated);
      await loadRequests();
      setRequestError(null);
      props.setSuccessMessage(`Доставка по заявке #${draftId} обновлена.`);
      return true;
    } catch (actionError) {
      setRequestError(actionError instanceof Error ? actionError.message : "Не удалось обновить доставку");
      return false;
    } finally {
      setRequestDetailBusyKey(null);
    }
  }

  async function handleCreateRequestItem(draftId: number, form: RequestItemFormState): Promise<boolean> {
    const title = form.title.trim();
    if (!title) {
      setRequestError("Введите название позиции.");
      return false;
    }

    try {
      setRequestDetailBusyKey(`create-item-${draftId}`);
      const updated = await createRequestItem(draftId, form);
      setRequestDetail(updated);
      await loadRequests();
      setRequestError(null);
      props.setSuccessMessage(`Позиция добавлена в заявку #${draftId}.`);
      return true;
    } catch (actionError) {
      setRequestError(actionError instanceof Error ? actionError.message : "Не удалось добавить позицию");
      return false;
    } finally {
      setRequestDetailBusyKey(null);
    }
  }

  async function handleUpdateRequestItem(item: RequestItem, form: RequestItemFormState): Promise<boolean> {
    const title = form.title.trim();
    if (!title) {
      setRequestError("Введите название позиции.");
      return false;
    }

    try {
      setRequestDetailBusyKey(`item-${item.id}`);
      const updated = await updateRequestItem(item, form);
      setRequestDetail(updated);
      await loadRequests();
      setRequestError(null);
      props.setSuccessMessage(`Позиция #${item.id} обновлена.`);
      return true;
    } catch (actionError) {
      setRequestError(actionError instanceof Error ? actionError.message : "Не удалось обновить позицию");
      return false;
    } finally {
      setRequestDetailBusyKey(null);
    }
  }

  async function handleDeleteRequestItem(draftId: number, itemId: number): Promise<boolean> {
    const confirmed = window.confirm(`Удалить позицию #${itemId} из заявки #${draftId}?`);
    if (!confirmed) {
      return false;
    }

    try {
      setRequestDetailBusyKey(`delete-item-${itemId}`);
      const updated = await deleteRequestItem(itemId);
      setRequestDetail(updated);
      await loadRequests();
      setRequestError(null);
      props.setSuccessMessage(`Позиция #${itemId} удалена из заявки #${draftId}.`);
      return true;
    } catch (actionError) {
      setRequestError(actionError instanceof Error ? actionError.message : "Не удалось удалить позицию");
      return false;
    } finally {
      setRequestDetailBusyKey(null);
    }
  }

  return {
    requests,
    telegramNotifications,
    selectedRequestId,
    setSelectedRequestId,
    requestDetail,
    requestsLoading,
    telegramNotificationsLoading,
    telegramNotificationsFlushing,
    requestDetailLoading,
    requestActionId,
    requestDetailBusyKey,
    requestMaintenanceLoading,
    requestError,
    loadRequests,
    loadTelegramNotifications,
    loadRequestDetail,
    handleRequestStatusAction,
    handleDeleteRequest,
    handleExpireStaleRequests,
    handleFlushTelegramNotifications,
    handleSaveRequestDelivery,
    handleCreateRequestItem,
    handleUpdateRequestItem,
    handleDeleteRequestItem,
  };
}

