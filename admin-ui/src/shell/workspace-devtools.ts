import {
  appWorkspaceAdapterSnapshots,
  getAppWorkspaceAdapterSnapshot,
  getAppWorkspaceCompositionInput,
  getAppWorkspaceRuntimeSnapshot,
} from "./workspace-catalog";
import type {
  CreateWorkspaceCompositionInputOptions,
  CreateWorkspaceRuntimeSnapshotOptions,
  WorkspaceAdapterSnapshot,
  WorkspaceCompositionInput,
  WorkspaceRuntimeSnapshot,
} from "../shared/workspace-adapter";
import {
  createNavigationEngineInput,
  type CreateNavigationEngineInputOptions,
  type NavigationEngineInput,
} from "./navigation-engine";

type WorkspaceDevtoolsSummary = {
  id: string;
  title: string;
  registryIds: string[];
  componentCount: number;
  elementCount: number;
  layoutItemCount: number;
  valid: boolean;
};

type WorkspaceDevtools = {
  list: () => WorkspaceDevtoolsSummary[];
  adapter: (id: string) => WorkspaceAdapterSnapshot | null;
  runtime: (id: string, options?: CreateWorkspaceRuntimeSnapshotOptions) => WorkspaceRuntimeSnapshot | null;
  composition: (
    id: string,
    runtimeOptions?: CreateWorkspaceRuntimeSnapshotOptions,
    compositionOptions?: CreateWorkspaceCompositionInputOptions,
  ) => WorkspaceCompositionInput | null;
  navigation: (options?: CreateNavigationEngineInputOptions) => NavigationEngineInput;
  shellCalculator: () => WorkspaceCompositionInput | null;
  calculator: () => WorkspaceCompositionInput | null;
};

declare global {
  interface Window {
    __ADMIN_UI_WORKSPACE__?: WorkspaceDevtools;
  }
}

const shellCompositionOverrides: NonNullable<CreateWorkspaceCompositionInputOptions["contentTypeOverrides"]> = {
  "shell.header": "header",
  "shell.sidebar": "sidebar",
  "shell.sidebar.calculator-projects": "sidebar",
  "shell.screen-router": "content",
  "shell.footer": "control",
  "shell.auth-gate": "control",
};

function clone<T>(value: T): T {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

function summarizeSnapshot(snapshot: WorkspaceAdapterSnapshot): WorkspaceDevtoolsSummary {
  return {
    id: snapshot.id,
    title: snapshot.title,
    registryIds: snapshot.meta.registryIds,
    componentCount: snapshot.meta.componentCount,
    elementCount: snapshot.meta.elementCount,
    layoutItemCount: snapshot.layoutItems.length,
    valid: snapshot.meta.valid,
  };
}

function renderJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function installWorkspaceProbePanel(devtools: WorkspaceDevtools) {
  if (!window.location.search.includes("workspaceProbe=1")) {
    return;
  }

  const panel = document.createElement("section");
  panel.setAttribute("data-workspace-probe", "true");
  panel.style.cssText = [
    "position:fixed",
    "right:16px",
    "bottom:16px",
    "z-index:2147483647",
    "width:min(760px,calc(100vw - 32px))",
    "max-height:min(720px,calc(100vh - 32px))",
    "display:flex",
    "flex-direction:column",
    "gap:10px",
    "padding:12px",
    "border:1px solid rgba(14,165,233,0.35)",
    "border-radius:12px",
    "background:rgba(2,8,23,0.96)",
    "color:#e2e8f0",
    "box-shadow:0 18px 60px rgba(0,0,0,0.4)",
    "font:12px ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace",
  ].join(";");

  const title = document.createElement("div");
  title.textContent = "admin-ui workspace probe";
  title.style.cssText = "font-weight:700;color:#67e8f9;";

  const controls = document.createElement("div");
  controls.style.cssText = "display:flex;flex-wrap:wrap;gap:8px;";

  const output = document.createElement("pre");
  output.style.cssText = [
    "margin:0",
    "padding:10px",
    "overflow:auto",
    "min-height:240px",
    "max-height:560px",
    "border-radius:8px",
    "background:rgba(15,23,42,0.95)",
    "white-space:pre-wrap",
    "word-break:break-word",
  ].join(";");

  function addButton(label: string, getValue: () => unknown) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.style.cssText = [
      "border:1px solid rgba(103,232,249,0.35)",
      "border-radius:8px",
      "padding:7px 10px",
      "background:rgba(8,47,73,0.72)",
      "color:#e0f2fe",
      "font:inherit",
      "cursor:pointer",
    ].join(";");
    button.addEventListener("click", () => {
      output.textContent = renderJson(getValue());
    });
    controls.append(button);
  }

  addButton("list", () => devtools.list());
  addButton("shell composition", () => devtools.shellCalculator());
  addButton("calculator composition", () => devtools.calculator());
  addButton("v3 navigation input", () =>
    devtools.navigation({
      activeScreen: "calculator",
      metrics: { columns: 32, rows: 30 },
      shellState: { menuState: "pinned", placement: "left" },
    }),
  );
  addButton("shell runtime", () =>
    devtools.runtime("shell-workspace", { activeRoute: "calculator", includeConditional: true }),
  );

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.textContent = "close";
  closeButton.style.cssText = [
    "margin-left:auto",
    "border:1px solid rgba(148,163,184,0.35)",
    "border-radius:8px",
    "padding:7px 10px",
    "background:rgba(30,41,59,0.88)",
    "color:#cbd5e1",
    "font:inherit",
    "cursor:pointer",
  ].join(";");
  closeButton.addEventListener("click", () => panel.remove());
  controls.append(closeButton);

  panel.append(title, controls, output);
  document.body.append(panel);
  output.textContent = renderJson(devtools.list());
}

export function installWorkspaceDevtools() {
  if (!import.meta.env.DEV || typeof window === "undefined") {
    return;
  }

  window.__ADMIN_UI_WORKSPACE__ = {
    list: () => appWorkspaceAdapterSnapshots.map(summarizeSnapshot),
    adapter: (id) => clone(getAppWorkspaceAdapterSnapshot(id)),
    runtime: (id, options = {}) => clone(getAppWorkspaceRuntimeSnapshot(id, options)),
    composition: (id, runtimeOptions = {}, compositionOptions = {}) =>
      clone(getAppWorkspaceCompositionInput(id, runtimeOptions, compositionOptions)),
    navigation: (options = {}) => clone(createNavigationEngineInput(options)),
    shellCalculator: () =>
      clone(
        getAppWorkspaceCompositionInput(
          "shell-workspace",
          { activeRoute: "calculator", includeConditional: true },
          { mode: "suggest", contentTypeOverrides: shellCompositionOverrides },
        ),
      ),
    calculator: () =>
      clone(
        getAppWorkspaceCompositionInput(
          "calculator.workspace",
          { activeRoute: "calculator" },
          { mode: "suggest" },
        ),
      ),
  };

  installWorkspaceProbePanel(window.__ADMIN_UI_WORKSPACE__);

  console.info("Workspace devtools ready: window.__ADMIN_UI_WORKSPACE__");
}
