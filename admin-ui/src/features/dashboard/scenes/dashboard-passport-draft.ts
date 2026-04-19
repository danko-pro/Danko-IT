import type { DashboardProjectCardData } from "../model/project-model";
import type { ProjectPassportPatch } from "../state/project-record-actions";

export type PassportDraft = ProjectPassportPatch;
export type PassportSaveState = "idle" | "saving" | "saved" | "error";

// Draft helpers паспорта объекта.
// Здесь живут базовая инициализация формы и сравнение draft с project-данными без участия scene-компонента.

export function createPassportDraft(project: DashboardProjectCardData): PassportDraft {
  return {
    name: project.name,
    address: project.address,
    apartment: project.apartment,
    floor: project.floor,
    hasElevator: project.hasElevator,
    siteAccess: project.siteAccess,
    intercomCode: project.intercomCode,
    responsiblePerson: project.responsiblePerson,
    areaM2: project.areaM2,
    plannedMarginPercent: project.plannedMarginPercent,
  };
}

export function samePassportDraft(left: PassportDraft, right: PassportDraft) {
  return (
    left.name === right.name &&
    left.address === right.address &&
    left.apartment === right.apartment &&
    left.floor === right.floor &&
    left.hasElevator === right.hasElevator &&
    left.siteAccess === right.siteAccess &&
    left.intercomCode === right.intercomCode &&
    left.responsiblePerson === right.responsiblePerson &&
    left.areaM2 === right.areaM2 &&
    left.plannedMarginPercent === right.plannedMarginPercent
  );
}
