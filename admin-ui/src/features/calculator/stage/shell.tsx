import type { Dispatch, ReactNode, SetStateAction } from "react";

import { Button } from "../../../shared/controls";

type CalculatorStageShellProps = {
  className: string;
  eyebrow: string;
  title: string;
  settingsOpen?: boolean;
  setSettingsOpen?: Dispatch<SetStateAction<boolean>>;
  actions?: ReactNode;
  isReady: boolean;
  children: ReactNode;
  emptyMessage?: string;
};

const DEFAULT_EMPTY_MESSAGE = "Сначала выберите проект калькулятора.";

export function CalculatorStageShell(props: CalculatorStageShellProps) {
  const {
    className,
    eyebrow,
    title,
    settingsOpen,
    setSettingsOpen,
    actions,
    isReady,
    children,
    emptyMessage = DEFAULT_EMPTY_MESSAGE,
  } = props;

  return (
    <section className={`glass-panel p-4 stage-panel calculator-stage-shell ${className}`}>
      <div className="panel-header calculator-stage-head">
        <div>
          <div className="eyebrow calculator-stage-kicker">{eyebrow}</div>
          <h3 className="panel-title calculator-stage-title">{title}</h3>
        </div>
        <div className="calculator-stage-head-actions">
          {typeof settingsOpen === "boolean" && setSettingsOpen ? (
            <Button
              type="button"
              variant="secondary"
              className={settingsOpen ? "calculator-stage-settings calculator-stage-settings-active" : "calculator-stage-settings"}
              onClick={() => setSettingsOpen((current) => !current)}
            >
              Параметры
            </Button>
          ) : null}
          {actions}
        </div>
      </div>

      {isReady ? (
        children
      ) : (
        <div className="calculator-stage-empty">
          {emptyMessage}
        </div>
      )}
    </section>
  );
}
