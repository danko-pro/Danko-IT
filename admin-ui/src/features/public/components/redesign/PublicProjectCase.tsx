import {
  getProjectCaseStats,
  getProjectMapUrl,
  getProjectPrice,
  getProjectScope,
  getProjectShortName,
  getProjectSubtitle,
  getProjectSummary,
  type PublicProjectItem,
} from "../projects/publicProjectModel";

type ProjectCaseProps = {
  project: PublicProjectItem;
  isOpen: boolean;
  onToggle: () => void;
};

export function PublicProjectInfo({ project, isOpen, onToggle }: ProjectCaseProps) {
  const hasCase = getProjectScope(project).length > 0;
  const mapUrl = getProjectMapUrl(project);
  const price = getProjectPrice(project);
  const subtitle = getProjectSubtitle(project);

  return (
    <aside className="dk-proj-info" key={project.name}>
      <h3 className="dk-proj-info__title">{project.name}</h3>
      {mapUrl ? (
        <a className="dk-project-map" href={mapUrl} target="_blank" rel="noreferrer" aria-label={`${subtitle}. Открыть в Яндекс Картах`}>
          <span className="dk-project-map__pin" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M12 21s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12Z"/><circle cx="12" cy="9" r="2.35"/></svg>
          </span>
          <span>
            <strong>{subtitle}</strong>
            <small>Открыть в Яндекс Картах ↗</small>
          </span>
        </a>
      ) : (
        <p className="dk-proj-info__loc">{subtitle}</p>
      )}
      <div className="dk-chips">
        <span className="dk-chip dk-chip--area">{project.area}</span>
        <span className="dk-chip dk-chip--pkg">Пакет {project.package}</span>
        <span className="dk-chip dk-chip--type">{project.type}</span>
      </div>
      {price ? (
        <div className="dk-project-price">
          <span>Стоимость ремонта</span>
          <strong>{price.value}</strong>
          <small>{price.note}</small>
        </div>
      ) : null}
      <p className="dk-proj-info__scope">{getProjectSummary(project)}</p>
      {hasCase ? (
        <button className="dk-case-toggle" type="button" aria-expanded={isOpen} aria-controls="dk-active-case" onClick={onToggle}>
          {isOpen ? "Скрыть подробности" : "Открыть полный кейс"}
          <span aria-hidden="true">{isOpen ? "↑" : "↓"}</span>
        </button>
      ) : null}
      <a className="dk-btn dk-btn--green dk-proj-info__cta" href="#contacts">Обсудить похожий проект</a>
    </aside>
  );
}

export function PublicProjectCasePanel({ project, isOpen }: Omit<ProjectCaseProps, "onToggle">) {
  const scope = getProjectScope(project);
  const stats = getProjectCaseStats(project);

  if (!isOpen || scope.length === 0) return null;

  return (
    <article className="dk-case" id="dk-active-case" tabIndex={-1} key={`case-${project.name}`}>
      <div className="dk-case__head">
        <div>
          <p className="dk-section-kicker">Кейс · {getProjectShortName(project)}</p>
          <h3>Что вошло в проект</h3>
        </div>
        <p>{getProjectSummary(project)}</p>
      </div>
      {stats.length > 0 ? (
        <dl className="dk-case__stats">
          {stats.map((stat) => <div key={stat.label}><dt>{stat.value}</dt><dd>{stat.label}</dd></div>)}
        </dl>
      ) : null}
      <div className="dk-case__scope">
        {scope.map((group, index) => (
          <section key={group.title}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <h4>{group.title}</h4>
            <ul>{group.items.map((item) => <li key={item}>{item}</li>)}</ul>
          </section>
        ))}
      </div>
    </article>
  );
}
