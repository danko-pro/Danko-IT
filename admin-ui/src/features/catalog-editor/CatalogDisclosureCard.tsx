import type { ReactNode } from "react";

export type CatalogDisclosureCardProps = {
  title: ReactNode;
  collapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
  summary?: ReactNode;
  actions?: ReactNode;
  ariaLabel?: string;
  bodyId?: string;
  className?: string;
  headClassName?: string;
  bodyClassName?: string;
  toggleClassName?: string;
};

export function CatalogDisclosureCard({
  title,
  collapsed,
  onToggle,
  children,
  summary,
  actions,
  ariaLabel,
  bodyId,
  className,
  headClassName,
  bodyClassName,
  toggleClassName,
}: CatalogDisclosureCardProps) {
  const rootClass = `ce-catalog-disclosure-card${collapsed ? " is-collapsed" : ""}${className ? ` ${className}` : ""}`;
  const headClass = `ce-catalog-disclosure-card-head${headClassName ? ` ${headClassName}` : ""}`;
  const bodyClass = `ce-catalog-disclosure-card-body${bodyClassName ? ` ${bodyClassName}` : ""}`;
  const buttonClass = `ce-disclosure ce-catalog-disclosure-card-toggle${toggleClassName ? ` ${toggleClassName}` : ""}`;

  return (
    <section className={rootClass}>
      <header className={headClass}>
        <button
          type="button"
          className={buttonClass}
          onClick={onToggle}
          aria-expanded={!collapsed}
          aria-controls={bodyId}
          aria-label={ariaLabel}
        >
          <span className={`ce-chevron${collapsed ? "" : " is-open"}`}>{"\u25b6"}</span>
        </button>
        {title}
        {summary}
        {actions}
      </header>
      {!collapsed ? (
        <div id={bodyId} className={bodyClass}>
          {children}
        </div>
      ) : null}
    </section>
  );
}
