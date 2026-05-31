import {
  getProjectShortName,
  type PublicProjectImage,
  type PublicProjectItem,
} from "./publicProjectModel";

type PublicProjectShowcaseMediaProps = {
  activeProject: PublicProjectItem;
  activeProjectImage: PublicProjectImage | undefined;
  activeProjectImages: PublicProjectImage[];
  activeProjectImageIndex: number;
  setActiveProjectImageIndex: (index: number) => void;
};

export function PublicProjectShowcaseMedia({
  activeProject,
  activeProjectImage,
  activeProjectImages,
  activeProjectImageIndex,
  setActiveProjectImageIndex,
}: PublicProjectShowcaseMediaProps) {
  return (
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
  );
}
