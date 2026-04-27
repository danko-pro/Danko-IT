import { useLayoutEffect, useRef, useState } from "react";

import { ProjectStagePane } from "./pane";
import type { ProjectKpRowDraft, ProjectWorkspaceDraft, ProjectWorkspaceTab, ProjectWorkspaceTabOption } from "./types";

const PROJECT_WORKSPACE_TABS: ProjectWorkspaceTabOption[] = [
  { id: "contacts", label: "Ответственные" },
  { id: "materials", label: "Материалы" },
  { id: "design", label: "Дизайн" },
  { id: "montage", label: "Монтаж" },
  { id: "kp", label: "КП", tone: "document" },
];

const INITIAL_PROJECT_KP_ROWS: ProjectKpRowDraft[] = [
  {
    id: "floors",
    title: "Подготовка и устройство пола",
    unit: "м²",
    quantity: "66.57",
    workRate: "1250",
    materialRate: "600",
  },
  {
    id: "walls",
    title: "Финишная отделка стен",
    unit: "м²",
    quantity: "210.61",
    workRate: "980",
    materialRate: "440",
  },
  {
    id: "doors",
    title: "Поставка и монтаж дверей",
    unit: "шт",
    quantity: "4",
    workRate: "5000",
    materialRate: "21000",
  },
];

const INITIAL_PROJECT_WORKSPACE_DRAFT: ProjectWorkspaceDraft = {
  clientName: "",
  clientContact: "",
  managerName: "",
  managerContact: "",
  designerName: "",
  designerContact: "",
  foremanName: "",
  foremanContact: "",
  materialsManagerName: "",
  materialsManagerContact: "",
  objectChatLink: "",
  deliveryWindow: "",
  unloadingContact: "",
  loadingDetails: "",
  materialsComment: "",
  kpVersion: "",
  kpStatus: "",
  kpRecipient: "",
  kpComment: "",
  designProjectLink: "",
  designApproval: "",
  designComment: "",
  meetingContact: "",
  accessWindow: "",
  workLimits: "",
  montageComment: "",
};

export function ProjectStageWorkspace() {
  const [activeTab, setActiveTab] = useState<ProjectWorkspaceTab>("contacts");
  const [draft, setDraft] = useState<ProjectWorkspaceDraft>(INITIAL_PROJECT_WORKSPACE_DRAFT);
  const [kpRows, setKpRows] = useState<ProjectKpRowDraft[]>(INITIAL_PROJECT_KP_ROWS);
  const paneRef = useRef<HTMLDivElement | null>(null);
  const [paneHeight, setPaneHeight] = useState<number | null>(null);

  const updateDraft = <K extends keyof ProjectWorkspaceDraft>(key: K, value: ProjectWorkspaceDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const updateKpRow = <K extends keyof ProjectKpRowDraft>(rowId: string, key: K, value: ProjectKpRowDraft[K]) => {
    setKpRows((current) => current.map((row) => (row.id === rowId ? { ...row, [key]: value } : row)));
  };

  useLayoutEffect(() => {
    const node = paneRef.current;
    if (!node) {
      return;
    }

    const measure = () => {
      setPaneHeight(node.getBoundingClientRect().height);
    };

    measure();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => {
      measure();
    });

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [activeTab]);

  return (
    <section className="calculator-project-workspace-shell stage-panel">
      <div className="calculator-project-workspace-tabs" role="tablist" aria-label="Дополнительные параметры объекта">
        {PROJECT_WORKSPACE_TABS.map((tab, index) => {
          const isActive = activeTab === tab.id;
          const isDocumentTab = tab.tone === "document";
          const isDocumentGroupStart = isDocumentTab && PROJECT_WORKSPACE_TABS[index - 1]?.tone !== "document";

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={
                isActive
                  ? isDocumentTab
                    ? `calculator-project-workspace-tab calculator-project-workspace-tab-document${isDocumentGroupStart ? " calculator-project-workspace-tab-document-start" : ""} calculator-project-workspace-tab-active calculator-project-workspace-tab-active-document`
                    : "calculator-project-workspace-tab calculator-project-workspace-tab-active"
                  : isDocumentTab
                    ? `calculator-project-workspace-tab calculator-project-workspace-tab-document${isDocumentGroupStart ? " calculator-project-workspace-tab-document-start" : ""}`
                    : "calculator-project-workspace-tab"
              }
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="calculator-project-workspace-surface">
        <div className="calculator-project-workspace-toolbar">
          <span className="calculator-project-workspace-kicker">
            {activeTab === "kp" ? "Черновик КП" : "Дополнительные параметры"}
          </span>
          <span className="calculator-project-workspace-status">
            {activeTab === "kp" ? "Документная таблица по объекту" : "Минималистичный редактируемый блок"}
          </span>
        </div>
        <div
          className="calculator-project-workspace-body"
          style={paneHeight === null ? undefined : { height: `${paneHeight}px` }}
        >
          <div
            key={activeTab}
            ref={paneRef}
            className="calculator-project-workspace-body-inner calculator-project-workspace-body-inner-active"
          >
            <ProjectStagePane
              activeTab={activeTab}
              draft={draft}
              updateDraft={updateDraft}
              kpRows={kpRows}
              updateKpRow={updateKpRow}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
