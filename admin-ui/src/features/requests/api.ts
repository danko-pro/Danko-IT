import type {
  RequestActionResult,
  RequestDeliveryFormState,
  RequestDetail,
  RequestItem,
  RequestItemFormState,
  RequestStaleDraftResetResult,
  RecentRequest,
  TelegramNotification,
  TelegramNotificationFlushResult,
} from "../../shared/types";
import { fetchJson, itemTitle, toNullableNumber } from "../../shared/utils";

export function fetchRecentRequests(limit = 40) {
  return fetchJson<RecentRequest[]>(`/api/requests/recent?limit=${limit}`);
}

export function fetchRequestDetail(draftId: number) {
  return fetchJson<RequestDetail>(`/api/requests/${draftId}`);
}

export function updateRequestStatus(draftId: number, status: string) {
  return fetchJson<RequestActionResult>(`/api/requests/${draftId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function deleteRequest(draftId: number) {
  return fetchJson<{ deleted: boolean; draft_id?: number }>(`/api/requests/${draftId}`, {
    method: "DELETE",
  });
}

export function expireStaleRequests() {
  return fetchJson<RequestStaleDraftResetResult>("/api/requests/expire-stale", {
    method: "POST",
  });
}

export function fetchTelegramNotifications(limit = 20) {
  return fetchJson<TelegramNotification[]>(`/api/notifications/telegram?status=pending&limit=${limit}`);
}

export function flushTelegramNotifications(limit = 20) {
  return fetchJson<TelegramNotificationFlushResult>(`/api/notifications/telegram/flush?limit=${limit}`, {
    method: "POST",
  });
}

export function saveRequestDelivery(draftId: number, form: RequestDeliveryFormState) {
  return fetchJson<RequestDetail>(`/api/requests/${draftId}/delivery`, {
    method: "PATCH",
    body: JSON.stringify(form),
  });
}

export function createRequestItem(draftId: number, form: RequestItemFormState) {
  return fetchJson<RequestDetail>(`/api/requests/${draftId}/items`, {
    method: "POST",
    body: JSON.stringify(buildRequestItemPayload(form)),
  });
}

export function updateRequestItem(item: RequestItem, form: RequestItemFormState) {
  return fetchJson<RequestDetail>(`/api/requests/items/${item.id}`, {
    method: "PATCH",
    body: JSON.stringify({
      ...buildRequestItemPayload(form),
      detach_catalog: form.title.trim() !== itemTitle(item).trim(),
    }),
  });
}

export function deleteRequestItem(itemId: number) {
  return fetchJson<RequestDetail>(`/api/requests/items/${itemId}`, {
    method: "DELETE",
  });
}

function buildRequestItemPayload(form: RequestItemFormState) {
  return {
    title: form.title.trim(),
    quantity: toNullableNumber(form.quantity),
    unit: form.unit.trim() || null,
    thickness_mm: toNullableNumber(form.thickness_mm),
    length_mm: toNullableNumber(form.length_mm),
    width_mm: toNullableNumber(form.width_mm),
    note: form.note.trim() || null,
  };
}
