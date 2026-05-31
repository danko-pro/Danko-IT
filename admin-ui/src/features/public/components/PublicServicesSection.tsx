import { publicServiceItems } from "../public-content";
import { usePublicServicesExplorer } from "../hooks/usePublicServicesExplorer";
import { PublicSectionContour } from "./PublicSectionContour";
import { PublicServiceDetail } from "./services/PublicServiceDetail";
import { PublicServicesAccordion } from "./services/PublicServicesAccordion";
import { PublicServicesTabs } from "./services/PublicServicesTabs";

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
        <PublicServicesTabs
          services={publicServiceItems}
          activeServiceIndex={activeServiceIndex}
          scheduleServiceActivation={scheduleServiceActivation}
          clearServiceHoverTimer={clearServiceHoverTimer}
          activateServiceImmediately={activateServiceImmediately}
        />

        <PublicServiceDetail activeService={activeService} activeServiceIndex={activeServiceIndex} />
      </div>

      <PublicServicesAccordion
        services={publicServiceItems}
        activeServiceIndex={activeServiceIndex}
        setActiveServiceIndex={setActiveServiceIndex}
      />
    </section>
  );
}
