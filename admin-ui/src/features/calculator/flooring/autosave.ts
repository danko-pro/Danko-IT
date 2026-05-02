import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

import { buildFlooringPayload, buildFlooringState } from "./";
import { emptyFlooringState, flooringDraftStorageKey, readSessionValue } from "./";
import type { CalculatorFlooringPayload, CalculatorProjectDetail, FlooringAutosaveState, FlooringEditState } from "./";

type FlooringAutosaveParams = {
  projectDetail: CalculatorProjectDetail | null;
  isFlooringStage: boolean;
  flooringState: FlooringEditState;
  setFlooringState: Dispatch<SetStateAction<FlooringEditState>>;
  onSaveFlooring: (
    projectId: number,
    payload: CalculatorFlooringPayload,
    options?: { silent?: boolean },
  ) => Promise<void>;
};

const FLOORING_AUTOSAVE_DELAY_MS = 700;
const serializeFlooringPayload = (payload: CalculatorFlooringPayload) => JSON.stringify(payload);

export function useFlooringAutosave(params: FlooringAutosaveParams): FlooringAutosaveState {
  const { projectDetail, isFlooringStage, flooringState, setFlooringState, onSaveFlooring } = params;
  const [autosaveState, setAutosaveState] = useState<FlooringAutosaveState>("idle");
  const projectIdRef = useRef<number | null>(null);
  const lastSyncedSignatureRef = useRef("");
  const currentDraftSignatureRef = useRef("");
  const currentDraftPayloadRef = useRef<CalculatorFlooringPayload | null>(null);
  const queuedSignatureRef = useRef<string | null>(null);
  const queuedPayloadRef = useRef<CalculatorFlooringPayload | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveInFlightRef = useRef(false);
  const stateHydratedProjectIdRef = useRef<number | null>(null);
  const onSaveFlooringRef = useRef(onSaveFlooring);

  useEffect(() => {
    onSaveFlooringRef.current = onSaveFlooring;
  }, [onSaveFlooring]);

  function clearAutosaveTimer() {
    if (saveTimerRef.current !== null) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
  }

  async function flushFlooringDraft() {
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
      await onSaveFlooringRef.current(projectId, payload, { silent: true });
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
        void flushFlooringDraft();
      } else {
        queuedPayloadRef.current = null;
        queuedSignatureRef.current = null;
      }
    }
  }

  useEffect(() => {
    const nextProjectId = projectDetail?.project.id ?? null;
    const nextState = projectDetail?.flooring
      ? buildFlooringState(
          projectDetail.flooring,
          readSessionValue<FlooringEditState>(flooringDraftStorageKey(projectDetail.project.id)),
        )
      : emptyFlooringState;
    const nextPayload = projectDetail?.flooring ? buildFlooringPayload(nextState) : null;
    const nextSignature = nextPayload ? serializeFlooringPayload(nextPayload) : "";

    if (projectIdRef.current !== nextProjectId) {
      clearAutosaveTimer();
      projectIdRef.current = nextProjectId;
      stateHydratedProjectIdRef.current = null;
      lastSyncedSignatureRef.current = nextSignature;
      currentDraftSignatureRef.current = nextSignature;
      currentDraftPayloadRef.current = nextPayload;
      queuedPayloadRef.current = null;
      queuedSignatureRef.current = null;
      setFlooringState(nextState);
      setAutosaveState("idle");
      return;
    }

    if (!projectDetail?.flooring || nextPayload === null) {
      stateHydratedProjectIdRef.current = null;
      setFlooringState(emptyFlooringState);
      setAutosaveState("idle");
      return;
    }

    if (currentDraftSignatureRef.current === lastSyncedSignatureRef.current) {
      lastSyncedSignatureRef.current = nextSignature;
      currentDraftSignatureRef.current = nextSignature;
      currentDraftPayloadRef.current = nextPayload;
      setFlooringState(nextState);
      return;
    }
    if (currentDraftSignatureRef.current === nextSignature) {
      lastSyncedSignatureRef.current = nextSignature;
      setAutosaveState("saved");
    }
  }, [projectDetail, setFlooringState]);

  useEffect(() => {
    if (!projectDetail?.flooring) return;
    const payload = buildFlooringPayload(flooringState);
    const signature = serializeFlooringPayload(payload);
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
    saveTimerRef.current = setTimeout(() => void flushFlooringDraft(), FLOORING_AUTOSAVE_DELAY_MS);
    return clearAutosaveTimer;
  }, [projectDetail?.project.id, projectDetail?.flooring, flooringState]);

  useEffect(() => {
    const hasUnsavedDraft =
      projectIdRef.current !== null &&
      currentDraftPayloadRef.current !== null &&
      currentDraftSignatureRef.current !== lastSyncedSignatureRef.current;
    if (!isFlooringStage && hasUnsavedDraft) {
      clearAutosaveTimer();
      void flushFlooringDraft();
    }
  }, [isFlooringStage]);

  useEffect(() => {
    return () => {
      clearAutosaveTimer();
      if (
        projectIdRef.current !== null &&
        currentDraftPayloadRef.current !== null &&
        currentDraftSignatureRef.current !== lastSyncedSignatureRef.current
      ) {
        void onSaveFlooringRef.current(projectIdRef.current, currentDraftPayloadRef.current, { silent: true });
      }
    };
  }, [projectDetail?.project.id]);

  return autosaveState;
}
