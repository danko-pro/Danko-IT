import { useEffect, useState } from "react";

import { publicProjectItems } from "../../public-content";
import { usePublicProjectsShowcase } from "../../hooks/usePublicProjectsShowcase";
import {
  getProjectImages,
  getProjectShortName,
} from "../projects/publicProjectModel";
import { PublicProjectCasePanel, PublicProjectInfo } from "./PublicProjectCase";

// Показываем в галерее только объекты, у которых есть фотографии.
const SHOWCASE_PROJECTS = publicProjectItems.filter((project) => getProjectImages(project).length > 0);

export function PublicProjectsSection() {
  const [isCaseOpen, setIsCaseOpen] = useState(false);
  const {
    activeProject,
    activeProjectImages,
    activeProjectImage,
    activeProjectImageIndex,
    activeProjectCounter,
    handleProjectSelect,
    setActiveProjectImageIndex,
  } = usePublicProjectsShowcase({ projects: SHOWCASE_PROJECTS });

  const activeIndex = SHOWCASE_PROJECTS.indexOf(activeProject);

  useEffect(() => {
    setIsCaseOpen(false);
  }, [activeProject.name]);

  return (
    <section className="dk-section dk-section--paper dk-projects dk-reveal" id="projects" aria-labelledby="dk-projects-title">
      <div className="dk-wrap">
        <div className="dk-head">
          <div>
            <p className="dk-section-kicker">Объекты</p>
            <h2 className="dk-section-title" id="dk-projects-title">
              Реальные объекты под ключ
            </h2>
          </div>
          <span className="dk-pill">{activeProjectCounter}</span>
        </div>

        <div className="dk-projects__grid">
          <div className="dk-media">
            <div className="dk-media__frame">
              <img
                key={activeProjectImage?.src}
                className="dk-media__img"
                src={activeProjectImage?.src}
                alt={activeProjectImage?.alt ?? activeProject.name}
              />
              <div className="dk-media__scrim" aria-hidden="true" />
              <span className="dk-media__badge">
                <i aria-hidden="true" />
                Пакет {activeProject.package} · {activeProject.area}
              </span>
            </div>

            <div className="dk-thumbs">
              {activeProjectImages.map((image, index) => (
                <button
                  type="button"
                  key={image.src}
                  className={`dk-thumb${index === activeProjectImageIndex ? " dk-thumb--active" : ""}`}
                  onClick={() => setActiveProjectImageIndex(index)}
                  aria-label={`Фото ${index + 1}`}
                >
                  <img src={image.src} alt={image.alt ?? ""} />
                </button>
              ))}
            </div>
          </div>

          <PublicProjectInfo project={activeProject} isOpen={isCaseOpen} onToggle={() => setIsCaseOpen((current) => !current)} />
        </div>

        <PublicProjectCasePanel project={activeProject} isOpen={isCaseOpen} />

        <div className="dk-switchers">
          {SHOWCASE_PROJECTS.map((project, index) => (
            <button
              type="button"
              key={project.name}
              className={`dk-switch${index === activeIndex ? " dk-switch--active" : ""}`}
              onClick={() => handleProjectSelect(index)}
            >
              <span className="dk-switch__num">{String(index + 1).padStart(2, "0")}</span>
              {getProjectShortName(project)}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
