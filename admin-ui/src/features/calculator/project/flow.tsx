import { useEffect, useRef, useState } from "react";

import { ProjectStageSection } from "./stage";
import { RoomsStageEditorSection, RoomsStageSidebarSection } from "../rooms";
import type { ProjectStageSectionProps } from "./types";
import type { RoomsStageEditorSectionProps, RoomsStageSidebarSectionProps } from "../rooms/types";

type CalculatorProjectRoomsStageProps = {
  isProjectStage: boolean;
  isRoomsStage: boolean;
  projectStage: ProjectStageSectionProps;
  roomsSidebar: Omit<RoomsStageSidebarSectionProps, "onActiveRoomAnchorChange" | "roomSelectionToken">;
  roomsEditor: Omit<RoomsStageEditorSectionProps, "selectedRoomAnchorTop" | "collapsed">;
};

// Отдельный stage-orchestrator для project/rooms.
// Корневой screen-content больше не управляет якорем room editor и не знает детали этих секций.
export function CalculatorProjectRoomsStage(props: CalculatorProjectRoomsStageProps) {
  const { isProjectStage, isRoomsStage, projectStage, roomsSidebar, roomsEditor } = props;
  const [selectedRoomAnchorTop, setSelectedRoomAnchorTop] = useState<number | null>(null);
  const [editorCollapsed, setEditorCollapsed] = useState(false);
  const [roomSelectionToken, setRoomSelectionToken] = useState(0);
  const previousSelectedRoomIdRef = useRef<number | null>(roomsSidebar.selectedRoomId);

  useEffect(() => {
    if (roomsSidebar.selectedRoomId === previousSelectedRoomIdRef.current) {
      return;
    }

    previousSelectedRoomIdRef.current = roomsSidebar.selectedRoomId;

    if (roomsSidebar.selectedRoomId !== null) {
      setEditorCollapsed(false);
    }
  }, [roomsSidebar.selectedRoomId]);

  function handleSelectRoom(roomId: number) {
    setRoomSelectionToken((current) => current + 1);

    if (roomId === roomsSidebar.selectedRoomId) {
      setEditorCollapsed((current) => !current);
      return;
    }

    setEditorCollapsed(false);
    roomsSidebar.onSelectRoom(roomId);
  }

  if (isProjectStage) {
    return <ProjectStageSection {...projectStage} />;
  }

  if (!isRoomsStage) {
    return null;
  }

  return (
    <div
      className={
        editorCollapsed || roomsSidebar.selectedRoomId === null
          ? "calculator-rooms-stage-layout calculator-rooms-stage-layout-collapsed"
          : "calculator-rooms-stage-layout"
      }
    >
      <div className="space-y-4">
        <RoomsStageSidebarSection
          {...roomsSidebar}
          roomSelectionToken={roomSelectionToken}
          onSelectRoom={handleSelectRoom}
          onActiveRoomAnchorChange={setSelectedRoomAnchorTop}
        />
      </div>

      <div
        className={
          editorCollapsed || roomsSidebar.selectedRoomId === null
            ? "calculator-room-editor-shell calculator-room-editor-shell-collapsed"
            : "calculator-room-editor-shell"
        }
      >
        <RoomsStageEditorSection
          {...roomsEditor}
          collapsed={editorCollapsed || roomsSidebar.selectedRoomId === null}
          selectedRoomAnchorTop={editorCollapsed ? null : selectedRoomAnchorTop}
        />
      </div>
    </div>
  );
}
