import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import type {
  RequestActionResult,
  RequestDeliveryFormState,
  RequestDetail,
  RequestItem,
  RequestItemFormState,
  RequestStaleDraftResetResult,
  RecentRequest,
} from "../../shared/types";
import { fetchJson, formatStatus, itemTitle, toNullableNumber } from "../../shared/utils";

type RequestsControllerOptions = {
  setSuccessMessage: Dispatch<SetStateAction<string | null>>;
};

// Контур заявок: список, активная карточка и CRUD по доставке/позициям.
export function useAdminRequestsController(props: RequestsControllerOptions) {
  const [requests, setRequests] = useState<RecentRequest[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [requestDetail, setRequestDetail] = useState<RequestDetail | null>(null);

  const [requestsLoading, setRequestsLoading] = useState(false);
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
      const data = await fetchJson<RecentRequest[]>("/api/requests/recent?limit=40");
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
      const data = await fetchJson<RequestDetail>(`/api/requests/${draftId}`);
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
      const result = await fetchJson<RequestActionResult>(`/api/requests/${draftId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
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
      await fetchJson<{ deleted: boolean }>(`/api/requests/${draftId}`, {
        method: "DELETE",
      });
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
      const result = await fetchJson<RequestStaleDraftResetResult>("/api/requests/expire-stale", {
        method: "POST",
      });
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

  async function handleSaveRequestDelivery(draftId: number, form: RequestDeliveryFormState): Promise<boolean> {
    try {
      setRequestDetailBusyKey(`delivery-${draftId}`);
      const updated = await fetchJson<RequestDetail>(`/api/requests/${draftId}/delivery`, {
        method: "PATCH",
        body: JSON.stringify(form),
      });
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
      const updated = await fetchJson<RequestDetail>(`/api/requests/${draftId}/items`, {
        method: "POST",
        body: JSON.stringify({
          title,
          quantity: toNullableNumber(form.quantity),
          unit: form.unit.trim() || null,
          thickness_mm: toNullableNumber(form.thickness_mm),
          length_mm: toNullableNumber(form.length_mm),
          width_mm: toNullableNumber(form.width_mm),
          note: form.note.trim() || null,
        }),
      });
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
      const updated = await fetchJson<RequestDetail>(`/api/requests/items/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title,
          quantity: toNullableNumber(form.quantity),
          unit: form.unit.trim() || null,
          thickness_mm: toNullableNumber(form.thickness_mm),
          length_mm: toNullableNumber(form.length_mm),
          width_mm: toNullableNumber(form.width_mm),
          note: form.note.trim() || null,
          detach_catalog: title !== itemTitle(item).trim(),
        }),
      });
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
      const updated = await fetchJson<RequestDetail>(`/api/requests/items/${itemId}`, {
        method: "DELETE",
      });
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
    selectedRequestId,
    setSelectedRequestId,
    requestDetail,
    requestsLoading,
    requestDetailLoading,
    requestActionId,
    requestDetailBusyKey,
    requestMaintenanceLoading,
    requestError,
    loadRequests,
    loadRequestDetail,
    handleRequestStatusAction,
    handleDeleteRequest,
    handleExpireStaleRequests,
    handleSaveRequestDelivery,
    handleCreateRequestItem,
    handleUpdateRequestItem,
    handleDeleteRequestItem,
  };
}

