import type { Dispatch, SetStateAction } from "react";

import type { DashboardProjectCardData } from "../model/project-model";
import {
  loadDashboardProjectAdvances,
  loadDashboardProjectContract,
  loadDashboardProjectLedger,
  loadDashboardProjects,
} from "./project-loaders";

type ProjectStateLoadersOptions = {
  setLoading: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<string | null>>;
  setProjects: Dispatch<SetStateAction<DashboardProjectCardData[]>>;
  setSelectedProjectId: Dispatch<SetStateAction<string | null>>;
};

export function createProjectStateLoaders(props: ProjectStateLoadersOptions) {
  async function loadProjects() {
    await loadDashboardProjects({
      setLoading: props.setLoading,
      setError: props.setError,
      setProjects: props.setProjects,
      setSelectedProjectId: props.setSelectedProjectId,
    });
  }

  async function loadProjectAdvances(projectId: string) {
    await loadDashboardProjectAdvances(projectId, {
      setError: props.setError,
      setProjects: props.setProjects,
    });
  }

  async function loadProjectLedger(projectId: string) {
    await loadDashboardProjectLedger(projectId, {
      setError: props.setError,
      setProjects: props.setProjects,
    });
  }

  async function loadProjectContract(projectId: string) {
    await loadDashboardProjectContract(projectId, {
      setError: props.setError,
      setProjects: props.setProjects,
    });
  }

  return {
    loadProjects,
    loadProjectAdvances,
    loadProjectLedger,
    loadProjectContract,
  };
}
