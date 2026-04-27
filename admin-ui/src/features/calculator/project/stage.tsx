import { ProjectStageWorkspace } from "./workspace";
import type { ProjectStageSectionProps } from "./types";

export function ProjectStageSection(props: ProjectStageSectionProps) {
  if (props.error) {
    return <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{props.error}</div>;
  }

  return <ProjectStageWorkspace />;
}
