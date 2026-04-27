import type { Dispatch, SetStateAction } from "react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";

import { buildFlooringPreview, buildFlooringState } from "./";
import {
  buildFlooringSelectedTechRooms,
  buildIdMap,
  buildRoomStateById,
} from "./";
import {
  buildFlooringCoveringPayload,
  buildFlooringLayoutPayload,
  buildFlooringPayload,
  buildFlooringPreparationPayload,
} from "./";
import {
  emptyFlooringCoveringState,
  emptyFlooringLayoutState,
  emptyFlooringPreparationState,
  emptyFlooringState,
  flooringDraftStorageKey,
  flooringExpandedStorageKey,
  readSessionValue,
  writeSessionValue,
} from "./";
import type {
  CalculatorFlooringCoveringPayload,
  CalculatorFlooringLayoutPayload,
  CalculatorFlooringPayload,
  CalculatorFlooringPreparationPayload,
  CalculatorProjectDetail,
  FlooringCoveringCreateState,
  FlooringEditState,
  FlooringLayoutCreateState,
  FlooringPreparationCreateState,
} from "./";

type FlooringControllerParams = {
  projectDetail: CalculatorProjectDetail | null;
  isFlooringStage: boolean;
  onSaveFlooring: (projectId: number, payload: CalculatorFlooringPayload) => Promise<void>;
  onCreateFlooringCovering: (payload: CalculatorFlooringCoveringPayload) => Promise<void>;
  onCreateFlooringPreparation: (payload: CalculatorFlooringPreparationPayload) => Promise<void>;
  onCreateFlooringLayout: (payload: CalculatorFlooringLayoutPayload) => Promise<void>;
};

type FlooringControllerResult = {
  flooringState: FlooringEditState;
  setFlooringState: Dispatch<SetStateAction<FlooringEditState>>;
  flooringCoveringState: FlooringCoveringCreateState;
  setFlooringCoveringState: Dispatch<SetStateAction<FlooringCoveringCreateState>>;
  flooringPreparationState: FlooringPreparationCreateState;
  setFlooringPreparationState: Dispatch<SetStateAction<FlooringPreparationCreateState>>;
  flooringLayoutState: FlooringLayoutCreateState;
  setFlooringLayoutState: Dispatch<SetStateAction<FlooringLayoutCreateState>>;
  flooringSettingsOpen: boolean;
  setFlooringSettingsOpen: Dispatch<SetStateAction<boolean>>;
  expandedFlooringRoomId: number | null;
  setExpandedFlooringRoomId: Dispatch<SetStateAction<number | null>>;
  flooringDetail: CalculatorProjectDetail["flooring"] | null;
  flooringPreview: CalculatorProjectDetail["flooring"] | null;
  flooringRoomStateById: Map<number, FlooringEditState["rooms"][number]>;
  flooringCoveringById: Map<number, NonNullable<CalculatorProjectDetail["flooring"]>["coverings"][number]>;
  flooringPreparationById: Map<number, NonNullable<CalculatorProjectDetail["flooring"]>["preparations"][number]>;
  flooringLayoutById: Map<number, NonNullable<CalculatorProjectDetail["flooring"]>["layouts"][number]>;
  flooringSelectedTechRooms: ReturnType<typeof buildFlooringSelectedTechRooms>;
  submitFlooring: () => Promise<void>;
  submitFlooringCovering: () => Promise<void>;
  submitFlooringPreparation: () => Promise<void>;
  submitFlooringLayout: () => Promise<void>;
  resetFlooringState: () => void;
};

export function useCalculatorFlooringController(
  params: FlooringControllerParams,
): FlooringControllerResult {
  const {
    projectDetail,
    isFlooringStage,
    onSaveFlooring,
    onCreateFlooringCovering,
    onCreateFlooringPreparation,
    onCreateFlooringLayout,
  } = params;
  const [flooringState, setFlooringState] = useState<FlooringEditState>(emptyFlooringState);
  const [flooringCoveringState, setFlooringCoveringState] =
    useState<FlooringCoveringCreateState>(emptyFlooringCoveringState);
  const [flooringPreparationState, setFlooringPreparationState] =
    useState<FlooringPreparationCreateState>(emptyFlooringPreparationState);
  const [flooringLayoutState, setFlooringLayoutState] =
    useState<FlooringLayoutCreateState>(emptyFlooringLayoutState);
  const [flooringSettingsOpen, setFlooringSettingsOpen] = useState(false);
  const [expandedFlooringRoomId, setExpandedFlooringRoomId] = useState<number | null>(null);

  useEffect(() => {
    if (!projectDetail?.flooring) {
      setFlooringState(emptyFlooringState);
      return;
    }
    const draft = readSessionValue<FlooringEditState>(flooringDraftStorageKey(projectDetail.project.id));
    setFlooringState(buildFlooringState(projectDetail.flooring, draft));
  }, [projectDetail?.project.id, projectDetail?.flooring]);

  useEffect(() => {
    if (!projectDetail?.flooring) {
      setExpandedFlooringRoomId(null);
      return;
    }
    const availableIds = projectDetail.flooring.rooms.map((room) => room.room_id);
    const storedId = readSessionValue<number | null>(flooringExpandedStorageKey(projectDetail.project.id));
    if (storedId !== null && availableIds.includes(storedId)) {
      setExpandedFlooringRoomId(storedId);
      return;
    }
    setExpandedFlooringRoomId(availableIds[0] ?? null);
  }, [projectDetail?.project.id, projectDetail?.flooring?.rooms]);

  useEffect(() => {
    setFlooringSettingsOpen(false);
  }, [projectDetail?.project.id]);

  useEffect(() => {
    if (!projectDetail) {
      return;
    }
    const projectId = projectDetail.project.id;
    const timerId = window.setTimeout(() => {
      writeSessionValue(flooringDraftStorageKey(projectId), flooringState);
    }, 520);
    return () => window.clearTimeout(timerId);
  }, [projectDetail?.project.id, flooringState]);

  useEffect(() => {
    if (!projectDetail) {
      return;
    }
    writeSessionValue(flooringExpandedStorageKey(projectDetail.project.id), expandedFlooringRoomId);
  }, [projectDetail?.project.id, expandedFlooringRoomId]);

  const flooringDetail = projectDetail?.flooring ?? null;
  const deferredFlooringState = useDeferredValue(flooringState);
  const flooringPreview = useMemo(() => {
    if (!projectDetail) {
      return null;
    }
    if (!isFlooringStage) {
      return projectDetail.flooring;
    }
    return buildFlooringPreview(projectDetail.flooring, deferredFlooringState);
  }, [deferredFlooringState, isFlooringStage, projectDetail]);

  const flooringRoomStateById = useMemo(
    () => buildRoomStateById(flooringState.rooms),
    [flooringState.rooms],
  );
  const flooringCoveringById = useMemo(
    () => buildIdMap(flooringDetail?.coverings),
    [flooringDetail?.coverings],
  );
  const flooringPreparationById = useMemo(
    () => buildIdMap(flooringDetail?.preparations),
    [flooringDetail?.preparations],
  );
  const flooringLayoutById = useMemo(
    () => buildIdMap(flooringDetail?.layouts),
    [flooringDetail?.layouts],
  );
  const flooringSelectedTechRooms = useMemo(
    () =>
      buildFlooringSelectedTechRooms(
        isFlooringStage,
        flooringPreview,
        flooringCoveringById,
        flooringPreparationById,
        flooringLayoutById,
      ),
    [flooringCoveringById, flooringLayoutById, flooringPreparationById, flooringPreview, isFlooringStage],
  );

  async function submitFlooring() {
    if (!projectDetail) {
      return;
    }
    await onSaveFlooring(projectDetail.project.id, buildFlooringPayload(flooringState));
  }

  async function submitFlooringCovering() {
    const payload = buildFlooringCoveringPayload(flooringCoveringState);
    if (!payload) {
      return;
    }
    await onCreateFlooringCovering(payload);
    setFlooringCoveringState(emptyFlooringCoveringState);
  }

  async function submitFlooringPreparation() {
    const payload = buildFlooringPreparationPayload(flooringPreparationState);
    if (!payload) {
      return;
    }
    await onCreateFlooringPreparation(payload);
    setFlooringPreparationState(emptyFlooringPreparationState);
  }

  async function submitFlooringLayout() {
    const payload = buildFlooringLayoutPayload(flooringLayoutState);
    if (!payload) {
      return;
    }
    await onCreateFlooringLayout(payload);
    setFlooringLayoutState(emptyFlooringLayoutState);
  }

  function resetFlooringState() {
    if (!projectDetail?.flooring) {
      setFlooringState(emptyFlooringState);
      return;
    }
    setFlooringState(buildFlooringState(projectDetail.flooring));
  }

  return {
    flooringState,
    setFlooringState,
    flooringCoveringState,
    setFlooringCoveringState,
    flooringPreparationState,
    setFlooringPreparationState,
    flooringLayoutState,
    setFlooringLayoutState,
    flooringSettingsOpen,
    setFlooringSettingsOpen,
    expandedFlooringRoomId,
    setExpandedFlooringRoomId,
    flooringDetail,
    flooringPreview,
    flooringRoomStateById,
    flooringCoveringById,
    flooringPreparationById,
    flooringLayoutById,
    flooringSelectedTechRooms,
    submitFlooring,
    submitFlooringCovering,
    submitFlooringPreparation,
    submitFlooringLayout,
    resetFlooringState,
  };
}
