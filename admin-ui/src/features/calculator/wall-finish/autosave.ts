import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

import { buildWallFinishPayload, buildWallFinishState } from "./";
import { emptyWallFinishState, readSessionValue, wallFinishDraftStorageKey } from "./";
import type {
  CalculatorProjectDetail,
  CalculatorWallFinishPayload,
  WallFinishAutosaveState,
  WallFinishEditState,
} from "./";

type WallFinishAutosaveParams = {
  projectDetail: CalculatorProjectDetail | null;
  isWallFinishStage: boolean;
  wallFinishState: WallFinishEditState;
  setWallFinishState: Dispatch<SetStateAction<WallFinishEditState>>;
  onSaveWallFinish: (
    projectId: number,
    payload: CalculatorWallFinishPayload,
    options?: { silent?: boolean },
  ) => Promise<void>;
};

const WALL_FINISH_AUTOSAVE_DELAY_MS = 700;
const serializeWallFinishPayload = (payload: CalculatorWallFinishPayload) => JSON.stringify(payload);

export function useWallFinishAutosave(params: WallFinishAutosaveParams): WallFinishAutosaveState {
  const { projectDetail, isWallFinishStage, wallFinishState, setWallFinishState, onSaveWallFinish } = params;
  const [autosaveState, setAutosaveState] = useState<WallFinishAutosaveState>("idle");
  const projectIdRef = useRef<number | null>(null);
  const lastSyncedSignatureRef = useRef("");
  const currentDraftSignatureRef = useRef("");
  const currentDraftPayloadRef = useRef<CalculatorWallFinishPayload | null>(null);
  const queuedSignatureRef = useRef<string | null>(null);
  const queuedPayloadRef = useRef<CalculatorWallFinishPayload | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveInFlightRef = useRef(false);
  const stateHydratedProjectIdRef = useRef<number | null>(null);
  const onSaveWallFinishRef = useRef(onSaveWallFinish);

  useEffect(() => {
    onSaveWallFinishRef.current = onSaveWallFinish;
  }, [onSaveWallFinish]);

  function clearAutosaveTimer() {
    if (saveTimerRef.current !== null) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
  }

  async function flushWallFinishDraft() {
    const projectId = projectIdRef.current;
    const payload = currentDraftPayloadRef.current;
    const signature = currentDraftSignatureRef.current;
    if (projectId === null || payload === null || signature === lastSyncedSignatureRef.current) return;
    if (saveInFlightRef.current) {
      queuedSignatureRef.current = signature;
      queuedPayloadRef.current = payload;
      return;
    }

    saveInFlightRef.current = true;
    setAutosaveState("saving");
    try {
      await onSaveWallFinishRef.current(projectId, payload, { silent: true });
      if (projectIdRef.current === projectId) {
        lastSyncedSignatureRef.current = signature;
        setAutosaveState(currentDraftSignatureRef.current === signature ? "saved" : "pending");
      }
    } catch {
      if (projectIdRef.current === projectId) setAutosaveState("error");
    } finally {
      saveInFlightRef.current = false;
      const queuedPayload = queuedPayloadRef.current;
      const queuedSignature = queuedSignatureRef.current;
      if (queuedPayload !== null && queuedSignature !== null && queuedSignature !== lastSyncedSignatureRef.current) {
        currentDraftPayloadRef.current = queuedPayload;
        currentDraftSignatureRef.current = queuedSignature;
        queuedPayloadRef.current = null;
        queuedSignatureRef.current = null;
        void flushWallFinishDraft();
      } else {
        queuedPayloadRef.current = null;
        queuedSignatureRef.current = null;
      }
    }
  }

  useEffect(() => {
    const nextProjectId = projectDetail?.project.id ?? null;
    const nextState = projectDetail?.wall_finishes
      ? buildWallFinishState(
          projectDetail.wall_finishes,
          readSessionValue<WallFinishEditState>(wallFinishDraftStorageKey(projectDetail.project.id)),
        )
      : emptyWallFinishState;
    const nextPayload = projectDetail?.wall_finishes ? buildWallFinishPayload(nextState) : null;
    const nextSignature = nextPayload ? serializeWallFinishPayload(nextPayload) : "";

    if (projectIdRef.current !== nextProjectId) {
      clearAutosaveTimer();
      projectIdRef.current = nextProjectId;
      stateHydratedProjectIdRef.current = null;
      lastSyncedSignatureRef.current = nextSignature;
      currentDraftSignatureRef.current = nextSignature;
      currentDraftPayloadRef.current = nextPayload;
      queuedPayloadRef.current = null;
      queuedSignatureRef.current = null;
      setWallFinishState(nextState);
      setAutosaveState("idle");
      return;
    }

    if (!projectDetail?.wall_finishes || nextPayload === null) {
      stateHydratedProjectIdRef.current = null;
      setWallFinishState(emptyWallFinishState);
      setAutosaveState("idle");
      return;
    }

    if (currentDraftSignatureRef.current === lastSyncedSignatureRef.current) {
      lastSyncedSignatureRef.current = nextSignature;
      currentDraftSignatureRef.current = nextSignature;
      currentDraftPayloadRef.current = nextPayload;
      setWallFinishState(nextState);
      return;
    }
    if (currentDraftSignatureRef.current === nextSignature) {
      lastSyncedSignatureRef.current = nextSignature;
      setAutosaveState("saved");
    }
  }, [projectDetail, setWallFinishState]);

  useEffect(() => {
    if (!projectDetail?.wall_finishes) return;
    const payload = buildWallFinishPayload(wallFinishState);
    const signature = serializeWallFinishPayload(payload);
    if (stateHydratedProjectIdRef.current !== projectDetail.project.id) {
      if (signature === lastSyncedSignatureRef.current) {
        stateHydratedProjectIdRef.current = projectDetail.project.id;
      } else {
        return;
      }
    }
    currentDraftPayloadRef.current = payload;
    currentDraftSignatureRef.current = signature;
    if (signature === lastSyncedSignatureRef.current) {
      clearAutosaveTimer();
      setAutosaveState((current) => (current === "idle" ? current : "saved"));
      return;
    }

    setAutosaveState(saveInFlightRef.current ? "saving" : "pending");
    clearAutosaveTimer();
    saveTimerRef.current = setTimeout(() => void flushWallFinishDraft(), WALL_FINISH_AUTOSAVE_DELAY_MS);
    return clearAutosaveTimer;
  }, [projectDetail?.project.id, projectDetail?.wall_finishes, wallFinishState]);

  useEffect(() => {
    const hasUnsavedDraft =
      projectIdRef.current !== null &&
      currentDraftPayloadRef.current !== null &&
      currentDraftSignatureRef.current !== lastSyncedSignatureRef.current;
    if (!isWallFinishStage && hasUnsavedDraft) {
      clearAutosaveTimer();
      void flushWallFinishDraft();
    }
  }, [isWallFinishStage]);

  useEffect(() => {
    return () => {
      clearAutosaveTimer();
      if (
        projectIdRef.current !== null &&
        currentDraftPayloadRef.current !== null &&
        currentDraftSignatureRef.current !== lastSyncedSignatureRef.current
      ) {
        void onSaveWallFinishRef.current(projectIdRef.current, currentDraftPayloadRef.current, { silent: true });
      }
    };
  }, [projectDetail?.project.id]);

  return autosaveState;
}
