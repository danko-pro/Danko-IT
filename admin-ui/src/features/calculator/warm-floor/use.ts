import type { Dispatch, SetStateAction } from "react";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { buildRoomStateById } from "./";
import { buildWarmFloorPayload } from "./";
import { buildWarmFloorPreview, buildWarmFloorState } from "./";
import { emptyWarmFloorState, readSessionValue, warmFloorDraftStorageKey, writeSessionValue } from "./";
import type { CalculatorProjectDetail, CalculatorWarmFloorPayload, WarmFloorAutosaveState, WarmFloorEditState } from "./";

type WarmFloorControllerParams = {
  projectDetail: CalculatorProjectDetail | null;
  isWarmFloorStage: boolean;
  onSaveWarmFloor: (
    projectId: number,
    payload: CalculatorWarmFloorPayload,
    options?: { silent?: boolean },
  ) => Promise<void>;
};

type WarmFloorControllerResult = {
  warmFloorState: WarmFloorEditState;
  setWarmFloorState: Dispatch<SetStateAction<WarmFloorEditState>>;
  warmFloorSettingsOpen: boolean;
  setWarmFloorSettingsOpen: Dispatch<SetStateAction<boolean>>;
  expandedWarmFloorRoomId: number | null;
  setExpandedWarmFloorRoomId: Dispatch<SetStateAction<number | null>>;
  warmFloorPreview: CalculatorProjectDetail["warm_floor"] | null;
  warmFloorRoomStateById: Map<number, WarmFloorEditState["rooms"][number]>;
  autosaveState: WarmFloorAutosaveState;
  resetWarmFloorState: () => void;
};

const WARM_FLOOR_AUTOSAVE_DELAY_MS = 700;
const serializeWarmFloorPayload = (payload: CalculatorWarmFloorPayload) => JSON.stringify(payload);

export function useCalculatorWarmFloorController(params: WarmFloorControllerParams): WarmFloorControllerResult {
  const { projectDetail, isWarmFloorStage, onSaveWarmFloor } = params;
  const [warmFloorState, setWarmFloorState] = useState<WarmFloorEditState>(emptyWarmFloorState);
  const [autosaveState, setAutosaveState] = useState<WarmFloorAutosaveState>("idle");
  const [warmFloorSettingsOpen, setWarmFloorSettingsOpen] = useState(false);
  const [expandedWarmFloorRoomId, setExpandedWarmFloorRoomId] = useState<number | null>(null);
  const projectIdRef = useRef<number | null>(null);
  const lastSyncedSignatureRef = useRef("");
  const currentDraftSignatureRef = useRef("");
  const currentDraftPayloadRef = useRef<CalculatorWarmFloorPayload | null>(null);
  const queuedSignatureRef = useRef<string | null>(null);
  const queuedPayloadRef = useRef<CalculatorWarmFloorPayload | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveInFlightRef = useRef(false);
  const onSaveWarmFloorRef = useRef(onSaveWarmFloor);

  useEffect(() => {
    onSaveWarmFloorRef.current = onSaveWarmFloor;
  }, [onSaveWarmFloor]);

  function clearAutosaveTimer() {
    if (saveTimerRef.current !== null) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
  }

  async function flushWarmFloorDraft() {
    const projectId = projectIdRef.current;
    const payload = currentDraftPayloadRef.current;
    const signature = currentDraftSignatureRef.current;
    if (projectId === null || payload === null || signature === lastSyncedSignatureRef.current) {
      return;
    }
    if (saveInFlightRef.current) {
      queuedSignatureRef.current = signature;
      queuedPayloadRef.current = payload;
      return;
    }

    saveInFlightRef.current = true;
    setAutosaveState("saving");
    try {
      await onSaveWarmFloorRef.current(projectId, payload, { silent: true });
      if (projectIdRef.current === projectId) {
        lastSyncedSignatureRef.current = signature;
        setAutosaveState(currentDraftSignatureRef.current === signature ? "saved" : "pending");
      }
    } catch {
      if (projectIdRef.current === projectId) {
        setAutosaveState("error");
      }
    } finally {
      saveInFlightRef.current = false;
      if (
        queuedPayloadRef.current !== null &&
        queuedSignatureRef.current !== null &&
        queuedSignatureRef.current !== lastSyncedSignatureRef.current
      ) {
        currentDraftPayloadRef.current = queuedPayloadRef.current;
        currentDraftSignatureRef.current = queuedSignatureRef.current;
        queuedPayloadRef.current = null;
        queuedSignatureRef.current = null;
        void flushWarmFloorDraft();
      } else {
        queuedPayloadRef.current = null;
        queuedSignatureRef.current = null;
      }
    }
  }

  useEffect(() => {
    const nextProjectId = projectDetail?.project.id ?? null;
    const nextState = projectDetail?.warm_floor
      ? buildWarmFloorState(
          projectDetail.warm_floor,
          readSessionValue<WarmFloorEditState>(warmFloorDraftStorageKey(projectDetail.project.id)),
        )
      : emptyWarmFloorState;
    const nextPayload = projectDetail?.warm_floor ? buildWarmFloorPayload(nextState) : null;
    const nextSignature = nextPayload ? serializeWarmFloorPayload(nextPayload) : "";

    if (projectIdRef.current !== nextProjectId) {
      clearAutosaveTimer();
      projectIdRef.current = nextProjectId;
      lastSyncedSignatureRef.current = nextSignature;
      currentDraftSignatureRef.current = nextSignature;
      currentDraftPayloadRef.current = nextPayload;
      queuedPayloadRef.current = null;
      queuedSignatureRef.current = null;
      setWarmFloorState(nextState);
      setAutosaveState("idle");
      return;
    }

    if (!projectDetail?.warm_floor || nextPayload === null) {
      setWarmFloorState(emptyWarmFloorState);
      setAutosaveState("idle");
      return;
    }

    if (currentDraftSignatureRef.current === lastSyncedSignatureRef.current) {
      lastSyncedSignatureRef.current = nextSignature;
      currentDraftSignatureRef.current = nextSignature;
      currentDraftPayloadRef.current = nextPayload;
      setWarmFloorState(nextState);
      return;
    }

    if (currentDraftSignatureRef.current === nextSignature) {
      lastSyncedSignatureRef.current = nextSignature;
      setAutosaveState("saved");
    }
  }, [projectDetail]);

  useEffect(() => {
    if (!projectDetail?.warm_floor) {
      setExpandedWarmFloorRoomId(null);
      return;
    }
    const selectedRoom = projectDetail.warm_floor.rooms.find((room) => room.selected);
    setExpandedWarmFloorRoomId(selectedRoom?.room_id ?? projectDetail.warm_floor.rooms[0]?.room_id ?? null);
  }, [projectDetail?.project.id, projectDetail?.warm_floor?.rooms]);

  useEffect(() => {
    setWarmFloorSettingsOpen(false);
  }, [projectDetail?.project.id]);

  useEffect(() => {
    if (!projectDetail) {
      return;
    }
    const timerId = window.setTimeout(() => {
      writeSessionValue(warmFloorDraftStorageKey(projectDetail.project.id), warmFloorState);
    }, 520);
    return () => window.clearTimeout(timerId);
  }, [projectDetail?.project.id, warmFloorState]);

  useEffect(() => {
    if (!projectDetail?.warm_floor) {
      return;
    }
    const payload = buildWarmFloorPayload(warmFloorState);
    const signature = serializeWarmFloorPayload(payload);
    currentDraftPayloadRef.current = payload;
    currentDraftSignatureRef.current = signature;

    if (signature === lastSyncedSignatureRef.current) {
      clearAutosaveTimer();
      setAutosaveState((current) => (current === "idle" ? current : "saved"));
      return;
    }

    setAutosaveState(saveInFlightRef.current ? "saving" : "pending");
    clearAutosaveTimer();
    saveTimerRef.current = setTimeout(() => {
      void flushWarmFloorDraft();
    }, WARM_FLOOR_AUTOSAVE_DELAY_MS);
    return clearAutosaveTimer;
  }, [projectDetail?.project.id, projectDetail?.warm_floor, warmFloorState]);

  useEffect(() => {
    if (
      !isWarmFloorStage &&
      projectIdRef.current !== null &&
      currentDraftPayloadRef.current !== null &&
      currentDraftSignatureRef.current !== lastSyncedSignatureRef.current
    ) {
      clearAutosaveTimer();
      void flushWarmFloorDraft();
    }
  }, [isWarmFloorStage]);

  useEffect(() => {
    return () => {
      clearAutosaveTimer();
      if (
        projectIdRef.current !== null &&
        currentDraftPayloadRef.current !== null &&
        currentDraftSignatureRef.current !== lastSyncedSignatureRef.current
      ) {
        void onSaveWarmFloorRef.current(projectIdRef.current, currentDraftPayloadRef.current, { silent: true });
      }
    };
  }, [projectDetail?.project.id]);

  const deferredWarmFloorState = useDeferredValue(warmFloorState);
  const warmFloorPreview = useMemo(() => {
    if (!projectDetail) {
      return null;
    }
    return isWarmFloorStage ? buildWarmFloorPreview(projectDetail.warm_floor, deferredWarmFloorState) : projectDetail.warm_floor;
  }, [deferredWarmFloorState, isWarmFloorStage, projectDetail]);

  const warmFloorRoomStateById = useMemo(() => buildRoomStateById(warmFloorState.rooms), [warmFloorState.rooms]);

  function resetWarmFloorState() {
    setWarmFloorState(projectDetail?.warm_floor ? buildWarmFloorState(projectDetail.warm_floor) : emptyWarmFloorState);
  }

  return {
    warmFloorState,
    setWarmFloorState,
    warmFloorSettingsOpen,
    setWarmFloorSettingsOpen,
    expandedWarmFloorRoomId,
    setExpandedWarmFloorRoomId,
    warmFloorPreview,
    warmFloorRoomStateById,
    autosaveState,
    resetWarmFloorState,
  };
}
