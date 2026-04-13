import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import type { ProjectCardLedgerDocument, ProjectCardLedgerStatus } from "../model/project-model";
import { LedgerDocumentKind, requiresAct, requiresInvoice } from "./project-accounting-ledger-config";

export function LedgerField(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`dashboard-ledger-input ${props.className ?? ""}`.trim()} />;
}

export function LedgerSelect(
  props: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode; toneClass?: string },
) {
  return (
    <select
      {...props}
      className={`dashboard-ledger-select ${props.toneClass ?? ""} ${props.className ?? ""}`.trim()}
    >
      {props.children}
    </select>
  );
}

export function DocumentEditorCell(props: {
  kind: LedgerDocumentKind;
  document: ProjectCardLedgerDocument | null;
  status: ProjectCardLedgerStatus;
  onUpload: (file: File) => void;
  onUpdate: (patch: Partial<ProjectCardLedgerDocument>) => void;
}) {
  const isRequired = props.kind === "invoice" ? requiresInvoice(props.status) : requiresAct(props.status);
  const uploadLabel = props.kind === "invoice" ? "счёт" : "акт";

  return (
    <div className="dashboard-ledger-document-editor">
      <LedgerField
        type="text"
        value={props.document?.title ?? ""}
        disabled={!props.document}
        placeholder={props.kind === "invoice" ? "Название счёта" : "Название акта"}
        onChange={(event) => props.onUpdate({ title: event.target.value })}
      />

      <div className="dashboard-ledger-document-actions">
        <label className="dashboard-ledger-upload-button">
          {props.document ? `Заменить ${uploadLabel}` : `Загрузить ${uploadLabel}`}
          <input
            type="file"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                props.onUpload(file);
              }
              event.target.value = "";
            }}
          />
        </label>
      </div>

      {props.document ? (
        <>
          <div
            className={
              isRequired
                ? "dashboard-ledger-document-state dashboard-ledger-document-state-ok"
                : "dashboard-ledger-document-state dashboard-ledger-document-state-soft"
            }
          >
            Исходник
          </div>
          <div className="dashboard-ledger-source-name" title={props.document.sourceFile.fileName}>
            {props.document.sourceFile.fileName}
          </div>
        </>
      ) : (
        <div
          className={
            isRequired
              ? "dashboard-ledger-document-state dashboard-ledger-document-state-missing"
              : "dashboard-ledger-document-state dashboard-ledger-document-state-soft"
          }
        >
          {isRequired ? "Нужен исходник" : "Без исходника"}
        </div>
      )}
    </div>
  );
}
