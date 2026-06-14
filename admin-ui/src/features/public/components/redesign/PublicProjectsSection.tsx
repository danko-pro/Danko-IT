import { publicProjectItems } from "../../public-content";
import { usePublicProjectsShowcase } from "../../hooks/usePublicProjectsShowcase";
import {
  getProjectImages,
  getProjectScope,
  getProjectShortName,
  getProjectSubtitle,
  type PublicProjectItem,
} from "../projects/publicProjectModel";

// Показываем в галерее только объекты, у которых есть фотографии.
const SHOWCASE_PROJECTS = publicProjectItems.filter((project) => getProjectImages(project).length > 0);

function buildScopeText(project: PublicProjectItem): string {
  const scope = getProjectScope(project);

  if (scope.length > 0) {
    return scope
      .flatMap((group) => group.items)
      .slice(0, 6)
      .join(" · ");
  }

  return `Ремонт под ключ: дизайн, отделка и комплектация под задачу объекта (${project.type}).`;
}

export function PublicProjectsSection() {
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

          <aside className="dk-proj-info">
            <h3 className="dk-proj-info__title">{activeProject.name}</h3>
            <p className="dk-proj-info__loc">{getProjectSubtitle(activeProject)}</p>

            <div className="dk-chips">
              <span className="dk-chip dk-chip--area">{activeProject.area}</span>
              <span className="dk-chip dk-chip--pkg">Пакет {activeProject.package}</span>
              <span className="dk-chip dk-chip--type">{activeProject.type}</span>
            </div>

            <p className="dk-proj-info__scope">{buildScopeText(activeProject)}</p>

            <a className="dk-btn dk-btn--green dk-proj-info__cta" href="#contacts">
              Обсудить похожий проект
            </a>
          </aside>
        </div>

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
