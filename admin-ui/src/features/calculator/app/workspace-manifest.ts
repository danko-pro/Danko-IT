import {
  defineWorkspaceManifest,
  registryToLayoutConstraints,
  registryToLayoutItems,
  validateWorkspaceManifest,
} from "../../../shared/workspace-contract";
import { createWorkspaceAdapterSnapshot } from "../../../shared/workspace-adapter";
import { doorsWorkbenchWorkspaceRegistry } from "../doors-workbench/workspace-registry";
import { calculatorFlooringWorkspaceRegistry } from "../flooring/workspace-registry";
import { calculatorProjectWorkspaceRegistry } from "../project/workspace-registry";
import { calculatorRoomsWorkspaceRegistry } from "../rooms/workspace-registry";
import { calculatorStageWorkspaceRegistry } from "../stage/workspace-registry";
import { calculatorWarmFloorWorkspaceRegistry } from "../warm-floor/workspace-registry";
import { calculatorWallFinishWorkspaceRegistry } from "../wall-finish/workspace-registry";

export const calculatorWorkspaceManifest = defineWorkspaceManifest({
  id: "calculator.workspace",
  title: "Калькулятор объекта",
  description: "Host manifest для stage shell и первых управляемых рабочих областей калькулятора.",
  registries: [
    calculatorStageWorkspaceRegistry,
    calculatorProjectWorkspaceRegistry,
    calculatorRoomsWorkspaceRegistry,
    calculatorFlooringWorkspaceRegistry,
    calculatorWallFinishWorkspaceRegistry,
    calculatorWarmFloorWorkspaceRegistry,
    doorsWorkbenchWorkspaceRegistry,
  ],
});

export const calculatorWorkspaceLayoutItems = calculatorWorkspaceManifest.registries.flatMap((registry) =>
  registryToLayoutItems(registry),
);
export const calculatorWorkspaceLayoutConstraints =
  calculatorWorkspaceManifest.registries.flatMap((registry) => registryToLayoutConstraints(registry));
export const calculatorWorkspaceValidationReport = validateWorkspaceManifest(calculatorWorkspaceManifest);
export const calculatorWorkspaceAdapterSnapshot =
  createWorkspaceAdapterSnapshot(calculatorWorkspaceManifest);
