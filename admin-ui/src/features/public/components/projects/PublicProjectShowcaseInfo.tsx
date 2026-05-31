import { type RefObject } from "react";

import {
  getProjectSubtitle,
  type PublicProjectItem,
} from "./publicProjectModel";

type PublicProjectShowcaseInfoProps = {
  activeProject: PublicProjectItem;
  activeProjectCounter: string;
  activeProjectMapUrl: string | undefined;
  projectTitleRef: RefObject<HTMLHeadingElement | null>;
};

export function PublicProjectShowcaseInfo({
  activeProject,
  activeProjectCounter,
  activeProjectMapUrl,
  projectTitleRef,
}: PublicProjectShowcaseInfoProps) {
  return (
    <article className="public-project-showcase-info">
      <div className="public-project-showcase-topline">
        <span>{activeProjectCounter}</span>
        <span>Пакет {activeProject.package}</span>
      </div>

      <div className="public-project-showcase-title">
        <h4 ref={projectTitleRef}>{activeProject.name}</h4>
        <p>{getProjectSubtitle(activeProject)}</p>
      </div>

      <div
        className={`public-project-showcase-meta${
          activeProjectMapUrl ? " public-project-showcase-meta-has-map" : ""
        }`}
        aria-label="Параметры объекта"
      >
        <span>
          <strong>{activeProject.area}</strong>
          площадь
        </span>
        {activeProjectMapUrl ? (
          <span className="public-project-map-card">
            <span>локация</span>
            <a
              className="public-project-map-link"
              href={activeProjectMapUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={`Открыть объект ${activeProject.name} на карте`}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M12 21s7-5.2 7-11.4A7 7 0 0 0 5 9.6C5 15.8 12 21 12 21Z" />
                <circle cx="12" cy="9.7" r="2.2" />
              </svg>
              карта
            </a>
          </span>
        ) : (
          <span>
            <strong>{activeProject.focus.length}</strong>
            блока в смете
          </span>
        )}
      </div>

      <div className="public-project-showcase-tags" aria-label="Состав работ">
        {activeProject.focus.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>

      <a className="public-project-showcase-action" href="/estimate">
        Собрать комплектацию
      </a>
    </article>
  );
}
