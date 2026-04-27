import { RoomsEditorContent } from "./editor-content";
import { getEditorState } from "./editor-state";
import type { RoomsStageEditorSectionProps } from "./types";
import { useBodyHeight } from "./use-body";

function getAutosaveLabel(state: RoomsStageEditorSectionProps["autosaveState"]): string {
  switch (state) {
    case "pending":
      return "Сохранится автоматически";
    case "saving":
      return "Сохраняю...";
    case "saved":
      return "Сохранено";
    case "error":
      return "Ошибка сохранения";
    default:
      return "Автосохранение";
  }
}

// Main editor for the room stage.
export function RoomsStageEditorSection(props: RoomsStageEditorSectionProps) {
  const { roomDetail, autosaveState } = props;
  const { bodyRef, bodyHeight } = useBodyHeight(roomDetail?.room.id ?? null);
  const editorState = getEditorState({ ...props, bodyHeight });
  const autosaveLabel = roomDetail ? getAutosaveLabel(autosaveState) : null;

  return (
    <section className={editorState.panelClassName} style={editorState.editorStyle}>
      {editorState.showPointer ? <div className="calculator-room-editor-pointer" aria-hidden /> : null}
      <div className="panel-header calculator-room-editor-head">
        <div>
          <div className="eyebrow calculator-room-editor-kicker">Редактор комнаты</div>
          <h3 className="panel-title calculator-room-editor-title">Геометрия, полы и проемы</h3>
        </div>
        {autosaveLabel ? <span className="slot-chip">{autosaveLabel}</span> : null}
      </div>

      <div className="calculator-room-editor-body" style={editorState.bodyStyle}>
        <div ref={bodyRef} className="calculator-room-editor-body-inner">
          <RoomsEditorContent {...props} contentState={editorState.contentState} />
        </div>
      </div>

      <div className={editorState.overlayClassName} aria-live="polite" aria-hidden={editorState.overlayHidden}>
        <span className="calculator-room-editor-overlay-chip">Переключаю помещение...</span>
      </div>
    </section>
  );
}
