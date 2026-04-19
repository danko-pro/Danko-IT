/**
 * Shell contract-панели.
 * Компонент держит только общий каркас и сводит вместе локальный state hook,
 * head-блок, collapsed preview, editor и read-only content.
 */
import { ProjectCardContractCollapsedProgress } from "./project-card-contract-collapsed-progress";
import { ProjectCardContractContent } from "./project-card-contract-content";
import { ProjectCardContractEditor } from "./project-card-contract-editor";
import { ProjectCardContractPanelHead } from "./project-card-contract-panel-head";
import { useProjectCardContractPanelState } from "./project-card-contract-panel-state";
import type { ContractSyncState, ProjectCardContractPanelProps } from "./project-card-contract-types";

function getCompactSyncLabel(tone: ContractSyncState["tone"]) {
  if (tone === "success") {
    return "AI проверен";
  }

  if (tone === "error") {
    return "Ошибка AI";
  }

  return "AI статус";
}

export function ProjectCardContractPanel(props: ProjectCardContractPanelProps) {
  const state = useProjectCardContractPanelState(props);

  return (
    <section className="dashboard-project-panel">
      <ProjectCardContractPanelHead
        hasUploadedSource={state.hasUploadedSource}
        isBusy={state.isBusy}
        isDeleting={state.isDeleting}
        isEditing={state.isEditing}
        isExpanded={state.isExpanded}
        syncState={props.syncState}
        uploadInputRef={state.uploadInputRef}
        onExtractContract={props.onExtractContract}
        onToggleEditing={state.toggleEditing}
        onToggleExpanded={state.toggleExpanded}
        onUploadChange={state.handleUploadChange}
      />

      <ProjectCardContractCollapsedProgress
        contractSummary={state.contractSummary}
        isExpanded={state.isExpanded}
        timelineMilestones={state.timelineMilestones}
        onExpandPanel={state.expandPanel}
      />

      <div
        className={
          state.isExpanded
            ? "dashboard-project-contract-body-shell dashboard-project-contract-body-shell-open"
            : "dashboard-project-contract-body-shell"
        }
      >
        <div className="dashboard-project-contract-body-shell-inner">
          <div className="dashboard-project-contract">
            {props.syncState.message && state.syncDisplayMode !== "hidden" ? (
              state.syncDisplayMode === "compact" ? (
                <div className="dashboard-project-contract-sync-compact-row">
                  <span
                    className={`dashboard-project-contract-sync-compact dashboard-project-contract-sync-compact-${props.syncState.tone}`}
                  >
                    {getCompactSyncLabel(props.syncState.tone)}
                  </span>
                </div>
              ) : (
                <div className={`dashboard-project-contract-sync dashboard-project-contract-sync-${props.syncState.tone}`}>
                  {props.syncState.message}
                </div>
              )
            ) : null}

            <ProjectCardContractEditor
              draft={state.draft}
              hasSavedContract={state.hasSavedContract}
              isBusy={state.isBusy}
              isDeleteConfirmOpen={state.isDeleteConfirmOpen}
              isDeleting={state.isDeleting}
              isOpen={state.isEditing}
              isSubmitting={state.isSubmitting}
              onCancel={state.handleCancelEditing}
              onCloseDeleteConfirm={state.closeDeleteConfirm}
              onDelete={() => void state.handleDeleteContract()}
              onDraftChange={state.updateDraft}
              onOpenDeleteConfirm={state.openDeleteConfirm}
              onSave={() => void state.handleSave()}
            />

            <ProjectCardContractContent
              contract={props.contract}
              contractSummary={state.contractSummary}
              extractionChipClass={state.extractionChipClass}
              extractionChipLabel={state.extractionChipLabel}
              isDownloadingSource={state.isDownloadingSource}
              onCompleteContractMilestone={props.onCompleteContractMilestone}
              onDownloadContractSource={() => void state.handleDownloadContractSource()}
              timelineMilestones={state.timelineMilestones}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
