import { defineWorkspaceRegistry, type WorkspaceCapabilityMap, type WorkspaceElementSchema } from "../../../shared/workspace-contract";

const ROOT_ID = "calculator.wall-finish.workspace";
const MODES_ID = "calculator.wall-finish.mode-tabs";
const ROOMS_ID = "calculator.wall-finish.rooms";
const SIDE_ID = "calculator.wall-finish.side-panel";
const ROOM_PARAMS_ID = "calculator.wall-finish.room-parameters";
const SETTINGS_ID = "calculator.wall-finish.settings";
const TECHMAP_ID = "calculator.wall-finish.techmap";
const SUMMARY_ID = "calculator.wall-finish.summary";
const ESTIMATE_ID = "calculator.wall-finish.estimate";

function caps(overrides: Partial<WorkspaceCapabilityMap> = {}): WorkspaceCapabilityMap {
  return { movable: false, resizable: false, deletable: false, copyable: false, ...overrides };
}

function element(id: string, type: WorkspaceElementSchema["type"], role: WorkspaceElementSchema["role"], label: string, options: Partial<WorkspaceElementSchema> = {}): WorkspaceElementSchema {
  return { id, type, role, label, ...options };
}

const field = (id: string, label: string, dataKey: string, critical = false) => element(id, "input", "field", label, { dataKey, critical });
const select = (id: string, label: string, dataKey: string, critical = false) => element(id, "select", "selector", label, { dataKey, critical });
const button = (id: string, label: string, role: WorkspaceElementSchema["role"] = "primary-action") => element(id, "button", role, label);
const metric = (id: string, label: string, dataKey: string, critical = false) => element(id, "metric", "summary", label, { dataKey, critical });

export const calculatorWallFinishWorkspaceRegistry = defineWorkspaceRegistry({
  id: "calculator.wall-finish",
  title: "Calculator wall-finish workspace",
  description: "Wall finish stage map for room wall areas, finish techmap catalogs, summary and estimate.",
  components: [
    {
      id: ROOT_ID,
      type: "workspace",
      title: "Wall finish workspace root",
      dataKey: "calculator.wallFinish",
      layoutParticipation: "none",
      capabilities: caps(),
      source: { feature: "calculator/wall-finish", file: "stage.tsx" },
    },
    {
      id: MODES_ID,
      parentId: ROOT_ID,
      type: "toolbar",
      title: "Wall finish panel mode tabs",
      dataKey: "calculator.wallFinish.panelMode",
      layoutParticipation: "none",
      capabilities: caps(),
      children: [
        element("calculator.wall-finish.mode-tabs.room", "button", "navigation", "Room mode", { dataKey: "calculator.wallFinish.panelMode.room" }),
        element("calculator.wall-finish.mode-tabs.settings", "button", "navigation", "Settings mode", { dataKey: "calculator.wallFinish.panelMode.settings" }),
        element("calculator.wall-finish.mode-tabs.techmap", "button", "navigation", "Techmap mode", { dataKey: "calculator.wallFinish.panelMode.techmap" }),
        element("calculator.wall-finish.mode-tabs.summary", "button", "navigation", "Summary mode", { dataKey: "calculator.wallFinish.panelMode.summary" }),
        element("calculator.wall-finish.mode-tabs.estimate", "button", "navigation", "Estimate mode", { dataKey: "calculator.wallFinish.panelMode.estimate" }),
      ],
      relationships: [{ type: "controls", targetId: SIDE_ID }],
      source: { feature: "calculator/wall-finish", file: "stage.tsx" },
    },
    {
      id: ROOMS_ID,
      parentId: ROOT_ID,
      type: "list",
      title: "Wall finish rooms panel",
      dataKey: "calculator.wallFinish.preview.rooms",
      area: { x: 1, y: 1, w: 20, h: 22 },
      minArea: { w: 10, h: 10 },
      priority: 100,
      capabilities: caps({ resizable: true, collapsible: true }),
      children: [
        element("calculator.wall-finish.rooms.card", "list-item", "navigation", "Wall finish room card", {
          dataKey: "calculator.wallFinish.preview.rooms[]",
          critical: true,
          relationships: [{ type: "selects", targetId: ROOM_PARAMS_ID }],
        }),
        field("calculator.wall-finish.rooms.selected", "Room selected toggle", "calculator.wallFinish.state.rooms[].selected", true),
        element("calculator.wall-finish.rooms.metrics", "chip", "summary", "Room wall metrics chips", { dataKey: "calculator.wallFinish.preview.rooms[].summary" }),
        element("calculator.wall-finish.rooms.amount", "metric", "summary", "Room wall finish amount", { dataKey: "calculator.wallFinish.preview.rooms[].total_cost" }),
      ],
      relationships: [{ type: "controls", targetId: ROOM_PARAMS_ID }, { type: "summarizes", targetId: SUMMARY_ID }],
      source: { feature: "calculator/wall-finish", file: "rooms.tsx" },
    },
    {
      id: SIDE_ID,
      parentId: ROOT_ID,
      type: "panel",
      title: "Wall finish right panel scenes",
      dataKey: "calculator.wallFinish.panelMode",
      area: { x: 21, y: 1, w: 10, h: 22 },
      minArea: { w: 7, h: 10 },
      priority: 90,
      capabilities: caps({ resizable: true, collapsible: true }),
      relationships: [{ type: "controls", targetId: ROOM_PARAMS_ID }, { type: "controls", targetId: SETTINGS_ID }, { type: "controls", targetId: TECHMAP_ID }, { type: "controls", targetId: SUMMARY_ID }, { type: "controls", targetId: ESTIMATE_ID }],
      source: { feature: "calculator/wall-finish", file: "summary.tsx" },
    },
    {
      id: ROOM_PARAMS_ID,
      parentId: SIDE_ID,
      type: "form",
      title: "Wall finish room parameters",
      dataKey: "calculator.wallFinish.state.rooms[].zones",
      layoutParticipation: "none",
      capabilities: caps({ copyable: true, collapsible: true }),
      children: [
        element("calculator.wall-finish.room-parameters.zone-row", "list-item", "field", "Wall finish zone row", {
          dataKey: "calculator.wallFinish.state.rooms[].zones[]",
          critical: true,
        }),
        field("calculator.wall-finish.room-parameters.zone-area", "Zone wall area", "calculator.wallFinish.state.rooms[].zones[].area_m2", true),
        select("calculator.wall-finish.room-parameters.covering", "Zone finish", "calculator.wallFinish.state.rooms[].zones[].covering_id", true),
        select("calculator.wall-finish.room-parameters.preparation", "Zone preparation", "calculator.wallFinish.state.rooms[].zones[].preparation_id"),
        select("calculator.wall-finish.room-parameters.layout", "Zone installation", "calculator.wallFinish.state.rooms[].zones[].layout_id"),
        button("calculator.wall-finish.room-parameters.add-zone", "Add wall finish zone"),
        button("calculator.wall-finish.room-parameters.delete-zone", "Delete wall finish zone", "danger-action"),
        field("calculator.wall-finish.room-parameters.manual-area", "Manual wall area", "calculator.wallFinish.state.rooms[].area_m2_override"),
      ],
      relationships: [{ type: "writes", targetId: SUMMARY_ID }, { type: "writes", targetId: ESTIMATE_ID }],
      source: { feature: "calculator/wall-finish", file: "room-parameters.tsx" },
    },
    {
      id: SETTINGS_ID,
      parentId: SIDE_ID,
      type: "form",
      title: "Wall finish global settings",
      dataKey: "calculator.wallFinish.state",
      layoutParticipation: "none",
      capabilities: caps({ copyable: true, collapsible: true }),
      children: [
        field("calculator.wall-finish.settings.preparation", "Preparation toggle", "calculator.wallFinish.state.include_preparation"),
        field("calculator.wall-finish.settings.demolition", "Demolition toggle", "calculator.wallFinish.state.include_demolition"),
        field("calculator.wall-finish.settings.demolition-rate", "Demolition rate", "calculator.wallFinish.state.demolition_price_per_m2"),
        button("calculator.wall-finish.settings.reset", "Reset wall finish edits", "secondary-action"),
      ],
      relationships: [{ type: "writes", targetId: SUMMARY_ID }, { type: "writes", targetId: ESTIMATE_ID }],
      source: { feature: "calculator/wall-finish", file: "settings.tsx" },
    },
    {
      id: TECHMAP_ID,
      parentId: SIDE_ID,
      type: "panel",
      title: "Wall finish techmap panel",
      dataKey: "calculator.wallFinish.techmapMode",
      layoutParticipation: "none",
      capabilities: caps({ collapsible: true }),
      children: [
        element("calculator.wall-finish.techmap.coverings-tab", "button", "navigation", "Finishes tab"),
        element("calculator.wall-finish.techmap.preparations-tab", "button", "navigation", "Preparations tab"),
        element("calculator.wall-finish.techmap.layouts-tab", "button", "navigation", "Installation tab"),
      ],
      relationships: [{ type: "controls", targetId: "calculator.wall-finish.coverings-catalog" }, { type: "controls", targetId: "calculator.wall-finish.preparations-catalog" }, { type: "controls", targetId: "calculator.wall-finish.layouts-catalog" }],
      source: { feature: "calculator/wall-finish", file: "summary.tsx" },
    },
    {
      id: "calculator.wall-finish.coverings-catalog",
      parentId: TECHMAP_ID,
      type: "form",
      title: "Wall finish coverings catalog",
      dataKey: "calculator.wallFinish.detail.coverings",
      layoutParticipation: "none",
      capabilities: caps({ copyable: true }),
      children: [
        element("calculator.wall-finish.coverings-catalog.saved-chip", "chip", "selector", "Saved finish chip", { dataKey: "calculator.wallFinish.detail.coverings[]" }),
        field("calculator.wall-finish.coverings-catalog.title", "Finish title", "calculator.wallFinish.coveringState.title", true),
        field("calculator.wall-finish.coverings-catalog.rates", "Finish rates", "calculator.wallFinish.coveringState.rates", true),
        field("calculator.wall-finish.coverings-catalog.consumables", "Finish consumables", "calculator.wallFinish.coveringState.consumables"),
        button("calculator.wall-finish.coverings-catalog.submit", "Add finish", "submit-action"),
      ],
      relationships: [{ type: "writes", targetId: ROOM_PARAMS_ID }, { type: "writes", targetId: SUMMARY_ID }],
      source: { feature: "calculator/wall-finish", file: "covering.tsx" },
    },
    {
      id: "calculator.wall-finish.preparations-catalog",
      parentId: TECHMAP_ID,
      type: "form",
      title: "Wall finish preparations catalog",
      dataKey: "calculator.wallFinish.detail.preparations",
      layoutParticipation: "none",
      capabilities: caps({ copyable: true }),
      children: [
        element("calculator.wall-finish.preparations-catalog.saved-chip", "chip", "selector", "Saved preparation chip", { dataKey: "calculator.wallFinish.detail.preparations[]" }),
        field("calculator.wall-finish.preparations-catalog.title", "Preparation title", "calculator.wallFinish.preparationState.title", true),
        field("calculator.wall-finish.preparations-catalog.rates", "Preparation rates", "calculator.wallFinish.preparationState.rates"),
        field("calculator.wall-finish.preparations-catalog.consumables", "Preparation consumables", "calculator.wallFinish.preparationState.consumables"),
        button("calculator.wall-finish.preparations-catalog.submit", "Add preparation", "submit-action"),
      ],
      relationships: [{ type: "writes", targetId: ROOM_PARAMS_ID }, { type: "writes", targetId: SUMMARY_ID }],
      source: { feature: "calculator/wall-finish", file: "prepare.tsx" },
    },
    {
      id: "calculator.wall-finish.layouts-catalog",
      parentId: TECHMAP_ID,
      type: "form",
      title: "Wall finish layouts catalog",
      dataKey: "calculator.wallFinish.detail.layouts",
      layoutParticipation: "none",
      capabilities: caps({ copyable: true }),
      children: [
        element("calculator.wall-finish.layouts-catalog.saved-chip", "chip", "selector", "Saved installation chip", { dataKey: "calculator.wallFinish.detail.layouts[]" }),
        field("calculator.wall-finish.layouts-catalog.title", "Installation title", "calculator.wallFinish.layoutState.title", true),
        field("calculator.wall-finish.layouts-catalog.multipliers", "Installation multipliers", "calculator.wallFinish.layoutState.multipliers"),
        field("calculator.wall-finish.layouts-catalog.note", "Installation note", "calculator.wallFinish.layoutState.note"),
        button("calculator.wall-finish.layouts-catalog.submit", "Add installation", "submit-action"),
      ],
      relationships: [{ type: "writes", targetId: ROOM_PARAMS_ID }, { type: "writes", targetId: SUMMARY_ID }],
      source: { feature: "calculator/wall-finish", file: "layout.tsx" },
    },
    {
      id: SUMMARY_ID,
      parentId: SIDE_ID,
      type: "summary",
      title: "Wall finish summary panel",
      dataKey: "calculator.wallFinish.preview.summary",
      layoutParticipation: "none",
      capabilities: caps({ copyable: true, collapsible: true }),
      children: [
        metric("calculator.wall-finish.summary.grand-total", "Grand total", "calculator.wallFinish.preview.summary.grand_total", true),
        metric("calculator.wall-finish.summary.total-area", "Total wall area", "calculator.wallFinish.preview.summary.total_area_m2", true),
        metric("calculator.wall-finish.summary.purchase-area", "Purchase area", "calculator.wallFinish.preview.summary.total_purchase_area_m2"),
        metric("calculator.wall-finish.summary.work-total", "Work total", "calculator.wallFinish.preview.summary.work_total"),
        metric("calculator.wall-finish.summary.material-total", "Material total", "calculator.wallFinish.preview.summary.material_total"),
        element("calculator.wall-finish.summary.autosave", "status", "status", "Autosave state", { dataKey: "calculator.wallFinish.autosaveState" }),
      ],
      source: { feature: "calculator/wall-finish", file: "summary.tsx" },
    },
    {
      id: ESTIMATE_ID,
      parentId: SIDE_ID,
      type: "table",
      title: "Wall finish estimate panel",
      dataKey: "calculator.wallFinish.preview.specification",
      layoutParticipation: "none",
      capabilities: caps({ copyable: true, collapsible: true }),
      children: [
        element("calculator.wall-finish.estimate.work-group", "list-item", "summary", "Work estimate group", { dataKey: "calculator.wallFinish.preview.specification.work" }),
        element("calculator.wall-finish.estimate.material-group", "list-item", "summary", "Material estimate group", { dataKey: "calculator.wallFinish.preview.specification.material" }),
        metric("calculator.wall-finish.estimate.total", "Estimate total", "calculator.wallFinish.preview.specification.total", true),
        element("calculator.wall-finish.estimate.room-row", "list-item", "summary", "Selected room estimate row", { dataKey: "calculator.wallFinish.preview.rooms[].estimate" }),
      ],
      relationships: [{ type: "summarizes", targetId: SUMMARY_ID }],
      source: { feature: "calculator/wall-finish", file: "estimate.tsx" },
    },
  ],
});
