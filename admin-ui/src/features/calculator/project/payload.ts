import type { ProjectHeaderDraft } from "./draft";

export type CalculatorProjectUpdatePayload = {
  name: string;
  residential_complex: string;
  address: string;
  entrance_section: string;
  apartment: string;
  floor: string;
  lift_type: string;
  site_access: string;
  intercom_code: string;
  loading_zone: string;
  responsible_person: string;
  note: string;
};

export function buildProjectUpdatePayload(draft: ProjectHeaderDraft): CalculatorProjectUpdatePayload {
  return {
    name: draft.projectName,
    residential_complex: draft.residentialComplex,
    address: draft.projectAddress,
    entrance_section: draft.entranceSection,
    apartment: draft.unitNumber,
    floor: draft.floorNumber,
    lift_type: draft.liftType,
    site_access: draft.accessMode,
    intercom_code: draft.intercomCode,
    loading_zone: draft.loadingZone,
    responsible_person: draft.responsiblePerson,
    note: draft.projectNote,
  };
}
