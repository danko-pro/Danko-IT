import type {
  DraftDetail,
  GroupProfile,
  MaterialSku,
  RecentRequest,
  RequestItem,
  RequestItemFormState,
} from "./types";
import { formatDateRu, formatDateTimeRu } from "./formatters/date";
import { trimFloatLoose } from "./formatters/number";

// Helper'ы request/materials UI: статусные подписи, размеры, количество и form mapping.

export function requestItemFormFromItem(item: RequestItem): RequestItemFormState {
  return {
    title: itemTitle(item),
    quantity: item.quantity === null || item.quantity === undefined ? "" : trimFloat(item.quantity),
    unit: item.unit ?? "шт",
    thickness_mm: item.thickness_mm === null || item.thickness_mm === undefined ? "" : trimFloat(item.thickness_mm),
    length_mm: item.length_mm === null || item.length_mm === undefined ? "" : trimFloat(item.length_mm),
    width_mm: item.width_mm === null || item.width_mm === undefined ? "" : trimFloat(item.width_mm),
    note: item.note ?? "",
  };
}

export function toneForStatus(status: string): "ok" | "warn" | "neutral" | "active" | "error" {
  switch (status) {
    case "confirmed":
      return "ok";
    case "done":
      return "ok";
    case "awaiting_confirmation":
      return "warn";
    case "collecting":
      return "active";
    case "in_progress":
      return "active";
    case "cancelled":
      return "error";
    default:
      return "neutral";
  }
}

export function formatStatus(status: string): string {
  switch (status) {
    case "confirmed":
      return "Подтверждена";
    case "in_progress":
      return "В работе";
    case "done":
      return "Выполнена";
    case "awaiting_confirmation":
      return "Ждет подтверждения";
    case "collecting":
      return "Сбор данных";
    case "cancelled":
      return "Отменена";
    default:
      return status;
  }
}

export function waitingForLabel(waitingFor: string): string {
  switch (waitingFor) {
    case "item_clarification":
      return "Уточнение позиции";
    case "quantity":
      return "Количество";
    case "note":
      return "Комментарий";
    case "delivery":
      return "Дата и время";
    case "delivery_proposal":
      return "Подтверждение слота";
    case "confirmation":
      return "Финальное подтверждение";
    default:
      return waitingFor;
  }
}

export function requestActionsForStatus(status: string): Array<{ status: string; label: string }> {
  switch (status) {
    case "collecting":
    case "awaiting_confirmation":
      return [
        { status: "confirmed", label: "Подтвердить" },
        { status: "cancelled", label: "Отменить" },
      ];
    case "confirmed":
      return [
        { status: "in_progress", label: "В работу" },
        { status: "cancelled", label: "Отменить" },
      ];
    case "in_progress":
      return [
        { status: "done", label: "Завершить" },
        { status: "cancelled", label: "Отменить" },
      ];
    case "cancelled":
      return [{ status: "collecting", label: "Вернуть в сбор" }];
    default:
      return [];
  }
}

export function canDeleteRequest(status: string): boolean {
  return status === "collecting" || status === "awaiting_confirmation" || status === "cancelled";
}

export function formatDateTime(value: string | null | undefined): string {
  return formatDateTimeRu(value);
}

export function formatDate(value: string | null | undefined): string {
  return formatDateRu(value);
}

export function formatDraftDelivery(draft: DraftDetail): string {
  if (draft.confirmed_delivery_date || draft.confirmed_delivery_time) {
    return `${formatDate(draft.confirmed_delivery_date)} к ${draft.confirmed_delivery_time ?? "—"}`;
  }
  if (draft.proposed_delivery_date || draft.proposed_delivery_time) {
    return `предложено ${formatDate(draft.proposed_delivery_date)} к ${draft.proposed_delivery_time ?? "—"}`;
  }
  if (draft.requested_delivery_date || draft.requested_delivery_time) {
    return `${formatDate(draft.requested_delivery_date)} к ${draft.requested_delivery_time ?? "—"}`;
  }
  return "не указана";
}

export function formatDeliveryWindow(request: RecentRequest): string {
  if (request.confirmed_delivery_date || request.confirmed_delivery_time) {
    return `${formatDate(request.confirmed_delivery_date)} к ${request.confirmed_delivery_time ?? "—"}`;
  }
  if (request.requested_delivery_date || request.requested_delivery_time) {
    return `${formatDate(request.requested_delivery_date)} к ${request.requested_delivery_time ?? "—"}`;
  }
  return "не указана";
}

export function formatAddress(group: GroupProfile | null): string {
  if (!group) {
    return "Адрес не найден";
  }
  const parts = [group.address];
  if (group.flat) {
    parts.push(`кв. ${group.flat}`);
  }
  if (group.floor) {
    parts.push(`${group.floor} этаж`);
  }
  return parts.filter(Boolean).join(", ") || "Адрес не найден";
}

export function itemTitle(item: RequestItem): string {
  return item.sku_title || item.variant_name || item.normalized_name || item.family_name || item.raw_name || "Позиция";
}

export function formatDimensions(item: Pick<RequestItem, "length_mm" | "width_mm" | "thickness_mm">): string {
  const length = formatMm(item.length_mm);
  const width = formatMm(item.width_mm);
  const thickness = formatMm(item.thickness_mm);

  if (item.length_mm && item.width_mm && item.thickness_mm) {
    return `${Math.round(item.length_mm)}x${Math.round(item.width_mm)}x${trimFloat(item.thickness_mm)} мм`;
  }
  if (item.length_mm && item.width_mm) {
    return `${Math.round(item.length_mm)}x${Math.round(item.width_mm)} мм`;
  }
  return [length, width, thickness].filter(Boolean).join(" · ") || "—";
}

export function formatSkuDimensions(sku: MaterialSku): string {
  const parts = [];
  if (sku.length_mm || sku.width_mm || sku.thickness_mm) {
    parts.push(formatDimensions(sku));
  }
  parts.push(`ед. ${sku.unit}`);
  return parts.join(" · ");
}

export function formatMm(value: number | null): string {
  if (value === null || value === undefined) {
    return "";
  }
  return `${trimFloat(value)} мм`;
}

export function trimFloat(value: number): string {
  return trimFloatLoose(value);
}

export function formatQuantity(quantity: number, unit: string): string {
  const rounded = Number.isInteger(quantity) ? String(quantity) : quantity.toString();
  const normalizedUnit = unit.toLowerCase();

  if (normalizedUnit === "шт" || normalizedUnit === "штука" || normalizedUnit === "штуки" || normalizedUnit === "штук") {
    return `${rounded} ${declOf(Number(quantity), ["штука", "штуки", "штук"])}`;
  }

  if (normalizedUnit === "лист" || normalizedUnit === "листа" || normalizedUnit === "листов") {
    return `${rounded} ${declOf(Number(quantity), ["лист", "листа", "листов"])}`;
  }

  if (normalizedUnit === "мешок" || normalizedUnit === "мешка" || normalizedUnit === "мешков") {
    return `${rounded} ${declOf(Number(quantity), ["мешок", "мешка", "мешков"])}`;
  }

  return `${rounded} ${unit}`;
}

export function declOf(value: number, forms: string[]): string {
  const abs = Math.abs(value) % 100;
  const remainder = abs % 10;
  if (abs > 10 && abs < 20) {
    return forms[2];
  }
  if (remainder > 1 && remainder < 5) {
    return forms[1];
  }
  if (remainder === 1) {
    return forms[0];
  }
  return forms[2];
}

export function toNullableNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const normalized = trimmed.replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}
