import type {
  DashboardProjectCardData,
  ProjectCardContract,
  ProjectCardLedgerCounterparty,
  ProjectCardLedgerEntry,
} from "../model/project-model";

// Сборка payload'ов для dashboard API.
// Здесь живут только преобразования UI-моделей в transport-формат backend.
export function buildProjectCreatePayload(project: DashboardProjectCardData) {
  return {
    code: project.code,
    name: project.name,
    address: project.address,
    apartment: project.apartment,
    floor: project.floor,
    has_elevator: project.hasElevator,
    site_access: project.siteAccess,
    intercom_code: project.intercomCode,
    responsible_person: project.responsiblePerson,
    stage_label: project.stageLabel,
    stage_tone: project.stageTone,
    estimate_source: project.estimateSource,
    area_m2: project.areaM2,
    received_total: project.receivedTotal,
    remaining_total: project.remainingTotal,
    deferred_total: project.deferredTotal,
    planned_total: project.plannedTotal,
    actual_total: project.actualTotal,
    work_per_m2: project.workPerM2,
    materials_per_m2: project.materialsPerM2,
    planned_margin_percent: project.plannedMarginPercent,
    next_delivery_label: project.nextDeliveryLabel,
  };
}

export function buildProjectPassportPatchPayload(
  patch: Pick<
    DashboardProjectCardData,
    | "name"
    | "address"
    | "apartment"
    | "floor"
    | "hasElevator"
    | "siteAccess"
    | "intercomCode"
    | "responsiblePerson"
    | "areaM2"
    | "plannedMarginPercent"
  >,
) {
  return {
    name: patch.name,
    address: patch.address,
    apartment: patch.apartment,
    floor: patch.floor,
    has_elevator: patch.hasElevator,
    site_access: patch.siteAccess,
    intercom_code: patch.intercomCode,
    responsible_person: patch.responsiblePerson,
    area_m2: patch.areaM2,
    planned_margin_percent: patch.plannedMarginPercent,
  };
}

export function buildProjectAdvancePayload(advance: {
  title: string;
  amount: number;
  date: string;
  status?: "paid" | "planned";
}) {
  return {
    title: advance.title,
    amount: advance.amount,
    date: advance.date,
    status: advance.status ?? "paid",
  };
}

export function buildProjectContractPayload(contract: ProjectCardContract) {
  return {
    file_name: contract.fileName,
    title: contract.title,
    number: contract.number,
    signed_at: contract.signedAt,
    start_date: contract.startDate,
    planned_end_date: contract.plannedEndDate,
    amount: contract.amount,
    advance_terms: contract.advanceTerms,
    extraction_status: contract.extractionStatus,
    milestones: contract.milestones.map((milestone, index) => ({
      kind: milestone.kind,
      title: milestone.title,
      planned_date: milestone.plannedDate,
      amount: typeof milestone.amount === "number" ? milestone.amount : null,
      note: milestone.note ?? "",
      status: milestone.status,
      sort_order: (index + 1) * 10,
    })),
  };
}

function buildLedgerCounterpartyPayload(details: ProjectCardLedgerCounterparty | null) {
  if (!details) {
    return null;
  }

  return {
    inn: details.inn,
    legalName: details.legalName,
    managerName: details.managerName,
    email: details.email,
    phone: details.phone,
    messenger: details.messenger,
  };
}

export function buildProjectLedgerPayload(entry: ProjectCardLedgerEntry) {
  return {
    category: entry.category,
    item: entry.item,
    owner: entry.owner,
    counterparty: entry.counterparty,
    counterparty_details: buildLedgerCounterpartyPayload(entry.counterpartyDetails),
    status: entry.status,
    plan_amount: entry.planAmount,
    actual_amount: entry.actualAmount,
    control_date: entry.controlDate,
  };
}

export function buildProjectLedgerPatchPayload(patch: Partial<ProjectCardLedgerEntry>) {
  const payload: Record<string, unknown> = {};

  if ("category" in patch) {
    payload.category = patch.category ?? "";
  }
  if ("item" in patch) {
    payload.item = patch.item ?? "";
  }
  if ("owner" in patch) {
    payload.owner = patch.owner ?? "";
  }
  if ("counterparty" in patch) {
    payload.counterparty = patch.counterparty ?? "";
  }
  if ("counterpartyDetails" in patch) {
    payload.counterparty_details = buildLedgerCounterpartyPayload(patch.counterpartyDetails ?? null);
  }
  if ("status" in patch) {
    payload.status = patch.status ?? "planned";
  }
  if ("planAmount" in patch) {
    payload.plan_amount = patch.planAmount ?? 0;
  }
  if ("actualAmount" in patch) {
    payload.actual_amount = patch.actualAmount ?? 0;
  }
  if ("controlDate" in patch) {
    payload.control_date = patch.controlDate ?? "";
  }

  return payload;
}
