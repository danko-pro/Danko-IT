import type { ProjectCardLedgerCounterparty, ProjectCardLedgerEntry } from "../../model/project-model";

export function createEmptyCounterpartyDetails(legalName = ""): ProjectCardLedgerCounterparty {
  return {
    inn: "",
    legalName,
    managerName: "",
    email: "",
    phone: "",
    messenger: "",
  };
}

export function counterpartyFromEntry(
  entry: ProjectCardLedgerEntry | null | undefined,
): ProjectCardLedgerCounterparty | null {
  if (!entry) {
    return null;
  }

  if (entry.counterpartyDetails) {
    return entry.counterpartyDetails;
  }

  if (!entry.counterparty.trim()) {
    return null;
  }

  return createEmptyCounterpartyDetails(entry.counterparty);
}

export function mergeUniqueCounterparties(records: Array<ProjectCardLedgerCounterparty | null | undefined>) {
  const result: ProjectCardLedgerCounterparty[] = [];
  const seen = new Set<string>();

  for (const record of records) {
    if (!record) {
      continue;
    }

    const normalized = {
      inn: record.inn.trim(),
      legalName: record.legalName.trim(),
      managerName: record.managerName.trim(),
      email: record.email.trim(),
      phone: record.phone.trim(),
      messenger: record.messenger.trim(),
    };

    const primaryLabel = normalized.legalName || normalized.managerName || normalized.inn;
    if (!primaryLabel) {
      continue;
    }

    const key = normalized.inn
      ? `inn:${normalized.inn}`
      : `name:${primaryLabel.toLocaleLowerCase("ru-RU")}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(normalized);
  }

  return result;
}

export function counterpartyTriggerLabel(details: ProjectCardLedgerCounterparty | null, fallback: string) {
  if (details?.legalName.trim()) {
    return details.legalName.trim();
  }

  if (fallback.trim()) {
    return fallback.trim();
  }

  return "Выбрать контрагента";
}

export function counterpartyTriggerMeta(details: ProjectCardLedgerCounterparty | null) {
  if (details?.inn.trim()) {
    return `ИНН ${details.inn.trim()}`;
  }

  if (details?.managerName.trim()) {
    return details.managerName.trim();
  }

  return "Карточка контрагента";
}
