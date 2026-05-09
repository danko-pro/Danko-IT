import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { ConfirmDeleteContent, DeleteButton, InlineAddButton } from "../../shared/controls";
import type { DashboardProjectCardData } from "./model/project-model";

export function DashboardProjectSwitcher(props: {
  projects: DashboardProjectCardData[];
  selectedProjectId: string | null;
  onSelectProject: (projectId: string) => void;
  onAddProject: () => void;
  onRenameProject: (projectId: string, nextCode: string) => void;
  onDeleteProject: (projectId: string) => void;
}) {
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [pendingDeleteProjectId, setPendingDeleteProjectId] = useState<string | null>(null);
  const [draftCode, setDraftCode] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editingProjectId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingProjectId]);

  function startEditing(project: DashboardProjectCardData) {
    setEditingProjectId(project.id);
    setDraftCode(project.code);
  }

  function stopEditing() {
    setEditingProjectId(null);
    setDraftCode("");
  }

  function commitEditing(projectId: string) {
    props.onRenameProject(projectId, draftCode);
    stopEditing();
  }

  function handleEditorKeyDown(event: KeyboardEvent<HTMLInputElement>, projectId: string) {
    if (event.key === "Enter") {
      event.preventDefault();
      commitEditing(projectId);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      stopEditing();
    }
  }

  return (
    <div className="dashboard-project-switcher" aria-label="Объекты">
      <div className="dashboard-project-switcher-tabs" role="tablist" aria-label="Список объектов">
        {props.projects.map((project) => {
          const isActive = project.id === props.selectedProjectId;
          const isEditing = project.id === editingProjectId;
          const isDeleteConfirmOpen = project.id === pendingDeleteProjectId;

          return (
            <div
              key={project.id}
              role="tab"
              aria-selected={isActive}
              className={
                isActive
                  ? `dashboard-project-switcher-tab dashboard-project-switcher-tab-active${
                      isEditing ? " dashboard-project-switcher-tab-editing" : ""
                    }`
                  : `dashboard-project-switcher-tab${isEditing ? " dashboard-project-switcher-tab-editing" : ""}`
              }
              title={isEditing ? project.name : `${project.name} • Двойной клик, чтобы переименовать`}
              onClick={() => {
                if (!isEditing) {
                  setPendingDeleteProjectId(null);
                  props.onSelectProject(project.id);
                }
              }}
              onDoubleClick={() => startEditing(project)}
            >
              <div className="dashboard-project-switcher-tab-main">
                <span className="dashboard-project-switcher-tab-label">Объект</span>

                {isEditing ? (
                  <input
                    ref={inputRef}
                    type="text"
                    className="dashboard-project-switcher-tab-input"
                    value={draftCode}
                    onChange={(event) => setDraftCode(event.target.value)}
                    onBlur={() => commitEditing(project.id)}
                    onKeyDown={(event) => handleEditorKeyDown(event, project.id)}
                  />
                ) : (
                  <span className="dashboard-project-switcher-tab-code-row">
                    <span className="dashboard-project-switcher-tab-code">{project.code}</span>
                    <span className="dashboard-project-switcher-tab-edit-hint" aria-hidden="true">
                      ✎
                    </span>
                  </span>
                )}
              </div>

              {isActive && !isEditing ? (
                <DeleteButton
                  className="dashboard-project-switcher-tab-remove"
                  aria-label={`Удалить объект ${project.code}`}
                  title="Удалить объект"
                  onClick={(event) => {
                    event.stopPropagation();
                    setPendingDeleteProjectId((current) => (current === project.id ? null : project.id));
                  }}
                >
                  ×
                </DeleteButton>
              ) : null}

              {isDeleteConfirmOpen ? (
                <div className="ui-confirm-delete-cloud dashboard-project-switcher-tab-delete-cloud" onClick={(event) => event.stopPropagation()}>
                  <ConfirmDeleteContent
                    message="Удалить объект?"
                    onCancel={() => setPendingDeleteProjectId(null)}
                    onConfirm={() => {
                      props.onDeleteProject(project.id);
                      setPendingDeleteProjectId(null);
                    }}
                  />
                </div>
              ) : null}
            </div>
          );
        })}

        <InlineAddButton
          className="dashboard-project-switcher-add-inline"
          ariaLabel="Добавить объект"
          title="Добавить объект"
          onClick={() => {
            setPendingDeleteProjectId(null);
            props.onAddProject();
          }}
        />
      </div>
    </div>
  );
}
