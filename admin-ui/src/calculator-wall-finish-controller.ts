import type { Dispatch, SetStateAction } from "react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";

import { buildWallFinishPreview, buildWallFinishState } from "./calculator-calculations";
import {
  buildIdMap,
  buildRoomStateById,
  buildWallFinishSelectedTechRooms,
} from "./calculator-derived";
import {
  buildWallFinishCoveringPayload,
  buildWallFinishLayoutPayload,
  buildWallFinishPayload,
  buildWallFinishPreparationPayload,
} from "./calculator-payloads";
import {
  emptyWallFinishCoveringState,
  emptyWallFinishLayoutState,
  emptyWallFinishPreparationState,
  emptyWallFinishState,
  readSessionValue,
  wallFinishDraftStorageKey,
  wallFinishExpandedStorageKey,
  writeSessionValue,
} from "./calculator-state";
import type {
  CalculatorProjectDetail,
  CalculatorWallFinishCoveringPayload,
  CalculatorWallFinishLayoutPayload,
  CalculatorWallFinishPayload,
  CalculatorWallFinishPreparationPayload,
  WallFinishCoveringCreateState,
  WallFinishEditState,
  WallFinishLayoutCreateState,
  WallFinishPreparationCreateState,
} from "./calculator";

type WallFinishControllerParams = {
  projectDetail: CalculatorProjectDetail | null;
  isWallFinishStage: boolean;
  onSaveWallFinish: (projectId: number, payload: CalculatorWallFinishPayload) => Promise<void>;
  onCreateWallFinishCovering: (payload: CalculatorWallFinishCoveringPayload) => Promise<void>;
  onCreateWallFinishPreparation: (payload: CalculatorWallFinishPreparationPayload) => Promise<void>;
  onCreateWallFinishLayout: (payload: CalculatorWallFinishLayoutPayload) => Promise<void>;
};

type WallFinishControllerResult = {
  wallFinishState: WallFinishEditState;
  setWallFinishState: Dispatch<SetStateAction<WallFinishEditState>>;
  wallFinishCoveringState: WallFinishCoveringCreateState;
  setWallFinishCoveringState: Dispatch<SetStateAction<WallFinishCoveringCreateState>>;
  wallFinishPreparationState: WallFinishPreparationCreateState;
  setWallFinishPreparationState: Dispatch<SetStateAction<WallFinishPreparationCreateState>>;
  wallFinishLayoutState: WallFinishLayoutCreateState;
  setWallFinishLayoutState: Dispatch<SetStateAction<WallFinishLayoutCreateState>>;
  wallFinishSettingsOpen: boolean;
  setWallFinishSettingsOpen: Dispatch<SetStateAction<boolean>>;
  expandedWallFinishRoomId: number | null;
  setExpandedWallFinishRoomId: Dispatch<SetStateAction<number | null>>;
  wallFinishDetail: CalculatorProjectDetail["wall_finishes"] | null;
  wallFinishPreview: CalculatorProjectDetail["wall_finishes"] | null;
  wallFinishRoomStateById: Map<number, WallFinishEditState["rooms"][number]>;
  wallFinishCoveringById: Map<number, NonNullable<CalculatorProjectDetail["wall_finishes"]>["coverings"][number]>;
  wallFinishPreparationById: Map<number, NonNullable<CalculatorProjectDetail["wall_finishes"]>["preparations"][number]>;
  wallFinishLayoutById: Map<number, NonNullable<CalculatorProjectDetail["wall_finishes"]>["layouts"][number]>;
  wallFinishSelectedTechRooms: ReturnType<typeof buildWallFinishSelectedTechRooms>;
  submitWallFinish: () => Promise<void>;
  submitWallFinishCovering: () => Promise<void>;
  submitWallFinishPreparation: () => Promise<void>;
  submitWallFinishLayout: () => Promise<void>;
  resetWallFinishState: () => void;
};

export function useCalculatorWallFinishController(
  params: WallFinishControllerParams,
): WallFinishControllerResult {
  const {
    projectDetail,
    isWallFinishStage,
    onSaveWallFinish,
    onCreateWallFinishCovering,
    onCreateWallFinishPreparation,
    onCreateWallFinishLayout,
  } = params;
  const [wallFinishState, setWallFinishState] = useState<WallFinishEditState>(emptyWallFinishState);
  const [wallFinishCoveringState, setWallFinishCoveringState] =
    useState<WallFinishCoveringCreateState>(emptyWallFinishCoveringState);
  const [wallFinishPreparationState, setWallFinishPreparationState] =
    useState<WallFinishPreparationCreateState>(emptyWallFinishPreparationState);
  const [wallFinishLayoutState, setWallFinishLayoutState] =
    useState<WallFinishLayoutCreateState>(emptyWallFinishLayoutState);
  const [wallFinishSettingsOpen, setWallFinishSettingsOpen] = useState(false);
  const [expandedWallFinishRoomId, setExpandedWallFinishRoomId] = useState<number | null>(null);

  useEffect(() => {
    if (!projectDetail?.wall_finishes) {
      setWallFinishState(emptyWallFinishState);
      return;
    }
    const draft = readSessionValue<WallFinishEditState>(wallFinishDraftStorageKey(projectDetail.project.id));
    setWallFinishState(buildWallFinishState(projectDetail.wall_finishes, draft));
  }, [projectDetail?.project.id, projectDetail?.wall_finishes]);

  useEffect(() => {
    if (!projectDetail?.wall_finishes) {
      setExpandedWallFinishRoomId(null);
      return;
    }
    const availableIds = projectDetail.wall_finishes.rooms.map((room) => room.room_id);
    const storedId = readSessionValue<number | null>(wallFinishExpandedStorageKey(projectDetail.project.id));
    if (storedId !== null && availableIds.includes(storedId)) {
      setExpandedWallFinishRoomId(storedId);
      return;
    }
    setExpandedWallFinishRoomId(availableIds[0] ?? null);
  }, [projectDetail?.project.id, projectDetail?.wall_finishes?.rooms]);

  useEffect(() => {
    setWallFinishSettingsOpen(false);
  }, [projectDetail?.project.id]);

  useEffect(() => {
    if (!projectDetail) {
      return;
    }
    const projectId = projectDetail.project.id;
    const timerId = window.setTimeout(() => {
      writeSessionValue(wallFinishDraftStorageKey(projectId), wallFinishState);
    }, 520);
    return () => window.clearTimeout(timerId);
  }, [projectDetail?.project.id, wallFinishState]);

  useEffect(() => {
    if (!projectDetail) {
      return;
    }
    writeSessionValue(wallFinishExpandedStorageKey(projectDetail.project.id), expandedWallFinishRoomId);
  }, [projectDetail?.project.id, expandedWallFinishRoomId]);

  const wallFinishDetail = projectDetail?.wall_finishes ?? null;
  const deferredWallFinishState = useDeferredValue(wallFinishState);
  const wallFinishPreview = useMemo(() => {
    if (!projectDetail) {
      return null;
    }
    if (!isWallFinishStage) {
      return projectDetail.wall_finishes;
    }
    return buildWallFinishPreview(projectDetail.wall_finishes, deferredWallFinishState);
  }, [deferredWallFinishState, isWallFinishStage, projectDetail]);

  const wallFinishRoomStateById = useMemo(
    () => buildRoomStateById(wallFinishState.rooms),
    [wallFinishState.rooms],
  );
  const wallFinishCoveringById = useMemo(
    () => buildIdMap(wallFinishDetail?.coverings),
    [wallFinishDetail?.coverings],
  );
  const wallFinishPreparationById = useMemo(
    () => buildIdMap(wallFinishDetail?.preparations),
    [wallFinishDetail?.preparations],
  );
  const wallFinishLayoutById = useMemo(
    () => buildIdMap(wallFinishDetail?.layouts),
    [wallFinishDetail?.layouts],
  );
  const wallFinishSelectedTechRooms = useMemo(
    () =>
      buildWallFinishSelectedTechRooms(
        isWallFinishStage,
        wallFinishPreview,
        wallFinishCoveringById,
        wallFinishPreparationById,
        wallFinishLayoutById,
      ),
    [isWallFinishStage, wallFinishCoveringById, wallFinishLayoutById, wallFinishPreparationById, wallFinishPreview],
  );

  async function submitWallFinish() {
    if (!projectDetail) {
      return;
    }
    await onSaveWallFinish(projectDetail.project.id, buildWallFinishPayload(wallFinishState));
  }

  async function submitWallFinishCovering() {
    const payload = buildWallFinishCoveringPayload(wallFinishCoveringState);
    if (!payload) {
      return;
    }
    await onCreateWallFinishCovering(payload);
    setWallFinishCoveringState(emptyWallFinishCoveringState);
  }

  async function submitWallFinishPreparation() {
    const payload = buildWallFinishPreparationPayload(wallFinishPreparationState);
    if (!payload) {
      return;
    }
    await onCreateWallFinishPreparation(payload);
    setWallFinishPreparationState(emptyWallFinishPreparationState);
  }

  async function submitWallFinishLayout() {
    const payload = buildWallFinishLayoutPayload(wallFinishLayoutState);
    if (!payload) {
      return;
    }
    await onCreateWallFinishLayout(payload);
    setWallFinishLayoutState(emptyWallFinishLayoutState);
  }

  function resetWallFinishState() {
    if (!projectDetail?.wall_finishes) {
      setWallFinishState(emptyWallFinishState);
      return;
    }
    setWallFinishState(buildWallFinishState(projectDetail.wall_finishes));
  }

  return {
    wallFinishState,
    setWallFinishState,
    wallFinishCoveringState,
    setWallFinishCoveringState,
    wallFinishPreparationState,
    setWallFinishPreparationState,
    wallFinishLayoutState,
    setWallFinishLayoutState,
    wallFinishSettingsOpen,
    setWallFinishSettingsOpen,
    expandedWallFinishRoomId,
    setExpandedWallFinishRoomId,
    wallFinishDetail,
    wallFinishPreview,
    wallFinishRoomStateById,
    wallFinishCoveringById,
    wallFinishPreparationById,
    wallFinishLayoutById,
    wallFinishSelectedTechRooms,
    submitWallFinish,
    submitWallFinishCovering,
    submitWallFinishPreparation,
    submitWallFinishLayout,
    resetWallFinishState,
  };
}
