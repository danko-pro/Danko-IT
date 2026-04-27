import type { DashboardProjectCardData } from "../model/project-model";
import type { ProjectPassportPatch } from "../state/project-record-actions";

export type PassportDraft = ProjectPassportPatch;
export type PassportSaveState = "idle" | "saving" | "saved" | "error";

// Draft helpers паспорта объекта.
// Здесь живут базовая инициализация формы и сравнение draft с project-данными без участия scene-компонента.
export function createPassportDraft(project: DashboardProjectCardData): PassportDraft {
  return {
    code: project.code,
    name: project.name,
    address: project.address,
    entranceSection: project.entranceSection,
    apartment: project.apartment,
    floor: project.floor,
    roomCount: project.roomCount,
    hasElevator: project.hasElevator,
    siteAccess: project.siteAccess,
    accessHours: project.accessHours,
    intercomCode: project.intercomCode,
    responsiblePerson: project.responsiblePerson,
    comment: project.comment,
    areaM2: project.areaM2,
    ceilingHeightM: project.ceilingHeightM,
    plannedMarginPercent: project.plannedMarginPercent,
  };
}

export function samePassportDraft(left: PassportDraft, right: PassportDraft) {
  return (
    left.code === right.code &&
    left.name === right.name &&
    left.address === right.address &&
    left.entranceSection === right.entranceSection &&
    left.apartment === right.apartment &&
    left.floor === right.floor &&
    left.roomCount === right.roomCount &&
    left.hasElevator === right.hasElevator &&
    left.siteAccess === right.siteAccess &&
    left.accessHours === right.accessHours &&
    left.intercomCode === right.intercomCode &&
    left.responsiblePerson === right.responsiblePerson &&
    left.comment === right.comment &&
    left.areaM2 === right.areaM2 &&
    left.ceilingHeightM === right.ceilingHeightM &&
    left.plannedMarginPercent === right.plannedMarginPercent
  );
}
