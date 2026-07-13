import { useEffect, useState } from "react";
import { publicProjectItems } from "../../public-content";
import { usePublicProjectsShowcase } from "../../hooks/usePublicProjectsShowcase";
import { getProjectImages, getProjectScope, getProjectShortName } from "../projects/publicProjectModel";
import { PublicProjectCasePanel, PublicProjectInfo } from "./PublicProjectCase";
// Готовые кейсы без фотосъёмки показываем через технический паспорт объекта.
const SHOWCASE_PROJECTS = publicProjectItems.filter((project) => getProjectImages(project).length > 0 || getProjectScope(project).length > 0);
export function PublicProjectsSection() {
  const [isCaseOpen, setIsCaseOpen] = useState(false);
  const {
    activeProject,
    activeProjectImages,
    activeProjectImage,
    activeProjectImageIndex,
    activeProjectCounter,
    handleProjectKeyDown,
    handleProjectSelect,
    projectSwitcherButtonRefs,
    setActiveProjectImageIndex,
  } = usePublicProjectsShowcase({ projects: SHOWCASE_PROJECTS });
  const activeIndex = SHOWCASE_PROJECTS.indexOf(activeProject);
  useEffect(() => {
    setIsCaseOpen(false);
  }, [activeProject.name]);
  useEffect(() => {
    if (!isCaseOpen) return undefined;
    const frame = window.requestAnimationFrame(() => {
      const caseElement = document.getElementById("dk-active-case");
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      caseElement?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      caseElement?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isCaseOpen, activeProject.name]);
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

        <div className="dk-projects__layout">
          <div className="dk-switchers" role="tablist" aria-label="Выбор объекта">
            {SHOWCASE_PROJECTS.map((project, index) => (
              <button
                type="button"
                key={project.name}
                id={`dk-project-tab-${index}`}
                ref={(button) => { projectSwitcherButtonRefs.current[index] = button; }}
                role="tab"
                className={`dk-switch${index === activeIndex ? " dk-switch--active" : ""}`}
                onClick={() => handleProjectSelect(index)}
                onKeyDown={(event) => handleProjectKeyDown(event, index)}
                aria-selected={index === activeIndex}
                aria-controls="dk-project-panel"
                tabIndex={index === activeIndex ? 0 : -1}
              >
                <span className="dk-switch__num">{String(index + 1).padStart(2, "0")}</span>
                <span>{getProjectShortName(project)}</span>
              </button>
            ))}
          </div>

          <div className="dk-projects__main" id="dk-project-panel" role="tabpanel" aria-labelledby={`dk-project-tab-${activeIndex}`}>
            <div className="dk-projects__grid">
              <div className="dk-media">
                <div className="dk-media__frame">
                  {activeProjectImage ? (
                    <img
                      key={activeProjectImage.src}
                      className="dk-media__img"
                      src={activeProjectImage.src}
                      alt={activeProjectImage.alt ?? activeProject.name}
                      width={1280} height={932}
                      decoding="async"
                    />
                  ) : (
                    <div className="dk-project-passport" key={`passport-${activeProject.name}`}>
                      <div className="dk-project-passport__grid" aria-hidden="true" />
                      <p>Паспорт проекта</p>
                      <strong>{activeProject.name}</strong>
                      <dl>
                        <div><dt>Площадь</dt><dd>{activeProject.area}</dd></div>
                        <div><dt>Формат</dt><dd>Пакет {activeProject.package}</dd></div>
                        <div><dt>Контур</dt><dd>{activeProject.focus.length} направления</dd></div>
                      </dl>
                      <span>Проектирование · ремонт · комплектация</span>
                    </div>
                  )}
                  <span className="dk-media__badge">
                    <i aria-hidden="true" />
                    Пакет {activeProject.package} · {activeProject.area}
                  </span>
                </div>
                {activeProjectImages.length > 0 ? (
                  <div className="dk-thumbs">
                    {activeProjectImages.map((image, index) => (
                      <button
                        type="button"
                        key={image.src}
                        className={`dk-thumb${index === activeProjectImageIndex ? " dk-thumb--active" : ""}`}
                        onClick={() => setActiveProjectImageIndex(index)}
                        aria-label={`Фото ${index + 1}`}
                        aria-pressed={index === activeProjectImageIndex}
                      >
                        <img src={image.src} alt={image.alt ?? ""} width={1280} height={932} loading="lazy" decoding="async" />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <PublicProjectInfo project={activeProject} isOpen={isCaseOpen} onToggle={() => setIsCaseOpen((current) => !current)} />
            </div>

            <PublicProjectCasePanel project={activeProject} isOpen={isCaseOpen} />
          </div>
        </div>
      </div>
    </section>
  );
}
