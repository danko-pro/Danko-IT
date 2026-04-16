import { useEffect, useRef, useState } from "react";
import { applyLedgerEntriesToProject, createEmptyLedgerEntry } from "../model/project-accounting-logic";
import {
  cloneDashboardProjectData,
  createDashboardProjectDraft,
  createEmptyProjectContract,
  firstProjectCardMock,
} from "../model/project-card.mock";
import type {
  DashboardProjectAdvanceApiRecord,
  DashboardProjectApiRecord,
  DashboardProjectCardData,
  DashboardProjectContractApiRecord,
  DashboardProjectLedgerDocumentApiRecord,
  DashboardProjectLedgerApiRecord,
  ProjectCardAdvanceItem,
  ProjectCardContract,
  ProjectCardLedgerCounterparty,
  ProjectCardLedgerDocument,
  ProjectCardLedgerEntry,
} from "../model/project-model";
import { ApiError, fetchJson } from "../../../shared/utils";

type AdvancePayload = {
  title: string;
  amount: number;
  date: string;
};

type LedgerDocumentKind = "invoice" | "act";

type LedgerSyncPatch = Partial<ProjectCardLedgerEntry>;
type LedgerDocumentSyncPatch = Partial<ProjectCardLedgerDocument>;
type ContractSyncTone = "info" | "success" | "error";

type ContractSyncState = {
  uploading: boolean;
  extracting: boolean;
  tone: ContractSyncTone;
  message: string | null;
};

const idleContractSyncState: ContractSyncState = {
  uploading: false,
  extracting: false,
  tone: "info",
  message: null,
};

function buildProjectCreatePayload(project: DashboardProjectCardData) {
  return {
    code: project.code,
    name: project.name,
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

function buildProjectAdvancePayload(advance: {
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

function buildProjectContractPayload(contract: ProjectCardContract) {
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

function buildProjectLedgerPayload(entry: ProjectCardLedgerEntry) {
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

function buildProjectLedgerPatchPayload(patch: LedgerSyncPatch) {
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

function mapAdvanceRecord(record: DashboardProjectAdvanceApiRecord): ProjectCardAdvanceItem {
  return {
    id: String(record.id),
    title: record.title,
    amount: record.amount,
    date: record.date,
    status: record.status,
  };
}

function mapLedgerDocumentRecord(record: DashboardProjectLedgerDocumentApiRecord): ProjectCardLedgerDocument {
  return {
    id: String(record.id),
    kind: record.kind,
    title: record.title,
    date: record.date,
    amount: record.amount,
    sourceFile: {
      id: record.source_file.id,
      fileName: record.source_file.file_name,
      mimeType: record.source_file.mime_type,
      uploadedAt: record.source_file.uploaded_at,
    },
    extractedByAi: record.extracted_by_ai,
    verifiedByUser: record.verified_by_user,
  };
}

function mapContractRecord(record: DashboardProjectContractApiRecord): ProjectCardContract {
  return {
    fileName: record.file_name,
    title: record.title,
    number: record.number,
    signedAt: record.signed_at,
    startDate: record.start_date,
    plannedEndDate: record.planned_end_date,
    amount: record.amount,
    advanceTerms: record.advance_terms,
    extractionStatus: record.extraction_status,
    sourceFile: record.source_file
      ? {
          id: record.source_file.id,
          fileName: record.source_file.file_name,
          mimeType: record.source_file.mime_type,
          uploadedAt: record.source_file.uploaded_at,
        }
      : null,
    downloadUrl: record.download_url,
    milestones: record.milestones.map((milestone) => ({
      id: String(milestone.id),
      kind: milestone.kind,
      title: milestone.title,
      plannedDate: milestone.planned_date,
      amount: typeof milestone.amount === "number" ? milestone.amount : undefined,
      note: milestone.note || undefined,
      status: milestone.status,
    })),
  };
}

function cloneLedgerDocument(document: ProjectCardLedgerDocument | null): ProjectCardLedgerDocument | null {
  return document ? structuredClone(document) : null;
}

function mapLedgerRecord(
  record: DashboardProjectLedgerApiRecord,
  existingEntry?: ProjectCardLedgerEntry,
): ProjectCardLedgerEntry {
  return {
    id: String(record.id),
    category: record.category,
    item: record.item,
    owner: record.owner,
    counterparty: record.counterparty,
    counterpartyDetails: record.counterparty_details ? { ...record.counterparty_details } : null,
    status: record.status,
    invoiceDocument: record.invoice_document
      ? mapLedgerDocumentRecord(record.invoice_document)
      : cloneLedgerDocument(existingEntry?.invoiceDocument ?? null),
    actDocument: record.act_document
      ? mapLedgerDocumentRecord(record.act_document)
      : cloneLedgerDocument(existingEntry?.actDocument ?? null),
    planAmount: record.plan_amount,
    actualAmount: record.actual_amount,
    controlDate: record.control_date,
  };
}

function ledgerEntrySignature(entry: {
  category: string;
  item: string;
  counterparty: string;
  planAmount: number;
  actualAmount: number;
  controlDate: string;
}) {
  return [
    entry.category.trim().toLowerCase(),
    entry.item.trim().toLowerCase(),
    entry.counterparty.trim().toLowerCase(),
    entry.planAmount.toFixed(2),
    entry.actualAmount.toFixed(2),
    entry.controlDate.trim(),
  ].join("|");
}

function ledgerRecordSignature(record: DashboardProjectLedgerApiRecord) {
  return ledgerEntrySignature({
    category: record.category,
    item: record.item,
    counterparty: record.counterparty,
    planAmount: record.plan_amount,
    actualAmount: record.actual_amount,
    controlDate: record.control_date,
  });
}

function mergeProjectRecord(
  projectRecord: DashboardProjectApiRecord,
  existingProject: DashboardProjectCardData | undefined,
  options: {
    usePrototypeSeed: boolean;
    sequence: number;
  },
): DashboardProjectCardData {
  const { usePrototypeSeed, sequence } = options;
  const seed = existingProject
    ? cloneDashboardProjectData(existingProject)
    : usePrototypeSeed
      ? cloneDashboardProjectData(firstProjectCardMock)
      : createDashboardProjectDraft(sequence);

  return {
    ...seed,
    id: String(projectRecord.id),
    code: projectRecord.code,
    name: projectRecord.name,
    stageLabel: projectRecord.stage_label,
    stageTone: projectRecord.stage_tone,
    areaM2: projectRecord.area_m2,
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

function mergeProjectAdvances(
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

function mergeProjectLedger(
  currentProjects: DashboardProjectCardData[],
  projectId: string,
  records: DashboardProjectLedgerApiRecord[],
): DashboardProjectCardData[] {
  return currentProjects.map((candidate) => {
    if (candidate.id !== projectId) {
      return candidate;
    }

    const existingEntriesById = new Map(candidate.ledgerEntries.map((entry) => [entry.id, entry]));
    const existingEntriesBySignature = new Map<string, ProjectCardLedgerEntry[]>();

    for (const entry of candidate.ledgerEntries) {
      const signature = ledgerEntrySignature(entry);
      const currentGroup = existingEntriesBySignature.get(signature) ?? [];
      currentGroup.push(entry);
      existingEntriesBySignature.set(signature, currentGroup);
    }

    const nextEntries = records.map((record) => {
      const existingById = existingEntriesById.get(String(record.id));
      if (existingById) {
        return mapLedgerRecord(record, existingById);
      }

      const signature = ledgerRecordSignature(record);
      const sameSignatureEntries = existingEntriesBySignature.get(signature) ?? [];
      const matchedEntry = sameSignatureEntries.shift();
      if (sameSignatureEntries.length > 0) {
        existingEntriesBySignature.set(signature, sameSignatureEntries);
      } else {
        existingEntriesBySignature.delete(signature);
      }
      return mapLedgerRecord(record, matchedEntry);
    });

    if (candidate.expenses.length > 0 && candidate.ledgerEntries.length > 0) {
      return {
        ...candidate,
        ledgerEntries: nextEntries,
      };
    }

    return applyLedgerEntriesToProject(candidate, nextEntries);
  });
}

function mergeProjectSummary(
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

function mergeProjectContract(
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

export function useDashboardProjectState() {
  const [projects, setProjects] = useState<DashboardProjectCardData[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contractSyncState, setContractSyncState] = useState<ContractSyncState>(idleContractSyncState);
  const ledgerSyncTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const ledgerPendingPatchesRef = useRef<Map<string, LedgerSyncPatch>>(new Map());
  const ledgerDocumentSyncTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const ledgerDocumentPendingPatchesRef = useRef<Map<string, LedgerDocumentSyncPatch>>(new Map());

  const project = selectedProjectId ? projects.find((candidate) => candidate.id === selectedProjectId) ?? null : null;
  const activeProject = project ?? projects[0] ?? null;

  useEffect(() => {
    setContractSyncState(idleContractSyncState);
  }, [selectedProjectId]);

  useEffect(() => {
    void loadProjects();
  }, []);

  useEffect(() => {
    if (!selectedProjectId) {
      return;
    }

    void Promise.all([
      loadProjectAdvances(selectedProjectId),
      loadProjectLedger(selectedProjectId),
      loadProjectContract(selectedProjectId),
    ]);
  }, [selectedProjectId]);

  useEffect(() => {
    return () => {
      for (const timeoutId of ledgerSyncTimersRef.current.values()) {
        clearTimeout(timeoutId);
      }
      ledgerSyncTimersRef.current.clear();
      ledgerPendingPatchesRef.current.clear();
      for (const timeoutId of ledgerDocumentSyncTimersRef.current.values()) {
        clearTimeout(timeoutId);
      }
      ledgerDocumentSyncTimersRef.current.clear();
      ledgerDocumentPendingPatchesRef.current.clear();
    };
  }, []);

  async function loadProjects() {
    try {
      setLoading(true);
      setError(null);
      let records = await fetchJson<DashboardProjectApiRecord[]>("/api/projects");
      let usePrototypeSeed = false;

      if (records.length === 0) {
        const seededRecord = await fetchJson<DashboardProjectApiRecord>("/api/projects", {
          method: "POST",
          body: JSON.stringify(buildProjectCreatePayload(firstProjectCardMock)),
        });
        await Promise.all([
          ...firstProjectCardMock.advances.map((advance) =>
            fetchJson<{ advance: DashboardProjectAdvanceApiRecord; project: DashboardProjectApiRecord }>(
              `/api/projects/${seededRecord.id}/advances?sync_totals=false`,
              {
                method: "POST",
                body: JSON.stringify(buildProjectAdvancePayload(advance)),
              },
            ),
          ),
          ...firstProjectCardMock.ledgerEntries.map((entry) =>
            fetchJson<{ entry: DashboardProjectLedgerApiRecord; project: DashboardProjectApiRecord }>(
              `/api/projects/${seededRecord.id}/ledger?sync_summary=false`,
              {
                method: "POST",
                body: JSON.stringify(buildProjectLedgerPayload(entry)),
              },
            ),
          ),
          fetchJson<DashboardProjectContractApiRecord>(`/api/projects/${seededRecord.id}/contract`, {
            method: "PUT",
            body: JSON.stringify(buildProjectContractPayload(firstProjectCardMock.contract)),
          }),
        ]);
        records = [seededRecord];
        usePrototypeSeed = true;
      }

      setProjects((current) =>
        records.map((record, index) =>
          mergeProjectRecord(record, current.find((candidate) => candidate.id === String(record.id)), {
            usePrototypeSeed: usePrototypeSeed && index === 0,
            sequence: index + 1,
          }),
        ),
      );
      setSelectedProjectId((currentSelectedId) => {
        if (currentSelectedId && records.some((record) => String(record.id) === currentSelectedId)) {
          return currentSelectedId;
        }
        return records[0] ? String(records[0].id) : null;
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить объекты");
      setProjects([]);
      setSelectedProjectId(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadProjectAdvances(projectId: string) {
    try {
      const advances = await fetchJson<DashboardProjectAdvanceApiRecord[]>(`/api/projects/${projectId}/advances`);
      setProjects((current) => mergeProjectAdvances(current, projectId, advances));
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить авансы объекта");
    }
  }

  async function loadProjectLedger(projectId: string) {
    try {
      const entries = await fetchJson<DashboardProjectLedgerApiRecord[]>(`/api/projects/${projectId}/ledger`);
      setProjects((current) => mergeProjectLedger(current, projectId, entries));
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить таблицу учета объекта");
    }
  }

  async function loadProjectContract(projectId: string) {
    try {
      const contract = await fetchJson<DashboardProjectContractApiRecord | null>(`/api/projects/${projectId}/contract`);
      setProjects((current) =>
        contract
          ? mergeProjectContract(current, projectId, contract)
          : current.map((candidate) =>
              candidate.id === projectId
                ? {
                    ...candidate,
                    contract: createEmptyProjectContract(),
                  }
                : candidate,
            ),
      );
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить договор объекта");
    }
  }

  function updateSelectedProject(mutator: (current: DashboardProjectCardData) => DashboardProjectCardData) {
    if (!activeProject) {
      return;
    }

    setProjects((current) =>
      current.map((candidate) => (candidate.id === activeProject.id ? mutator(candidate) : candidate)),
    );
  }

  function updateSelectedProjectLedger(
    mutator: (entries: ProjectCardLedgerEntry[]) => ProjectCardLedgerEntry[],
    options?: { recomputeExpenses?: boolean },
  ) {
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
  }

  function clearPendingLedgerSync(projectId: string, entryId: string) {
    const syncKey = `${projectId}:${entryId}`;
    const timerId = ledgerSyncTimersRef.current.get(syncKey);
    if (timerId) {
      clearTimeout(timerId);
      ledgerSyncTimersRef.current.delete(syncKey);
    }
    ledgerPendingPatchesRef.current.delete(syncKey);
  }

  function clearPendingLedgerDocumentSync(projectId: string, entryId: string, kind: LedgerDocumentKind) {
    const syncKey = `${projectId}:${entryId}:${kind}`;
    const timerId = ledgerDocumentSyncTimersRef.current.get(syncKey);
    if (timerId) {
      clearTimeout(timerId);
      ledgerDocumentSyncTimersRef.current.delete(syncKey);
    }
    ledgerDocumentPendingPatchesRef.current.delete(syncKey);
  }

  async function flushLedgerEntrySync(projectId: string, entryId: string, syncKey: string) {
    const patch = ledgerPendingPatchesRef.current.get(syncKey);
    ledgerPendingPatchesRef.current.delete(syncKey);
    ledgerSyncTimersRef.current.delete(syncKey);

    if (!patch) {
      return;
    }

    const payload = buildProjectLedgerPatchPayload(patch);
    if (Object.keys(payload).length === 0) {
      return;
    }

    try {
      const result = await fetchJson<{
        entry: DashboardProjectLedgerApiRecord;
        project: DashboardProjectApiRecord;
      }>(`/api/projects/${projectId}/ledger/${entryId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      setProjects((current) =>
        current.map((candidate, index) => {
          if (candidate.id !== projectId) {
            return candidate;
          }

          const nextProject = mergeProjectRecord(result.project, candidate, {
            usePrototypeSeed: false,
            sequence: index + 1,
          });
          const nextEntries = candidate.ledgerEntries.map((entry) =>
            entry.id === entryId ? mapLedgerRecord(result.entry, entry) : entry,
          );
          return applyLedgerEntriesToProject(nextProject, nextEntries);
        }),
      );
      setError(null);
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "Не удалось сохранить строку учета");
      await loadProjects();
    }
  }

  function scheduleLedgerEntrySync(projectId: string, entryId: string, patch: LedgerSyncPatch) {
    const syncKey = `${projectId}:${entryId}`;
    const queuedPatch = ledgerPendingPatchesRef.current.get(syncKey) ?? {};
    ledgerPendingPatchesRef.current.set(syncKey, {
      ...queuedPatch,
      ...patch,
    });

    const currentTimer = ledgerSyncTimersRef.current.get(syncKey);
    if (currentTimer) {
      clearTimeout(currentTimer);
    }

    const timeoutId = setTimeout(() => {
      void flushLedgerEntrySync(projectId, entryId, syncKey);
    }, 350);
    ledgerSyncTimersRef.current.set(syncKey, timeoutId);
  }

  async function flushLedgerDocumentSync(
    projectId: string,
    entryId: string,
    kind: LedgerDocumentKind,
    syncKey: string,
  ) {
    const patch = ledgerDocumentPendingPatchesRef.current.get(syncKey);
    ledgerDocumentPendingPatchesRef.current.delete(syncKey);
    ledgerDocumentSyncTimersRef.current.delete(syncKey);

    if (!patch) {
      return;
    }

    try {
      const result = await fetchJson<{
        document: DashboardProjectLedgerDocumentApiRecord;
        entry: DashboardProjectLedgerApiRecord;
      }>(`/api/projects/${projectId}/ledger/${entryId}/documents/${kind}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: patch.title,
          date: patch.date,
          amount: patch.amount,
          extracted_by_ai: patch.extractedByAi,
          verified_by_user: patch.verifiedByUser,
        }),
      });

      setProjects((current) =>
        current.map((candidate) => {
          if (candidate.id !== projectId) {
            return candidate;
          }

          const nextEntries = candidate.ledgerEntries.map((entry) =>
            entry.id === entryId ? mapLedgerRecord(result.entry, entry) : entry,
          );
          return applyLedgerEntriesToProject(candidate, nextEntries);
        }),
      );
      setError(null);
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "Не удалось сохранить документ");
      await loadProjectLedger(projectId);
    }
  }

  function scheduleLedgerDocumentSync(
    projectId: string,
    entryId: string,
    kind: LedgerDocumentKind,
    patch: LedgerDocumentSyncPatch,
  ) {
    const syncKey = `${projectId}:${entryId}:${kind}`;
    const queuedPatch = ledgerDocumentPendingPatchesRef.current.get(syncKey) ?? {};
    ledgerDocumentPendingPatchesRef.current.set(syncKey, {
      ...queuedPatch,
      ...patch,
    });

    const currentTimer = ledgerDocumentSyncTimersRef.current.get(syncKey);
    if (currentTimer) {
      clearTimeout(currentTimer);
    }

    const timeoutId = setTimeout(() => {
      void flushLedgerDocumentSync(projectId, entryId, kind, syncKey);
    }, 350);
    ledgerDocumentSyncTimersRef.current.set(syncKey, timeoutId);
  }

  async function addAdvance(payload: AdvancePayload) {
    if (!activeProject) {
      return;
    }

    try {
      const result = await fetchJson<{
        advance: DashboardProjectAdvanceApiRecord;
        project: DashboardProjectApiRecord;
      }>(`/api/projects/${activeProject.id}/advances`, {
        method: "POST",
        body: JSON.stringify({
          ...buildProjectAdvancePayload({
            ...payload,
            status: "paid",
          }),
        }),
      });

      setProjects((current) =>
        current.map((candidate, index) =>
          candidate.id === activeProject.id
            ? {
                ...mergeProjectRecord(result.project, candidate, {
                  usePrototypeSeed: false,
                  sequence: index + 1,
                }),
                advances: [
                  mapAdvanceRecord(result.advance),
                  ...candidate.advances.filter((advance) => advance.id !== String(result.advance.id)),
                ],
              }
            : candidate,
        ),
      );
      setError(null);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Не удалось добавить аванс");
    }
  }

  async function deleteAdvance(advanceId: string) {
    if (!activeProject) {
      return;
    }

    try {
      const result = await fetchJson<{
        deleted: boolean;
        advance_id: number;
        project: DashboardProjectApiRecord;
      }>(`/api/projects/${activeProject.id}/advances/${advanceId}`, {
        method: "DELETE",
      });

      setProjects((current) =>
        current.map((candidate, index) =>
          candidate.id === activeProject.id
            ? {
                ...mergeProjectRecord(result.project, candidate, {
                  usePrototypeSeed: false,
                  sequence: index + 1,
                }),
                advances: candidate.advances.filter((advance) => advance.id !== advanceId),
              }
            : candidate,
        ),
      );
      setError(null);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Не удалось удалить аванс");
    }
  }

  function completeContractMilestone(milestoneId: string) {
    if (!activeProject) {
      return;
    }

    if (milestoneId === "synthetic:start-after-advance") {
      const startedAt = new Date().toISOString().slice(0, 10);
      const nextContract = {
        ...activeProject.contract,
        startDate: startedAt,
        extractionStatus: "verified" as const,
      };

      updateSelectedProject((current) => ({
        ...current,
        contract: nextContract,
      }));

      void (async () => {
        try {
          const result = await fetchJson<DashboardProjectContractApiRecord>(`/api/projects/${activeProject.id}/contract`, {
            method: "PUT",
            body: JSON.stringify(buildProjectContractPayload(nextContract)),
          });
          setProjects((current) => mergeProjectContract(current, activeProject.id, result));
          setError(null);
        } catch (completeError) {
          setError(completeError instanceof Error ? completeError.message : "Не удалось зафиксировать старт работ");
          await loadProjectContract(activeProject.id);
        }
      })();
      return;
    }

    updateSelectedProject((current) => ({
      ...current,
      contract: {
        ...current.contract,
        extractionStatus: "verified",
        milestones: current.contract.milestones.map((milestone) =>
          milestone.id === milestoneId ? { ...milestone, status: "completed" } : milestone,
        ),
      },
    }));

    if (!/^\d+$/.test(milestoneId)) {
      return;
    }

    void (async () => {
      try {
        const result = await fetchJson<DashboardProjectContractApiRecord>(
          `/api/projects/${activeProject.id}/contract/milestones/${milestoneId}`,
          {
            method: "PATCH",
            body: JSON.stringify({ status: "completed" }),
          },
        );
        setProjects((current) => mergeProjectContract(current, activeProject.id, result));
        setError(null);
      } catch (completeError) {
        setError(completeError instanceof Error ? completeError.message : "Не удалось обновить веху договора");
        await loadProjectContract(activeProject.id);
      }
    })();
  }

  async function extractContract(options?: { suppressUnavailable?: boolean }) {
    if (!activeProject) {
      return;
    }

    setContractSyncState({
      uploading: false,
      extracting: true,
      tone: "info",
      message: "Проверяю договор нейросетью...",
    });

    try {
      const contract = await fetchJson<DashboardProjectContractApiRecord>(`/api/projects/${activeProject.id}/contract/extract`, {
        method: "POST",
      });
      setProjects((current) => mergeProjectContract(current, activeProject.id, contract));
      setError(null);
      setContractSyncState({
        uploading: false,
        extracting: false,
        tone: "success",
        message: "Договор проверен. Поля и вехи обновлены.",
      });
    } catch (extractError) {
      if (options?.suppressUnavailable && extractError instanceof ApiError && extractError.status === 503) {
        setContractSyncState({
          uploading: false,
          extracting: false,
          tone: "info",
          message: "Договор загружен. AI-проверка сейчас недоступна.",
        });
        return;
      }
      setContractSyncState({
        uploading: false,
        extracting: false,
        tone: "error",
        message: extractError instanceof Error ? extractError.message : "Не удалось проверить договор нейросетью",
      });
      setError(extractError instanceof Error ? extractError.message : "Не удалось проверить договор нейросетью");
    }
  }

  async function uploadContract(file: File) {
    if (!activeProject) {
      return;
    }

    setContractSyncState({
      uploading: true,
      extracting: false,
      tone: "info",
      message: "Загружаю договор...",
    });

    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadedContract = await fetchJson<DashboardProjectContractApiRecord>(
        `/api/projects/${activeProject.id}/contract/upload`,
        {
          method: "POST",
          body: formData,
        },
      );
      setProjects((current) => mergeProjectContract(current, activeProject.id, uploadedContract));
      setError(null);
      setContractSyncState({
        uploading: false,
        extracting: true,
        tone: "info",
        message: "Договор загружен. Проверяю нейросетью...",
      });
      await extractContract({ suppressUnavailable: true });
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Не удалось загрузить договор");
      setContractSyncState({
        uploading: false,
        extracting: false,
        tone: "error",
        message: uploadError instanceof Error ? uploadError.message : "Не удалось загрузить договор",
      });
    }
  }

  async function updateContract(nextContract: ProjectCardContract) {
    if (!activeProject) {
      return;
    }

    const projectId = activeProject.id;

    updateSelectedProject((current) => ({
      ...current,
      contract: nextContract,
    }));

    setContractSyncState({
      uploading: false,
      extracting: false,
      tone: "info",
      message: "Сохраняю договор...",
    });

    try {
      const result = await fetchJson<DashboardProjectContractApiRecord>(`/api/projects/${projectId}/contract`, {
        method: "PUT",
        body: JSON.stringify(buildProjectContractPayload(nextContract)),
      });
      setProjects((current) => mergeProjectContract(current, projectId, result));
      setError(null);
      setContractSyncState({
        uploading: false,
        extracting: false,
        tone: "success",
        message: "Договор обновлён.",
      });
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Не удалось обновить договор");
      setContractSyncState({
        uploading: false,
        extracting: false,
        tone: "error",
        message: updateError instanceof Error ? updateError.message : "Не удалось обновить договор",
      });
      await loadProjectContract(projectId);
    }
  }

  async function deleteContract() {
    if (!activeProject) {
      return;
    }

    const projectId = activeProject.id;
    setContractSyncState({
      uploading: false,
      extracting: false,
      tone: "info",
      message: "Удаляю договор...",
    });

    try {
      await fetchJson<{ deleted: boolean; project_id: number }>(`/api/projects/${projectId}/contract`, {
        method: "DELETE",
      });
      setProjects((current) =>
        current.map((candidate) =>
          candidate.id === projectId
            ? {
                ...candidate,
                contract: createEmptyProjectContract(),
              }
            : candidate,
        ),
      );
      setError(null);
      setContractSyncState({
        uploading: false,
        extracting: false,
        tone: "success",
        message: "Договор удалён.",
      });
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Не удалось удалить договор");
      setContractSyncState({
        uploading: false,
        extracting: false,
        tone: "error",
        message: deleteError instanceof Error ? deleteError.message : "Не удалось удалить договор",
      });
      await loadProjectContract(projectId);
    }
  }

  async function addLedgerEntry() {
    if (!activeProject) {
      return;
    }

    const draftEntry = createEmptyLedgerEntry();

    try {
      const result = await fetchJson<{
        entry: DashboardProjectLedgerApiRecord;
        project: DashboardProjectApiRecord;
      }>(`/api/projects/${activeProject.id}/ledger`, {
        method: "POST",
        body: JSON.stringify(buildProjectLedgerPayload(draftEntry)),
      });

      setProjects((current) =>
        current.map((candidate, index) => {
          if (candidate.id !== activeProject.id) {
            return candidate;
          }

          const nextProject = mergeProjectRecord(result.project, candidate, {
            usePrototypeSeed: false,
            sequence: index + 1,
          });
          const nextEntries = [...candidate.ledgerEntries, mapLedgerRecord(result.entry)];
          return applyLedgerEntriesToProject(nextProject, nextEntries);
        }),
      );
      setError(null);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Не удалось добавить строку учета");
    }
  }

  async function deleteLedgerEntry(entryId: string) {
    if (!activeProject) {
      return;
    }

    clearPendingLedgerSync(activeProject.id, entryId);
    const projectId = activeProject.id;

    updateSelectedProjectLedger(
      (entries) => entries.filter((entry) => entry.id !== entryId),
      { recomputeExpenses: true },
    );

    try {
      const result = await fetchJson<{
        deleted: boolean;
        entry_id: number;
        project: DashboardProjectApiRecord;
      }>(`/api/projects/${projectId}/ledger/${entryId}`, {
        method: "DELETE",
      });

      setProjects((current) =>
        current.map((candidate, index) => {
          if (candidate.id !== projectId) {
            return candidate;
          }

          const nextProject = mergeProjectRecord(result.project, candidate, {
            usePrototypeSeed: false,
            sequence: index + 1,
          });
          return applyLedgerEntriesToProject(nextProject, candidate.ledgerEntries);
        }),
      );
      setError(null);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Не удалось удалить строку учета");
      await loadProjects();
    }
  }

  function updateLedgerEntry(entryId: string, patch: Partial<ProjectCardLedgerEntry>) {
    if (!activeProject) {
      return;
    }

    updateSelectedProjectLedger(
      (entries) => entries.map((entry) => (entry.id === entryId ? { ...entry, ...patch } : entry)),
      { recomputeExpenses: true },
    );
    scheduleLedgerEntrySync(activeProject.id, entryId, patch);
  }

  function updateLedgerDocument(
    entryId: string,
    kind: LedgerDocumentKind,
    patch: Partial<ProjectCardLedgerDocument>,
  ) {
    if (!activeProject) {
      return;
    }

    const currentEntry = activeProject.ledgerEntries.find((entry) => entry.id === entryId);
    const currentDocument = currentEntry?.[kind === "invoice" ? "invoiceDocument" : "actDocument"];
    const canSyncWithBackend = Boolean(currentDocument && /^\d+$/.test(currentDocument.id));

    updateSelectedProjectLedger((entries) =>
      entries.map((entry) => {
        if (entry.id !== entryId) {
          return entry;
        }

        const key = kind === "invoice" ? "invoiceDocument" : "actDocument";
        const document = entry[key];
        if (!document) {
          return entry;
        }

        return {
          ...entry,
          [key]: {
            ...document,
            ...patch,
          },
        };
      }),
    );
    if (canSyncWithBackend) {
      scheduleLedgerDocumentSync(activeProject.id, entryId, kind, patch);
    }
  }

  async function uploadLedgerDocument(entryId: string, kind: LedgerDocumentKind, file: File) {
    if (!activeProject) {
      return;
    }

    const projectId = activeProject.id;

    updateSelectedProjectLedger((entries) =>
      entries.map((entry) => {
        if (entry.id !== entryId) {
          return entry;
        }

        const key = kind === "invoice" ? "invoiceDocument" : "actDocument";
        const existingDocument = entry[key];
        const uploadedAt = new Date().toISOString();
        const date = existingDocument?.date ?? uploadedAt.slice(0, 10);
        const amount =
          existingDocument?.amount ??
          (kind === "invoice" ? entry.planAmount : entry.actualAmount > 0 ? entry.actualAmount : entry.planAmount);

        return {
          ...entry,
          [key]: {
            id: existingDocument?.id ?? `${kind}-${entry.id}`,
            kind,
            title: existingDocument?.title ?? (kind === "invoice" ? "Счёт" : "Акт"),
            date,
            amount,
            sourceFile: {
              id: `source-${kind}-${entry.id}-${Date.now()}`,
              fileName: file.name,
              mimeType: file.type || "application/octet-stream",
              uploadedAt,
            },
            extractedByAi: existingDocument?.extractedByAi ?? false,
            verifiedByUser: existingDocument?.verifiedByUser ?? false,
          },
        };
      }),
    );

    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await fetchJson<{
        document: DashboardProjectLedgerDocumentApiRecord;
        entry: DashboardProjectLedgerApiRecord;
      }>(`/api/projects/${projectId}/ledger/${entryId}/documents/${kind}/upload`, {
        method: "POST",
        body: formData,
      });

      setProjects((current) =>
        current.map((candidate) => {
          if (candidate.id !== projectId) {
            return candidate;
          }

          const nextEntries = candidate.ledgerEntries.map((entry) =>
            entry.id === entryId ? mapLedgerRecord(result.entry, entry) : entry,
          );
          return applyLedgerEntriesToProject(candidate, nextEntries);
        }),
      );
      clearPendingLedgerDocumentSync(projectId, entryId, kind);
      setError(null);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Не удалось загрузить документ");
      await loadProjectLedger(projectId);
    }
  }

  function selectProject(projectId: string) {
    setSelectedProjectId(projectId);
  }

  async function addProject() {
    try {
      const createdRecord = await fetchJson<DashboardProjectApiRecord>("/api/projects", {
        method: "POST",
        body: JSON.stringify({}),
      });
      setProjects((current) => [
        ...current,
        mergeProjectRecord(createdRecord, undefined, {
          usePrototypeSeed: false,
          sequence: current.length + 1,
        }),
      ]);
      setSelectedProjectId(String(createdRecord.id));
      setError(null);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Не удалось создать объект");
    }
  }

  async function renameProject(projectId: string, nextCode: string) {
    const normalizedCode = nextCode.trim();
    if (!normalizedCode) {
      return;
    }

    try {
      const updatedRecord = await fetchJson<DashboardProjectApiRecord>(`/api/projects/${projectId}`, {
        method: "PATCH",
        body: JSON.stringify({ code: normalizedCode }),
      });
      setProjects((current) => mergeProjectSummary(current, projectId, updatedRecord));
      setError(null);
    } catch (renameError) {
      setError(renameError instanceof Error ? renameError.message : "Не удалось переименовать объект");
    }
  }

  async function deleteProject(projectId: string) {
    try {
      await fetchJson<{ deleted: boolean; project_id: number }>(`/api/projects/${projectId}`, {
        method: "DELETE",
      });
      setProjects((current) => {
        const nextProjects = current.filter((candidate) => candidate.id !== projectId);
        setSelectedProjectId((currentSelectedId) => {
          if (currentSelectedId !== projectId) {
            return currentSelectedId;
          }
          const removedIndex = current.findIndex((candidate) => candidate.id === projectId);
          const nextSelectedProject = nextProjects[Math.max(0, removedIndex - 1)] ?? nextProjects[0] ?? null;
          return nextSelectedProject?.id ?? null;
        });
        return nextProjects;
      });
      setError(null);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Не удалось удалить объект");
    }
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
