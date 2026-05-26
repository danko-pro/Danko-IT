import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { publicProjectItems } from "../public-content";

type PublicProjectItem = (typeof publicProjectItems)[number];
type PublicProjectImage = {
  src: string;
  alt?: string;
};
type PublicProjectScopeGroup = {
  title: string;
  items: string[];
};

type PublicProjectWithDetails = PublicProjectItem & {
  imageAlt?: string;
  imageSrc?: string;
  images?: PublicProjectImage[];
  location?: string;
  mapUrl?: string;
  scope?: PublicProjectScopeGroup[];
  shortName?: string;
};

function getProjectImages(project: PublicProjectItem) {
  const projectWithDetails = project as PublicProjectWithDetails;

  if (Array.isArray(projectWithDetails.images) && projectWithDetails.images.length > 0) {
    return projectWithDetails.images.filter((image) => typeof image.src === "string" && image.src.length > 0);
  }

  if (typeof projectWithDetails.imageSrc === "string" && projectWithDetails.imageSrc.length > 0) {
    return [{ src: projectWithDetails.imageSrc, alt: projectWithDetails.imageAlt }];
  }

  return [];
}

function getProjectShortName(project: PublicProjectItem) {
  const shortName = (project as PublicProjectWithDetails).shortName;

  return typeof shortName === "string" && shortName.length > 0 ? shortName : project.name;
}

function getProjectSubtitle(project: PublicProjectItem) {
  const location = (project as PublicProjectWithDetails).location;

  return typeof location === "string" && location.length > 0 ? location : project.type;
}

function getProjectScope(project: PublicProjectItem) {
  const scope = (project as PublicProjectWithDetails).scope;

  return Array.isArray(scope) ? scope.filter((group) => group.items.length > 0) : [];
}

function getProjectMapUrl(project: PublicProjectItem) {
  const mapUrl = (project as PublicProjectWithDetails).mapUrl;

  return typeof mapUrl === "string" && mapUrl.length > 0 ? mapUrl : undefined;
}

export function PublicProjectsSection() {
  const [activeProjectIndex, setActiveProjectIndex] = useState(0);
  const [activeProjectImageIndex, setActiveProjectImageIndex] = useState(0);
  const projectSwitcherButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const projectTitleRef = useRef<HTMLHeadingElement | null>(null);
  const activeProject = publicProjectItems[activeProjectIndex] ?? publicProjectItems[0];
  const activeProjectImages = getProjectImages(activeProject);
  const activeProjectImage = activeProjectImages[activeProjectImageIndex] ?? activeProjectImages[0];
  const activeProjectScope = getProjectScope(activeProject);
  const activeProjectMapUrl = getProjectMapUrl(activeProject);
  const isProjectScopeOpen = activeProjectScope.length > 0;
  const [renderedProjectScope, setRenderedProjectScope] = useState(activeProjectScope);
  const projectScopeToRender = isProjectScopeOpen ? activeProjectScope : renderedProjectScope;
  const activeProjectCounter = `${String(activeProjectIndex + 1).padStart(2, "0")} / ${String(
    publicProjectItems.length,
  ).padStart(2, "0")}`;

  useEffect(() => {
    if (activeProjectScope.length > 0) {
      setRenderedProjectScope(activeProjectScope);
    }
  }, [activeProjectIndex]);

  useEffect(() => {
    projectSwitcherButtonRefs.current[activeProjectIndex]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [activeProjectIndex]);

  useLayoutEffect(() => {
    const title = projectTitleRef.current;

    if (!title) {
      return undefined;
    }

    const fitTitle = () => {
      const maxFontSize = Number.parseFloat(getComputedStyle(title).getPropertyValue("--public-project-title-max"));
      const minFontSize = Number.parseFloat(getComputedStyle(title).getPropertyValue("--public-project-title-min"));
      const titleParentWidth = title.parentElement?.clientWidth ?? title.clientWidth;

      if (!Number.isFinite(maxFontSize) || !Number.isFinite(minFontSize) || titleParentWidth <= 0) {
        return;
      }

      title.style.fontSize = `${maxFontSize}px`;

      if (title.scrollWidth <= titleParentWidth) {
        return;
      }

      let low = minFontSize;
      let high = maxFontSize;

      for (let step = 0; step < 8; step += 1) {
        const middle = (low + high) / 2;

        title.style.fontSize = `${middle}px`;

        if (title.scrollWidth <= titleParentWidth) {
          low = middle;
        } else {
          high = middle;
        }
      }

      title.style.fontSize = `${low}px`;
    };

    fitTitle();

    const resizeObserver = new ResizeObserver(fitTitle);
    resizeObserver.observe(title);

    if (title.parentElement) {
      resizeObserver.observe(title.parentElement);
    }

    const mutationObserver = new MutationObserver(fitTitle);
    mutationObserver.observe(title, {
      characterData: true,
      childList: true,
      subtree: true,
    });

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [activeProject.name]);

  const handleProjectSelect = (index: number) => {
    setActiveProjectIndex(index);
    setActiveProjectImageIndex(0);
  };

  return (
    <div className="public-projects-sample">
      <div className="public-projects-subhead">
        <p className="public-section-kicker">Объекты</p>
        <h3>Объекты в расчёте</h3>
      </div>

      <div className="public-project-showcase">
        <div
          className={`public-project-showcase-media${activeProjectImage ? " public-project-showcase-media-has-image" : ""}`}
          data-package={activeProject.package}
        >
          {activeProjectImage ? (
            <img
              key={activeProjectImage.src}
              className="public-project-showcase-image"
              src={activeProjectImage.src}
              alt={activeProjectImage.alt ?? `Фото или рендер объекта ${activeProject.name}`}
              loading="lazy"
            />
          ) : (
            <div className="public-project-showcase-placeholder" aria-hidden="true">
              <span className="public-project-placeholder-room public-project-placeholder-room-main" />
              <span className="public-project-placeholder-room public-project-placeholder-room-side" />
              <span className="public-project-placeholder-room public-project-placeholder-room-small" />
              <span className="public-project-placeholder-line public-project-placeholder-line-a" />
              <span className="public-project-placeholder-line public-project-placeholder-line-b" />
              <span className="public-project-placeholder-line public-project-placeholder-line-c" />
            </div>
          )}

          {activeProjectImages.length > 1 && (
            <div className="public-project-gallery-controls" aria-label={`Рендеры объекта ${activeProject.name}`}>
              {activeProjectImages.map((image, index) => (
                <button
                  className={`public-project-gallery-button${
                    activeProjectImageIndex === index ? " public-project-gallery-button-active" : ""
                  }`}
                  type="button"
                  aria-label={`Показать рендер ${index + 1}`}
                  aria-pressed={activeProjectImageIndex === index}
                  key={image.src}
                  onClick={() => setActiveProjectImageIndex(index)}
                  onFocus={() => setActiveProjectImageIndex(index)}
                  onMouseEnter={() => setActiveProjectImageIndex(index)}
                >
                  <img src={image.src} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          )}

          <div className="public-project-showcase-media-meta">
            <span>{getProjectShortName(activeProject)}</span>
            <strong>Пакет {activeProject.package}</strong>
          </div>
        </div>

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
      </div>

      <div className="public-project-switcher" aria-label="Объекты в расчёте">
        {publicProjectItems.map((project, index) => {
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

      <div
        className={`public-project-scope${isProjectScopeOpen ? " public-project-scope-open" : ""}`}
        aria-hidden={!isProjectScopeOpen}
        aria-label={`Состав работ: ${activeProject.name}`}
      >
        <div className="public-project-scope-inner">
          <div className="public-project-scope-head">
            <span>Состав работ и комплектации</span>
            <strong>под ключ</strong>
          </div>

          <div className="public-project-scope-grid">
            {projectScopeToRender.map((group) => (
              <section className="public-project-scope-group" key={group.title}>
                <h5>{group.title}</h5>
                <ul>
                  {group.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
