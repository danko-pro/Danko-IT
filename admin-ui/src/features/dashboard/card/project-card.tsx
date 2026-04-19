import { DashboardFinanceScene } from "../scenes/dashboard-finance-scene";
import type { ProjectCardProps } from "./project-card-types";

export function ProjectCard(props: ProjectCardProps) {
  const { onOpenAccounting, ...financeProps } = props;
  return (
    <DashboardFinanceScene
      {...financeProps}
      activeView="finance"
      onSelectView={(view) => {
        if (view === "accounting") {
          onOpenAccounting();
        }
      }}
    />
  );
}
