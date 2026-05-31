import { publicServiceItems } from "../public-content";
import { usePublicServicesExplorer } from "../hooks/usePublicServicesExplorer";
import { PublicSectionContour } from "./PublicSectionContour";
import { PublicServiceVisualIcon, getServiceVisualIcon } from "./services/PublicServiceVisualIcon";

type PublicServicesSectionProps = {
  getContourClassName: (sectionName: string, side: "left" | "right") => string;
};

export function PublicServicesSection({ getContourClassName }: PublicServicesSectionProps) {
  const {
    activeServiceIndex,
    setActiveServiceIndex,
    activateServiceImmediately,
    scheduleServiceActivation,
    clearServiceHoverTimer,
  } = usePublicServicesExplorer();
  const activeService = publicServiceItems[activeServiceIndex];

  return (
    <section
      className="public-services"
      id="services"
      aria-labelledby="public-services-title"
      data-public-contour-section="services"
    >
      <PublicSectionContour sectionName="services" side="right" getContourClassName={getContourClassName} />

      <div className="public-section-heading">
        <p className="public-section-kicker">Услуги</p>
        <h2 id="public-services-title">Что берём на себя</h2>
        <p>
          Закрываем ремонт как единый процесс: от идеи и расчёта до отделки, комплектации и
          сдачи объекта.
        </p>
      </div>

      <div className="public-services-explorer">
        <div className="public-services-tabs" role="tablist" aria-label="Услуги Danko">
          {publicServiceItems.map((service, index) => {
            const serviceNumber = String(index + 1).padStart(2, "0");
            const isActive = activeServiceIndex === index;

            return (
              <button
                className={`public-service-tab${isActive ? " public-service-tab-active" : ""}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls="public-service-panel"
                id={`public-service-tab-${index}`}
                key={service.title}
                onMouseEnter={() => scheduleServiceActivation(index)}
                onMouseLeave={clearServiceHoverTimer}
                onFocus={() => activateServiceImmediately(index)}
                onClick={() => activateServiceImmediately(index)}
              >
                <span className="public-service-number">{serviceNumber}</span>
                <span className="public-service-tab-copy">
                  <span className="public-service-tab-title">{service.title}</span>
                  <span className="public-service-tab-description">{service.description}</span>
                </span>
              </button>
            );
          })}
        </div>

        <article
          className="public-service-detail"
          role="tabpanel"
          id="public-service-panel"
          aria-labelledby={`public-service-tab-${activeServiceIndex}`}
        >
          <div className="public-service-detail-content" key={activeService.title}>
            <div className="public-service-detail-header">
              <span className="public-service-number">{String(activeServiceIndex + 1).padStart(2, "0")}</span>
              <h3>{activeService.title}</h3>
              <p>{activeService.description}</p>
            </div>

            <div className="public-service-detail-body">
              <div>
                <h4>Что входит</h4>
                <ul>
                  {activeService.includes.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="public-service-result">
                <h4>Результат</h4>
                <p>{activeService.result}</p>
              </div>
            </div>

            <div className="public-service-visual" aria-label={`Схема этапа: ${activeService.visualTitle}`}>
              <div className="public-service-visual-heading">
                <span>Схема этапа</span>
                <strong>{activeService.visualTitle}</strong>
              </div>
              <ol className="public-service-visual-list">
                {activeService.visualItems.map((item, index) => (
                  <li className="public-service-visual-item" key={item}>
                    <span className="public-service-visual-dot">
                      <PublicServiceVisualIcon name={getServiceVisualIcon(activeServiceIndex, index)} />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </article>
      </div>

      <div className="public-services-accordion">
        {publicServiceItems.map((service, index) => {
          const serviceNumber = String(index + 1).padStart(2, "0");
          const isActive = activeServiceIndex === index;

          return (
            <div className="public-service-accordion-item" key={service.title}>
              <button
                className={`public-service-accordion-button${
                  isActive ? " public-service-accordion-button-active" : ""
                }`}
                type="button"
                aria-expanded={isActive}
                aria-controls={`public-service-accordion-panel-${index}`}
                onClick={() => setActiveServiceIndex(index)}
              >
                <span className="public-service-number">{serviceNumber}</span>
                <span>{service.title}</span>
              </button>

              <div
                className={`public-service-accordion-panel${
                  isActive ? " public-service-accordion-panel-open" : ""
                }`}
                id={`public-service-accordion-panel-${index}`}
                aria-hidden={!isActive}
              >
                <div className="public-service-accordion-panel-inner">
                  <p>{service.description}</p>
                  <h4>Что входит</h4>
                  <ul>
                    {service.includes.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <div className="public-service-result">
                    <h4>Результат</h4>
                    <p>{service.result}</p>
                  </div>

                  <div className="public-service-visual" aria-label={`Схема этапа: ${service.visualTitle}`}>
                    <div className="public-service-visual-heading">
                      <span>Схема этапа</span>
                      <strong>{service.visualTitle}</strong>
                    </div>
                    <ol className="public-service-visual-list">
                      {service.visualItems.map((item, itemIndex) => (
                        <li className="public-service-visual-item" key={item}>
                          <span className="public-service-visual-dot">
                            <PublicServiceVisualIcon name={getServiceVisualIcon(index, itemIndex)} />
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
