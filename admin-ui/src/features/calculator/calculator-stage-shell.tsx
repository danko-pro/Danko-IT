import type { Dispatch, ReactNode, SetStateAction } from "react";

import { Button } from "../../shared/controls";

type CalculatorStageShellProps = {
  className: string;
  eyebrow: string;
  title: string;
  settingsOpen: boolean;
  setSettingsOpen: Dispatch<SetStateAction<boolean>>;
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
    isReady,
    children,
    emptyMessage = DEFAULT_EMPTY_MESSAGE,
  } = props;

  return (
    <section className={`glass-panel p-4 stage-panel ${className}`}>
      <div className="panel-header">
        <div>
          <div className="eyebrow">{eyebrow}</div>
          <h3 className="panel-title">{title}</h3>
        </div>
        <Button
          type="button"
          variant="secondary"
          className={settingsOpen ? "warmfloor-gear warmfloor-gear-active" : "warmfloor-gear"}
          onClick={() => setSettingsOpen((current) => !current)}
        >
          ⚙ Настройки
        </Button>
      </div>

      {isReady ? (
        children
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
          {emptyMessage}
        </div>
      )}
    </section>
  );
}
