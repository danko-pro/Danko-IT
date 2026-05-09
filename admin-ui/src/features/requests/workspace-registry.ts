import { defineWorkspaceRegistry, type WorkspaceCapabilityMap, type WorkspaceElementSchema } from "../../shared/workspace-contract";

const ROOT_ID = "requests.root";
const OVERVIEW_ID = "requests.overview";
const SUMMARY_ID = "requests.overview.summary";
const PRIORITY_ID = "requests.overview.priority";
const SIDE_ID = "requests.overview.side";
const LIST_ID = "requests.list";
const DETAIL_ID = "requests.detail";
const DELIVERY_ID = "requests.detail.delivery";
const ITEMS_ID = "requests.detail.items";
const ITEM_EDITOR_ID = "requests.detail.item-editor";

function caps(overrides: Partial<WorkspaceCapabilityMap> = {}): WorkspaceCapabilityMap {
  return { movable: false, resizable: false, deletable: false, copyable: false, ...overrides };
}

function element(id: string, type: WorkspaceElementSchema["type"], role: WorkspaceElementSchema["role"], label: string, options: Partial<WorkspaceElementSchema> = {}): WorkspaceElementSchema {
  return { id, type, role, label, ...options };
}

const field = (id: string, label: string, dataKey: string, critical = false) => element(id, "input", "field", label, { dataKey, critical });
const metric = (id: string, label: string, dataKey: string, critical = false) => element(id, "metric", "summary", label, { dataKey, critical });
const button = (id: string, label: string, role: WorkspaceElementSchema["role"] = "primary-action") => element(id, "button", role, label);

export const requestsWorkspaceRegistry = defineWorkspaceRegistry({
  id: "requests",
  title: "Requests workspace",
  description: "Logistics request screen workspace for overview, request list, active detail, delivery and item CRUD.",
  components: [
    {
      id: ROOT_ID,
      type: "workspace",
      title: "Requests workspace root",
      dataKey: "requests",
      layoutParticipation: "none",
      capabilities: caps(),
      source: { feature: "requests", file: "screen.tsx" },
    },
    {
      id: OVERVIEW_ID,
      parentId: ROOT_ID,
      type: "workspace",
      title: "Requests overview panel",
      dataKey: "requests.overview",
      area: { x: 1, y: 1, w: 30, h: 10 },
      minArea: { w: 16, h: 7 },
      priority: 80,
      capabilities: caps({ resizable: true, collapsible: true }),
      children: [
        element("requests.overview.reload", "button", "secondary-action", "Reload overview"),
        element("requests.overview.error", "status", "status", "Overview error", { dataKey: "requests.overviewError" }),
      ],
      relationships: [
        { type: "controls", targetId: SUMMARY_ID },
        { type: "controls", targetId: PRIORITY_ID },
        { type: "controls", targetId: SIDE_ID },
      ],
      source: { feature: "requests", file: "overview-panel.tsx" },
    },
    {
      id: SUMMARY_ID,
      parentId: OVERVIEW_ID,
      type: "summary",
      title: "Requests operational summary",
      dataKey: "requests.summary",
      area: { x: 1, y: 1, w: 30, h: 4 },
      minArea: { w: 14, h: 3 },
      priority: 90,
      capabilities: caps({ resizable: true, copyable: true }),
      children: [
        metric("requests.summary.active-drafts", "Active drafts", "requests.summary.active_drafts_count", true),
        metric("requests.summary.awaiting", "Awaiting confirmation", "requests.status.awaiting_confirmation", true),
        metric("requests.summary.confirmed-today", "Confirmed today", "requests.summary.confirmed_today_count"),
        metric("requests.summary.groups", "Active objects", "requests.summary.groups_count"),
        element("requests.summary.status-pill", "status", "status", "Status overview pill", { dataKey: "requests.statusOverview[]" }),
      ],
      source: { feature: "requests", file: "overview-summary-section.tsx" },
    },
    {
      id: PRIORITY_ID,
      parentId: OVERVIEW_ID,
      type: "list",
      title: "Priority requests feed",
      dataKey: "requests.prioritized[]",
      area: { x: 1, y: 5, w: 18, h: 5 },
      minArea: { w: 10, h: 4 },
      priority: 80,
      capabilities: caps({ resizable: true, collapsible: true }),
      children: [
        element("requests.priority.row", "list-item", "summary", "Priority request row", { dataKey: "requests.prioritized[]" }),
        element("requests.priority.status", "status", "status", "Priority request status", { dataKey: "requests.prioritized[].status" }),
        metric("requests.priority.items", "Priority request items count", "requests.prioritized[].items_count"),
      ],
      relationships: [{ type: "summarizes", targetId: LIST_ID }],
      source: { feature: "requests", file: "overview-priority-requests-section.tsx" },
    },
    {
      id: SIDE_ID,
      parentId: OVERVIEW_ID,
      type: "summary",
      title: "Requests side overview",
      dataKey: "requests.sideOverview",
      area: { x: 19, y: 5, w: 12, h: 5 },
      minArea: { w: 8, h: 4 },
      priority: 70,
      capabilities: caps({ resizable: true, collapsible: true }),
      children: [
        metric("requests.side.delivery-start", "Default delivery start", "requests.deliverySettings.delivery_start"),
        metric("requests.side.delivery-end", "Default delivery end", "requests.deliverySettings.delivery_end"),
        element("requests.side.group-row", "list-item", "summary", "Recent group row", { dataKey: "requests.groups[]" }),
        element("requests.side.family-row", "list-item", "summary", "Material family row", { dataKey: "requests.families[]" }),
      ],
      source: { feature: "requests", file: "overview-side-sections.tsx" },
    },
    {
      id: LIST_ID,
      parentId: ROOT_ID,
      type: "list",
      title: "Recent requests list",
      dataKey: "requests.recent[]",
      area: { x: 1, y: 12, w: 12, h: 18 },
      minArea: { w: 9, h: 10 },
      priority: 100,
      capabilities: caps({ resizable: true, collapsible: true }),
      children: [
        button("requests.list.reload", "Reload requests", "secondary-action"),
        element("requests.list.error", "status", "status", "Requests error", { dataKey: "requests.error" }),
        element("requests.list.row", "list-item", "navigation", "Request row", { dataKey: "requests.recent[]" }),
        element("requests.list.status", "status", "status", "Request status badge", { dataKey: "requests.recent[].status", critical: true }),
        button("requests.list.status-action", "Change request status"),
        element("requests.list.delete", "confirm", "danger-action", "Delete request", {
          dataKey: "requests.recent[]",
          capabilities: { deletable: true },
        }),
      ],
      relationships: [{ type: "selects", targetId: DETAIL_ID }, { type: "writes", targetId: SUMMARY_ID }],
      source: { feature: "requests", file: "list-panel.tsx" },
    },
    {
      id: DETAIL_ID,
      parentId: ROOT_ID,
      type: "panel",
      title: "Active request detail",
      dataKey: "requests.requestDetail",
      area: { x: 13, y: 12, w: 18, h: 18 },
      minArea: { w: 11, h: 10 },
      priority: 100,
      capabilities: caps({ resizable: true, collapsible: true, copyable: true }),
      children: [
        metric("requests.detail.master", "Request master", "requests.requestDetail.draft.master_name", true),
        element("requests.detail.status", "status", "status", "Request detail status", { dataKey: "requests.requestDetail.draft.status", critical: true }),
        metric("requests.detail.waiting", "Waiting for", "requests.requestDetail.draft.waiting_for"),
        metric("requests.detail.updated", "Updated at", "requests.requestDetail.draft.updated_at"),
      ],
      relationships: [
        { type: "controls", targetId: DELIVERY_ID },
        { type: "controls", targetId: ITEMS_ID },
        { type: "controls", targetId: ITEM_EDITOR_ID },
      ],
      source: { feature: "requests", file: "detail-panel.tsx" },
    },
    {
      id: DELIVERY_ID,
      parentId: DETAIL_ID,
      type: "form",
      title: "Request delivery form",
      dataKey: "requests.requestDetail.delivery",
      layoutParticipation: "none",
      capabilities: caps({ copyable: true }),
      children: [
        field("requests.delivery.date", "Delivery date", "requests.deliveryEditForm.delivery_date", true),
        field("requests.delivery.time", "Delivery time", "requests.deliveryEditForm.delivery_time", true),
        element("requests.delivery.save", "button", "submit-action", "Save delivery", { critical: true }),
      ],
      relationships: [{ type: "writes", targetId: DETAIL_ID }, { type: "writes", targetId: LIST_ID }],
      source: { feature: "requests", file: "detail-delivery.tsx" },
    },
    {
      id: ITEMS_ID,
      parentId: DETAIL_ID,
      type: "list",
      title: "Request items list",
      dataKey: "requests.requestDetail.items[]",
      layoutParticipation: "none",
      capabilities: caps({ copyable: true, collapsible: true }),
      children: [
        element("requests.items.row", "list-item", "summary", "Request item row", { dataKey: "requests.requestDetail.items[]" }),
        button("requests.items.edit", "Edit request item", "secondary-action"),
        element("requests.items.delete", "confirm", "danger-action", "Delete request item", {
          dataKey: "requests.requestDetail.items[]",
          capabilities: { deletable: true },
        }),
      ],
      relationships: [{ type: "controls", targetId: ITEM_EDITOR_ID }, { type: "writes", targetId: LIST_ID }],
      source: { feature: "requests", file: "detail-items.tsx" },
    },
    {
      id: ITEM_EDITOR_ID,
      parentId: DETAIL_ID,
      type: "form",
      title: "Request item editor",
      dataKey: "requests.itemForm",
      layoutParticipation: "none",
      capabilities: caps({ copyable: true }),
      children: [
        field("requests.item-editor.title", "Item title", "requests.itemForm.title", true),
        field("requests.item-editor.note", "Item note", "requests.itemForm.note"),
        field("requests.item-editor.quantity", "Quantity", "requests.itemForm.quantity"),
        field("requests.item-editor.unit", "Unit", "requests.itemForm.unit"),
        field("requests.item-editor.thickness", "Thickness", "requests.itemForm.thickness_mm"),
        field("requests.item-editor.length", "Length", "requests.itemForm.length_mm"),
        field("requests.item-editor.width", "Width", "requests.itemForm.width_mm"),
        element("requests.item-editor.submit", "button", "submit-action", "Save request item", { critical: true }),
        button("requests.item-editor.cancel", "Cancel request item edit", "secondary-action"),
      ],
      relationships: [{ type: "writes", targetId: ITEMS_ID }, { type: "writes", targetId: LIST_ID }],
      source: { feature: "requests", file: "item-editor.tsx" },
    },
  ],
});
