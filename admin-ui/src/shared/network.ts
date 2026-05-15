import type { AdminAuthSession } from "./types";

// Сетевые helper'ы admin UI: базовый URL, HTTP-ошибки, JSON-запросы и скачивание файлов.

const DEV_API_BASE = "http://127.0.0.1:8000";

function resolveApiBase(): string {
  const rawApiBase = import.meta.env.VITE_API_BASE_URL?.trim();
  if (rawApiBase) {
    return rawApiBase.replace(/\/+$/, "");
  }

  if (import.meta.env.PROD) {
    throw new Error("VITE_API_BASE_URL is required for production frontend build/runtime");
  }

  return DEV_API_BASE;
}

export const API_BASE = resolveApiBase();

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers ?? {});
  if (!(init?.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...init,
    headers,
  });

  if (!response.ok) {
    const payload = (await safeJson(response)) as { detail?: string } | null;
    throw new ApiError(payload?.detail ?? `API ${response.status}: ${response.statusText}`, response.status, payload);
  }

  return (await response.json()) as T;
}

export function buildApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  return `${API_BASE}${path}`;
}

export async function downloadFile(path: string, preferredFileName?: string): Promise<void> {
  const response = await fetch(buildApiUrl(path), {
    credentials: "include",
  });

  if (!response.ok) {
    const payload = (await safeJson(response)) as { detail?: string } | null;
    throw new ApiError(payload?.detail ?? `API ${response.status}: ${response.statusText}`, response.status, payload);
  }

  const blob = await response.blob();
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = preferredFileName || extractDownloadFileName(response) || "download";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 0);
}

export function isAuthenticatedSession(session: AdminAuthSession | null): boolean {
  return Boolean(session?.authenticated);
}

export async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function extractDownloadFileName(response: Response): string | null {
  const contentDisposition = response.headers.get("content-disposition");
  if (!contentDisposition) {
    return null;
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const plainMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  return plainMatch?.[1] ?? null;
}
