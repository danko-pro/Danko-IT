/**
 * Главный hook для dashboard projects.
 * Здесь остаются только React state, загрузка срезов проекта и orchestration
 * между более узкими contract/ledger sync hook'ами и UI-экшенами.
 */
import { useEffect, useState } from "react";
import type { DashboardProjectCardData, ProjectCardLedgerDocument, ProjectCardLedgerEntry } from "../model/project-model";
import {
  type AdvancePayload,
  createDashboardProjectAdvance,
  deleteDashboardProjectAdvance,
} from "./project-advance-actions";
import {
  createDashboardProjectLedgerEntry,
  deleteDashboardProjectLedgerEntry,
  patchDashboardProjectLedgerDocument,
  patchDashboardProjectLedgerEntry,
  uploadDashboardProjectLedgerDocument,
} from "./project-ledger-actions";
import { createDashboardProjectLocalState } from "./project-local-state";
import {
  loadDashboardProjectAdvances,
  loadDashboardProjectContract,
  loadDashboardProjectLedger,
  loadDashboardProjects,
} from "./project-loaders";
import {
  createDashboardProject,
  deleteDashboardProject,
  renameDashboardProject,
  updateDashboardProjectPassport,
  type ProjectPassportPatch,
} from "./project-record-actions";
import { useDashboardProjectContractSync } from "./use-dashboard-project-contract-sync";
import { type LedgerDocumentKind, useDashboardProjectLedgerSync } from "./use-dashboard-project-ledger-sync";

export function useDashboardProjectState() {
  const [projects, setProjects] = useState<DashboardProjectCardData[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const project = selectedProjectId ? projects.find((candidate) => candidate.id === selectedProjectId) ?? null : null;
  const activeProject = project ?? projects[0] ?? null;

  useEffect(() => {
    void loadProjects();
  }, []);

  useEffect(() => {
    if (!selectedProjectId) {
      return;
    }

    void Promise.all([
      loadProjectAdvances(selectedProjectId),
      loadProjectLedger(selectedProjectId),
      loadProjectContract(selectedProjectId),
    ]);
  }, [selectedProjectId]);

  async function loadProjects() {
    await loadDashboardProjects({
      setLoading,
      setError,
      setProjects,
      setSelectedProjectId,
    });
  }

  async function loadProjectAdvances(projectId: string) {
    await loadDashboardProjectAdvances(projectId, {
      setError,
      setProjects,
    });
  }

  async function loadProjectLedger(projectId: string) {
    await loadDashboardProjectLedger(projectId, {
      setError,
      setProjects,
    });
  }

  async function loadProjectContract(projectId: string) {
    await loadDashboardProjectContract(projectId, {
      setError,
      setProjects,
    });
  }

  const { updateSelectedProject, updateSelectedProjectLedger } = createDashboardProjectLocalState({
    activeProjectId: activeProject?.id ?? null,
    setProjects,
  });

  const {
    clearPendingLedgerDocumentSync,
    clearPendingLedgerSync,
    scheduleLedgerDocumentSync,
    scheduleLedgerEntrySync,
  } = useDashboardProjectLedgerSync({
    loadProjectLedger,
    loadProjects,
    setError,
    setProjects,
  });

  const { contractSyncState, completeContractMilestone, deleteContract, extractContract, updateContract, uploadContract } =
    useDashboardProjectContractSync({
      activeProject,
      selectedProjectId,
      setError,
      setProjects,
      updateSelectedProject,
      loadProjectContract,
    });

  async function addAdvance(payload: AdvancePayload) {
    await createDashboardProjectAdvance({
      activeProject,
      payload,
      setProjects,
      setError,
    });
  }

  async function deleteAdvance(advanceId: string) {
    await deleteDashboardProjectAdvance({
      activeProject,
      advanceId,
      setProjects,
      setError,
    });
  }

  async function addLedgerEntry() {
    await createDashboardProjectLedgerEntry({
      activeProject,
      setProjects,
      setError,
    });
  }

  async function deleteLedgerEntry(entryId: string) {
    await deleteDashboardProjectLedgerEntry({
      activeProject,
      entryId,
      clearPendingLedgerSync,
      updateSelectedProjectLedger,
      loadProjects,
      setProjects,
      setError,
    });
  }

  function updateLedgerEntry(entryId: string, patch: Partial<ProjectCardLedgerEntry>) {
    patchDashboardProjectLedgerEntry({
      activeProject,
      entryId,
      patch,
      updateSelectedProjectLedger,
      scheduleLedgerEntrySync,
    });
  }

  function updateLedgerDocument(
    entryId: string,
    kind: LedgerDocumentKind,
    patch: Partial<ProjectCardLedgerDocument>,
  ) {
    patchDashboardProjectLedgerDocument({
      activeProject,
      entryId,
      kind,
      patch,
      updateSelectedProjectLedger,
      scheduleLedgerDocumentSync,
    });
  }

  async function uploadLedgerDocument(entryId: string, kind: LedgerDocumentKind, file: File) {
    await uploadDashboardProjectLedgerDocument({
      activeProject,
      entryId,
      kind,
      file,
      updateSelectedProjectLedger,
      clearPendingLedgerDocumentSync,
      loadProjectLedger,
      setProjects,
      setError,
    });
  }

  function selectProject(projectId: string) {
    setSelectedProjectId(projectId);
  }

  async function addProject() {
    await createDashboardProject({
      setProjects,
      setSelectedProjectId,
      setError,
    });
  }

  async function renameProject(projectId: string, nextCode: string) {
    await renameDashboardProject({
      projectId,
      nextCode,
      setProjects,
      setError,
    });
  }

  async function deleteProject(projectId: string) {
    await deleteDashboardProject({
      projectId,
      setProjects,
      setSelectedProjectId,
      setError,
    });
  }

  async function updateProjectPassport(passport: ProjectPassportPatch) {
    if (!activeProject) {
      return;
    }

    await updateDashboardProjectPassport({
      projectId: activeProject.id,
      passport,
      setProjects,
      setError,
    });
  }

  return {
    project: activeProject,
    projects,
    selectedProjectId,
    loading,
    error,
    contractSyncState,
    actions: {
      loadProjects,
      selectProject,
      addProject,
      renameProject,
      deleteProject,
      updateProjectPassport,
      addAdvance,
      deleteAdvance,
      completeContractMilestone,
      uploadContract,
      extractContract,
      updateContract,
      deleteContract,
      addLedgerEntry,
      deleteLedgerEntry,
      updateLedgerEntry,
      updateLedgerDocument,
      uploadLedgerDocument,
    },
  };
}
