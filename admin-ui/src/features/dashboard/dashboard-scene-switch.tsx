import type { ReactNode } from "react";
import type { DashboardSceneView } from "./dashboard-scene-types";

type SceneOption = {
  view: DashboardSceneView;
  label: string;
  icon: ReactNode;
};

const SCENE_OPTIONS: SceneOption[] = [
  {
    view: "overview",
    label: "Карточка объекта",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
        <rect x="4.5" y="5.5" width="15" height="13" rx="2.5" />
        <path d="M8 10.5h8" />
        <path d="M8 14h5.5" />
      </svg>
    ),
  },
  {
    view: "passport",
    label: "Паспорт объекта",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
        <path d="m4.5 11.25 7.5-6 7.5 6" />
        <path d="M6.5 10.75V18.5h11V10.75" />
        <path d="M10 18.5v-4.75h4V18.5" />
      </svg>
    ),
  },
  {
    view: "finance",
    label: "Финансы",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
        <path d="M7 6.5h6.5a3.25 3.25 0 0 1 0 6.5H10.5a3.25 3.25 0 0 0 0 6.5H17" />
        <path d="M12 4.5v15" />
      </svg>
    ),
  },
  {
    view: "accounting",
    label: "Таблица учёта",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
        <rect x="4.5" y="5.5" width="15" height="13" rx="2.5" />
        <path d="M9.5 5.5v13" />
        <path d="M14.5 5.5v13" />
        <path d="M4.5 10h15" />
        <path d="M4.5 14h15" />
      </svg>
    ),
  },
];

export function DashboardSceneSwitch(props: {
  activeView: DashboardSceneView;
  onSelect: (view: DashboardSceneView) => void;
}) {
  return (
    <nav className="dashboard-scene-switch" aria-label="Навигация по экрану объекта">
      {SCENE_OPTIONS.map((option) => {
        const isActive = props.activeView === option.view;
        return (
          <button
            key={option.view}
            type="button"
            className={
              isActive
                ? "dashboard-scene-switch-button dashboard-scene-switch-button-active ui-tooltip-anchor ui-tooltip-center dashboard-scene-switch-button-tooltip"
                : "dashboard-scene-switch-button ui-tooltip-anchor ui-tooltip-center dashboard-scene-switch-button-tooltip"
            }
            data-tooltip={option.label}
            aria-label={option.label}
            onClick={() => props.onSelect(option.view)}
          >
            <span className="dashboard-scene-switch-glyph" aria-hidden="true">
              {option.icon}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
