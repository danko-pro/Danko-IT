import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { downloadFile } from "../../../shared/utils";
import { formatDisplayDate, formatMoney } from "../model/project-accounting-format";
import type { ProjectCardAdvanceItem, ProjectCardContract } from "../model/project-model";
import { SideMetric } from "./project-card-primitives";
import {
  contractMilestoneStatusClass,
  contractMilestoneStatusLabel,
  contractProgressNodeClass,
  contractProgressNodeTooltip,
  contractSignalActionLabel,
  contractSignalDescription,
  contractSignalTitle,
  contractSignalToneClass,
  getContractSummary,
  getContractTimelineMilestones,
} from "./project-card-view";

type ContractSyncState = {
  uploading: boolean;
  extracting: boolean;
  tone: "info" | "success" | "error";
  message: string | null;
};

type ContractDraft = {
  title: string;
  number: string;
  signedAt: string;
  startDate: string;
  plannedEndDate: string;
  amount: string;
  advanceTerms: string;
};

function buildDraft(contract: ProjectCardContract): ContractDraft {
  return {
    title: contract.title,
    number: contract.number,
    signedAt: contract.signedAt,
    startDate: contract.startDate,
    plannedEndDate: contract.plannedEndDate,
    amount: contract.amount > 0 ? String(contract.amount) : "",
    advanceTerms: contract.advanceTerms,
  };
}

function hasContractContent(contract: ProjectCardContract) {
  return Boolean(
    contract.sourceFile ||
      contract.downloadUrl ||
      contract.signedAt ||
      contract.startDate ||
      contract.plannedEndDate ||
      contract.amount > 0 ||
      contract.milestones.length > 0 ||
      (contract.number && contract.number !== "Без номера") ||
      (contract.title && contract.title !== "Договор не загружен"),
  );
}

export function ProjectCardContractPanel(props: {
  contract: ProjectCardContract;
  advances: ProjectCardAdvanceItem[];
  onCompleteContractMilestone: (milestoneId: string) => void;
  onUploadContract: (file: File) => void;
  onExtractContract: () => void;
  onUpdateContract: (contract: ProjectCardContract) => void | Promise<void>;
  onDeleteContract: () => void | Promise<void>;
  syncState: ContractSyncState;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloadingSource, setIsDownloadingSource] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [draft, setDraft] = useState<ContractDraft>(() => buildDraft(props.contract));
  const [syncDisplayMode, setSyncDisplayMode] = useState<"hidden" | "full" | "compact">("hidden");
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const contractSummary = getContractSummary(props.contract, props.advances);
  const timelineMilestones = getContractTimelineMilestones(props.contract, props.advances);
  const extractionChipClass = props.contract.extractionStatus === "verified" ? "stat-chip" : "slot-chip";
  const extractionChipLabel =
    props.contract.extractionStatus === "verified" ? "Проверено" : "AI требует проверки";
  const hasUploadedSource = Boolean(props.contract.sourceFile);
  const hasSavedContract = hasContractContent(props.contract);
  const isBusy = props.syncState.uploading || props.syncState.extracting || isSubmitting || isDeleting;

  useEffect(() => {
    if (!isEditing) {
      setDraft(buildDraft(props.contract));
      setIsDeleteConfirmOpen(false);
    }
  }, [props.contract, isEditing]);

  useEffect(() => {
    if (!props.syncState.message) {
      setSyncDisplayMode("hidden");
      return;
    }

    if (props.syncState.uploading || props.syncState.extracting || props.syncState.tone === "error") {
      setSyncDisplayMode("full");
      return;
    }

    setSyncDisplayMode("full");
    const compactTimer = window.setTimeout(() => setSyncDisplayMode("compact"), 1800);
    const hideTimer = window.setTimeout(() => setSyncDisplayMode("hidden"), 4200);

    return () => {
      window.clearTimeout(compactTimer);
      window.clearTimeout(hideTimer);
    };
  }, [props.syncState]);

  function handleUploadChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    props.onUploadContract(file);
    event.currentTarget.value = "";
  }

  function updateDraft<K extends keyof ContractDraft>(key: K, value: ContractDraft[K]) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleSave() {
    const normalizedAmount = Number(draft.amount.replace(",", "."));
    const nextContract: ProjectCardContract = {
      ...props.contract,
      title: draft.title.trim() || "Договор без названия",
      number: draft.number.trim() || "Без номера",
      signedAt: draft.signedAt.trim(),
      startDate: draft.startDate.trim(),
      plannedEndDate: draft.plannedEndDate.trim(),
      amount: Number.isFinite(normalizedAmount) ? Math.max(0, normalizedAmount) : 0,
      advanceTerms: draft.advanceTerms.trim(),
    };

    setIsSubmitting(true);
    try {
      await props.onUpdateContract(nextContract);
      setIsEditing(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCancelEditing() {
    setDraft(buildDraft(props.contract));
    setIsDeleteConfirmOpen(false);
    setIsEditing(false);
  }

  async function handleDeleteContract() {
    setIsDeleting(true);
    try {
      await props.onDeleteContract();
      setIsDeleteConfirmOpen(false);
      setIsEditing(false);
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleDownloadContractSource() {
    if (!props.contract.downloadUrl) {
      return;
    }

    setIsDownloadingSource(true);
    try {
      await downloadFile(
        props.contract.downloadUrl,
        props.contract.sourceFile?.fileName || props.contract.fileName || "contract",
      );
    } finally {
      setIsDownloadingSource(false);
    }
  }

  return (
    <section className="dashboard-project-panel">
      <div className="dashboard-project-panel-head">
        <div>
          <div className="eyebrow">Договор</div>
          <h4 className="dashboard-project-panel-title">Контроль договора</h4>
        </div>

        <div className="dashboard-project-panel-head-actions">
          <div className="dashboard-project-contract-head-actions">
            <button
              type="button"
              className="secondary-button dashboard-project-contract-action"
              disabled={isBusy}
              onClick={() => uploadInputRef.current?.click()}
            >
              {props.syncState.uploading ? "Загружаю..." : "Загрузить договор"}
            </button>
            <input
              ref={uploadInputRef}
              type="file"
              className="dashboard-project-contract-upload-input"
              accept=".pdf,.txt,application/pdf,text/plain"
              onChange={handleUploadChange}
            />

            <button
              type="button"
              className="action-button dashboard-project-contract-action"
              disabled={!hasUploadedSource || isBusy}
              onClick={props.onExtractContract}
              title={
                hasUploadedSource
                  ? "Проверить договор нейросетью и обновить поля объекта"
                  : "Сначала загрузите PDF или TXT договора"
              }
            >
              {props.syncState.extracting ? "Проверяю..." : "Проверить AI"}
            </button>

            <button
              type="button"
              className="secondary-button dashboard-project-contract-icon-button"
              onClick={() => setIsEditing((current) => !current)}
              disabled={props.syncState.uploading || props.syncState.extracting || isDeleting}
              aria-label={isEditing ? "Закрыть редактирование договора" : "Редактировать договор"}
              title={isEditing ? "Закрыть редактирование договора" : "Редактировать договор"}
            >
              <svg viewBox="0 0 24 24" className="dashboard-project-contract-icon" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 20h4l9.8-9.8a1.7 1.7 0 0 0 0-2.4l-1.6-1.6a1.7 1.7 0 0 0-2.4 0L4 16v4Z" />
                <path d="m12.7 7.3 4 4" />
              </svg>
            </button>
          </div>

          <button
            type="button"
            className={
              isExpanded
                ? "dashboard-project-panel-toggle dashboard-project-panel-toggle-open"
                : "dashboard-project-panel-toggle"
            }
            aria-label={isExpanded ? "Свернуть блок договора" : "Развернуть блок договора"}
            aria-expanded={isExpanded}
            onClick={() => setIsExpanded((current) => !current)}
          >
            <svg viewBox="0 0 24 24" className="dashboard-project-panel-toggle-icon fill-none stroke-current" strokeWidth="1.8">
              <path d="m7 10 5 5 5-5" />
            </svg>
          </button>
        </div>
      </div>

      <div
        className={
          isExpanded
            ? "dashboard-project-contract-collapsed-shell"
            : "dashboard-project-contract-collapsed-shell dashboard-project-contract-collapsed-shell-visible"
        }
      >
        <div className="dashboard-project-contract-collapsed-shell-inner">
          <div className="dashboard-project-contract-progress">
            <div className="dashboard-project-contract-progress-track" />
            <div
              className="dashboard-project-contract-progress-fill"
              style={{ width: `${contractSummary.progressPercent}%` }}
              aria-hidden="true"
            >
              <div className="dashboard-project-contract-progress-arrow" />
            </div>
            <div className="dashboard-project-contract-progress-nodes">
              {timelineMilestones.map((milestone, milestoneIndex) => (
                <button
                  key={milestone.id}
                  type="button"
                  className={`${contractProgressNodeClass(
                    milestone,
                    contractSummary.activeMilestone?.id === milestone.id,
                  )} ui-tooltip-anchor ${
                    milestoneIndex === 0
                      ? "ui-tooltip-start"
                      : milestoneIndex >= timelineMilestones.length - 2
                        ? "ui-tooltip-end"
                        : "ui-tooltip-center"
                  }`}
                  data-tooltip={contractProgressNodeTooltip(milestone)}
                  aria-label={contractProgressNodeTooltip(milestone)}
                  onClick={() => setIsExpanded(true)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div
        className={
          isExpanded
            ? "dashboard-project-contract-body-shell dashboard-project-contract-body-shell-open"
            : "dashboard-project-contract-body-shell"
        }
      >
        <div className="dashboard-project-contract-body-shell-inner">
          <div className="dashboard-project-contract">
            {props.syncState.message && syncDisplayMode !== "hidden" ? (
              syncDisplayMode === "compact" ? (
                <div className="dashboard-project-contract-sync-compact-row">
                  <span
                    className={`dashboard-project-contract-sync-compact dashboard-project-contract-sync-compact-${props.syncState.tone}`}
                  >
                    {props.syncState.tone === "success"
                      ? "AI проверен"
                      : props.syncState.tone === "error"
                        ? "Ошибка AI"
                        : "AI статус"}
                  </span>
                </div>
              ) : (
                <div className={`dashboard-project-contract-sync dashboard-project-contract-sync-${props.syncState.tone}`}>
                  {props.syncState.message}
                </div>
              )
            ) : null}

            <div
              className={
                isEditing
                  ? "dashboard-project-contract-editor-shell dashboard-project-contract-editor-shell-open"
                  : "dashboard-project-contract-editor-shell"
              }
            >
              <div className="dashboard-project-contract-editor-shell-inner">
                <div className="dashboard-project-contract-editor">
                <div className="dashboard-project-contract-editor-grid">
                  <label className="dashboard-project-contract-editor-field">
                    <span className="dashboard-project-contract-editor-label">Название договора</span>
                    <input
                      type="text"
                      className="dashboard-project-contract-editor-input"
                      value={draft.title}
                      onChange={(event) => updateDraft("title", event.target.value)}
                      disabled={isBusy}
                    />
                  </label>

                  <label className="dashboard-project-contract-editor-field">
                    <span className="dashboard-project-contract-editor-label">Номер</span>
                    <input
                      type="text"
                      className="dashboard-project-contract-editor-input"
                      value={draft.number}
                      onChange={(event) => updateDraft("number", event.target.value)}
                      disabled={isBusy}
                    />
                  </label>

                  <label className="dashboard-project-contract-editor-field">
                    <span className="dashboard-project-contract-editor-label">Подписан</span>
                    <input
                      type="date"
                      className="dashboard-project-contract-editor-input"
                      value={draft.signedAt}
                      onChange={(event) => updateDraft("signedAt", event.target.value)}
                      disabled={isBusy}
                    />
                  </label>

                  <label className="dashboard-project-contract-editor-field">
                    <span className="dashboard-project-contract-editor-label">Старт</span>
                    <input
                      type="date"
                      className="dashboard-project-contract-editor-input"
                      value={draft.startDate}
                      onChange={(event) => updateDraft("startDate", event.target.value)}
                      disabled={isBusy}
                    />
                  </label>

                  <label className="dashboard-project-contract-editor-field">
                    <span className="dashboard-project-contract-editor-label">План завершения</span>
                    <input
                      type="date"
                      className="dashboard-project-contract-editor-input"
                      value={draft.plannedEndDate}
                      onChange={(event) => updateDraft("plannedEndDate", event.target.value)}
                      disabled={isBusy}
                    />
                  </label>

                  <label className="dashboard-project-contract-editor-field">
                    <span className="dashboard-project-contract-editor-label">Сумма</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      className="dashboard-project-contract-editor-input"
                      value={draft.amount}
                      onChange={(event) => updateDraft("amount", event.target.value)}
                      disabled={isBusy}
                    />
                  </label>

                  <label className="dashboard-project-contract-editor-field dashboard-project-contract-editor-field-wide">
                    <span className="dashboard-project-contract-editor-label">Условия оплаты</span>
                    <textarea
                      className="dashboard-project-contract-editor-textarea"
                      value={draft.advanceTerms}
                      onChange={(event) => updateDraft("advanceTerms", event.target.value)}
                      disabled={isBusy}
                      rows={4}
                    />
                  </label>
                </div>

                <div className="dashboard-project-contract-editor-actions">
                  <div className="dashboard-project-contract-editor-actions-main">
                    <button type="button" className="action-button" onClick={() => void handleSave()} disabled={isBusy}>
                      {isSubmitting ? "Сохраняю..." : "Сохранить"}
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={handleCancelEditing}
                      disabled={isBusy}
                    >
                      Отмена
                    </button>
                  </div>

                  {hasSavedContract ? (
                    <div className="dashboard-project-contract-delete-zone">
                      {isDeleteConfirmOpen ? (
                        <div className="dashboard-project-contract-delete-confirm">
                          <div className="dashboard-project-contract-delete-confirm-text">
                            Удалить договор и связанные вехи?
                          </div>
                          <div className="dashboard-project-contract-delete-confirm-actions">
                            <button
                              type="button"
                              className="dashboard-project-contract-danger-button"
                              onClick={() => void handleDeleteContract()}
                              disabled={isBusy}
                            >
                              {isDeleting ? "Удаляю..." : "Удалить"}
                            </button>
                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() => setIsDeleteConfirmOpen(false)}
                              disabled={isBusy}
                            >
                              Отмена
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="dashboard-project-contract-delete-trigger"
                          onClick={() => setIsDeleteConfirmOpen(true)}
                          disabled={isBusy}
                        >
                          Удалить договор
                        </button>
                      )}
                    </div>
                  ) : null}
                </div>
                </div>
              </div>
            </div>

            <div className="dashboard-project-contract-hero">
              <div className="dashboard-project-contract-file">{props.contract.fileName}</div>
              <div className="dashboard-project-contract-title-row">
                <div className="dashboard-project-contract-title">{props.contract.title}</div>
                <span className={extractionChipClass}>{extractionChipLabel}</span>
              </div>
              <div className="dashboard-project-contract-number">{props.contract.number}</div>

              {props.contract.sourceFile ? (
                <div className="dashboard-project-contract-source-row">
                  <div className="dashboard-project-contract-source-name">{props.contract.sourceFile.fileName}</div>
                  {props.contract.downloadUrl ? (
                    <button
                      type="button"
                      className="slot-chip"
                      onClick={() => void handleDownloadContractSource()}
                      disabled={isDownloadingSource}
                    >
                      Скачать исходник
                    </button>
                  ) : null}
                </div>
              ) : (
                <div className="dashboard-project-contract-source-note">
                  Загрузите PDF или TXT, чтобы нейросеть прочитала договор и заполнила даты, сумму и вехи.
                </div>
              )}
            </div>

            <div className="dashboard-project-contract-grid">
              <SideMetric label="Подписан" value={formatDisplayDate(props.contract.signedAt)} />
              <SideMetric label="Старт" value={formatDisplayDate(props.contract.startDate)} />
              <SideMetric label="План завершения" value={formatDisplayDate(props.contract.plannedEndDate)} />
              <SideMetric label="Сумма" value={formatMoney(props.contract.amount)} />
            </div>

            <div className="dashboard-project-contract-terms">
              <div className="eyebrow">Условия оплаты</div>
              <div className="dashboard-project-contract-terms-text">{props.contract.advanceTerms}</div>
            </div>

            <div className={contractSignalToneClass(contractSummary.activeMilestone)}>
              <div className="dashboard-project-contract-signal-head">
                <div>
                  <div className="eyebrow">Ближайшее действие</div>
                  <div className="dashboard-project-contract-signal-title">
                    {contractSignalTitle(contractSummary.activeMilestone)}
                  </div>
                </div>

                {contractSummary.activeMilestone ? (
                  <span className={contractMilestoneStatusClass(contractSummary.activeMilestone.status)}>
                    {contractMilestoneStatusLabel(contractSummary.activeMilestone.status)}
                  </span>
                ) : (
                  <span className="dashboard-project-contract-chip dashboard-project-contract-chip-completed">
                    Под контролем
                  </span>
                )}
              </div>

              <div className="dashboard-project-contract-signal-text">
                {contractSignalDescription(contractSummary.activeMilestone)}
              </div>

              {contractSummary.activeMilestone ? (
                <div className="dashboard-project-contract-signal-actions">
                  <span className="slot-chip">{formatDisplayDate(contractSummary.activeMilestone.plannedDate)}</span>
                  <button
                    type="button"
                    className="action-button"
                    onClick={() => props.onCompleteContractMilestone(contractSummary.activeMilestone!.id)}
                  >
                    {contractSignalActionLabel(contractSummary.activeMilestone)}
                  </button>
                </div>
              ) : null}
            </div>

            <div className="dashboard-project-contract-milestones">
              <div className="eyebrow">График вех</div>
              <div className="dashboard-project-contract-milestones-list">
                {timelineMilestones.map((milestone) => (
                  <div key={milestone.id} className="dashboard-project-contract-milestone-row">
                    <div className="dashboard-project-contract-milestone-main">
                      <div className="dashboard-project-contract-milestone-title">{milestone.title}</div>
                      <div className="dashboard-project-contract-milestone-note">
                        {milestone.note ?? "Без дополнительного комментария"}
                      </div>
                    </div>

                    <div className="dashboard-project-contract-milestone-meta">
                      {typeof milestone.amount === "number" ? (
                        <div className="dashboard-project-contract-milestone-amount">{formatMoney(milestone.amount)}</div>
                      ) : null}
                      <div className="dashboard-project-contract-milestone-date">
                        {formatDisplayDate(milestone.plannedDate)}
                      </div>
                      <span className={contractMilestoneStatusClass(milestone.status)}>
                        {contractMilestoneStatusLabel(milestone.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
