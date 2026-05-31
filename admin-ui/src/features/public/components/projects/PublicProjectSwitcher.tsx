import { type RefObject } from "react";

import {
  getProjectShortName,
  type PublicProjectItem,
} from "./publicProjectModel";

type PublicProjectSwitcherProps = {
  projects: PublicProjectItem[];
  activeProjectIndex: number;
  projectSwitcherButtonRefs: RefObject<Array<HTMLButtonElement | null>>;
  handleProjectSelect: (index: number) => void;
};

export function PublicProjectSwitcher({
  projects,
  activeProjectIndex,
  projectSwitcherButtonRefs,
  handleProjectSelect,
}: PublicProjectSwitcherProps) {
  return (
    <div className="public-project-switcher" aria-label="Объекты в расчёте">
      {projects.map((project, index) => {
        const isActive = activeProjectIndex === index;

        return (
          <button
            className={`public-project-switcher-button${isActive ? " public-project-switcher-button-active" : ""}`}
            type="button"
            aria-pressed={isActive}
            key={project.name}
            ref={(element) => {
              projectSwitcherButtonRefs.current[index] = element;
            }}
            onClick={() => handleProjectSelect(index)}
            onFocus={() => handleProjectSelect(index)}
            onMouseEnter={() => handleProjectSelect(index)}
          >
            <span className="public-project-switcher-name">{getProjectShortName(project)}</span>
            <span className="public-project-switcher-meta">
              <strong>{project.area}</strong>
              Пакет {project.package}
            </span>
          </button>
        );
      })}
    </div>
  );
}
