// Главный hook dashboard projects: state, загрузка срезов и orchestration между sync hook'ами и UI-экшенами.
import { useEffect, useState } from "react";
import type {
  DashboardProjectCardData,
  ProjectCardLedgerDocument,
  ProjectCardLedgerEntry,
  ProjectFinanceSettings,
} from "../model/project-model";
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
  createDashboardProject,
  deleteDashboardProject,
  renameDashboardProject,
  updateDashboardProjectFinanceSettings,
  updateDashboardProjectPassport,
  type ProjectPassportPatch,
} from "./project-record-actions";
import { createProjectStateLoaders } from "./project-state-loaders";
import { useDashboardProjectContractSync } from "./use-dashboard-project-contract-sync";
import { type LedgerDocumentKind, useDashboardProjectLedgerSync } from "./use-dashboard-project-ledger-sync";

export function useDashboardProjectState() {
  const [projects, setProjects] = useState<DashboardProjectCardData[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const project = selectedProjectId ? projects.find((candidate) => candidate.id === selectedProjectId) ?? null : null;
  const activeProject = project ?? projects[0] ?? null;

  const { loadProjects, loadProjectAdvances, loadProjectDetail, loadProjectLedger, loadProjectContract } = createProjectStateLoaders({
    setLoading,
    setError,
    setProjects,
    setSelectedProjectId,
  });

  useEffect(() => {
    void loadProjects();
  }, []);

  useEffect(() => {
    if (!selectedProjectId) {
      return;
    }

    void Promise.all([
      loadProjectDetail(selectedProjectId),
      loadProjectAdvances(selectedProjectId),
      loadProjectLedger(selectedProjectId),
      loadProjectContract(selectedProjectId),
    ]);
  }, [selectedProjectId]);

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
    loadProjectDetail,
    loadProjectLedger,
    loadProjects,
    setError,
    setProjects,
  });

  const { contractSyncState, completeContractMilestone, deleteContract, extractContract, updateContract, uploadContract } = useDashboardProjectContractSync({
    activeProject,
    selectedProjectId,
    setError,
    setProjects,
    updateSelectedProject,
    loadProjectContract,
  });

  async function addAdvance(payload: AdvancePayload) {
    const projectId = activeProject?.id ?? null;
    await createDashboardProjectAdvance({
      activeProject,
      payload,
      setProjects,
      setError,
    });
    if (projectId) {
      await loadProjectDetail(projectId);
    }
  }

  async function deleteAdvance(advanceId: string) {
    const projectId = activeProject?.id ?? null;
    await deleteDashboardProjectAdvance({
      activeProject,
      advanceId,
      setProjects,
      setError,
    });
    if (projectId) {
      await loadProjectDetail(projectId);
    }
  }

  async function addLedgerEntry() {
    const projectId = activeProject?.id ?? null;
    await createDashboardProjectLedgerEntry({
      activeProject,
      updateSelectedProjectLedger,
      setProjects,
      setError,
    });
    if (projectId) {
      await loadProjectDetail(projectId);
    }
  }

  async function deleteLedgerEntry(entryId: string) {
    const projectId = activeProject?.id ?? null;
    await deleteDashboardProjectLedgerEntry({
      activeProject,
      entryId,
      clearPendingLedgerSync,
      updateSelectedProjectLedger,
      loadProjects,
      setProjects,
      setError,
    });
    if (projectId) {
      await loadProjectDetail(projectId);
    }
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

  function updateLedgerDocument(entryId: string, kind: LedgerDocumentKind, patch: Partial<ProjectCardLedgerDocument>) {
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

  async function updateFinanceSettings(settings: ProjectFinanceSettings) {
    if (!activeProject) {
      return;
    }

    await updateDashboardProjectFinanceSettings({
      projectId: activeProject.id,
      settings,
      loadProjectDetail,
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
      updateFinanceSettings,
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
