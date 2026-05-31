import type { ReactNode } from "react";
import { formatMoney } from "../../estimate/format";
import type { PlumbingPackageLevel } from "../../public-estimate-plumbing";

export type PlumbingZoneCardProps = {
  ariaLabel: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  active: boolean;
  icon: ReactNode;
  label: string;
  total: number;
  packageLevel?: PlumbingPackageLevel;
  packageLabels?: Record<PlumbingPackageLevel, string>;
  onPackageLevelChange?: (level: PlumbingPackageLevel) => void;
  totalAriaLabel: string;
  packageGroupAriaLabel?: string;
};

export function PlumbingZoneCard({
  ariaLabel,
  checked,
  onCheckedChange,
  active,
  icon,
  label,
  total,
  packageLevel,
  packageLabels,
  onPackageLevelChange,
  totalAriaLabel,
  packageGroupAriaLabel,
}: PlumbingZoneCardProps) {
  const hasPackages = packageLevel != null && packageLabels != null && onPackageLevelChange != null;

  return (
    <label
      className={`public-estimate-plumbing-option-zone public-estimate-plumbing-sink-zone${
        active ? " public-estimate-plumbing-sink-zone-active" : ""
      }`}
      aria-label={ariaLabel}
    >
      <input type="checkbox" checked={checked} onChange={(event) => onCheckedChange(event.target.checked)} />
      <span className="public-estimate-plumbing-sink-zone-icon" aria-hidden="true">
        {icon}
      </span>
      <strong className="public-estimate-plumbing-sink-zone-label">{label}</strong>
      <div
        className={`public-estimate-option-expand-shell public-estimate-plumbing-sink-zone-expand${
          active ? " is-expanded" : ""
        }`}
        aria-hidden={!active}
      >
        <div className="public-estimate-option-expand-shell-inner">
          <div className="public-estimate-plumbing-sink-zone-expand-content">
            {hasPackages ? (
              <div
                className="public-estimate-plumbing-sink-zone-toggle"
                role="group"
                aria-label={packageGroupAriaLabel}
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
                {(["c", "b", "a"] as PlumbingPackageLevel[]).map((level) => (
                  <button
                    key={level}
                    className={packageLevel === level ? "public-estimate-toggle-active" : undefined}
                    type="button"
                    aria-label={packageLabels[level]}
                    aria-pressed={packageLevel === level}
                    title={packageLabels[level]}
                    tabIndex={active ? undefined : -1}
                    onClick={(event) => {
                      event.preventDefault();
                      onPackageLevelChange(level);
                    }}
                  >
                    {level.toUpperCase()}
                  </button>
                ))}
              </div>
            ) : null}
            <span className="public-estimate-plumbing-sink-zone-total" aria-label={totalAriaLabel}>
              <strong key={hasPackages ? packageLevel : "fixed"} className="public-estimate-option-value-fade">
                {formatMoney(total)}
              </strong>
            </span>
          </div>
        </div>
      </div>
    </label>
  );
}
