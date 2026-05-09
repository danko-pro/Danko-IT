import {
  defineWorkspaceManifest,
  registryToLayoutConstraints,
  registryToLayoutItems,
  validateWorkspaceManifest,
} from "../../../shared/workspace-contract";
import { createWorkspaceAdapterSnapshot } from "../../../shared/workspace-adapter";
import { dashboardLedgerWorkspaceRegistry } from "./workspace-registry";

export const dashboardAccountingWorkspaceManifest = defineWorkspaceManifest({
  id: "dashboard.accounting-workspace",
  title: "Dashboard accounting workspace",
  description: "Host manifest для реестра объекта и его summary/control блоков.",
  registries: [dashboardLedgerWorkspaceRegistry],
});

export const dashboardAccountingWorkspaceLayoutItems =
  dashboardAccountingWorkspaceManifest.registries.flatMap((registry) => registryToLayoutItems(registry));
export const dashboardAccountingWorkspaceLayoutConstraints =
  dashboardAccountingWorkspaceManifest.registries.flatMap((registry) =>
    registryToLayoutConstraints(registry),
  );
export const dashboardAccountingWorkspaceValidationReport = validateWorkspaceManifest(
  dashboardAccountingWorkspaceManifest,
);
export const dashboardAccountingWorkspaceAdapterSnapshot = createWorkspaceAdapterSnapshot(
  dashboardAccountingWorkspaceManifest,
);
