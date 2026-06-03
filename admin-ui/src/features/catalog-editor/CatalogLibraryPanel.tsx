import type { ReactNode } from "react";

export type CatalogLibraryMetric = {
  label: string;
  value: ReactNode;
  tone?: "success";
};

export type CatalogLibraryPanelProps = {
  title: string;
  toolbar?: ReactNode;
  metrics?: CatalogLibraryMetric[];
  children: ReactNode;
  className?: string;
};

export function CatalogLibraryPanel({
  title,
  toolbar,
  metrics = [],
  children,
  className = "",
}: CatalogLibraryPanelProps) {
  return (
    <section className={`ce-catalog-library${className ? ` ${className}` : ""}`}>
      <header className="ce-catalog-library-head">
        <h3 className="ce-catalog-library-title">{title}</h3>
        {toolbar ? <div className="ce-catalog-library-toolbar">{toolbar}</div> : null}
      </header>
      {metrics.length > 0 ? (
        <div className="ce-catalog-library-meta">
          {metrics.map((metric) => (
            <span
              key={metric.label}
              className={`ce-catalog-library-metric${metric.tone === "success" ? " is-success" : ""}`}
            >
              {metric.label}: <strong>{metric.value}</strong>
            </span>
          ))}
        </div>
      ) : null}
      <div className="ce-catalog-library-body">{children}</div>
    </section>
  );
}
