import type { Dispatch, SetStateAction } from "react";
import { useEffect, useRef, useState } from "react";

import { buildProjectHeaderDraft, emptyProjectHeaderDraft, type ProjectHeaderDraft } from "./draft";
import type { CalculatorProjectDetail } from "./model";
import { buildProjectUpdatePayload, type CalculatorProjectUpdatePayload } from "./payload";

type UseCalculatorProjectControllerParams = {
  projectDetail: CalculatorProjectDetail | null;
  onSaveProject: (
    projectId: number,
    payload: CalculatorProjectUpdatePayload,
    options?: { silent?: boolean },
  ) => Promise<void>;
};

export type ProjectAutosaveState = "idle" | "pending" | "saving" | "saved" | "error";

export type UseCalculatorProjectControllerResult = {
  projectName: string;
  setProjectName: Dispatch<SetStateAction<string>>;
  residentialComplex: string;
  setResidentialComplex: Dispatch<SetStateAction<string>>;
  projectAddress: string;
  setProjectAddress: Dispatch<SetStateAction<string>>;
  entranceSection: string;
  setEntranceSection: Dispatch<SetStateAction<string>>;
  floorNumber: string;
  setFloorNumber: Dispatch<SetStateAction<string>>;
  unitNumber: string;
  setUnitNumber: Dispatch<SetStateAction<string>>;
  liftType: string;
  setLiftType: Dispatch<SetStateAction<string>>;
  accessMode: string;
  setAccessMode: Dispatch<SetStateAction<string>>;
  intercomCode: string;
  setIntercomCode: Dispatch<SetStateAction<string>>;
  loadingZone: string;
  setLoadingZone: Dispatch<SetStateAction<string>>;
  responsiblePerson: string;
  setResponsiblePerson: Dispatch<SetStateAction<string>>;
  projectNote: string;
  setProjectNote: Dispatch<SetStateAction<string>>;
  autosaveState: ProjectAutosaveState;
};

const PROJECT_AUTOSAVE_DELAY_MS = 700;

function serializeProjectPayload(payload: CalculatorProjectUpdatePayload): string {
  return JSON.stringify(payload);
}

function buildFieldSetter(
  setProjectState: Dispatch<SetStateAction<ProjectHeaderDraft>>,
  key: keyof ProjectHeaderDraft,
): Dispatch<SetStateAction<string>> {
  return (value) => {
    setProjectState((current) => ({
      ...current,
      [key]: typeof value === "function" ? value(current[key]) : value,
    }));
  };
}

// Controller for the editable header fields of the project screen.
// Keeps the header draft locally and silently saves it after short pauses.
export function useCalculatorProjectController(
  params: UseCalculatorProjectControllerParams,
): UseCalculatorProjectControllerResult {
  const { projectDetail, onSaveProject } = params;
  const [projectState, setProjectState] = useState<ProjectHeaderDraft>(emptyProjectHeaderDraft);
  const [autosaveState, setAutosaveState] = useState<ProjectAutosaveState>("idle");
  const projectIdRef = useRef<number | null>(null);
  const lastSyncedSignatureRef = useRef("");
  const currentDraftSignatureRef = useRef("");
  const currentDraftPayloadRef = useRef<CalculatorProjectUpdatePayload | null>(null);
  const queuedSignatureRef = useRef<string | null>(null);
  const queuedPayloadRef = useRef<CalculatorProjectUpdatePayload | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveInFlightRef = useRef(false);
  const onSaveProjectRef = useRef(onSaveProject);

  useEffect(() => {
    onSaveProjectRef.current = onSaveProject;
  }, [onSaveProject]);

  function clearAutosaveTimer() {
    if (saveTimerRef.current !== null) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
  }

  async function flushProjectDraft() {
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
      await onSaveProjectRef.current(projectId, payload, { silent: true });
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
        void flushProjectDraft();
      } else {
        queuedPayloadRef.current = null;
        queuedSignatureRef.current = null;
      }
    }
  }

  useEffect(() => {
    const nextProjectId = projectDetail?.project.id ?? null;
    const nextState = buildProjectHeaderDraft(projectDetail);
    const nextPayload = projectDetail ? buildProjectUpdatePayload(nextState) : null;
    const nextSignature = nextPayload ? serializeProjectPayload(nextPayload) : "";
    const isProjectChanged = projectIdRef.current !== nextProjectId;

    if (isProjectChanged) {
      clearAutosaveTimer();
      projectIdRef.current = nextProjectId;
      lastSyncedSignatureRef.current = nextSignature;
      currentDraftSignatureRef.current = nextSignature;
      currentDraftPayloadRef.current = nextPayload;
      queuedPayloadRef.current = null;
      queuedSignatureRef.current = null;
      setProjectState(nextState);
      setAutosaveState("idle");
      return;
    }

    if (nextProjectId === null || nextPayload === null) {
      setProjectState(nextState);
      setAutosaveState("idle");
      return;
    }

    if (currentDraftSignatureRef.current === lastSyncedSignatureRef.current) {
      lastSyncedSignatureRef.current = nextSignature;
      currentDraftSignatureRef.current = nextSignature;
      currentDraftPayloadRef.current = nextPayload;
      setProjectState(nextState);
      return;
    }

    if (currentDraftSignatureRef.current === nextSignature) {
      lastSyncedSignatureRef.current = nextSignature;
      setAutosaveState("saved");
    }
  }, [projectDetail]);

  useEffect(() => {
    if (!projectDetail) {
      return;
    }

    const payload = buildProjectUpdatePayload(projectState);
    const signature = serializeProjectPayload(payload);
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
      void flushProjectDraft();
    }, PROJECT_AUTOSAVE_DELAY_MS);

    return clearAutosaveTimer;
  }, [projectDetail, projectState]);

  useEffect(() => {
    return () => {
      clearAutosaveTimer();
      if (
        projectIdRef.current !== null &&
        currentDraftPayloadRef.current !== null &&
        currentDraftSignatureRef.current !== lastSyncedSignatureRef.current
      ) {
        void onSaveProjectRef.current(projectIdRef.current, currentDraftPayloadRef.current, { silent: true });
      }
    };
  }, [projectDetail?.project.id]);

  return {
    projectName: projectState.projectName,
    setProjectName: buildFieldSetter(setProjectState, "projectName"),
    residentialComplex: projectState.residentialComplex,
    setResidentialComplex: buildFieldSetter(setProjectState, "residentialComplex"),
    projectAddress: projectState.projectAddress,
    setProjectAddress: buildFieldSetter(setProjectState, "projectAddress"),
    entranceSection: projectState.entranceSection,
    setEntranceSection: buildFieldSetter(setProjectState, "entranceSection"),
    floorNumber: projectState.floorNumber,
    setFloorNumber: buildFieldSetter(setProjectState, "floorNumber"),
    unitNumber: projectState.unitNumber,
    setUnitNumber: buildFieldSetter(setProjectState, "unitNumber"),
    liftType: projectState.liftType,
    setLiftType: buildFieldSetter(setProjectState, "liftType"),
    accessMode: projectState.accessMode,
    setAccessMode: buildFieldSetter(setProjectState, "accessMode"),
    intercomCode: projectState.intercomCode,
    setIntercomCode: buildFieldSetter(setProjectState, "intercomCode"),
    loadingZone: projectState.loadingZone,
    setLoadingZone: buildFieldSetter(setProjectState, "loadingZone"),
    responsiblePerson: projectState.responsiblePerson,
    setResponsiblePerson: buildFieldSetter(setProjectState, "responsiblePerson"),
    projectNote: projectState.projectNote,
    setProjectNote: buildFieldSetter(setProjectState, "projectNote"),
    autosaveState,
  };
}
