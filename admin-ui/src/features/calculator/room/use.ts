import type { Dispatch, SetStateAction } from "react";
import { useEffect, useRef, useState } from "react";

import { buildRoomPreviewDetail, buildRoomPreviewSummary } from "./calc";
import { buildRoomState } from "./draft";
import type { CalculatorRoomDetail, CalculatorRoomPayload, CalculatorRoomSummary, RoomEditState } from "./model";
import { buildRoomPayload } from "./payload";
import { emptyRoomState } from "./state";

type UseCalculatorRoomControllerParams = {
  roomDetail: CalculatorRoomDetail | null;
  selectedRoomId: number | null;
  onSaveRoom: (roomId: number, payload: CalculatorRoomPayload, options?: { silent?: boolean }) => Promise<void>;
};

export type RoomAutosaveState = "idle" | "pending" | "saving" | "saved" | "error";

type UseCalculatorRoomControllerResult = {
  roomState: RoomEditState;
  setRoomState: Dispatch<SetStateAction<RoomEditState>>;
  autosaveState: RoomAutosaveState;
  roomPreviewDetail: CalculatorRoomDetail | null;
  roomPreviewSummary: CalculatorRoomSummary | null;
};

const ROOM_AUTOSAVE_DELAY_MS = 700;

function serializeRoomPayload(payload: CalculatorRoomPayload): string {
  return JSON.stringify(payload);
}

// Room editor controller.
// Keeps a local draft, saves after a short pause, and flushes the latest changes on room switch/unmount.
export function useCalculatorRoomController(
  params: UseCalculatorRoomControllerParams,
): UseCalculatorRoomControllerResult {
  const { roomDetail, selectedRoomId, onSaveRoom } = params;
  const [roomState, setRoomState] = useState<RoomEditState>(emptyRoomState);
  const [autosaveState, setAutosaveState] = useState<RoomAutosaveState>("idle");
  const roomIdRef = useRef<number | null>(null);
  const lastSyncedSignatureRef = useRef("");
  const currentDraftSignatureRef = useRef("");
  const currentDraftPayloadRef = useRef<CalculatorRoomPayload | null>(null);
  const queuedSignatureRef = useRef<string | null>(null);
  const queuedPayloadRef = useRef<CalculatorRoomPayload | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveInFlightRef = useRef(false);
  const onSaveRoomRef = useRef(onSaveRoom);

  useEffect(() => {
    onSaveRoomRef.current = onSaveRoom;
  }, [onSaveRoom]);

  function clearAutosaveTimer() {
    if (saveTimerRef.current !== null) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
  }

  async function flushRoomDraft() {
    const roomId = roomIdRef.current;
    const payload = currentDraftPayloadRef.current;
    const signature = currentDraftSignatureRef.current;

    if (roomId === null || payload === null || signature === lastSyncedSignatureRef.current) {
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
      await onSaveRoomRef.current(roomId, payload, { silent: true });
      if (roomIdRef.current === roomId) {
        lastSyncedSignatureRef.current = signature;
        setAutosaveState(currentDraftSignatureRef.current === signature ? "saved" : "pending");
      }
    } catch {
      if (roomIdRef.current === roomId) {
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
        void flushRoomDraft();
      } else {
        queuedPayloadRef.current = null;
        queuedSignatureRef.current = null;
      }
    }
  }

  useEffect(() => {
    const nextRoomId = roomDetail?.room.id ?? null;
    const nextState = buildRoomState(roomDetail);
    const nextPayload = roomDetail ? buildRoomPayload(nextState) : null;
    const nextSignature = nextPayload ? serializeRoomPayload(nextPayload) : "";
    const isRoomChanged = roomIdRef.current !== nextRoomId;

    if (isRoomChanged) {
      clearAutosaveTimer();
      roomIdRef.current = nextRoomId;
      lastSyncedSignatureRef.current = nextSignature;
      currentDraftSignatureRef.current = nextSignature;
      currentDraftPayloadRef.current = nextPayload;
      queuedPayloadRef.current = null;
      queuedSignatureRef.current = null;
      setRoomState(nextState);
      setAutosaveState("idle");
      return;
    }

    if (nextRoomId === null || nextPayload === null) {
      setRoomState(nextState);
      setAutosaveState("idle");
      return;
    }

    if (currentDraftSignatureRef.current === lastSyncedSignatureRef.current) {
      lastSyncedSignatureRef.current = nextSignature;
      currentDraftSignatureRef.current = nextSignature;
      currentDraftPayloadRef.current = nextPayload;
      setRoomState(nextState);
      return;
    }

    if (currentDraftSignatureRef.current === nextSignature) {
      lastSyncedSignatureRef.current = nextSignature;
      setAutosaveState("saved");
    }
  }, [roomDetail]);

  useEffect(() => {
    if (!roomDetail) {
      return;
    }

    const payload = buildRoomPayload(roomState);
    const signature = serializeRoomPayload(payload);
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
      void flushRoomDraft();
    }, ROOM_AUTOSAVE_DELAY_MS);

    return clearAutosaveTimer;
  }, [roomDetail, roomState]);

  useEffect(() => {
    return () => {
      clearAutosaveTimer();
      if (
        roomIdRef.current !== null &&
        currentDraftPayloadRef.current !== null &&
        currentDraftSignatureRef.current !== lastSyncedSignatureRef.current
      ) {
        void onSaveRoomRef.current(roomIdRef.current, currentDraftPayloadRef.current, { silent: true });
      }
    };
  }, [roomDetail?.room.id]);

  const isActiveRoomDetail = roomDetail?.room.id === selectedRoomId;
  const isSyncedRoomDetail = roomDetail?.room.id === roomIdRef.current;
  const baseRoomSignature = roomDetail ? serializeRoomPayload(buildRoomPayload(buildRoomState(roomDetail))) : "";
  const hasPreviewOverride =
    roomDetail !== null &&
    isActiveRoomDetail &&
    isSyncedRoomDetail &&
    serializeRoomPayload(buildRoomPayload(roomState)) !== baseRoomSignature;
  const roomPreviewDetail = roomDetail && hasPreviewOverride ? buildRoomPreviewDetail(roomDetail, roomState) : null;
  const roomPreviewSummary = roomDetail && hasPreviewOverride ? buildRoomPreviewSummary(roomDetail, roomState) : null;

  return {
    roomState,
    setRoomState,
    autosaveState,
    roomPreviewDetail,
    roomPreviewSummary,
  };
}
