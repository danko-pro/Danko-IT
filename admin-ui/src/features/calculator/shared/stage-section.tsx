import type { ReactNode } from "react";

export function CalculatorStageSectionHeader(props: {
  kicker: ReactNode;
  title: ReactNode;
  note?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="calculator-stage-section-head">
      <div>
        <div className="calculator-stage-section-kicker">{props.kicker}</div>
        <div className="calculator-stage-section-title">{props.title}</div>
      </div>
      {props.note ? <div className="calculator-stage-section-note">{props.note}</div> : null}
      {props.actions ? <div className="calculator-stage-head-actions">{props.actions}</div> : null}
    </div>
  );
}

export function CalculatorStageEmptyState(props: { children: ReactNode; className?: string }) {
  const className = props.className ? `calculator-stage-empty ${props.className}` : "calculator-stage-empty";

  return <div className={className}>{props.children}</div>;
}
