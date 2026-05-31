import {
  type PublicProjectItem,
  type PublicProjectScopeGroup,
} from "./publicProjectModel";

type PublicProjectScopeProps = {
  isProjectScopeOpen: boolean;
  activeProject: PublicProjectItem;
  projectScopeToRender: PublicProjectScopeGroup[];
};

export function PublicProjectScope({
  isProjectScopeOpen,
  activeProject,
  projectScopeToRender,
}: PublicProjectScopeProps) {
  return (
    <div
      className={`public-project-scope${isProjectScopeOpen ? " public-project-scope-open" : ""}`}
      aria-hidden={!isProjectScopeOpen}
      aria-label={`Состав работ: ${activeProject.name}`}
    >
      <div className="public-project-scope-inner">
        <div className="public-project-scope-head">
          <span>Состав работ и комплектации</span>
          <strong>под ключ</strong>
        </div>

        <div className="public-project-scope-grid">
          {projectScopeToRender.map((group) => (
            <section className="public-project-scope-group" key={group.title}>
              <h5>{group.title}</h5>
              <ul>
                {group.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
