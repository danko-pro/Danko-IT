/**
 * Локальные mutator-helper'ы для project state вынесены отдельно, чтобы
 * coordinator-hook не держал в себе низкоуровневую работу с коллекцией проектов.
 */
import type { Dispatch, SetStateAction } from "react";
import { applyLedgerEntriesToProject } from "../model/project-accounting-logic";
import type { DashboardProjectCardData, ProjectCardLedgerEntry } from "../model/project-model";

type SetProjects = Dispatch<SetStateAction<DashboardProjectCardData[]>>;

export type UpdateSelectedProject = (
  mutator: (current: DashboardProjectCardData) => DashboardProjectCardData,
) => void;

export type UpdateSelectedProjectLedger = (
  mutator: (entries: ProjectCardLedgerEntry[]) => ProjectCardLedgerEntry[],
  options?: { recomputeExpenses?: boolean },
) => void;

export function createDashboardProjectLocalState(params: {
  activeProjectId: string | null;
  setProjects: SetProjects;
}) {
  const updateSelectedProject: UpdateSelectedProject = (mutator) => {
    if (!params.activeProjectId) {
      return;
    }

    params.setProjects((current) =>
      current.map((candidate) => (candidate.id === params.activeProjectId ? mutator(candidate) : candidate)),
    );
  };

  const updateSelectedProjectLedger: UpdateSelectedProjectLedger = (mutator, options) => {
    updateSelectedProject((current) => {
      const nextEntries = mutator(current.ledgerEntries);
      if (options?.recomputeExpenses) {
        return applyLedgerEntriesToProject(current, nextEntries);
      }

      return {
        ...current,
        ledgerEntries: nextEntries,
      };
    });
  };

  return {
    updateSelectedProject,
    updateSelectedProjectLedger,
  };
}
