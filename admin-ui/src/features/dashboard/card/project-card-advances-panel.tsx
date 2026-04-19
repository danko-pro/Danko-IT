/**
 * Shell панели авансов.
 * Компонент держит только каркас панели и связывает state hook со списком и формой.
 */
import type { ProjectCardAdvanceItem } from "../model/project-model";
import { ProjectCardAdvanceForm } from "./project-card-advance-form";
import { ProjectCardAdvanceList } from "./project-card-advance-list";
import { useProjectCardAdvancesPanelState } from "./project-card-advances-panel-state";

export function ProjectCardAdvancesPanel(props: {
  advances: ProjectCardAdvanceItem[];
  onAddAdvance: (payload: { title: string; amount: number; date: string }) => void;
  onDeleteAdvance: (advanceId: string) => void;
}) {
  const state = useProjectCardAdvancesPanelState(props);

  return (
    <section className="dashboard-project-panel dashboard-project-panel-advances">
      <div className="dashboard-project-panel-head">
        <div>
          <div className="eyebrow">Авансы</div>
          <h4 className="dashboard-project-panel-title">Поступления</h4>
        </div>

        <span className="slot-chip">{state.visibleAdvanceCount}</span>
      </div>

      <ProjectCardAdvanceList
        advances={props.advances}
        removingAdvanceIds={state.removingAdvanceIds}
        onRemoveAdvance={state.handleAdvanceRemove}
      />

      <ProjectCardAdvanceForm
        advanceAmount={state.advanceAmount}
        advanceDate={state.advanceDate}
        advanceError={state.advanceError}
        advanceTitle={state.advanceTitle}
        isOpen={state.isAdvanceFormOpen}
        onAmountChange={state.setAdvanceAmount}
        onClose={state.resetAdvanceForm}
        onDateChange={state.setAdvanceDate}
        onSubmit={state.handleAdvanceSubmit}
        onTitleChange={state.setAdvanceTitle}
        onToggle={state.toggleAdvanceForm}
      />
    </section>
  );
}
