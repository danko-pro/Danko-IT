import { defineWorkspaceRegistry, type WorkspaceCapabilityMap, type WorkspaceElementSchema } from "../../../shared/workspace-contract";

const ROOT_ID = "calculator.warm-floor.workspace";
const MODES_ID = "calculator.warm-floor.mode-tabs";
const ROOMS_ID = "calculator.warm-floor.rooms";
const SIDE_ID = "calculator.warm-floor.side-panel";
const SETTINGS_ID = "calculator.warm-floor.settings";
const SUMMARY_ID = "calculator.warm-floor.summary";
const ESTIMATE_ID = "calculator.warm-floor.estimate";

function caps(overrides: Partial<WorkspaceCapabilityMap> = {}): WorkspaceCapabilityMap {
  return { movable: false, resizable: false, deletable: false, copyable: false, ...overrides };
}

function element(id: string, type: WorkspaceElementSchema["type"], role: WorkspaceElementSchema["role"], label: string, options: Partial<WorkspaceElementSchema> = {}): WorkspaceElementSchema {
  return { id, type, role, label, ...options };
}

const field = (id: string, label: string, dataKey: string, critical = false) => element(id, "input", "field", label, { dataKey, critical });
const button = (id: string, label: string, role: WorkspaceElementSchema["role"] = "primary-action") => element(id, "button", role, label);
const metric = (id: string, label: string, dataKey: string, critical = false) => element(id, "metric", "summary", label, { dataKey, critical });

export const calculatorWarmFloorWorkspaceRegistry = defineWorkspaceRegistry({
  id: "calculator.warm-floor",
  title: "Calculator warm-floor workspace",
  description: "Warm floor stage map for room selection, calculation settings, system summary and estimate.",
  components: [
    {
      id: ROOT_ID,
      type: "workspace",
      title: "Warm floor workspace root",
      dataKey: "calculator.warmFloor",
      layoutParticipation: "none",
      capabilities: caps(),
      source: { feature: "calculator/warm-floor", file: "stage.tsx" },
    },
    {
      id: MODES_ID,
      parentId: ROOT_ID,
      type: "toolbar",
      title: "Warm floor panel mode tabs",
      dataKey: "calculator.warmFloor.panelMode",
      layoutParticipation: "none",
      capabilities: caps(),
      children: [
        element("calculator.warm-floor.mode-tabs.settings", "button", "navigation", "Settings mode", { dataKey: "calculator.warmFloor.panelMode.settings" }),
        element("calculator.warm-floor.mode-tabs.summary", "button", "navigation", "Summary mode", { dataKey: "calculator.warmFloor.panelMode.summary" }),
        element("calculator.warm-floor.mode-tabs.estimate", "button", "navigation", "Estimate mode", { dataKey: "calculator.warmFloor.panelMode.estimate" }),
      ],
      relationships: [{ type: "controls", targetId: SIDE_ID }],
      source: { feature: "calculator/warm-floor", file: "stage.tsx" },
    },
    {
      id: ROOMS_ID,
      parentId: ROOT_ID,
      type: "list",
      title: "Warm floor rooms panel",
      description: "Main room cards list with room selection, inline area override and note editor.",
      dataKey: "calculator.warmFloor.preview.rooms",
      area: { x: 1, y: 1, w: 20, h: 22 },
      minArea: { w: 10, h: 10 },
      priority: 100,
      capabilities: caps({ resizable: true, collapsible: true }),
      children: [
        element("calculator.warm-floor.rooms.card", "list-item", "navigation", "Warm floor room card", {
          dataKey: "calculator.warmFloor.preview.rooms[]",
          critical: true,
        }),
        field("calculator.warm-floor.rooms.selected", "Room selected toggle", "calculator.warmFloor.state.rooms[].selected", true),
        field("calculator.warm-floor.rooms.area-override", "Manual warm floor area", "calculator.warmFloor.state.rooms[].area_m2_override"),
        field("calculator.warm-floor.rooms.note", "Room warm floor note", "calculator.warmFloor.state.rooms[].note"),
        metric("calculator.warm-floor.rooms.pipe", "Room pipe meters", "calculator.warmFloor.preview.rooms[].pipe_m"),
        metric("calculator.warm-floor.rooms.contours", "Room contours", "calculator.warmFloor.preview.rooms[].contours"),
      ],
      relationships: [{ type: "writes", targetId: SUMMARY_ID }, { type: "writes", targetId: ESTIMATE_ID }],
      source: { feature: "calculator/warm-floor", file: "edit.tsx" },
    },
    {
      id: SIDE_ID,
      parentId: ROOT_ID,
      type: "panel",
      title: "Warm floor right panel scenes",
      dataKey: "calculator.warmFloor.panelMode",
      area: { x: 21, y: 1, w: 10, h: 22 },
      minArea: { w: 7, h: 10 },
      priority: 90,
      capabilities: caps({ resizable: true, collapsible: true }),
      relationships: [{ type: "controls", targetId: SETTINGS_ID }, { type: "controls", targetId: SUMMARY_ID }, { type: "controls", targetId: ESTIMATE_ID }],
      source: { feature: "calculator/warm-floor", file: "summary.tsx" },
    },
    {
      id: SETTINGS_ID,
      parentId: SIDE_ID,
      type: "form",
      title: "Warm floor settings",
      description: "Calculation norms, work rates and material composition for the warm floor system.",
      dataKey: "calculator.warmFloor.state",
      layoutParticipation: "none",
      capabilities: caps({ copyable: true, collapsible: true }),
      children: [
        field("calculator.warm-floor.settings.pipe-rate", "Pipe meters per m2", "calculator.warmFloor.state.pipe_m_per_m2", true),
        field("calculator.warm-floor.settings.max-contour-area", "Max contour area", "calculator.warmFloor.state.max_contour_area_m2", true),
        field("calculator.warm-floor.settings.small-zone-area", "Small zone threshold", "calculator.warmFloor.state.small_zone_area_m2"),
        field("calculator.warm-floor.settings.pump-thresholds", "Pump thresholds", "calculator.warmFloor.state.pumpThresholds"),
        field("calculator.warm-floor.settings.work-rates", "Warm floor work rates", "calculator.warmFloor.state.workRates"),
        field("calculator.warm-floor.settings.pipe-material", "Pipe material", "calculator.warmFloor.state.pipeMaterial"),
        element("calculator.warm-floor.settings.consumable-item", "list-item", "field", "Consumable material item", {
          dataKey: "calculator.warmFloor.state.consumable_material_items[]",
        }),
        element("calculator.warm-floor.settings.manifold-item", "list-item", "field", "Manifold material item", {
          dataKey: "calculator.warmFloor.state.manifold_material_items[]",
        }),
        element("calculator.warm-floor.settings.pump-item", "list-item", "field", "Pump material item", {
          dataKey: "calculator.warmFloor.state.pump_material_items[]",
        }),
        button("calculator.warm-floor.settings.add-consumable", "Add consumable item"),
        button("calculator.warm-floor.settings.delete-consumable", "Delete consumable item", "danger-action"),
      ],
      relationships: [{ type: "writes", targetId: SUMMARY_ID }, { type: "writes", targetId: ESTIMATE_ID }],
      source: { feature: "calculator/warm-floor", file: "settings.tsx" },
    },
    {
      id: SUMMARY_ID,
      parentId: SIDE_ID,
      type: "summary",
      title: "Warm floor summary panel",
      dataKey: "calculator.warmFloor.preview.summary",
      layoutParticipation: "none",
      capabilities: caps({ copyable: true, collapsible: true }),
      children: [
        metric("calculator.warm-floor.summary.grand-total", "Grand total", "calculator.warmFloor.preview.summary.grand_total", true),
        metric("calculator.warm-floor.summary.total-area", "Total warm floor area", "calculator.warmFloor.preview.summary.total_area_m2", true),
        metric("calculator.warm-floor.summary.total-pipe", "Total pipe meters", "calculator.warmFloor.preview.summary.total_pipe_m", true),
        metric("calculator.warm-floor.summary.total-contours", "Total contours", "calculator.warmFloor.preview.summary.total_contours"),
        metric("calculator.warm-floor.summary.work-total", "Work total", "calculator.warmFloor.preview.summary.work_total"),
        metric("calculator.warm-floor.summary.material-total", "Material total", "calculator.warmFloor.preview.summary.material_total"),
        element("calculator.warm-floor.summary.autosave", "status", "status", "Autosave state", { dataKey: "calculator.warmFloor.autosaveState" }),
      ],
      source: { feature: "calculator/warm-floor", file: "summary.tsx" },
    },
    {
      id: ESTIMATE_ID,
      parentId: SIDE_ID,
      type: "table",
      title: "Warm floor estimate panel",
      dataKey: "calculator.warmFloor.preview.specification",
      layoutParticipation: "none",
      capabilities: caps({ copyable: true, collapsible: true }),
      children: [
        element("calculator.warm-floor.estimate.row", "list-item", "summary", "Estimate row", { dataKey: "calculator.warmFloor.preview.specification[]" }),
        element("calculator.warm-floor.estimate.children", "list-item", "summary", "Nested material breakdown", { dataKey: "calculator.warmFloor.preview.specification[].children" }),
        metric("calculator.warm-floor.estimate.total", "Estimate total", "calculator.warmFloor.preview.specification.total", true),
      ],
      relationships: [{ type: "summarizes", targetId: SUMMARY_ID }],
      source: { feature: "calculator/warm-floor", file: "summary.tsx" },
    },
  ],
});
