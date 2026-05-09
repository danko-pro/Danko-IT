import { defineWorkspaceRegistry, type WorkspaceCapabilityMap, type WorkspaceElementSchema } from "../../../shared/workspace-contract";

const ROOT_ID = "dashboard.passport.root";
const SCENE_ID = "dashboard.passport.scene";
const IDENTITY_ID = "dashboard.passport.identity";
const ACCESS_ID = "dashboard.passport.access";
const METRICS_ID = "dashboard.passport.metrics";
const ACTIONS_ID = "dashboard.passport.actions";

function caps(overrides: Partial<WorkspaceCapabilityMap> = {}): WorkspaceCapabilityMap {
  return { movable: false, resizable: false, deletable: false, copyable: false, ...overrides };
}

function element(id: string, type: WorkspaceElementSchema["type"], role: WorkspaceElementSchema["role"], label: string, options: Partial<WorkspaceElementSchema> = {}): WorkspaceElementSchema {
  return { id, type, role, label, ...options };
}

const field = (id: string, label: string, dataKey: string, critical = false) => element(id, "input", "field", label, { dataKey, critical });
const metricField = (id: string, label: string, dataKey: string, critical = false) => element(id, "input", "field", label, { dataKey, critical });

export const dashboardPassportWorkspaceRegistry = defineWorkspaceRegistry({
  id: "dashboard.passport",
  title: "Dashboard passport workspace",
  description: "Project passport scene workspace for object identity, site access, calculation metrics and save state.",
  components: [
    {
      id: ROOT_ID,
      type: "workspace",
      title: "Dashboard passport workspace root",
      dataKey: "dashboard.project.passport",
      layoutParticipation: "none",
      capabilities: caps(),
      source: { feature: "dashboard/passport", file: "dashboard-passport-scene.tsx" },
    },
    {
      id: SCENE_ID,
      parentId: ROOT_ID,
      type: "workspace",
      title: "Dashboard passport scene",
      dataKey: "dashboard.project.passportDraft",
      area: { x: 1, y: 1, w: 30, h: 22 },
      minArea: { w: 16, h: 12 },
      priority: 100,
      capabilities: caps({ resizable: true }),
      relationships: [
        { type: "controls", targetId: IDENTITY_ID },
        { type: "controls", targetId: ACCESS_ID },
        { type: "controls", targetId: METRICS_ID },
        { type: "controls", targetId: ACTIONS_ID },
      ],
      source: { feature: "dashboard/scenes", file: "dashboard-passport-scene.tsx" },
    },
    {
      id: IDENTITY_ID,
      parentId: SCENE_ID,
      type: "form",
      title: "Object identity section",
      dataKey: "dashboard.project.passport.identity",
      area: { x: 1, y: 1, w: 20, h: 9 },
      minArea: { w: 12, h: 6 },
      priority: 90,
      capabilities: caps({ resizable: true, copyable: true }),
      children: [
        field("dashboard.passport.identity.code", "Object code", "dashboard.project.passportDraft.code", true),
        field("dashboard.passport.identity.name", "Project name", "dashboard.project.passportDraft.name", true),
        field("dashboard.passport.identity.address", "Address", "dashboard.project.passportDraft.address", true),
        field("dashboard.passport.identity.entrance", "Entrance or section", "dashboard.project.passportDraft.entranceSection"),
        field("dashboard.passport.identity.apartment", "Apartment", "dashboard.project.passportDraft.apartment"),
        field("dashboard.passport.identity.floor", "Floor", "dashboard.project.passportDraft.floor"),
      ],
      relationships: [{ type: "writes", targetId: ACTIONS_ID }],
      source: { feature: "dashboard/scenes", file: "dashboard-passport-identity-section.tsx" },
    },
    {
      id: ACCESS_ID,
      parentId: SCENE_ID,
      type: "form",
      title: "Object access section",
      dataKey: "dashboard.project.passport.access",
      area: { x: 1, y: 10, w: 20, h: 10 },
      minArea: { w: 12, h: 7 },
      priority: 80,
      capabilities: caps({ resizable: true, copyable: true }),
      children: [
        element("dashboard.passport.access.elevator", "input", "field", "Elevator availability", {
          dataKey: "dashboard.project.passportDraft.hasElevator",
        }),
        field("dashboard.passport.access.hours", "Access hours", "dashboard.project.passportDraft.accessHours"),
        field("dashboard.passport.access.site", "Site access", "dashboard.project.passportDraft.siteAccess"),
        field("dashboard.passport.access.intercom", "Intercom code", "dashboard.project.passportDraft.intercomCode"),
        field("dashboard.passport.access.responsible", "Responsible person", "dashboard.project.passportDraft.responsiblePerson", true),
        element("dashboard.passport.access.comment", "textarea", "field", "Object access comment", {
          dataKey: "dashboard.project.passportDraft.comment",
        }),
      ],
      relationships: [{ type: "writes", targetId: ACTIONS_ID }],
      source: { feature: "dashboard/scenes", file: "dashboard-passport-access-section.tsx" },
    },
    {
      id: METRICS_ID,
      parentId: SCENE_ID,
      type: "form",
      title: "Object metrics section",
      dataKey: "dashboard.project.passport.metrics",
      area: { x: 21, y: 1, w: 10, h: 12 },
      minArea: { w: 8, h: 8 },
      priority: 90,
      capabilities: caps({ resizable: true, copyable: true, collapsible: true }),
      children: [
        metricField("dashboard.passport.metrics.area", "Apartment area", "dashboard.project.passportDraft.areaM2", true),
        metricField("dashboard.passport.metrics.rooms", "Room count", "dashboard.project.passportDraft.roomCount", true),
        metricField("dashboard.passport.metrics.ceiling", "Ceiling height", "dashboard.project.passportDraft.ceilingHeightM", true),
        metricField("dashboard.passport.metrics.margin", "Planned margin", "dashboard.project.passportDraft.plannedMarginPercent", true),
      ],
      relationships: [{ type: "writes", targetId: ACTIONS_ID }],
      source: { feature: "dashboard/scenes", file: "dashboard-passport-metrics-section.tsx" },
    },
    {
      id: ACTIONS_ID,
      parentId: SCENE_ID,
      type: "toolbar",
      title: "Passport save actions",
      dataKey: "dashboard.project.passportSaveState",
      area: { x: 21, y: 14, w: 10, h: 6 },
      minArea: { w: 8, h: 4 },
      priority: 100,
      capabilities: caps({ resizable: true }),
      children: [
        element("dashboard.passport.actions.status", "status", "status", "Passport save status", {
          dataKey: "dashboard.project.passportSaveState",
          critical: true,
        }),
        element("dashboard.passport.actions.save", "button", "submit-action", "Save passport", { critical: true }),
      ],
      relationships: [{ type: "writes", targetId: SCENE_ID }],
      source: { feature: "dashboard/scenes", file: "dashboard-passport-actions.tsx" },
    },
  ],
});
