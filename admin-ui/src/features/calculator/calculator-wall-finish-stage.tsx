import type { Dispatch, SetStateAction } from "react";

import { WallFinishStageEditorColumn } from "./calculator-wall-finish-stage-editor";
import { WallFinishStageSummaryColumn } from "./calculator-wall-finish-stage-summary";
import type {
  CalculatorProjectDetail,
  CalculatorWallFinishCovering,
  CalculatorWallFinishDetail,
  CalculatorWallFinishLayout,
  CalculatorWallFinishPreparation,
  CalculatorWallFinishRoom,
  WallFinishCoveringCreateState,
  WallFinishEditState,
  WallFinishLayoutCreateState,
  WallFinishPreparationCreateState,
} from "./calculator";

type WallFinishRoomEdit = WallFinishEditState["rooms"][number];

type WallFinishTechRoom = {
  room: CalculatorWallFinishRoom;
  covering: CalculatorWallFinishCovering | null;
  preparation: CalculatorWallFinishPreparation | null;
  layout: CalculatorWallFinishLayout | null;
};

export type WallFinishStageSectionProps = {
  projectDetail: CalculatorProjectDetail | null;
  wallFinishDetail: CalculatorWallFinishDetail | null;
  wallFinishPreview: CalculatorWallFinishDetail | null;
  wallFinishSettingsOpen: boolean;
  setWallFinishSettingsOpen: Dispatch<SetStateAction<boolean>>;
  wallFinishRoomStateById: Map<number, WallFinishRoomEdit>;
  expandedWallFinishRoomId: number | null;
  setExpandedWallFinishRoomId: Dispatch<SetStateAction<number | null>>;
  setWallFinishState: Dispatch<SetStateAction<WallFinishEditState>>;
  wallFinishState: WallFinishEditState;
  wallFinishCoveringState: WallFinishCoveringCreateState;
  setWallFinishCoveringState: Dispatch<SetStateAction<WallFinishCoveringCreateState>>;
  wallFinishPreparationState: WallFinishPreparationCreateState;
  setWallFinishPreparationState: Dispatch<SetStateAction<WallFinishPreparationCreateState>>;
  wallFinishLayoutState: WallFinishLayoutCreateState;
  setWallFinishLayoutState: Dispatch<SetStateAction<WallFinishLayoutCreateState>>;
  wallFinishCoveringById: Map<number, CalculatorWallFinishCovering>;
  wallFinishPreparationById: Map<number, CalculatorWallFinishPreparation>;
  wallFinishLayoutById: Map<number, CalculatorWallFinishLayout>;
  wallFinishSelectedTechRooms: WallFinishTechRoom[];
  busyKey: string | null;
  submitWallFinish: () => Promise<void> | void;
  submitWallFinishCovering: () => Promise<void> | void;
  submitWallFinishPreparation: () => Promise<void> | void;
  submitWallFinishLayout: () => Promise<void> | void;
  resetWallFinishState: () => void;
};

export type WallFinishStageReadyProps = Omit<
  WallFinishStageSectionProps,
  "projectDetail" | "wallFinishDetail" | "wallFinishPreview"
> & {
  projectDetail: CalculatorProjectDetail;
  wallFinishDetail: CalculatorWallFinishDetail;
  wallFinishPreview: CalculatorWallFinishDetail;
};

// Keep the stage shell stable while the editor and summary columns evolve separately.
export function WallFinishStageSection(props: WallFinishStageSectionProps) {
  const {
    projectDetail,
    wallFinishDetail,
    wallFinishPreview,
    wallFinishSettingsOpen,
    setWallFinishSettingsOpen,
  } = props;

  return (
    <section className="glass-panel p-4 stage-panel flooring-stage">
      <div className="panel-header">
        <div>
          <div className="eyebrow">Отделка стен</div>
          <h3 className="panel-title">Финишные покрытия, подготовка и расходники</h3>
        </div>
        <button
          type="button"
          className={
            wallFinishSettingsOpen
              ? "secondary-button warmfloor-gear warmfloor-gear-active"
              : "secondary-button warmfloor-gear"
          }
          onClick={() => setWallFinishSettingsOpen((current) => !current)}
        >
          ⚙ Настройки
        </button>
      </div>

      {projectDetail && wallFinishDetail && wallFinishPreview ? (
        <div className="space-y-3">
          <div className="grid gap-3 xl:grid-cols-[1.08fr_0.92fr]">
            <WallFinishStageEditorColumn
              {...props}
              projectDetail={projectDetail}
              wallFinishDetail={wallFinishDetail}
              wallFinishPreview={wallFinishPreview}
            />
            <WallFinishStageSummaryColumn
              {...props}
              projectDetail={projectDetail}
              wallFinishDetail={wallFinishDetail}
              wallFinishPreview={wallFinishPreview}
            />
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
          Сначала выберите проект калькулятора.
        </div>
      )}
    </section>
  );
}
