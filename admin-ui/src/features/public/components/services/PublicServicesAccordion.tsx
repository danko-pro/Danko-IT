import { PublicServiceVisualList } from "./PublicServiceVisualList";

type PublicServiceAccordionItem = {
  title: string;
  description: string;
  includes: string[];
  result: string;
  visualTitle: string;
  visualItems: string[];
};

type PublicServicesAccordionProps = {
  services: PublicServiceAccordionItem[];
  activeServiceIndex: number;
  setActiveServiceIndex: (index: number) => void;
};

export function PublicServicesAccordion({
  services,
  activeServiceIndex,
  setActiveServiceIndex,
}: PublicServicesAccordionProps) {
  return (
    <div className="public-services-accordion">
      {services.map((service, index) => {
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

                <PublicServiceVisualList
                  serviceIndex={index}
                  visualTitle={service.visualTitle}
                  visualItems={service.visualItems}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
