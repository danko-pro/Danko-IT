import { useEffect, useState } from "react";
import { DropdownRoot, DropdownTrigger } from "../../../../shared/controls";
import { formatDisplayDate, formatMoney } from "../../model/project-accounting-format";
import type { ProjectCardLedgerDocument, ProjectCardLedgerStatus } from "../../model/project-model";
import type { LedgerDocumentKind } from "../project-accounting-ledger-config";
import { requiresAct, requiresInvoice } from "../project-accounting-ledger-config";
import {
  ProjectAccountingLedgerBuilderPopover,
  useProjectAccountingLedgerBuilderPopover,
} from "./project-accounting-ledger-builder-popover";
import { parseLedgerAmountInput } from "./project-accounting-ledger-builder-utils";

type ProjectAccountingLedgerDocumentPickerProps = {
  kind: LedgerDocumentKind;
  status: ProjectCardLedgerStatus;
  document: ProjectCardLedgerDocument | null;
  onUpload: (file: File) => void;
  onUpdate: (patch: Partial<ProjectCardLedgerDocument>) => void;
};

type DocumentVisualState = "muted" | "active" | "filled";

const DOCUMENT_COPY: Record<
  LedgerDocumentKind,
  {
    title: string;
    titlePlaceholder: string;
    uploadLabel: string;
    replaceLabel: string;
  }
> = {
  invoice: {
    title: "Счёт",
    titlePlaceholder: "Название счёта",
    uploadLabel: "Загрузить PDF",
    replaceLabel: "Заменить PDF",
  },
  act: {
    title: "Акт",
    titlePlaceholder: "Название акта",
    uploadLabel: "Загрузить PDF",
    replaceLabel: "Заменить PDF",
  },
};

function getDocumentVisualState(
  isAvailable: boolean,
  document: ProjectCardLedgerDocument | null,
): DocumentVisualState {
  if (!isAvailable) {
    return "muted";
  }

  return document ? "filled" : "active";
}

function getDocumentTriggerMeta(
  kind: LedgerDocumentKind,
  visualState: DocumentVisualState,
  document: ProjectCardLedgerDocument | null,
) {
  if (document) {
    return `${formatMoney(document.amount)} · ${formatDisplayDate(document.date)}`;
  }

  if (visualState === "active") {
    return "Нужен PDF";
  }

  return "Можно загрузить заранее";
}

function getDocumentFlagLabel(kind: LedgerDocumentKind, visualState: DocumentVisualState, hasDocument: boolean) {
  if (visualState === "filled" && hasDocument) {
    return "PDF";
  }

  if (visualState === "active") {
    return "Нужен файл";
  }

  return "Не обязателен";
}

export function ProjectAccountingLedgerDocumentPicker(props: ProjectAccountingLedgerDocumentPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [amountDraft, setAmountDraft] = useState(props.document?.amount ? String(props.document.amount) : "");
  const copy = DOCUMENT_COPY[props.kind];
  const isAvailable = props.kind === "invoice" ? requiresInvoice(props.status) : requiresAct(props.status);
  const visualState = getDocumentVisualState(isAvailable, props.document);
  const isInteractive = true;
  const hasDocument = Boolean(props.document);
  const canUpload = true;
  const canEditDocument = hasDocument;
  const triggerTitle = props.document?.title?.trim() || copy.title;
  const triggerMeta = getDocumentTriggerMeta(props.kind, visualState, props.document);
  const flagLabel = getDocumentFlagLabel(props.kind, visualState, hasDocument);
  const popover = useProjectAccountingLedgerBuilderPopover({
    isOpen,
    onClose: () => setIsOpen(false),
    preferredMaxHeight: 430,
    minimumHeight: 220,
    bodyClassName: "dashboard-ledger-document-cloud-body",
    resizable: {
      storageKey: `dashboard-ledger:popover:document:${props.kind}`,
      defaultSize: {
        width: 388,
        height: 332,
      },
      minWidth: 340,
      minHeight: 260,
    },
  });

  useEffect(() => {
    setAmountDraft(props.document?.amount ? String(props.document.amount) : "");
  }, [props.document?.amount]);

  useEffect(() => {
    if (!isInteractive) {
      setIsOpen(false);
    }
  }, [isInteractive]);

  return (
    <DropdownRoot
      rootRef={popover.rootRef}
      open={isOpen}
      className="dashboard-ledger-document-select"
      openClassName="dashboard-ledger-document-select-open"
    >
      <DropdownTrigger
        open={isOpen}
        className={`dashboard-ledger-document-trigger dashboard-ledger-document-trigger-${visualState}`}
        disabled={!isInteractive}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="dashboard-ledger-document-trigger-body">
          <span className="dashboard-ledger-document-trigger-title">{triggerTitle}</span>
          <span className="dashboard-ledger-document-trigger-meta" title={triggerMeta}>
            {triggerMeta}
          </span>
        </span>
        <span className="dashboard-ledger-document-trigger-icon" aria-hidden="true">
          <svg viewBox="0 0 16 16" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.6">
            <path d="M5 2.75h4.8l2.45 2.45V13a1.25 1.25 0 0 1-1.25 1.25H5A1.25 1.25 0 0 1 3.75 13V4A1.25 1.25 0 0 1 5 2.75Z" />
            <path d="M9.75 2.9V5.4H12.2" />
          </svg>
        </span>
      </DropdownTrigger>

      {isOpen ? (
        <ProjectAccountingLedgerBuilderPopover
          popover={popover}
          ariaLabel={copy.title}
          className="dashboard-ledger-document-cloud"
        >
          <div className="dashboard-ledger-document-upload-row">
            <label
              className={
                canUpload
                  ? "dashboard-ledger-document-upload-button"
                  : "dashboard-ledger-document-upload-button dashboard-ledger-document-upload-button-disabled"
              }
            >
              {props.document ? copy.replaceLabel : copy.uploadLabel}
              <input
                type="file"
                accept="application/pdf,.pdf,image/*,.jpg,.jpeg,.png,.webp,.heic,.heif"
                hidden
                disabled={!canUpload}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    props.onUpload(file);
                  }
                  event.target.value = "";
                }}
              />
            </label>

            <div className={`dashboard-ledger-document-flag dashboard-ledger-document-flag-${visualState}`}>{flagLabel}</div>
          </div>

          <div className="dashboard-ledger-document-fields">
            <label className="dashboard-ledger-document-field dashboard-ledger-document-field-wide">
              <span className="dashboard-ledger-document-field-label">Название</span>
              <input
                type="text"
                className="dashboard-ledger-item-input"
                disabled={!canEditDocument}
                value={props.document?.title ?? ""}
                placeholder={copy.titlePlaceholder}
                onChange={(event) => props.onUpdate({ title: event.target.value })}
              />
            </label>

            <label className="dashboard-ledger-document-field">
              <span className="dashboard-ledger-document-field-label">Дата</span>
              <input
                type="date"
                className="dashboard-ledger-item-input"
                disabled={!canEditDocument}
                value={props.document?.date ?? ""}
                onChange={(event) => props.onUpdate({ date: event.target.value })}
              />
            </label>

            <label className="dashboard-ledger-document-field">
              <span className="dashboard-ledger-document-field-label">Сумма</span>
              <div className="dashboard-ledger-document-field-shell">
                <input
                  type="text"
                  inputMode="decimal"
                  className="dashboard-ledger-item-input dashboard-ledger-document-amount-input"
                  disabled={!canEditDocument}
                  value={amountDraft}
                  placeholder="25000"
                  onChange={(event) => setAmountDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      props.onUpdate({ amount: parseLedgerAmountInput(amountDraft) });
                    }
                  }}
                />
                <span className="dashboard-ledger-document-field-suffix">₽</span>
              </div>
            </label>
          </div>

          {props.document ? (
            <div className="dashboard-ledger-document-source">
              <div className="dashboard-ledger-document-source-name" title={props.document.sourceFile.fileName}>
                {props.document.sourceFile.fileName}
              </div>
              <div className="dashboard-ledger-document-source-meta">
                {formatDisplayDate(props.document.date)} · {formatMoney(props.document.amount)}
              </div>
            </div>
          ) : null}
        </ProjectAccountingLedgerBuilderPopover>
      ) : null}
    </DropdownRoot>
  );
}
