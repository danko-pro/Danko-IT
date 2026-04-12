import type { CSSProperties, Dispatch, FormEvent, PointerEvent as ReactPointerEvent, SetStateAction } from "react";
import { useEffect, useState } from "react";

import { buildRoomPayload } from "./calculator-payloads";
import {
  calculatorHeaderCardWidthStorageKey,
  calculatorHeaderFontScaleStorageKey,
  calculatorStageStorageKey,
  emptyRoomState,
  readLocalNumber,
  readStoredStage,
  writeLocalNumber,
  writeSessionValue,
} from "./calculator-state";
import { trimFloat } from "./calculator-shared";
import type { CalculatorRoomDetail, CalculatorRoomPayload, CalculatorStage, RoomEditState } from "./calculator";

type UseCalculatorStageControllerResult = {
  activeStage: CalculatorStage;
  setActiveStage: Dispatch<SetStateAction<CalculatorStage>>;
};

type UseCalculatorProjectControllerParams = {
  onCreateProject: (payload: { name: string; note: string }) => Promise<void>;
};

type UseCalculatorProjectControllerResult = {
  projectName: string;
  setProjectName: Dispatch<SetStateAction<string>>;
  projectNote: string;
  setProjectNote: Dispatch<SetStateAction<string>>;
  handleProjectSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
};

type UseCalculatorRoomControllerParams = {
  roomDetail: CalculatorRoomDetail | null;
  onSaveRoom: (roomId: number, payload: CalculatorRoomPayload) => Promise<void>;
};

type UseCalculatorRoomControllerResult = {
  roomState: RoomEditState;
  setRoomState: Dispatch<SetStateAction<RoomEditState>>;
  handleRoomSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
};

type UseCalculatorHeaderLayoutControllerResult = {
  calculatorHeaderStyle: CSSProperties;
  startHeaderResize: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  resetHeaderLayout: () => void;
};

export function useCalculatorStageController(projectDetail: { project: { id: number } } | null): UseCalculatorStageControllerResult {
  const [activeStage, setActiveStage] = useState<CalculatorStage>(() => readStoredStage() ?? "rooms");

  useEffect(() => {
    writeSessionValue(calculatorStageStorageKey, activeStage);
  }, [activeStage]);

  useEffect(() => {
    if (!projectDetail) {
      setActiveStage("project");
    }
  }, [projectDetail]);

  return {
    activeStage,
    setActiveStage,
  };
}

export function useCalculatorProjectController(
  params: UseCalculatorProjectControllerParams,
): UseCalculatorProjectControllerResult {
  const { onCreateProject } = params;
  const [projectName, setProjectName] = useState("");
  const [projectNote, setProjectNote] = useState("");

  async function handleProjectSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = projectName.trim();
    if (!name) {
      return;
    }
    await onCreateProject({ name, note: projectNote });
    setProjectName("");
    setProjectNote("");
  }

  return {
    projectName,
    setProjectName,
    projectNote,
    setProjectNote,
    handleProjectSubmit,
  };
}

function buildRoomEditState(roomDetail: CalculatorRoomDetail | null): RoomEditState {
  if (!roomDetail) {
    return emptyRoomState;
  }

  return {
    name: roomDetail.room.name,
    ceiling_height_m: trimFloat(roomDetail.room.ceiling_height_m),
    manual_floor_area_m2:
      roomDetail.room.manual_floor_area_m2 === null ? "" : trimFloat(roomDetail.room.manual_floor_area_m2),
    auto_perimeter_calc: roomDetail.room.auto_perimeter_calc,
    perimeter_factor: trimFloat(roomDetail.room.perimeter_factor),
    note: roomDetail.room.note ?? "",
    walls_m: roomDetail.walls.length ? roomDetail.walls.map((wall) => trimFloat(wall.length_m)) : ["", "", "", ""],
    floor_sections: roomDetail.floor_sections.length
      ? roomDetail.floor_sections.map((section) => ({
          length_m: trimFloat(section.length_m),
          width_m: trimFloat(section.width_m),
        }))
      : [{ length_m: "", width_m: "" }],
    openings: roomDetail.openings.length
      ? roomDetail.openings.map((opening) => ({
          opening_type: opening.opening_type,
          width_m: opening.width_m === null ? "" : trimFloat(opening.width_m),
          height_m: opening.height_m === null ? "" : trimFloat(opening.height_m),
          quantity: trimFloat(opening.quantity),
          area_m2: opening.area_m2 === null ? "" : trimFloat(opening.area_m2),
          note: opening.note ?? "",
        }))
      : [{ opening_type: "window", width_m: "", height_m: "", quantity: "1", area_m2: "", note: "" }],
  };
}

export function useCalculatorRoomController(
  params: UseCalculatorRoomControllerParams,
): UseCalculatorRoomControllerResult {
  const { roomDetail, onSaveRoom } = params;
  const [roomState, setRoomState] = useState<RoomEditState>(emptyRoomState);

  useEffect(() => {
    setRoomState(buildRoomEditState(roomDetail));
  }, [roomDetail]);

  async function handleRoomSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!roomDetail) {
      return;
    }
    await onSaveRoom(roomDetail.room.id, buildRoomPayload(roomState));
  }

  return {
    roomState,
    setRoomState,
    handleRoomSubmit,
  };
}

export function useCalculatorHeaderLayoutController(): UseCalculatorHeaderLayoutControllerResult {
  const [headerCardMinWidth, setHeaderCardMinWidth] = useState(() => readLocalNumber(calculatorHeaderCardWidthStorageKey, 188));
  const [headerFontScale, setHeaderFontScale] = useState(() => readLocalNumber(calculatorHeaderFontScaleStorageKey, 1));

  useEffect(() => {
    writeLocalNumber(calculatorHeaderCardWidthStorageKey, headerCardMinWidth);
  }, [headerCardMinWidth]);

  useEffect(() => {
    writeLocalNumber(calculatorHeaderFontScaleStorageKey, headerFontScale);
  }, [headerFontScale]);

  function startHeaderResize(event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    const initialWidth = headerCardMinWidth;
    const initialScale = headerFontScale;

    const handleMove = (moveEvent: PointerEvent) => {
      const nextWidth = Math.max(150, Math.min(320, initialWidth + moveEvent.clientX - startX));
      const nextScale = Math.max(0.84, Math.min(1.22, initialScale + (startY - moveEvent.clientY) * 0.0035));
      setHeaderCardMinWidth(nextWidth);
      setHeaderFontScale(Number(nextScale.toFixed(3)));
    };

    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  }

  function resetHeaderLayout() {
    setHeaderCardMinWidth(188);
    setHeaderFontScale(1);
  }

  return {
    calculatorHeaderStyle: {
      "--calculator-header-card-min": `${headerCardMinWidth}px`,
      "--calculator-header-font-scale": String(headerFontScale),
    } as CSSProperties,
    startHeaderResize,
    resetHeaderLayout,
  };
}
