import { defineWorkspaceRegistry, type WorkspaceCapabilityMap, type WorkspaceElementSchema } from "../../../shared/workspace-contract";

const ROOT_ID = "dashboard.contract.root";
const SCENE_ID = "dashboard.contract.finance-scene";
const ADVANCES_ID = "dashboard.contract.advances";
const CONTRACT_ID = "dashboard.contract.panel";
const EDITOR_ID = "dashboard.contract.editor";
const CONTENT_ID = "dashboard.contract.content";
const MILESTONES_ID = "dashboard.contract.milestones";

function caps(overrides: Partial<WorkspaceCapabilityMap> = {}): WorkspaceCapabilityMap {
  return { movable: false, resizable: false, deletable: false, copyable: false, ...overrides };
}

function element(id: string, type: WorkspaceElementSchema["type"], role: WorkspaceElementSchema["role"], label: string, options: Partial<WorkspaceElementSchema> = {}): WorkspaceElementSchema {
  return { id, type, role, label, ...options };
}

const field = (id: string, label: string, dataKey: string, critical = false) => element(id, "input", "field", label, { dataKey, critical });
const button = (id: string, label: string, role: WorkspaceElementSchema["role"] = "primary-action") => element(id, "button", role, label);
const metric = (id: string, label: string, dataKey: string, critical = false) => element(id, "metric", "summary", label, { dataKey, critical });

export const dashboardContractWorkspaceRegistry = defineWorkspaceRegistry({
  id: "dashboard.contract",
  title: "Dashboard contract workspace",
  description: "Finance scene workspace for expenses, advances, contract lifecycle, AI extraction and milestones.",
  components: [
    {
      id: ROOT_ID,
      type: "workspace",
      title: "Dashboard contract workspace root",
      dataKey: "dashboard.project.finance",
      layoutParticipation: "none",
      capabilities: caps(),
      source: { feature: "dashboard/contract", file: "dashboard-finance-scene.tsx" },
    },
    {
      id: SCENE_ID,
      parentId: ROOT_ID,
      type: "workspace",
      title: "Dashboard finance scene",
      dataKey: "dashboard.project.financeScene",
      area: { x: 1, y: 1, w: 30, h: 24 },
      minArea: { w: 16, h: 12 },
      priority: 100,
      capabilities: caps({ resizable: true }),
      relationships: [
        { type: "controls", targetId: "dashboard.contract.expenses" },
        { type: "controls", targetId: ADVANCES_ID },
        { type: "controls", targetId: CONTRACT_ID },
      ],
      source: { feature: "dashboard/scenes", file: "dashboard-finance-scene.tsx" },
    },
    {
      id: "dashboard.contract.expenses",
      parentId: SCENE_ID,
      type: "summary",
      title: "Project expenses panel",
      dataKey: "dashboard.project.expenses",
      area: { x: 1, y: 1, w: 10, h: 22 },
      minArea: { w: 7, h: 10 },
      priority: 80,
      capabilities: caps({ resizable: true, collapsible: true }),
      children: [
        metric("dashboard.contract.expenses.plan", "Planned expenses", "dashboard.project.plannedTotal"),
        metric("dashboard.contract.expenses.actual", "Actual expenses", "dashboard.project.actualTotal"),
        metric("dashboard.contract.expenses.margin", "Planned margin", "dashboard.project.plannedMarginPercent"),
      ],
      source: { feature: "dashboard/card", file: "project-card-expenses-panel.tsx" },
    },
    {
      id: ADVANCES_ID,
      parentId: SCENE_ID,
      type: "list",
      title: "Project advances panel",
      dataKey: "dashboard.project.advances",
      area: { x: 11, y: 1, w: 20, h: 7 },
      minArea: { w: 10, h: 5 },
      priority: 90,
      capabilities: caps({ resizable: true, collapsible: true }),
      children: [
        element("dashboard.contract.advances.row", "list-item", "summary", "Advance row", { dataKey: "dashboard.project.advances[]" }),
        element("dashboard.contract.advances.delete", "button", "danger-action", "Delete advance", {
          dataKey: "dashboard.project.advances[]",
          capabilities: { deletable: true },
        }),
        button("dashboard.contract.advances.toggle-form", "Toggle advance form"),
        field("dashboard.contract.advances.title", "Advance title", "dashboard.project.advanceDraft.title", true),
        field("dashboard.contract.advances.amount", "Advance amount", "dashboard.project.advanceDraft.amount", true),
        field("dashboard.contract.advances.date", "Advance date", "dashboard.project.advanceDraft.date"),
        element("dashboard.contract.advances.submit", "button", "submit-action", "Add advance", { critical: true }),
      ],
      relationships: [{ type: "writes", targetId: CONTRACT_ID }],
      source: { feature: "dashboard/card", file: "project-card-advances-panel.tsx" },
    },
    {
      id: CONTRACT_ID,
      parentId: SCENE_ID,
      type: "panel",
      title: "Contract control panel",
      dataKey: "dashboard.project.contract",
      area: { x: 11, y: 8, w: 20, h: 15 },
      minArea: { w: 10, h: 8 },
      priority: 100,
      capabilities: caps({ resizable: true, collapsible: true, copyable: true }),
      children: [
        button("dashboard.contract.panel.upload", "Upload contract"),
        button("dashboard.contract.panel.extract", "Check AI"),
        button("dashboard.contract.panel.edit", "Toggle contract editor", "secondary-action"),
        button("dashboard.contract.panel.expand", "Expand contract panel", "secondary-action"),
        element("dashboard.contract.panel.sync", "status", "status", "Contract sync state", { dataKey: "dashboard.project.contractSyncState", critical: true }),
      ],
      relationships: [
        { type: "controls", targetId: EDITOR_ID },
        { type: "controls", targetId: CONTENT_ID },
        { type: "summarizes", targetId: MILESTONES_ID },
      ],
      source: { feature: "dashboard/card", file: "project-card-contract-panel.tsx" },
    },
    {
      id: EDITOR_ID,
      parentId: CONTRACT_ID,
      type: "form",
      title: "Contract editor",
      dataKey: "dashboard.project.contractDraft",
      layoutParticipation: "none",
      capabilities: caps({ copyable: true, collapsible: true }),
      children: [
        field("dashboard.contract.editor.title", "Contract title", "dashboard.project.contractDraft.title", true),
        field("dashboard.contract.editor.number", "Contract number", "dashboard.project.contractDraft.number"),
        field("dashboard.contract.editor.signed-at", "Signed date", "dashboard.project.contractDraft.signedAt"),
        field("dashboard.contract.editor.start-date", "Start date", "dashboard.project.contractDraft.startDate"),
        field("dashboard.contract.editor.planned-end", "Planned end date", "dashboard.project.contractDraft.plannedEndDate"),
        field("dashboard.contract.editor.amount", "Contract amount", "dashboard.project.contractDraft.amount", true),
        element("dashboard.contract.editor.advance-terms", "textarea", "field", "Advance terms", { dataKey: "dashboard.project.contractDraft.advanceTerms" }),
        element("dashboard.contract.editor.save", "button", "submit-action", "Save contract", { critical: true }),
        button("dashboard.contract.editor.cancel", "Cancel contract edit", "secondary-action"),
        element("dashboard.contract.editor.delete", "confirm", "danger-action", "Delete contract", {
          dataKey: "dashboard.project.contract",
          capabilities: { deletable: true },
        }),
      ],
      relationships: [{ type: "writes", targetId: CONTENT_ID }, { type: "writes", targetId: MILESTONES_ID }],
      source: { feature: "dashboard/card", file: "project-card-contract-editor.tsx" },
    },
    {
      id: CONTENT_ID,
      parentId: CONTRACT_ID,
      type: "summary",
      title: "Contract read-only content",
      dataKey: "dashboard.project.contract",
      layoutParticipation: "none",
      capabilities: caps({ copyable: true }),
      children: [
        element("dashboard.contract.content.hero", "status", "summary", "Contract hero", { dataKey: "dashboard.project.contract.fileName" }),
        metric("dashboard.contract.content.amount", "Contract amount", "dashboard.project.contract.amount", true),
        metric("dashboard.contract.content.signed-at", "Signed date", "dashboard.project.contract.signedAt"),
        metric("dashboard.contract.content.start-date", "Start date", "dashboard.project.contract.startDate"),
        metric("dashboard.contract.content.planned-end", "Planned end date", "dashboard.project.contract.plannedEndDate"),
        element("dashboard.contract.content.advance-terms", "textarea", "summary", "Advance terms", { dataKey: "dashboard.project.contract.advanceTerms" }),
      ],
      relationships: [{ type: "summarizes", targetId: MILESTONES_ID }],
      source: { feature: "dashboard/card", file: "project-card-contract-content.tsx" },
    },
    {
      id: MILESTONES_ID,
      parentId: CONTRACT_ID,
      type: "list",
      title: "Contract milestones",
      dataKey: "dashboard.project.contract.milestones",
      layoutParticipation: "none",
      capabilities: caps({ copyable: true, collapsible: true }),
      children: [
        element("dashboard.contract.milestones.progress-node", "button", "navigation", "Collapsed progress node", { dataKey: "dashboard.project.contract.milestones[]" }),
        element("dashboard.contract.milestones.row", "list-item", "summary", "Milestone row", { dataKey: "dashboard.project.contract.milestones[]" }),
        element("dashboard.contract.milestones.status", "status", "status", "Milestone status", { dataKey: "dashboard.project.contract.milestones[].status" }),
        button("dashboard.contract.milestones.complete", "Complete active milestone", "primary-action"),
      ],
      relationships: [{ type: "writes", targetId: CONTRACT_ID }],
      source: { feature: "dashboard/card", file: "project-card-contract-milestones.tsx" },
    },
  ],
});
