import { defineWorkspaceRegistry, type WorkspaceCapabilityMap, type WorkspaceElementSchema } from "../../../shared/workspace-contract";

const ROOT_ID = "calculator.project.root";
const WORKSPACE_ID = "calculator.project.workspace";
const KP_ID = "calculator.project.kp";

function caps(overrides: Partial<WorkspaceCapabilityMap> = {}): WorkspaceCapabilityMap {
  return { movable: false, resizable: false, deletable: false, copyable: false, ...overrides };
}

function element(id: string, type: WorkspaceElementSchema["type"], role: WorkspaceElementSchema["role"], label: string, options: Partial<WorkspaceElementSchema> = {}): WorkspaceElementSchema {
  return { id, type, role, label, ...options };
}

const field = (id: string, label: string, dataKey: string, critical = false) => element(id, "input", "field", label, { dataKey, critical });
const note = (id: string, label: string, dataKey: string) => element(id, "textarea", "field", label, { dataKey });
const tab = (id: string, label: string, dataKey: string) => element(id, "button", "navigation", label, { dataKey });
const metric = (id: string, label: string, dataKey: string, critical = false) => element(id, "metric", "summary", label, { dataKey, critical });

export const calculatorProjectWorkspaceRegistry = defineWorkspaceRegistry({
  id: "calculator.project",
  title: "Calculator project workspace",
  description: "Project-level object card, access card and draft workspace for contacts, materials, design, montage and KP.",
  components: [
    {
      id: ROOT_ID,
      type: "workspace",
      title: "Project workspace root",
      dataKey: "calculator.project",
      layoutParticipation: "none",
      capabilities: caps(),
      source: { feature: "calculator/project", file: "stage.tsx" },
    },
    {
      id: "calculator.project.identity",
      parentId: ROOT_ID,
      type: "form",
      title: "Object identity card",
      dataKey: "calculator.project.identity",
      layoutParticipation: "none",
      capabilities: caps({ copyable: true }),
      children: [
        field("calculator.project.identity.name", "Project name", "calculator.project.projectName", true),
        field("calculator.project.identity.complex", "Residential complex", "calculator.project.residentialComplex"),
        field("calculator.project.identity.address", "Address", "calculator.project.projectAddress", true),
        field("calculator.project.identity.entrance", "Entrance section", "calculator.project.entranceSection"),
        field("calculator.project.identity.floor", "Floor number", "calculator.project.floorNumber"),
        field("calculator.project.identity.unit", "Unit number", "calculator.project.unitNumber"),
      ],
      source: { feature: "calculator/screen", file: "header-form.tsx" },
    },
    {
      id: "calculator.project.access",
      parentId: ROOT_ID,
      type: "form",
      title: "Object access card",
      dataKey: "calculator.project.access",
      layoutParticipation: "none",
      capabilities: caps({ copyable: true }),
      children: [
        element("calculator.project.access.lift", "select", "selector", "Lift type", { dataKey: "calculator.project.liftType" }),
        field("calculator.project.access.mode", "Access mode", "calculator.project.accessMode"),
        field("calculator.project.access.intercom", "Intercom code", "calculator.project.intercomCode"),
        field("calculator.project.access.loading", "Loading zone", "calculator.project.loadingZone"),
        field("calculator.project.access.responsible", "Responsible person", "calculator.project.responsiblePerson", true),
        field("calculator.project.access.note", "Project note", "calculator.project.projectNote"),
      ],
      source: { feature: "calculator/screen", file: "header-form.tsx" },
    },
    {
      id: WORKSPACE_ID,
      parentId: ROOT_ID,
      type: "workspace",
      title: "Project stage workspace",
      dataKey: "calculator.project.workspaceDraft",
      area: { x: 1, y: 1, w: 30, h: 22 },
      minArea: { w: 14, h: 10 },
      priority: 100,
      capabilities: caps({ resizable: true, copyable: true }),
      relationships: [{ type: "controls", targetId: "calculator.project.tabs" }, { type: "controls", targetId: KP_ID }],
      source: { feature: "calculator/project", file: "workspace.tsx" },
    },
    {
      id: "calculator.project.tabs",
      parentId: WORKSPACE_ID,
      type: "toolbar",
      title: "Project workspace tabs",
      dataKey: "calculator.project.activeTab",
      layoutParticipation: "none",
      capabilities: caps(),
      children: [
        tab("calculator.project.tabs.contacts", "Contacts tab", "calculator.project.activeTab.contacts"),
        tab("calculator.project.tabs.materials", "Materials tab", "calculator.project.activeTab.materials"),
        tab("calculator.project.tabs.design", "Design tab", "calculator.project.activeTab.design"),
        tab("calculator.project.tabs.montage", "Montage tab", "calculator.project.activeTab.montage"),
        tab("calculator.project.tabs.kp", "KP tab", "calculator.project.activeTab.kp"),
      ],
      relationships: [
        { type: "controls", targetId: "calculator.project.contacts" },
        { type: "controls", targetId: "calculator.project.materials" },
        { type: "controls", targetId: "calculator.project.design" },
        { type: "controls", targetId: "calculator.project.montage" },
        { type: "controls", targetId: KP_ID },
      ],
      source: { feature: "calculator/project", file: "workspace.tsx" },
    },
    {
      id: "calculator.project.contacts",
      parentId: WORKSPACE_ID,
      type: "form",
      title: "Project contacts pane",
      dataKey: "calculator.project.workspaceDraft.contacts",
      layoutParticipation: "none",
      capabilities: caps({ copyable: true }),
      children: [
        field("calculator.project.contacts.client", "Client", "calculator.project.workspaceDraft.clientName", true),
        field("calculator.project.contacts.manager", "Manager", "calculator.project.workspaceDraft.managerName"),
        field("calculator.project.contacts.designer", "Designer", "calculator.project.workspaceDraft.designerName"),
        field("calculator.project.contacts.foreman", "Foreman", "calculator.project.workspaceDraft.foremanName"),
        field("calculator.project.contacts.materials-manager", "Materials manager", "calculator.project.workspaceDraft.materialsManagerName"),
        field("calculator.project.contacts.chat", "Object chat link", "calculator.project.workspaceDraft.objectChatLink"),
      ],
      source: { feature: "calculator/project", file: "contacts.tsx" },
    },
    {
      id: "calculator.project.materials",
      parentId: WORKSPACE_ID,
      type: "form",
      title: "Project materials pane",
      dataKey: "calculator.project.workspaceDraft.materials",
      layoutParticipation: "none",
      capabilities: caps({ copyable: true }),
      children: [
        field("calculator.project.materials.delivery-window", "Delivery window", "calculator.project.workspaceDraft.deliveryWindow"),
        field("calculator.project.materials.unloading", "Unloading contact", "calculator.project.workspaceDraft.unloadingContact"),
        field("calculator.project.materials.loading-details", "Loading details", "calculator.project.workspaceDraft.loadingDetails"),
        note("calculator.project.materials.comment", "Materials comment", "calculator.project.workspaceDraft.materialsComment"),
      ],
      source: { feature: "calculator/project", file: "materials.tsx" },
    },
    {
      id: "calculator.project.design",
      parentId: WORKSPACE_ID,
      type: "form",
      title: "Project design pane",
      dataKey: "calculator.project.workspaceDraft.design",
      layoutParticipation: "none",
      capabilities: caps({ copyable: true }),
      children: [
        field("calculator.project.design.link", "Design project link", "calculator.project.workspaceDraft.designProjectLink"),
        field("calculator.project.design.approval", "Design approval", "calculator.project.workspaceDraft.designApproval"),
        note("calculator.project.design.comment", "Design comment", "calculator.project.workspaceDraft.designComment"),
      ],
      source: { feature: "calculator/project", file: "design.tsx" },
    },
    {
      id: "calculator.project.montage",
      parentId: WORKSPACE_ID,
      type: "form",
      title: "Project montage pane",
      dataKey: "calculator.project.workspaceDraft.montage",
      layoutParticipation: "none",
      capabilities: caps({ copyable: true }),
      children: [
        field("calculator.project.montage.meeting", "Meeting contact", "calculator.project.workspaceDraft.meetingContact"),
        field("calculator.project.montage.access-window", "Access window", "calculator.project.workspaceDraft.accessWindow"),
        field("calculator.project.montage.work-limits", "Work limits", "calculator.project.workspaceDraft.workLimits"),
        note("calculator.project.montage.comment", "Montage comment", "calculator.project.workspaceDraft.montageComment"),
      ],
      source: { feature: "calculator/project", file: "montage.tsx" },
    },
    {
      id: KP_ID,
      parentId: WORKSPACE_ID,
      type: "form",
      title: "Project KP pane",
      dataKey: "calculator.project.workspaceDraft.kp",
      layoutParticipation: "none",
      capabilities: caps({ copyable: true }),
      children: [
        field("calculator.project.kp.version", "KP version", "calculator.project.workspaceDraft.kpVersion"),
        field("calculator.project.kp.status", "KP status", "calculator.project.workspaceDraft.kpStatus"),
        field("calculator.project.kp.recipient", "KP recipient", "calculator.project.workspaceDraft.kpRecipient"),
        note("calculator.project.kp.comment", "KP comment", "calculator.project.workspaceDraft.kpComment"),
      ],
      relationships: [{ type: "controls", targetId: "calculator.project.kp-table" }],
      source: { feature: "calculator/project", file: "kp.tsx" },
    },
    {
      id: "calculator.project.kp-table",
      parentId: KP_ID,
      type: "table",
      title: "Project KP draft table",
      dataKey: "calculator.project.kpRows",
      layoutParticipation: "none",
      capabilities: caps({ copyable: true }),
      children: [
        element("calculator.project.kp-table.row", "list-item", "field", "KP draft row", { dataKey: "calculator.project.kpRows[]" }),
        field("calculator.project.kp-table.quantity", "KP quantity", "calculator.project.kpRows[].quantity"),
        field("calculator.project.kp-table.work-rate", "KP work rate", "calculator.project.kpRows[].workRate"),
        field("calculator.project.kp-table.material-rate", "KP material rate", "calculator.project.kpRows[].materialRate"),
        metric("calculator.project.kp-table.total", "KP total", "calculator.project.kpRows.total", true),
      ],
      source: { feature: "calculator/project", file: "table.tsx" },
    },
  ],
});
