import { applyLedgerEntriesToProject } from "../model/project-accounting-logic";
import { mapAdvanceRecord, mapContractRecord } from "../model/project-api-mappers";
import type {
  DashboardProjectAdvanceApiRecord,
  DashboardProjectApiRecord,
  DashboardProjectCardData,
  DashboardProjectContractApiRecord,
  DashboardProjectLedgerApiRecord,
} from "../model/project-model";
import {
  reconcileProjectLedgerEntries,
  resolveProjectRecordSeed,
  type MergeProjectRecordOptions,
} from "./project-state-merge-helpers";

// Слияние server-records в UI state вынесено отдельно, чтобы hook оставался
// orchestrator-слоем, а правила пересборки проекта жили в чистых helper'ах.
export function mergeProjectRecord(
  projectRecord: DashboardProjectApiRecord,
  existingProject: DashboardProjectCardData | undefined,
  options: MergeProjectRecordOptions,
): DashboardProjectCardData {
  const seed = resolveProjectRecordSeed(existingProject, options);

  return {
    ...seed,
    id: String(projectRecord.id),
    code: projectRecord.code,
    name: projectRecord.name,
    address: projectRecord.address,
    entranceSection: projectRecord.entrance_section,
    apartment: projectRecord.apartment,
    floor: projectRecord.floor,
    roomCount: projectRecord.room_count,
    hasElevator: projectRecord.has_elevator,
    siteAccess: projectRecord.site_access,
    accessHours: projectRecord.access_hours,
    intercomCode: projectRecord.intercom_code,
    responsiblePerson: projectRecord.responsible_person,
    comment: projectRecord.comment,
    stageLabel: projectRecord.stage_label,
    stageTone: projectRecord.stage_tone,
    areaM2: projectRecord.area_m2,
    ceilingHeightM: projectRecord.ceiling_height_m,
    estimateSource: projectRecord.estimate_source,
    receivedTotal: projectRecord.received_total,
    remainingTotal: projectRecord.remaining_total,
    deferredTotal: projectRecord.deferred_total,
    plannedTotal: projectRecord.planned_total,
    actualTotal: projectRecord.actual_total,
    workPerM2: projectRecord.work_per_m2,
    materialsPerM2: projectRecord.materials_per_m2,
    plannedMarginPercent: projectRecord.planned_margin_percent,
    nextDeliveryLabel: projectRecord.next_delivery_label,
  };
}

export function mergeProjectAdvances(
  currentProjects: DashboardProjectCardData[],
  projectId: string,
  advances: DashboardProjectAdvanceApiRecord[],
): DashboardProjectCardData[] {
  return currentProjects.map((candidate) =>
    candidate.id === projectId
      ? {
          ...candidate,
          advances: advances.map(mapAdvanceRecord),
        }
      : candidate,
  );
}

export function mergeProjectLedger(
  currentProjects: DashboardProjectCardData[],
  projectId: string,
  records: DashboardProjectLedgerApiRecord[],
): DashboardProjectCardData[] {
  return currentProjects.map((candidate) => {
    if (candidate.id !== projectId) {
      return candidate;
    }

    const nextEntries = reconcileProjectLedgerEntries(candidate.ledgerEntries, records);

    if (candidate.expenses.length > 0 && candidate.ledgerEntries.length > 0) {
      return {
        ...candidate,
        ledgerEntries: nextEntries,
      };
    }

    return applyLedgerEntriesToProject(candidate, nextEntries);
  });
}

export function mergeProjectSummary(
  currentProjects: DashboardProjectCardData[],
  projectId: string,
  projectRecord: DashboardProjectApiRecord,
): DashboardProjectCardData[] {
  return currentProjects.map((candidate, index) =>
    candidate.id === projectId
      ? mergeProjectRecord(projectRecord, candidate, {
          usePrototypeSeed: false,
          sequence: index + 1,
        })
      : candidate,
  );
}

export function mergeProjectContract(
  currentProjects: DashboardProjectCardData[],
  projectId: string,
  contractRecord: DashboardProjectContractApiRecord,
): DashboardProjectCardData[] {
  return currentProjects.map((candidate) =>
    candidate.id === projectId
      ? {
          ...candidate,
          contract: mapContractRecord(contractRecord),
        }
      : candidate,
  );
}
