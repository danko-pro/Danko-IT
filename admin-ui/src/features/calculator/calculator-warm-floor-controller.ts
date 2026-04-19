import type { Dispatch, FormEvent, SetStateAction } from "react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";

import { buildWarmFloorPreview, buildWarmFloorState } from "./calculator-calculations";
import { buildRoomStateById } from "./calculator-derived";
import { buildWarmFloorPayload } from "./calculator-payloads";
import {
  emptyWarmFloorState,
  readSessionValue,
  warmFloorDraftStorageKey,
  writeSessionValue,
} from "./calculator-state";
import type { CalculatorProjectDetail, CalculatorWarmFloorPayload, WarmFloorEditState } from "./calculator-types";

type WarmFloorControllerParams = {
  projectDetail: CalculatorProjectDetail | null;
  isWarmFloorStage: boolean;
  onSaveWarmFloor: (projectId: number, payload: CalculatorWarmFloorPayload) => Promise<void>;
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
  handleWarmFloorSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  resetWarmFloorState: () => void;
};

export function useCalculatorWarmFloorController(
  params: WarmFloorControllerParams,
): WarmFloorControllerResult {
  const { projectDetail, isWarmFloorStage, onSaveWarmFloor } = params;
  const [warmFloorState, setWarmFloorState] = useState<WarmFloorEditState>(emptyWarmFloorState);
  const [warmFloorSettingsOpen, setWarmFloorSettingsOpen] = useState(false);
  const [expandedWarmFloorRoomId, setExpandedWarmFloorRoomId] = useState<number | null>(null);

  useEffect(() => {
    if (!projectDetail?.warm_floor) {
      setWarmFloorState(emptyWarmFloorState);
      return;
    }
    const draft = readSessionValue<WarmFloorEditState>(warmFloorDraftStorageKey(projectDetail.project.id));
    setWarmFloorState(buildWarmFloorState(projectDetail.warm_floor, draft));
  }, [projectDetail?.project.id, projectDetail?.warm_floor]);

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
    const projectId = projectDetail.project.id;
    const timerId = window.setTimeout(() => {
      writeSessionValue(warmFloorDraftStorageKey(projectId), warmFloorState);
    }, 520);
    return () => window.clearTimeout(timerId);
  }, [projectDetail?.project.id, warmFloorState]);

  const deferredWarmFloorState = useDeferredValue(warmFloorState);
  const warmFloorPreview = useMemo(() => {
    if (!projectDetail) {
      return null;
    }
    if (!isWarmFloorStage) {
      return projectDetail.warm_floor;
    }
    return buildWarmFloorPreview(projectDetail.warm_floor, deferredWarmFloorState);
  }, [deferredWarmFloorState, isWarmFloorStage, projectDetail]);

  const warmFloorRoomStateById = useMemo(
    () => buildRoomStateById(warmFloorState.rooms),
    [warmFloorState.rooms],
  );

  async function handleWarmFloorSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectDetail) {
      return;
    }
    await onSaveWarmFloor(projectDetail.project.id, buildWarmFloorPayload(warmFloorState));
  }

  function resetWarmFloorState() {
    if (!projectDetail?.warm_floor) {
      setWarmFloorState(emptyWarmFloorState);
      return;
    }
    setWarmFloorState(buildWarmFloorState(projectDetail.warm_floor));
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
    handleWarmFloorSubmit,
    resetWarmFloorState,
  };
}
