import type { CalculatorStage } from "./calculator-types";

const calculatorStageOptions: CalculatorStage[] = ["project", "rooms", "doors", "warmfloor", "flooring", "wallfinish"];

// Storage-ключи и persist helpers калькулятора.
// Этот модуль отвечает только за чтение/запись UI-настроек и draft-ключей в session/local storage.

export const calculatorStageStorageKey = "calculator:stage";
export const calculatorHeaderCardWidthStorageKey = "calculator:header:card-width";
export const calculatorHeaderFontScaleStorageKey = "calculator:header:font-scale";

export function readSessionValue<T>(key: string): T | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeSessionValue(key: string, value: unknown) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage errors and keep working with in-memory state.
  }
}

export function readLocalNumber(key: string, fallback: number) {
  if (typeof window === "undefined") {
    return fallback;
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) {
      return fallback;
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function writeLocalNumber(key: string, value: number) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // Ignore storage errors and continue with in-memory state.
  }
}

export function readStoredStage(): CalculatorStage | null {
  const value = readSessionValue<string>(calculatorStageStorageKey);
  return value && calculatorStageOptions.includes(value as CalculatorStage) ? (value as CalculatorStage) : null;
}

export function warmFloorDraftStorageKey(projectId: number) {
  return `calculator:warmfloor:draft:${projectId}`;
}

export function flooringDraftStorageKey(projectId: number) {
  return `calculator:flooring:draft:${projectId}`;
}

export function flooringExpandedStorageKey(projectId: number) {
  return `calculator:flooring:expanded:${projectId}`;
}

export function wallFinishDraftStorageKey(projectId: number) {
  return `calculator:wallfinish:draft:${projectId}`;
}

export function wallFinishExpandedStorageKey(projectId: number) {
  return `calculator:wallfinish:expanded:${projectId}`;
}
