import { defineWorkspaceRegistry, type WorkspaceCapabilityMap, type WorkspaceElementSchema } from "../../../shared/workspace-contract";

const ROOT_ID = "calculator.rooms.workspace";
const EDITOR_ID = "calculator.rooms.editor";
const SIDEBAR_ID = "calculator.rooms.sidebar";
const STATS_ID = "calculator.rooms.stats";

function caps(overrides: Partial<WorkspaceCapabilityMap> = {}): WorkspaceCapabilityMap {
  return {
    movable: false,
    resizable: false,
    deletable: false,
    copyable: false,
    ...overrides,
  };
}

function element(
  id: string,
  type: WorkspaceElementSchema["type"],
  role: WorkspaceElementSchema["role"],
  label: string,
  options: Partial<WorkspaceElementSchema> = {},
): WorkspaceElementSchema {
  return { id, type, role, label, ...options };
}

const field = (id: string, label: string, dataKey: string, critical = false) => element(id, "input", "field", label, { dataKey, critical });
const button = (id: string, label: string, role: WorkspaceElementSchema["role"] = "primary-action") =>
  element(id, "button", role, label);
const metric = (id: string, label: string, dataKey: string, critical = false) => element(id, "metric", "summary", label, { dataKey, critical });

export const calculatorRoomsWorkspaceRegistry = defineWorkspaceRegistry({
  id: "calculator.rooms",
  title: "Calculator rooms workspace",
  description:
    "Room selection, creation and geometry editing surface. Dynamic rows remain children of stable parent blocks.",
  components: [
    {
      id: ROOT_ID,
      type: "workspace",
      title: "Rooms workspace root",
      description: "Parent-only root for the rooms workspace inside the calculator stage.",
      dataKey: "calculator.rooms",
      layoutParticipation: "none",
      capabilities: caps(),
      source: { feature: "calculator/rooms", file: "project/flow.tsx" },
    },
    {
      id: SIDEBAR_ID,
      parentId: ROOT_ID,
      type: "list",
      title: "Rooms sidebar",
      description: "Room list, active room navigation, visible room count and delete confirmation.",
      dataKey: "calculator.project.rooms",
      area: { x: 1, y: 1, w: 9, h: 22 },
      minArea: { w: 6, h: 10 },
      priority: 90,
      capabilities: caps({ resizable: true, collapsible: true }),
      children: [
        element("calculator.rooms.sidebar.room-row", "list-item", "navigation", "Room row", {
          dataKey: "calculator.project.rooms[]",
          critical: true,
          relationships: [{ type: "selects", targetId: EDITOR_ID, note: "Selecting a row changes the active editor." }],
        }),
        element("calculator.rooms.sidebar.delete-room", "confirm", "danger-action", "Delete room", {
          dataKey: "calculator.project.rooms[]",
          critical: true,
          capabilities: { deletable: true },
        }),
        element("calculator.rooms.sidebar.room-metrics", "chip", "summary", "Room row metrics", {
          dataKey: "calculator.project.rooms[].summary",
        }),
        element("calculator.rooms.sidebar.visible-count", "status", "summary", "Visible room count", {
          dataKey: "calculator.project.rooms.length",
        }),
      ],
      relationships: [
        { type: "controls", targetId: EDITOR_ID },
        { type: "controls", targetId: "calculator.rooms.create" },
      ],
      source: { feature: "calculator/rooms", file: "rooms/sidebar.tsx" },
    },
    {
      id: "calculator.rooms.create",
      parentId: SIDEBAR_ID,
      type: "form",
      title: "Room create form",
      description: "Expandable create-room form controlled from the sidebar.",
      dataKey: "calculator.rooms.createRoom",
      layoutParticipation: "none",
      capabilities: caps({ collapsible: true }),
      children: [
        button("calculator.rooms.create.trigger", "Open create room form"),
        field("calculator.rooms.create.name", "Room name", "calculator.rooms.createRoom.name", true),
        field("calculator.rooms.create.ceiling-height", "Ceiling height", "calculator.rooms.createRoom.ceilingHeight"),
        field("calculator.rooms.create.auto-perimeter", "Auto perimeter", "calculator.rooms.createRoom.autoPerimeterCalc"),
        element("calculator.rooms.create.submit", "button", "submit-action", "Create room", {
          critical: true,
          relationships: [{ type: "writes", targetId: SIDEBAR_ID }],
        }),
        button("calculator.rooms.create.cancel", "Cancel create room", "secondary-action"),
      ],
      source: { feature: "calculator/rooms", file: "rooms/create.tsx" },
    },
    {
      id: EDITOR_ID,
      parentId: ROOT_ID,
      type: "editor",
      title: "Room editor",
      description: "Selected room editor shell with autosave, empty/loading states and measured content.",
      dataKey: "calculator.rooms.selectedRoom",
      area: { x: 10, y: 1, w: 21, h: 22 },
      minArea: { w: 12, h: 12 },
      priority: 100,
      capabilities: caps({ resizable: true, copyable: true }),
      children: [
        element("calculator.rooms.editor.autosave", "status", "status", "Autosave state", {
          dataKey: "calculator.rooms.autosaveState",
          critical: true,
        }),
        element("calculator.rooms.editor.empty-state", "status", "status", "Empty or loading editor state"),
      ],
      relationships: [
        { type: "controls", targetId: "calculator.rooms.primary" },
        { type: "summarizes", targetId: STATS_ID },
        { type: "controls", targetId: "calculator.rooms.walls" },
        { type: "controls", targetId: "calculator.rooms.floor-sections" },
        { type: "controls", targetId: "calculator.rooms.openings" },
      ],
      source: { feature: "calculator/rooms", file: "rooms/editor.tsx" },
    },
    {
      id: "calculator.rooms.primary",
      parentId: EDITOR_ID,
      type: "form",
      title: "Room primary fields",
      description: "Base selected-room geometry and perimeter mode.",
      dataKey: "calculator.rooms.selectedRoom.primary",
      layoutParticipation: "none",
      capabilities: caps({ copyable: true }),
      children: [
        field("calculator.rooms.primary.name", "Room name", "calculator.rooms.selectedRoom.name", true),
        field("calculator.rooms.primary.ceiling-height", "Ceiling height", "calculator.rooms.selectedRoom.ceiling_height_m"),
        field("calculator.rooms.primary.manual-floor-area", "Manual floor area", "calculator.rooms.selectedRoom.manual_floor_area_m2"),
        field("calculator.rooms.primary.auto-perimeter", "Auto perimeter", "calculator.rooms.selectedRoom.auto_perimeter_calc"),
        field("calculator.rooms.primary.perimeter-factor", "Perimeter form factor", "calculator.rooms.selectedRoom.perimeter_factor"),
        button("calculator.rooms.primary.perimeter-help", "Perimeter factor help tooltip", "secondary-action"),
      ],
      relationships: [{ type: "writes", targetId: STATS_ID }],
      source: { feature: "calculator/rooms", file: "rooms/primary.tsx" },
    },
    {
      id: STATS_ID,
      parentId: EDITOR_ID,
      type: "summary",
      title: "Room stats summary",
      description: "Calculated room metrics used by the editor and room row summary.",
      dataKey: "calculator.rooms.selectedRoom.stats",
      layoutParticipation: "none",
      capabilities: caps({ copyable: true }),
      children: [
        metric("calculator.rooms.stats.floor-area", "Floor area", "calculator.rooms.selectedRoom.stats.floor_area_m2", true),
        metric("calculator.rooms.stats.wall-gross", "Gross wall area", "calculator.rooms.selectedRoom.stats.wall_area_gross_m2"),
        metric("calculator.rooms.stats.openings-area", "Openings area", "calculator.rooms.selectedRoom.stats.openings_area_m2"),
        metric("calculator.rooms.stats.door-area", "Door area", "calculator.rooms.selectedRoom.stats.door_area_m2"),
        metric("calculator.rooms.stats.wall-net", "Net wall area", "calculator.rooms.selectedRoom.stats.wall_area_net_m2", true),
        metric("calculator.rooms.stats.perimeter", "Perimeter", "calculator.rooms.selectedRoom.stats.perimeter_m"),
      ],
      source: { feature: "calculator/room", file: "room/stats.tsx" },
    },
    {
      id: "calculator.rooms.walls",
      parentId: EDITOR_ID,
      type: "list",
      title: "Room walls panel",
      description: "Dynamic wall list used for manual perimeter measurement.",
      dataKey: "calculator.rooms.selectedRoom.walls_m",
      layoutParticipation: "none",
      capabilities: caps({ copyable: true, collapsible: true }),
      children: [
        button("calculator.rooms.walls.add", "Add wall"),
        element("calculator.rooms.walls.row", "list-item", "field", "Wall length row", {
          dataKey: "calculator.rooms.selectedRoom.walls_m[]",
          critical: true,
        }),
        element("calculator.rooms.walls.delete", "button", "danger-action", "Delete wall", {
          dataKey: "calculator.rooms.selectedRoom.walls_m[]",
          capabilities: { deletable: true },
        }),
      ],
      relationships: [{ type: "writes", targetId: STATS_ID }],
      source: { feature: "calculator/room", file: "room/walls.tsx" },
    },
    {
      id: "calculator.rooms.floor-sections",
      parentId: EDITOR_ID,
      type: "list",
      title: "Room floor sections panel",
      description: "Dynamic floor sections that calculate floor area from length and width pairs.",
      dataKey: "calculator.rooms.selectedRoom.floor_sections",
      layoutParticipation: "none",
      capabilities: caps({ copyable: true, collapsible: true }),
      children: [
        button("calculator.rooms.floor-sections.add", "Add floor section"),
        element("calculator.rooms.floor-sections.row", "list-item", "field", "Floor section row", {
          dataKey: "calculator.rooms.selectedRoom.floor_sections[]",
          critical: true,
        }),
        element("calculator.rooms.floor-sections.delete", "button", "danger-action", "Delete floor section", {
          dataKey: "calculator.rooms.selectedRoom.floor_sections[]",
          capabilities: { deletable: true },
        }),
      ],
      relationships: [{ type: "writes", targetId: STATS_ID }],
      source: { feature: "calculator/room", file: "room/floors.tsx" },
    },
    {
      id: "calculator.rooms.openings",
      parentId: EDITOR_ID,
      type: "list",
      title: "Room openings panel",
      description: "Dynamic windows and openings list subtracted from gross wall area.",
      dataKey: "calculator.rooms.selectedRoom.openings",
      layoutParticipation: "none",
      capabilities: caps({ copyable: true, collapsible: true }),
      children: [
        button("calculator.rooms.openings.add", "Add opening"),
        element("calculator.rooms.openings.row", "list-item", "field", "Opening row", {
          dataKey: "calculator.rooms.selectedRoom.openings[]",
          critical: true,
          children: [
            element("calculator.rooms.openings.type", "select", "selector", "Opening type", {
              dataKey: "calculator.rooms.selectedRoom.openings[].opening_type",
            }),
            field("calculator.rooms.openings.dimensions", "Opening dimensions", "calculator.rooms.selectedRoom.openings[].dimensions"),
            field("calculator.rooms.openings.manual-area", "Opening manual area", "calculator.rooms.selectedRoom.openings[].area_m2"),
            field("calculator.rooms.openings.note", "Opening note", "calculator.rooms.selectedRoom.openings[].note"),
          ],
        }),
        element("calculator.rooms.openings.delete", "button", "danger-action", "Delete opening", {
          dataKey: "calculator.rooms.selectedRoom.openings[]",
          capabilities: { deletable: true },
        }),
      ],
      relationships: [{ type: "writes", targetId: STATS_ID }],
      source: { feature: "calculator/room", file: "room/openings.tsx" },
    },
  ],
});
