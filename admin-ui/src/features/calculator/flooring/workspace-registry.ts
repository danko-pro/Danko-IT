import { defineWorkspaceRegistry, type WorkspaceCapabilityMap, type WorkspaceElementSchema } from "../../../shared/workspace-contract";

const ROOT_ID = "calculator.flooring.workspace";
const MODES_ID = "calculator.flooring.mode-tabs";
const ROOMS_ID = "calculator.flooring.rooms";
const SIDE_ID = "calculator.flooring.side-panel";
const ROOM_PARAMS_ID = "calculator.flooring.room-parameters";
const SETTINGS_ID = "calculator.flooring.settings";
const TECHMAP_ID = "calculator.flooring.techmap";
const SUMMARY_ID = "calculator.flooring.summary";
const ESTIMATE_ID = "calculator.flooring.estimate";

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

export const calculatorFlooringWorkspaceRegistry = defineWorkspaceRegistry({
  id: "calculator.flooring",
  title: "Calculator flooring workspace",
  description: "Flooring stage map for room selection, right-panel scenes, techmap catalogs, summary and estimate.",
  components: [
    {
      id: ROOT_ID,
      type: "workspace",
      title: "Flooring workspace root",
      dataKey: "calculator.flooring",
      layoutParticipation: "none",
      capabilities: caps(),
      source: { feature: "calculator/flooring", file: "stage.tsx" },
    },
    {
      id: MODES_ID,
      parentId: ROOT_ID,
      type: "toolbar",
      title: "Flooring panel mode tabs",
      dataKey: "calculator.flooring.panelMode",
      layoutParticipation: "none",
      capabilities: caps(),
      children: [
        element("calculator.flooring.mode-tabs.room", "button", "navigation", "Room mode", { dataKey: "calculator.flooring.panelMode.room" }),
        element("calculator.flooring.mode-tabs.settings", "button", "navigation", "Settings mode", { dataKey: "calculator.flooring.panelMode.settings" }),
        element("calculator.flooring.mode-tabs.techmap", "button", "navigation", "Techmap mode", { dataKey: "calculator.flooring.panelMode.techmap" }),
        element("calculator.flooring.mode-tabs.summary", "button", "navigation", "Summary mode", { dataKey: "calculator.flooring.panelMode.summary" }),
        element("calculator.flooring.mode-tabs.estimate", "button", "navigation", "Estimate mode", { dataKey: "calculator.flooring.panelMode.estimate" }),
      ],
      relationships: [{ type: "controls", targetId: SIDE_ID }],
      source: { feature: "calculator/flooring", file: "stage.tsx" },
    },
    {
      id: ROOMS_ID,
      parentId: ROOT_ID,
      type: "list",
      title: "Flooring rooms panel",
      dataKey: "calculator.flooring.preview.rooms",
      area: { x: 1, y: 1, w: 20, h: 22 },
      minArea: { w: 10, h: 10 },
      priority: 100,
      capabilities: caps({ resizable: true, collapsible: true }),
      children: [
        element("calculator.flooring.rooms.card", "list-item", "navigation", "Flooring room card", {
          dataKey: "calculator.flooring.preview.rooms[]",
          critical: true,
          relationships: [{ type: "selects", targetId: ROOM_PARAMS_ID }],
        }),
        field("calculator.flooring.rooms.selected", "Room selected toggle", "calculator.flooring.state.rooms[].selected", true),
        element("calculator.flooring.rooms.metrics", "chip", "summary", "Room metrics chips", { dataKey: "calculator.flooring.preview.rooms[].summary" }),
        element("calculator.flooring.rooms.amount", "metric", "summary", "Room total amount", { dataKey: "calculator.flooring.preview.rooms[].total_cost" }),
      ],
      relationships: [{ type: "controls", targetId: ROOM_PARAMS_ID }, { type: "summarizes", targetId: SUMMARY_ID }],
      source: { feature: "calculator/flooring", file: "rooms.tsx" },
    },
    {
      id: SIDE_ID,
      parentId: ROOT_ID,
      type: "panel",
      title: "Flooring right panel scenes",
      dataKey: "calculator.flooring.panelMode",
      area: { x: 21, y: 1, w: 10, h: 22 },
      minArea: { w: 7, h: 10 },
      priority: 90,
      capabilities: caps({ resizable: true, collapsible: true }),
      relationships: [{ type: "controls", targetId: ROOM_PARAMS_ID }, { type: "controls", targetId: SETTINGS_ID }, { type: "controls", targetId: TECHMAP_ID }, { type: "controls", targetId: SUMMARY_ID }, { type: "controls", targetId: ESTIMATE_ID }],
      source: { feature: "calculator/flooring", file: "summary.tsx" },
    },
    {
      id: ROOM_PARAMS_ID,
      parentId: SIDE_ID,
      type: "form",
      title: "Flooring room parameters",
      dataKey: "calculator.flooring.state.rooms[].zones",
      layoutParticipation: "none",
      capabilities: caps({ copyable: true, collapsible: true }),
      children: [
        element("calculator.flooring.room-parameters.zone-row", "list-item", "field", "Coverage zone row", {
          dataKey: "calculator.flooring.state.rooms[].zones[]",
          critical: true,
        }),
        field("calculator.flooring.room-parameters.zone-area", "Zone area", "calculator.flooring.state.rooms[].zones[].area_m2", true),
        select("calculator.flooring.room-parameters.covering", "Zone covering", "calculator.flooring.state.rooms[].zones[].covering_id", true),
        select("calculator.flooring.room-parameters.preparation", "Zone preparation", "calculator.flooring.state.rooms[].zones[].preparation_id"),
        select("calculator.flooring.room-parameters.layout", "Zone layout", "calculator.flooring.state.rooms[].zones[].layout_id"),
        button("calculator.flooring.room-parameters.add-zone", "Add zone"),
        button("calculator.flooring.room-parameters.delete-zone", "Delete zone", "danger-action"),
        field("calculator.flooring.room-parameters.plinth", "Plinth override", "calculator.flooring.state.rooms[].plinth_m_override"),
      ],
      relationships: [{ type: "writes", targetId: SUMMARY_ID }, { type: "writes", targetId: ESTIMATE_ID }],
      source: { feature: "calculator/flooring", file: "room-parameters.tsx" },
    },
    {
      id: SETTINGS_ID,
      parentId: SIDE_ID,
      type: "form",
      title: "Flooring global settings",
      dataKey: "calculator.flooring.state",
      layoutParticipation: "none",
      capabilities: caps({ copyable: true, collapsible: true }),
      children: [
        field("calculator.flooring.settings.demolition", "Demolition toggle", "calculator.flooring.state.include_demolition"),
        field("calculator.flooring.settings.preparation", "Preparation toggle", "calculator.flooring.state.include_preparation"),
        field("calculator.flooring.settings.underlay", "Underlay toggle", "calculator.flooring.state.include_underlay"),
        field("calculator.flooring.settings.plinth", "Plinth toggle", "calculator.flooring.state.include_plinth"),
        field("calculator.flooring.settings.rates", "Global rates", "calculator.flooring.state.rates"),
        element("calculator.flooring.settings.global-item", "list-item", "field", "Global quick item", { dataKey: "calculator.flooring.state.global_items[]" }),
        button("calculator.flooring.settings.add-global-item", "Add global item"),
        button("calculator.flooring.settings.delete-global-item", "Delete global item", "danger-action"),
        button("calculator.flooring.settings.reset", "Reset flooring edits", "secondary-action"),
      ],
      relationships: [{ type: "writes", targetId: SUMMARY_ID }, { type: "writes", targetId: ESTIMATE_ID }],
      source: { feature: "calculator/flooring", file: "settings.tsx" },
    },
    {
      id: TECHMAP_ID,
      parentId: SIDE_ID,
      type: "panel",
      title: "Flooring techmap panel",
      dataKey: "calculator.flooring.techmapMode",
      layoutParticipation: "none",
      capabilities: caps({ collapsible: true }),
      children: [
        element("calculator.flooring.techmap.coverings-tab", "button", "navigation", "Coverings tab"),
        element("calculator.flooring.techmap.preparations-tab", "button", "navigation", "Preparations tab"),
        element("calculator.flooring.techmap.layouts-tab", "button", "navigation", "Layouts tab"),
      ],
      relationships: [{ type: "controls", targetId: "calculator.flooring.coverings-catalog" }, { type: "controls", targetId: "calculator.flooring.preparations-catalog" }, { type: "controls", targetId: "calculator.flooring.layouts-catalog" }],
      source: { feature: "calculator/flooring", file: "summary.tsx" },
    },
    {
      id: "calculator.flooring.coverings-catalog",
      parentId: TECHMAP_ID,
      type: "form",
      title: "Flooring coverings catalog",
      dataKey: "calculator.flooring.detail.coverings",
      layoutParticipation: "none",
      capabilities: caps({ copyable: true }),
      children: [
        element("calculator.flooring.coverings-catalog.saved-chip", "chip", "selector", "Saved covering chip", { dataKey: "calculator.flooring.detail.coverings[]" }),
        field("calculator.flooring.coverings-catalog.title", "Covering title", "calculator.flooring.coveringState.title", true),
        field("calculator.flooring.coverings-catalog.rates", "Covering rates", "calculator.flooring.coveringState.rates", true),
        field("calculator.flooring.coverings-catalog.consumables", "Covering consumables", "calculator.flooring.coveringState.consumables"),
        button("calculator.flooring.coverings-catalog.submit", "Add covering", "submit-action"),
      ],
      relationships: [{ type: "writes", targetId: ROOM_PARAMS_ID }, { type: "writes", targetId: SUMMARY_ID }],
      source: { feature: "calculator/flooring", file: "covering.tsx" },
    },
    {
      id: "calculator.flooring.preparations-catalog",
      parentId: TECHMAP_ID,
      type: "form",
      title: "Flooring preparations catalog",
      dataKey: "calculator.flooring.detail.preparations",
      layoutParticipation: "none",
      capabilities: caps({ copyable: true }),
      children: [
        element("calculator.flooring.preparations-catalog.saved-chip", "chip", "selector", "Saved preparation chip", { dataKey: "calculator.flooring.detail.preparations[]" }),
        field("calculator.flooring.preparations-catalog.title", "Preparation title", "calculator.flooring.preparationState.title", true),
        field("calculator.flooring.preparations-catalog.rates", "Preparation rates", "calculator.flooring.preparationState.rates"),
        field("calculator.flooring.preparations-catalog.consumables", "Preparation consumables", "calculator.flooring.preparationState.consumables"),
        button("calculator.flooring.preparations-catalog.submit", "Add preparation", "submit-action"),
      ],
      relationships: [{ type: "writes", targetId: ROOM_PARAMS_ID }, { type: "writes", targetId: SUMMARY_ID }],
      source: { feature: "calculator/flooring", file: "prepare.tsx" },
    },
    {
      id: "calculator.flooring.layouts-catalog",
      parentId: TECHMAP_ID,
      type: "form",
      title: "Flooring layouts catalog",
      dataKey: "calculator.flooring.detail.layouts",
      layoutParticipation: "none",
      capabilities: caps({ copyable: true }),
      children: [
        element("calculator.flooring.layouts-catalog.saved-chip", "chip", "selector", "Saved layout chip", { dataKey: "calculator.flooring.detail.layouts[]" }),
        field("calculator.flooring.layouts-catalog.title", "Layout title", "calculator.flooring.layoutState.title", true),
        field("calculator.flooring.layouts-catalog.multipliers", "Layout multipliers", "calculator.flooring.layoutState.multipliers"),
        field("calculator.flooring.layouts-catalog.note", "Layout note", "calculator.flooring.layoutState.note"),
        button("calculator.flooring.layouts-catalog.submit", "Add layout", "submit-action"),
      ],
      relationships: [{ type: "writes", targetId: ROOM_PARAMS_ID }, { type: "writes", targetId: SUMMARY_ID }],
      source: { feature: "calculator/flooring", file: "layout.tsx" },
    },
    {
      id: SUMMARY_ID,
      parentId: SIDE_ID,
      type: "summary",
      title: "Flooring summary panel",
      dataKey: "calculator.flooring.preview.summary",
      layoutParticipation: "none",
      capabilities: caps({ copyable: true, collapsible: true }),
      children: [
        metric("calculator.flooring.summary.grand-total", "Grand total", "calculator.flooring.preview.summary.grand_total", true),
        metric("calculator.flooring.summary.total-area", "Total area", "calculator.flooring.preview.summary.total_area_m2", true),
        metric("calculator.flooring.summary.purchase-area", "Purchase area", "calculator.flooring.preview.summary.total_purchase_area_m2"),
        metric("calculator.flooring.summary.work-total", "Work total", "calculator.flooring.preview.summary.work_total"),
        metric("calculator.flooring.summary.material-total", "Material total", "calculator.flooring.preview.summary.material_total"),
        element("calculator.flooring.summary.autosave", "status", "status", "Autosave state", { dataKey: "calculator.flooring.autosaveState" }),
      ],
      source: { feature: "calculator/flooring", file: "summary.tsx" },
    },
    {
      id: ESTIMATE_ID,
      parentId: SIDE_ID,
      type: "table",
      title: "Flooring estimate panel",
      dataKey: "calculator.flooring.preview.specification",
      layoutParticipation: "none",
      capabilities: caps({ copyable: true, collapsible: true }),
      children: [
        element("calculator.flooring.estimate.work-group", "list-item", "summary", "Work estimate group", { dataKey: "calculator.flooring.preview.specification.work" }),
        element("calculator.flooring.estimate.material-group", "list-item", "summary", "Material estimate group", { dataKey: "calculator.flooring.preview.specification.material" }),
        metric("calculator.flooring.estimate.total", "Estimate total", "calculator.flooring.preview.specification.total", true),
        element("calculator.flooring.estimate.room-row", "list-item", "summary", "Selected room estimate row", { dataKey: "calculator.flooring.preview.rooms[].estimate" }),
      ],
      relationships: [{ type: "summarizes", targetId: SUMMARY_ID }],
      source: { feature: "calculator/flooring", file: "estimate.tsx" },
    },
  ],
});
