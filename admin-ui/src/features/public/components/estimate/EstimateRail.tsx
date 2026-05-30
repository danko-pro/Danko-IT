import type { RefObject } from "react";
import type { EstimateNavigationIcon, EstimateNavigationItem } from "../../sections/types";

export type EstimateRailVolumeItem = {
  label: string;
  value: string;
};

export type EstimateRailProps = {
  navigationItems: EstimateNavigationItem[];
  activeSectionId: string;
  railScrollRef: RefObject<HTMLElement | null>;
  onNavigateToSection: (sectionId: string) => void;
  compactVolumeItems: EstimateRailVolumeItem[];
  summaryItems: EstimateRailVolumeItem[];
  isMobileVolumesExpanded: boolean;
  onToggleMobileVolumesExpanded: () => void;
  onPrintVolumes: () => void;
};

function EstimateNavigationIcon({ name }: { name: EstimateNavigationIcon }) {
  const commonProps = {
    viewBox: "0 0 24 24",
    "aria-hidden": true,
    focusable: false,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (name) {
    case "geometry":
      return (
        <svg {...commonProps}>
          <rect x="4" y="4" width="16" height="16" rx="1.5" />
          <path d="M4 20 20 4" />
        </svg>
      );
    case "object":
      return (
        <svg {...commonProps}>
          <path d="M3 21h18" />
          <path d="M6 21V8l6-4 6 4v13" />
          <path d="M10 21v-5h4v5" />
        </svg>
      );
    case "warmFloor":
      return (
        <svg {...commonProps}>
          <path d="M3 10c2.5-2 5-2 7.5 0s5 2 7.5 0 5-2 7.5 0" />
          <path d="M3 15c2.5-2 5-2 7.5 0s5 2 7.5 0 5-2 7.5 0" />
        </svg>
      );
    case "flooring":
      return (
        <svg {...commonProps}>
          <path d="M12 3 2 8l10 5 10-5-10-5z" />
          <path d="M2 13l10 5 10-5" />
          <path d="M2 18l10 5 10-5" />
        </svg>
      );
    case "walls":
      return (
        <svg {...commonProps}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M12 3v18" />
        </svg>
      );
    case "ceiling":
      return (
        <svg {...commonProps}>
          <path d="M4 7h16" />
          <path d="M6 11h12" />
          <path d="M8 15h8" />
        </svg>
      );
    case "electric":
      return (
        <svg {...commonProps}>
          <path d="M13 2 3 14h8l-1 8 10-12h-8l1-8z" />
        </svg>
      );
    case "plumbing":
      return (
        <svg {...commonProps}>
          <path d="M12 3c3.5 3.5 5.5 6 5.5 9a5.5 5.5 0 1 1-11 0c0-3 2-5.5 5.5-9z" />
        </svg>
      );
    case "doors":
      return (
        <svg {...commonProps}>
          <path d="M4 20V6a2 2 0 0 1 2-2h8" />
          <path d="M14 4h4a2 2 0 0 1 2 2v14" />
          <path d="M2 20h20" />
        </svg>
      );
    case "completion":
      return (
        <svg {...commonProps}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      );
    case "appliances":
      return (
        <svg {...commonProps}>
          <rect x="5" y="2" width="14" height="20" rx="1.5" />
          <path d="M5 10h14" />
        </svg>
      );
    case "furniture":
      return (
        <svg {...commonProps}>
          <path d="M19 9V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v2" />
          <path d="M3 11v5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5" />
          <path d="M5 18v2" />
          <path d="M19 18v2" />
        </svg>
      );
    case "cleaning":
      return (
        <svg {...commonProps}>
          <path d="M12 3v4" />
          <path d="m8 7 4-4 4 4" />
          <path d="M8 7v3l-3 9h14l-3-9V7" />
        </svg>
      );
    case "total":
      return (
        <svg {...commonProps}>
          <rect x="4" y="2" width="16" height="20" rx="2" />
          <path d="M8 7h8" />
          <path d="M8 11h8" />
          <path d="M8 15h5" />
        </svg>
      );
  }
}

export function EstimateRail({
  navigationItems,
  activeSectionId,
  railScrollRef,
  onNavigateToSection,
  compactVolumeItems,
  summaryItems,
  isMobileVolumesExpanded,
  onToggleMobileVolumesExpanded,
  onPrintVolumes,
}: EstimateRailProps) {
  return (
    <aside className="public-estimate-rail" aria-label="Навигация по разделам расчёта">
      <div className="public-estimate-rail-head">
        <span>Калькулятор</span>
        <strong>Разделы расчёта</strong>
      </div>

      <nav className="public-estimate-rail-nav" aria-label="Разделы расчёта" ref={railScrollRef}>
        <ol className="public-estimate-rail-list">
          {navigationItems.map((item, index) => {
            const isActive = activeSectionId === item.id;
            const stepLabel = String(index + 1).padStart(2, "0");

            return (
              <li className="public-estimate-rail-item" key={item.id}>
                <a
                  className={`public-estimate-rail-link${isActive ? " is-active" : ""}`}
                  href={`#${item.id}`}
                  aria-current={isActive ? "location" : undefined}
                  onClick={(event) => {
                    event.preventDefault();
                    onNavigateToSection(item.id);
                  }}
                >
                  <span className="public-estimate-rail-icon">
                    <EstimateNavigationIcon name={item.icon} />
                  </span>
                  <span className="public-estimate-rail-copy">
                    <span className="public-estimate-rail-step">{stepLabel}</span>
                    <span className="public-estimate-rail-label">{item.label}</span>
                  </span>
                </a>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="public-estimate-geometry-compact" aria-label="Ключевые объёмы объекта">
        <div className="public-estimate-geometry-compact-row">
          {compactVolumeItems.map((item) => (
            <div className="public-estimate-geometry-compact-metric" key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
          <button
            className="public-estimate-geometry-compact-toggle"
            type="button"
            aria-expanded={isMobileVolumesExpanded}
            onClick={onToggleMobileVolumesExpanded}
          >
            {isMobileVolumesExpanded ? "Свернуть" : "Все объёмы"}
          </button>
        </div>

        {isMobileVolumesExpanded ? (
          <dl className="public-estimate-geometry-compact-full">
            {summaryItems.map((item) => (
              <div className="public-estimate-geometry-compact-item" key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        <button className="public-estimate-geometry-compact-print" type="button" onClick={onPrintVolumes}>
          Скачать объёмы
        </button>
      </div>
    </aside>
  );
}
