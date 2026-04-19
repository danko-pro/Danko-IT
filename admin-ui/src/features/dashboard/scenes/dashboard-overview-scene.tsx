import { ProjectCardOverview } from "../card/project-card-overview";
import { DashboardSceneChrome } from "../dashboard-scene-chrome";
import type { DashboardSceneView } from "../dashboard-scene-types";
import type { DashboardProjectCardData } from "../model/project-model";

export function DashboardOverviewScene(props: {
  project: DashboardProjectCardData;
  activeView: DashboardSceneView;
  onSelectView: (view: DashboardSceneView) => void;
}) {
  return (
    <article className="dashboard-project-card">
      <div className="dashboard-project-card__glow" />
      <DashboardSceneChrome activeView={props.activeView} onSelect={props.onSelectView} project={props.project} />
      <ProjectCardOverview project={props.project} />
    </article>
  );
}
