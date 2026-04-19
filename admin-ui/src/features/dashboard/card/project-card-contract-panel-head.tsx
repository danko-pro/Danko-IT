import type { ChangeEventHandler, RefObject } from "react";

import { Button, IconButton } from "../../../shared/controls";
import type { ContractSyncState } from "./project-card-contract-types";

type ProjectCardContractPanelHeadProps = {
  hasUploadedSource: boolean;
  isBusy: boolean;
  isDeleting: boolean;
  isEditing: boolean;
  isExpanded: boolean;
  syncState: ContractSyncState;
  uploadInputRef: RefObject<HTMLInputElement | null>;
  onExtractContract: () => void;
  onToggleEditing: () => void;
  onToggleExpanded: () => void;
  onUploadChange: ChangeEventHandler<HTMLInputElement>;
};

export function ProjectCardContractPanelHead(props: ProjectCardContractPanelHeadProps) {
  return (
    <div className="dashboard-project-panel-head">
      <div>
        <div className="eyebrow">Договор</div>
        <h4 className="dashboard-project-panel-title">Контроль договора</h4>
      </div>

      <div className="dashboard-project-panel-head-actions">
        <div className="dashboard-project-contract-head-actions">
          <Button
            variant="secondary"
            className="dashboard-project-contract-action"
            disabled={props.isBusy}
            onClick={() => props.uploadInputRef.current?.click()}
          >
            {props.syncState.uploading ? "Загружаю..." : "Загрузить договор"}
          </Button>
          <input
            ref={props.uploadInputRef}
            type="file"
            className="dashboard-project-contract-upload-input"
            accept=".pdf,.txt,application/pdf,text/plain"
            onChange={props.onUploadChange}
          />

          <Button
            className="dashboard-project-contract-action"
            disabled={!props.hasUploadedSource || props.isBusy}
            onClick={props.onExtractContract}
            title={
              props.hasUploadedSource
                ? "Проверить договор нейросетью и обновить поля объекта"
                : "Сначала загрузите PDF или TXT договора"
            }
          >
            {props.syncState.extracting ? "Проверяю..." : "Проверить AI"}
          </Button>

          <IconButton
            variant="secondary"
            className="dashboard-project-contract-icon-button"
            onClick={props.onToggleEditing}
            disabled={props.syncState.uploading || props.syncState.extracting || props.isDeleting}
            ariaLabel={props.isEditing ? "Закрыть редактирование договора" : "Редактировать договор"}
            title={props.isEditing ? "Закрыть редактирование договора" : "Редактировать договор"}
          >
            <svg
              viewBox="0 0 24 24"
              className="dashboard-project-contract-icon"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M4 20h4l9.8-9.8a1.7 1.7 0 0 0 0-2.4l-1.6-1.6a1.7 1.7 0 0 0-2.4 0L4 16v4Z" />
              <path d="m12.7 7.3 4 4" />
            </svg>
          </IconButton>
        </div>

        <button
          type="button"
          className={
            props.isExpanded
              ? "dashboard-project-panel-toggle dashboard-project-panel-toggle-open"
              : "dashboard-project-panel-toggle"
          }
          aria-label={props.isExpanded ? "Свернуть блок договора" : "Развернуть блок договора"}
          aria-expanded={props.isExpanded}
          onClick={props.onToggleExpanded}
        >
          <svg viewBox="0 0 24 24" className="dashboard-project-panel-toggle-icon fill-none stroke-current" strokeWidth="1.8">
            <path d="m7 10 5 5 5-5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
