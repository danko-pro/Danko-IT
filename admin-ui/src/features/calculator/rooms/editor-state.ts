import type { CSSProperties } from "react";

import type { CalculatorRoomDetail } from "../room/model";

const BASE_PANEL_CLASS = "glass-panel p-4 stage-panel calculator-room-editor-panel";
const ACTIVE_PANEL_CLASS = `${BASE_PANEL_CLASS} calculator-room-editor-panel-active`;
const BASE_OVERLAY_CLASS = "calculator-room-editor-overlay";
const ACTIVE_OVERLAY_CLASS = `${BASE_OVERLAY_CLASS} calculator-room-editor-overlay-active`;

export type RoomsEditorContentState = "form" | "loading" | "empty";

type RoomsEditorStateArgs = {
  roomDetail: CalculatorRoomDetail | null;
  roomLoading: boolean;
  detailLoading: boolean;
  collapsed: boolean;
  selectedRoomAnchorTop: number | null;
  bodyHeight: number | null;
};

export function getEditorState(args: RoomsEditorStateArgs) {
  const { roomDetail, roomLoading, detailLoading, collapsed, selectedRoomAnchorTop, bodyHeight } = args;
  const hasRoomDetail = roomDetail !== null;
  const isLoading = roomLoading || detailLoading;
  const isSwitchingRoom = !collapsed && isLoading && hasRoomDetail;
  const contentState: RoomsEditorContentState = hasRoomDetail ? "form" : isLoading ? "loading" : "empty";
  const editorStyle =
    collapsed || selectedRoomAnchorTop === null
      ? undefined
      : ({ "--room-editor-anchor-top": `${selectedRoomAnchorTop}px` } as CSSProperties);
  const bodyStyle = bodyHeight === null ? undefined : ({ height: `${bodyHeight}px` } as CSSProperties);

  return {
    bodyStyle,
    contentState,
    editorStyle,
    overlayClassName: isSwitchingRoom ? ACTIVE_OVERLAY_CLASS : BASE_OVERLAY_CLASS,
    overlayHidden: !isSwitchingRoom,
    panelClassName: hasRoomDetail && !collapsed ? ACTIVE_PANEL_CLASS : BASE_PANEL_CLASS,
    showPointer: hasRoomDetail && !collapsed && selectedRoomAnchorTop !== null,
  };
}
