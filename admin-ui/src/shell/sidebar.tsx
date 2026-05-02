import type { CalculatorProject } from "../features/calculator";
import { navigation, type NavigationScreenKey } from "./navigation";

export function AppShellSidebar(props: {
  screen: NavigationScreenKey | "editor";
  calculatorProjects: CalculatorProject[];
  selectedCalculatorProjectId: number | null;
  calculatorLoading: boolean;
  onScreenSelect: (screen: NavigationScreenKey) => void;
  onSelectCalculatorProject: (projectId: number) => void;
  onClearSuccessMessage: () => void;
  onQuickCreateCalculatorProject: () => void;
}) {
  return (
    <aside className="glass-panel flex flex-col overflow-hidden px-4 py-4 text-slate-100">
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <img
            src="/danko-it-logo.png"
            alt="Данко IT"
            className="h-12 w-12 rounded-[16px] border border-[#07f8c6]/18 object-cover shadow-[0_12px_28px_rgba(0,0,0,0.18)]"
          />
          <div className="min-w-0">
            <div className="text-[1.22rem] font-semibold tracking-[-0.03em] text-slate-50">Данко IT</div>
            <div className="eyebrow mt-1">Среда управления проектом</div>
          </div>
        </div>

        <nav className="space-y-2">
          {navigation.map((item) => {
            const active = props.screen === item.key;
            const isCalculator = item.key === "calculator";

            return (
              <div key={item.key} className="space-y-1.5">
                <button
                  type="button"
                  title={item.note}
                  data-testid={`nav-${item.key}`}
                  className={active ? "nav-button nav-button-active" : "nav-button"}
                  onClick={() => props.onScreenSelect(item.key)}
                >
                  <span className="text-[13px] font-semibold">{item.label}</span>
                </button>

                {isCalculator && active ? (
                  <div className="calculator-nav-panel">
                    <div className="calculator-nav-list">
                      {props.calculatorProjects.map((project) => {
                        const projectActive = props.selectedCalculatorProjectId === project.id;

                        return (
                          <button
                            key={project.id}
                            type="button"
                            data-testid={`calculator-project-${project.id}`}
                            className={projectActive ? "calculator-nav-item calculator-nav-item-active" : "calculator-nav-item"}
                            onClick={() => {
                              props.onSelectCalculatorProject(project.id);
                              props.onClearSuccessMessage();
                            }}
                          >
                            <span className="truncate">{project.name}</span>
                            <span className="calculator-nav-id">#{project.id}</span>
                          </button>
                        );
                      })}

                      {!props.calculatorLoading && !props.calculatorProjects.length ? (
                        <div className="calculator-nav-empty">Пока нет объектов</div>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      className="calculator-nav-add"
                      onClick={props.onQuickCreateCalculatorProject}
                      title="Добавить объект"
                    >
                      +
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
