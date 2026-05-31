type PublicServiceTabItem = {
  title: string;
  description: string;
};

type PublicServicesTabsProps = {
  services: PublicServiceTabItem[];
  activeServiceIndex: number;
  scheduleServiceActivation: (index: number) => void;
  clearServiceHoverTimer: () => void;
  activateServiceImmediately: (index: number) => void;
};

export function PublicServicesTabs({
  services,
  activeServiceIndex,
  scheduleServiceActivation,
  clearServiceHoverTimer,
  activateServiceImmediately,
}: PublicServicesTabsProps) {
  return (
    <div className="public-services-tabs" role="tablist" aria-label="Услуги Danko">
      {services.map((service, index) => {
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
  );
}
