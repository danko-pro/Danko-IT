import { publicProjectItems } from "../public-content";
import { usePublicProjectsShowcase } from "../hooks/usePublicProjectsShowcase";
import { PublicProjectScope } from "./projects/PublicProjectScope";
import { PublicProjectShowcaseInfo } from "./projects/PublicProjectShowcaseInfo";
import { PublicProjectShowcaseMedia } from "./projects/PublicProjectShowcaseMedia";
import { PublicProjectSwitcher } from "./projects/PublicProjectSwitcher";

export function PublicProjectsSection() {
  const {
    activeProjectIndex,
    activeProjectImageIndex,
    activeProject,
    activeProjectImages,
    activeProjectImage,
    activeProjectMapUrl,
    isProjectScopeOpen,
    projectScopeToRender,
    activeProjectCounter,
    projectSwitcherButtonRefs,
    projectTitleRef,
    handleProjectSelect,
    setActiveProjectImageIndex,
  } = usePublicProjectsShowcase({ projects: publicProjectItems });

  return (
    <div className="public-projects-sample">
      <div className="public-projects-subhead">
        <p className="public-section-kicker">Объекты</p>
        <h3>Объекты в расчёте</h3>
      </div>

      <div className="public-project-showcase">
        <PublicProjectShowcaseMedia
          activeProject={activeProject}
          activeProjectImage={activeProjectImage}
          activeProjectImages={activeProjectImages}
          activeProjectImageIndex={activeProjectImageIndex}
          setActiveProjectImageIndex={setActiveProjectImageIndex}
        />

        <PublicProjectShowcaseInfo
          activeProject={activeProject}
          activeProjectCounter={activeProjectCounter}
          activeProjectMapUrl={activeProjectMapUrl}
          projectTitleRef={projectTitleRef}
        />
      </div>

      <PublicProjectSwitcher
        projects={publicProjectItems}
        activeProjectIndex={activeProjectIndex}
        projectSwitcherButtonRefs={projectSwitcherButtonRefs}
        handleProjectSelect={handleProjectSelect}
      />

      <PublicProjectScope
        isProjectScopeOpen={isProjectScopeOpen}
        activeProject={activeProject}
        projectScopeToRender={projectScopeToRender}
      />
    </div>
  );
}
