import type { Dispatch, SetStateAction } from "react";
import { useEffect, useRef, useState } from "react";

import { trimFloat } from "../shared";
import type { CalculatorProjectDoor, ProjectDoorAutosaveState, ProjectDoorCreateState } from "./model";
import { buildProjectDoorPayload, type ProjectDoorPayload } from "./payload";
import { emptyProjectDoorState } from "./state";

type ProjectDoorAutosaveParams = {
  editingDoorId: number | null;
  isDoorsStage: boolean;
  projectId: number | null;
  projectDoorState: ProjectDoorCreateState;
  selectedDoor: CalculatorProjectDoor | null;
  setProjectDoorState: Dispatch<SetStateAction<ProjectDoorCreateState>>;
  onUpdateProjectDoor: (doorId: number, payload: ProjectDoorPayload, options?: { silent?: boolean }) => Promise<void>;
};

const PROJECT_DOOR_AUTOSAVE_DELAY_MS = 700;
const serializeProjectDoorPayload = (payload: ProjectDoorPayload) => JSON.stringify(payload);

export function buildProjectDoorStateFromDoor(door: CalculatorProjectDoor): ProjectDoorCreateState {
  return {
    door_catalog_id: door.door_catalog_id === null ? "" : String(door.door_catalog_id),
    opening_kind: door.opening_kind,
    title: door.title ?? door.catalog_title ?? "",
    width_mm: door.width_mm === null ? "" : trimFloat(door.width_mm),
    height_mm: door.height_mm === null ? "" : trimFloat(door.height_mm),
    thickness_mm: door.thickness_mm === null ? "" : trimFloat(door.thickness_mm),
    purchase_price: door.purchase_price === null ? "" : trimFloat(door.purchase_price),
    sale_price: door.sale_price === null ? "" : trimFloat(door.sale_price),
    install_price: door.install_price === null ? "" : trimFloat(door.install_price),
    room_a_id: door.room_a_id === null ? "" : String(door.room_a_id),
    room_b_id: door.room_b_id === null ? "" : String(door.room_b_id),
    note: door.note ?? "",
  };
}

export function useProjectDoorAutosave(params: ProjectDoorAutosaveParams): ProjectDoorAutosaveState {
  const [autosaveState, setAutosaveState] = useState<ProjectDoorAutosaveState>("idle");
  const projectDoorIdRef = useRef<number | null>(null);
  const lastSyncedSignatureRef = useRef("");
  const currentDraftSignatureRef = useRef("");
  const currentDraftPayloadRef = useRef<ProjectDoorPayload | null>(null);
  const queuedSignatureRef = useRef<string | null>(null);
  const queuedPayloadRef = useRef<ProjectDoorPayload | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveInFlightRef = useRef(false);
  const onUpdateProjectDoorRef = useRef(params.onUpdateProjectDoor);

  useEffect(() => {
    onUpdateProjectDoorRef.current = params.onUpdateProjectDoor;
  }, [params.onUpdateProjectDoor]);

  function clearAutosaveTimer() {
    if (saveTimerRef.current !== null) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
  }

  async function flushProjectDoorDraft() {
    const doorId = projectDoorIdRef.current;
    const payload = currentDraftPayloadRef.current;
    const signature = currentDraftSignatureRef.current;
    if (doorId === null || payload === null || signature === lastSyncedSignatureRef.current) {
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
      await onUpdateProjectDoorRef.current(doorId, payload, { silent: true });
      if (projectDoorIdRef.current === doorId) {
        lastSyncedSignatureRef.current = signature;
        setAutosaveState(currentDraftSignatureRef.current === signature ? "saved" : "pending");
      }
    } catch {
      if (projectDoorIdRef.current === doorId) {
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
        void flushProjectDoorDraft();
      } else {
        queuedPayloadRef.current = null;
        queuedSignatureRef.current = null;
      }
    }
  }

  useEffect(() => {
    const nextDoor = params.editingDoorId === null ? null : params.selectedDoor;
    const nextDoorId = nextDoor?.id ?? null;
    const nextState = nextDoor ? buildProjectDoorStateFromDoor(nextDoor) : emptyProjectDoorState;
    const nextPayload = nextDoor ? buildProjectDoorPayload(nextState) : null;
    const nextSignature = nextPayload ? serializeProjectDoorPayload(nextPayload) : "";

    if (projectDoorIdRef.current !== nextDoorId) {
      clearAutosaveTimer();
      projectDoorIdRef.current = nextDoorId;
      lastSyncedSignatureRef.current = nextSignature;
      currentDraftSignatureRef.current = nextSignature;
      currentDraftPayloadRef.current = nextPayload;
      queuedPayloadRef.current = null;
      queuedSignatureRef.current = null;
      setAutosaveState(nextDoorId === null ? "idle" : "saved");
      return;
    }

    if (nextDoor === null || nextPayload === null) {
      setAutosaveState("idle");
      return;
    }

    if (currentDraftSignatureRef.current === lastSyncedSignatureRef.current) {
      lastSyncedSignatureRef.current = nextSignature;
      currentDraftSignatureRef.current = nextSignature;
      currentDraftPayloadRef.current = nextPayload;
      params.setProjectDoorState(nextState);
      return;
    }

    if (currentDraftSignatureRef.current === nextSignature) {
      lastSyncedSignatureRef.current = nextSignature;
      setAutosaveState("saved");
    }
  }, [params.editingDoorId, params.selectedDoor]);

  useEffect(() => {
    if (params.editingDoorId === null || params.selectedDoor === null) {
      return;
    }
    const payload = buildProjectDoorPayload(params.projectDoorState);
    const signature = serializeProjectDoorPayload(payload);
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
      void flushProjectDoorDraft();
    }, PROJECT_DOOR_AUTOSAVE_DELAY_MS);
    return clearAutosaveTimer;
  }, [params.editingDoorId, params.projectDoorState, params.selectedDoor]);

  useEffect(() => {
    if (
      !params.isDoorsStage &&
      projectDoorIdRef.current !== null &&
      currentDraftPayloadRef.current !== null &&
      currentDraftSignatureRef.current !== lastSyncedSignatureRef.current
    ) {
      clearAutosaveTimer();
      void flushProjectDoorDraft();
    }
  }, [params.isDoorsStage]);

  useEffect(() => {
    return () => {
      clearAutosaveTimer();
      if (
        projectDoorIdRef.current !== null &&
        currentDraftPayloadRef.current !== null &&
        currentDraftSignatureRef.current !== lastSyncedSignatureRef.current
      ) {
        void onUpdateProjectDoorRef.current(projectDoorIdRef.current, currentDraftPayloadRef.current, {
          silent: true,
        });
      }
    };
  }, [params.projectId]);

  return autosaveState;
}
