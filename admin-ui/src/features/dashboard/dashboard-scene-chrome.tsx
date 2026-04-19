import { ProjectSceneSignalsHeader } from "./card/project-scene-signals-header";
import { DashboardSceneSwitch } from "./dashboard-scene-switch";
import type { DashboardSceneView } from "./dashboard-scene-types";
import type { DashboardProjectCardData } from "./model/project-model";

export function DashboardSceneChrome(props: {
  activeView: DashboardSceneView;
  onSelect: (view: DashboardSceneView) => void;
  project?: DashboardProjectCardData;
}) {
  return (
    <div
      className={
        props.project
          ? "dashboard-scene-chrome dashboard-scene-chrome-with-signals"
          : "dashboard-scene-chrome dashboard-scene-chrome-solo"
      }
    >
      <DashboardSceneSwitch activeView={props.activeView} onSelect={props.onSelect} />
      {props.project ? <ProjectSceneSignalsHeader project={props.project} /> : null}
    </div>
  );
}
