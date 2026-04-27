import type { RoomsEditorContentState } from "./editor-state";
import { RoomsEditorForm } from "./form";
import type { RoomsStageEditorSectionProps } from "./types";

type RoomsEditorContentProps = Pick<
  RoomsStageEditorSectionProps,
  "roomDetail" | "roomLoading" | "detailLoading" | "roomState" | "setRoomState"
> & {
  contentState: RoomsEditorContentState;
};

function EditorMessage(props: { className: string; text: string }) {
  return <div className={props.className}>{props.text}</div>;
}

export function RoomsEditorContent(props: RoomsEditorContentProps) {
  const { contentState, roomDetail, roomState, setRoomState } = props;

  if (contentState === "form" && roomDetail) {
    return <RoomsEditorForm roomDetail={roomDetail} roomState={roomState} setRoomState={setRoomState} />;
  }

  if (contentState === "loading") {
    return (
      <EditorMessage
        className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-10 text-center text-sm text-slate-500"
        text="Загружаю данные помещения..."
      />
    );
  }

  return (
    <EditorMessage
      className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500"
      text="Выберите комнату слева или создайте новую."
    />
  );
}
