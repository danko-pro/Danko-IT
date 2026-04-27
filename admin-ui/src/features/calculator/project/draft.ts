import type { CalculatorProjectDetail } from "./model";

export type ProjectHeaderDraft = {
  projectName: string;
  residentialComplex: string;
  projectAddress: string;
  entranceSection: string;
  floorNumber: string;
  unitNumber: string;
  liftType: string;
  accessMode: string;
  intercomCode: string;
  loadingZone: string;
  responsiblePerson: string;
  projectNote: string;
};

export const emptyProjectHeaderDraft: ProjectHeaderDraft = {
  projectName: "",
  residentialComplex: "",
  projectAddress: "",
  entranceSection: "",
  floorNumber: "",
  unitNumber: "",
  liftType: "",
  accessMode: "",
  intercomCode: "",
  loadingZone: "",
  responsiblePerson: "",
  projectNote: "",
};

export function buildProjectHeaderDraft(projectDetail: CalculatorProjectDetail | null): ProjectHeaderDraft {
  if (!projectDetail) {
    return emptyProjectHeaderDraft;
  }

  const { project } = projectDetail;
  return {
    projectName: project.name ?? "",
    residentialComplex: project.residential_complex ?? "",
    projectAddress: project.address ?? "",
    entranceSection: project.entrance_section ?? "",
    floorNumber: project.floor ?? "",
    unitNumber: project.apartment ?? "",
    liftType: project.lift_type ?? "",
    accessMode: project.site_access ?? "",
    intercomCode: project.intercom_code ?? "",
    loadingZone: project.loading_zone ?? "",
    responsiblePerson: project.responsible_person ?? "",
    projectNote: project.note ?? "",
  };
}
