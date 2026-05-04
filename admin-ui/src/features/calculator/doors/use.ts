import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import { trimFloat } from "../shared";
import { buildProjectDoorStateFromDoor, useProjectDoorAutosave } from "./autosave";
import { buildDoorsStageSpecification, buildDoorsStageSummary } from "./derived";
import {
  buildDoorCatalogPayload,
  buildDoorComponentCatalogPayload,
  buildProjectDoorComponentPayload,
  buildProjectDoorPayload,
} from "./payload";
import { emptyDoorCatalogState, emptyDoorComponentCatalogState, emptyProjectDoorComponentState, emptyProjectDoorState } from "./state";
import type {
  CalculatorProjectDoor,
  CalculatorProjectDoorComponent,
  DoorCatalogCreateState,
  DoorComponentCatalogCreateState,
  ProjectDoorComponentState,
  ProjectDoorCreateState,
} from "./model";
import type { UseCalculatorDoorsControllerParams, UseCalculatorDoorsControllerResult } from "./use-types";

export function useCalculatorDoorsController(
  params: UseCalculatorDoorsControllerParams,
): UseCalculatorDoorsControllerResult {
  const {
    projectDetail,
    isDoorsStage,
    setActiveStage,
    onCreateDoorCatalogItem,
    onCreateDoorComponentCatalogItem,
    onCreateProjectDoor,
    onUpdateProjectDoor,
    onCreateProjectDoorComponent,
    onUpdateProjectDoorComponent,
  } = params;

  const [doorCatalogState, setDoorCatalogState] = useState<DoorCatalogCreateState>(emptyDoorCatalogState);
  const [doorComponentCatalogState, setDoorComponentCatalogState] =
    useState<DoorComponentCatalogCreateState>(emptyDoorComponentCatalogState);
  const [projectDoorState, setProjectDoorState] = useState<ProjectDoorCreateState>(emptyProjectDoorState);
  const [projectDoorComponentState, setProjectDoorComponentState] =
    useState<ProjectDoorComponentState>(emptyProjectDoorComponentState);
  const [editingDoorId, setEditingDoorId] = useState<number | null>(null);
  const [selectedDoorId, setSelectedDoorId] = useState<number | null>(null);
  const [editingDoorComponentId, setEditingDoorComponentId] = useState<number | null>(null);

  useEffect(() => {
    if (!projectDetail) {
      setProjectDoorState(emptyProjectDoorState);
      setEditingDoorId(null);
      setSelectedDoorId(null);
      setProjectDoorComponentState(emptyProjectDoorComponentState);
      setEditingDoorComponentId(null);
      return;
    }
    setProjectDoorState((current) => ({
      ...current,
      room_a_id: current.room_a_id || String(projectDetail.rooms[0]?.id ?? ""),
    }));
  }, [projectDetail?.project.id]);

  useEffect(() => {
    if (!projectDetail?.doors.length) {
      setSelectedDoorId(null);
      setEditingDoorId(null);
      setProjectDoorState(emptyProjectDoorState);
      setEditingDoorComponentId(null);
      setProjectDoorComponentState(emptyProjectDoorComponentState);
      return;
    }
    if (selectedDoorId === null || !projectDetail.doors.some((door) => door.id === selectedDoorId)) {
      const firstDoor = projectDetail.doors[0];
      setSelectedDoorId(firstDoor.id);
      setEditingDoorId(firstDoor.id);
      setProjectDoorState(buildProjectDoorStateFromDoor(firstDoor));
    }
  }, [projectDetail?.doors, selectedDoorId]);

  useEffect(() => {
    setEditingDoorComponentId(null);
    setProjectDoorComponentState(emptyProjectDoorComponentState);
  }, [selectedDoorId]);

  const selectedDoor =
    projectDetail?.doors.find((door) => door.id === selectedDoorId) ??
    projectDetail?.doors[0] ??
    null;

  const doorsStageSummary = useMemo(
    () => buildDoorsStageSummary(projectDetail),
    [projectDetail],
  );

  const doorsStageSpecification = useMemo(
    () => buildDoorsStageSpecification(projectDetail?.doors),
    [projectDetail?.doors],
  );

  const projectDoorAutosaveState = useProjectDoorAutosave({
    editingDoorId,
    isDoorsStage,
    projectId: projectDetail?.project.id ?? null,
    projectDoorState,
    selectedDoor,
    setProjectDoorState,
    onUpdateProjectDoor,
  });

  async function handleDoorCatalogSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = buildDoorCatalogPayload(doorCatalogState);
    if (!payload) {
      return;
    }
    await onCreateDoorCatalogItem(payload);
    setDoorCatalogState(emptyDoorCatalogState);
  }

  async function handleDoorComponentCatalogSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = buildDoorComponentCatalogPayload(doorComponentCatalogState);
    if (!payload) {
      return;
    }
    await onCreateDoorComponentCatalogItem(payload);
    setDoorComponentCatalogState(emptyDoorComponentCatalogState);
  }

  async function handleProjectDoorSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectDetail) {
      return;
    }
    const payload = buildProjectDoorPayload(projectDoorState);
    if (editingDoorId !== null) {
      await onUpdateProjectDoor(editingDoorId, payload);
      return;
    } else {
      await onCreateProjectDoor(projectDetail.project.id, payload);
    }
    setEditingDoorId(null);
    setProjectDoorState(emptyProjectDoorState);
  }

  async function createBlankProjectDoor() {
    if (!projectDetail || projectDetail.rooms.length === 0) {
      return;
    }
    const payload = buildProjectDoorPayload({
      ...emptyProjectDoorState,
      title: `Дверь ${projectDetail.doors.length + 1}`,
      width_mm: "800",
      height_mm: "2000",
      thickness_mm: "40",
      room_a_id: String(projectDetail.rooms[0]?.id ?? ""),
    });
    const existingDoorIds = new Set(projectDetail.doors.map((door) => door.id));
    const updatedProject = await onCreateProjectDoor(projectDetail.project.id, payload);
    const createdDoor =
      updatedProject?.doors.find((door) => !existingDoorIds.has(door.id)) ??
      updatedProject?.doors[updatedProject.doors.length - 1];
    if (createdDoor) {
      startDoorEdit(createdDoor);
    }
  }

  async function handleProjectDoorComponentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedDoor) {
      return;
    }
    const payload = buildProjectDoorComponentPayload(projectDoorComponentState);
    if (editingDoorComponentId !== null) {
      await onUpdateProjectDoorComponent(editingDoorComponentId, payload);
    } else {
      await onCreateProjectDoorComponent(selectedDoor.id, payload);
    }
    setEditingDoorComponentId(null);
    setProjectDoorComponentState(emptyProjectDoorComponentState);
  }

  function startDoorEdit(door: CalculatorProjectDoor) {
    setActiveStage("doors");
    setEditingDoorId(door.id);
    setSelectedDoorId(door.id);
    setProjectDoorState(buildProjectDoorStateFromDoor(door));
  }

  function resetDoorForm() {
    if (selectedDoor) {
      setEditingDoorId(selectedDoor.id);
      setProjectDoorState(buildProjectDoorStateFromDoor(selectedDoor));
      return;
    }
    setEditingDoorId(null);
    setProjectDoorState(emptyProjectDoorState);
  }

  function startDoorComponentEdit(component: CalculatorProjectDoorComponent) {
    setEditingDoorComponentId(component.id);
    setProjectDoorComponentState({
      component_catalog_id: component.component_catalog_id === null ? "" : String(component.component_catalog_id),
      category_code: component.category_code,
      title: component.title,
      unit: component.unit,
      quantity: trimFloat(component.quantity),
      purchase_price: component.purchase_price === null ? "" : trimFloat(component.purchase_price),
      sale_price: component.sale_price === null ? "" : trimFloat(component.sale_price),
      note: component.note ?? "",
    });
  }

  function resetDoorComponentForm() {
    setEditingDoorComponentId(null);
    setProjectDoorComponentState(emptyProjectDoorComponentState);
  }

  return {
    doorCatalogState,
    setDoorCatalogState,
    doorComponentCatalogState,
    setDoorComponentCatalogState,
    projectDoorState,
    setProjectDoorState,
    projectDoorAutosaveState,
    projectDoorComponentState,
    setProjectDoorComponentState,
    editingDoorId,
    selectedDoorId,
    setSelectedDoorId,
    editingDoorComponentId,
    selectedDoor,
    doorsStageSummary,
    doorsStageSpecification,
    handleDoorCatalogSubmit,
    handleDoorComponentCatalogSubmit,
    handleProjectDoorSubmit,
    createBlankProjectDoor,
    handleProjectDoorComponentSubmit,
    startDoorEdit,
    resetDoorForm,
    startDoorComponentEdit,
    resetDoorComponentForm,
  };
}
