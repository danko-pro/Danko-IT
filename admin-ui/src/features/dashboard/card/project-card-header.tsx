import { ProjectSceneSignalsHeader } from "./project-scene-signals-header";
import type { ProjectCardProps } from "./project-card-types";

type ProjectCardHeaderProps = Pick<ProjectCardProps, "project" | "onOpenAccounting">;

export function ProjectCardHeader(props: ProjectCardHeaderProps) {
  void props.onOpenAccounting;
  return <ProjectSceneSignalsHeader project={props.project} />;
}
