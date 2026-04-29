import type { ReactNode } from "react";

type CalculatorStageRightPanelLayoutProps = {
  panelOpen: boolean;
  main: ReactNode;
  panel: ReactNode;
};

export function CalculatorStageRightPanelLayout(props: CalculatorStageRightPanelLayoutProps) {
  const { panelOpen, main, panel } = props;

  return (
    <div className={panelOpen ? "calculator-stage-split-layout" : "calculator-stage-split-layout calculator-stage-split-layout-collapsed"}>
      <div className="space-y-3">{main}</div>
      <div className={panelOpen ? "calculator-stage-side-shell" : "calculator-stage-side-shell calculator-stage-side-shell-collapsed"}>
        <section className={panelOpen ? "glass-panel p-4 stage-panel calculator-stage-side-panel calculator-stage-side-panel-active" : "glass-panel p-4 stage-panel calculator-stage-side-panel"}>
          {panel}
        </section>
      </div>
    </div>
  );
}
