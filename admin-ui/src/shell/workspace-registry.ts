import { defineWorkspaceRegistry, type WorkspaceCapabilityMap, type WorkspaceElementSchema } from "../shared/workspace-contract";
import { appPageRegistry, getSidebarAppPages, type AppPageRegistryItem } from "./page-registry";

const ROOT_ID = "shell.root";
const FRAME_ID = "shell.frame";
const SIDEBAR_ID = "shell.sidebar";
const ROUTER_ID = "shell.screen-router";
const HEADER_ID = "shell.header";
const FOOTER_ID = "shell.footer";
const CALCULATOR_PROJECTS_ID = "shell.sidebar.calculator-projects";
const AUTH_GATE_ID = "shell.auth-gate";

function caps(overrides: Partial<WorkspaceCapabilityMap> = {}): WorkspaceCapabilityMap {
  return { movable: false, resizable: false, deletable: false, copyable: false, ...overrides };
}

function element(id: string, type: WorkspaceElementSchema["type"], role: WorkspaceElementSchema["role"], label: string, options: Partial<WorkspaceElementSchema> = {}): WorkspaceElementSchema {
  return { id, type, role, label, ...options };
}

function navItem(page: AppPageRegistryItem): WorkspaceElementSchema {
  return element(page.navigationElementId, "button", "navigation", page.navigationLabel, {
    dataKey: `shell.screen.${page.screen}`,
    critical: true,
    relationships: [{ type: "selects", targetId: page.routeElementId }],
  });
}

function routeItem(page: AppPageRegistryItem): WorkspaceElementSchema {
  return element(page.routeElementId, "status", "navigation", `${page.navigationLabel} route`, {
    dataKey: page.routeDataKey,
  });
}

export const shellWorkspaceRegistry = defineWorkspaceRegistry({
  id: "shell",
  title: "Application shell workspace",
  description: "Top-level managed shell for navigation, route outlet, header, auth gate and footer.",
  components: [
    {
      id: ROOT_ID,
      type: "workspace",
      title: "Application shell root",
      dataKey: "shell",
      layoutParticipation: "none",
      capabilities: caps(),
      source: { feature: "shell", file: "App.tsx" },
    },
    {
      id: FRAME_ID,
      parentId: ROOT_ID,
      type: "workspace",
      title: "Application shell frame",
      dataKey: "shell.frame",
      area: { x: 1, y: 1, w: 32, h: 30 },
      minArea: { w: 18, h: 18 },
      priority: 100,
      capabilities: caps({ resizable: true }),
      relationships: [
        { type: "controls", targetId: SIDEBAR_ID },
        { type: "controls", targetId: HEADER_ID },
        { type: "controls", targetId: ROUTER_ID },
        { type: "controls", targetId: FOOTER_ID },
      ],
      source: { feature: "shell", file: "App.tsx" },
    },
    {
      id: SIDEBAR_ID,
      parentId: FRAME_ID,
      type: "panel",
      title: "Application navigation sidebar",
      dataKey: "shell.navigation",
      area: { x: 1, y: 1, w: 5, h: 26 },
      minArea: { w: 4, h: 14 },
      maxArea: { w: 9, h: 30 },
      priority: 100,
      capabilities: caps({ movable: true, resizable: true, collapsible: true }),
      children: [
        element("shell.sidebar.brand", "status", "summary", "Danko IT brand", { dataKey: "shell.brand" }),
        ...getSidebarAppPages().map((page) => navItem(page)),
      ],
      relationships: [
        { type: "selects", targetId: ROUTER_ID },
        { type: "controls", targetId: CALCULATOR_PROJECTS_ID },
      ],
      source: { feature: "shell", file: "sidebar.tsx" },
    },
    {
      id: CALCULATOR_PROJECTS_ID,
      parentId: SIDEBAR_ID,
      type: "list",
      title: "Calculator project quick navigation",
      dataKey: "calculator.projects[]",
      layoutParticipation: "conditional",
      area: { x: 1, y: 8, w: 5, h: 11 },
      minArea: { w: 4, h: 5 },
      priority: 80,
      capabilities: caps({ resizable: true, collapsible: true }),
      children: [
        element("shell.sidebar.calculator-project", "list-item", "navigation", "Calculator project row", {
          dataKey: "calculator.projects[]",
          relationships: [{ type: "selects", targetId: "shell.route.calculator" }],
        }),
        element("shell.sidebar.calculator-project.add", "button", "primary-action", "Create calculator project", {
          dataKey: "calculator.project.create",
          critical: true,
        }),
      ],
      relationships: [{ type: "selects", targetId: ROUTER_ID }],
      source: { feature: "shell", file: "sidebar.tsx" },
    },
    {
      id: HEADER_ID,
      parentId: FRAME_ID,
      type: "toolbar",
      title: "Screen header",
      dataKey: "shell.header",
      area: { x: 6, y: 1, w: 27, h: 4 },
      minArea: { w: 12, h: 3 },
      priority: 80,
      capabilities: caps({ movable: true, resizable: true, collapsible: true }),
      children: [
        element("shell.header.eyebrow", "status", "summary", "Screen eyebrow", { dataKey: "shell.activeNavigation.label" }),
        element("shell.header.title", "status", "summary", "Screen title", { dataKey: "shell.activeScreenTitle", critical: true }),
        element("shell.header.terms", "metric", "summary", "Unknown terms signal", {
          dataKey: "summary.new_unknown_terms_count",
        }),
        element("shell.header.success", "status", "status", "Success message", { dataKey: "shell.successMessage" }),
      ],
      relationships: [{ type: "summarizes", targetId: ROUTER_ID }],
      source: { feature: "shell", file: "header.tsx" },
    },
    {
      id: ROUTER_ID,
      parentId: FRAME_ID,
      type: "stage",
      title: "Screen router outlet",
      dataKey: "shell.screen",
      area: { x: 6, y: 5, w: 27, h: 22 },
      minArea: { w: 12, h: 10 },
      priority: 100,
      capabilities: caps({ movable: true, resizable: true }),
      children: [
        ...appPageRegistry.map((page) => routeItem(page)),
        element("shell.route.loader", "status", "status", "Lazy screen loader", { dataKey: "shell.screenLoader" }),
      ],
      relationships: [
        { type: "depends-on", targetId: SIDEBAR_ID },
        { type: "depends-on", targetId: HEADER_ID },
      ],
      source: { feature: "shell", file: "screen-router.tsx" },
    },
    {
      id: FOOTER_ID,
      parentId: FRAME_ID,
      type: "toolbar",
      title: "Application footer",
      dataKey: "shell.footer",
      area: { x: 1, y: 27, w: 32, h: 3 },
      minArea: { w: 14, h: 2 },
      priority: 60,
      capabilities: caps({ movable: true, resizable: true, collapsible: true }),
      children: [
        element("shell.footer.api-status", "status", "status", "API status", { dataKey: "shell.loading" }),
        element("shell.footer.auth-status", "status", "status", "Auth status", { dataKey: "shell.authSession" }),
        element("shell.footer.stack", "chip", "summary", "Runtime stack", { dataKey: "shell.runtimeStack" }),
        element("shell.footer.logout", "button", "secondary-action", "Logout", { dataKey: "shell.auth.logout" }),
      ],
      source: { feature: "shell", file: "footer.tsx" },
    },
    {
      id: AUTH_GATE_ID,
      parentId: FRAME_ID,
      type: "form",
      title: "Authentication gate",
      dataKey: "shell.auth",
      layoutParticipation: "conditional",
      area: { x: 1, y: 1, w: 32, h: 26 },
      minArea: { w: 14, h: 10 },
      priority: 100,
      capabilities: caps({ resizable: true }),
      children: [
        element("shell.auth.password", "input", "field", "Admin password", { dataKey: "shell.auth.password", critical: true }),
        element("shell.auth.submit", "button", "submit-action", "Login", { dataKey: "shell.auth.login", critical: true }),
        element("shell.auth.error", "status", "status", "Auth error", { dataKey: "shell.authError" }),
      ],
      relationships: [{ type: "controls", targetId: ROUTER_ID }],
      source: { feature: "auth", file: "screen.tsx" },
    },
  ],
});
