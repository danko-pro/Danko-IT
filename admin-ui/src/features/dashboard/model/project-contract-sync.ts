/**
 * Общий контракт sync-состояния для договора.
 * Файл лежит в model-слое, чтобы state и card UI переиспользовали один тип без обратных зависимостей.
 */
export type ContractSyncTone = "info" | "success" | "error";

export type ContractSyncState = {
  uploading: boolean;
  extracting: boolean;
  tone: ContractSyncTone;
  message: string | null;
};
