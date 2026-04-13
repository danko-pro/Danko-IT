import type { Dispatch, SetStateAction } from "react";

import { FlooringStageEditorColumn } from "./calculator-flooring-stage-editor";
import { FlooringStageSummaryColumn } from "./calculator-flooring-stage-summary";
import type {
  CalculatorFlooringCovering,
  CalculatorFlooringDetail,
  CalculatorFlooringLayout,
  CalculatorFlooringPreparation,
  CalculatorFlooringRoom,
  CalculatorProjectDetail,
  FlooringCoveringCreateState,
  FlooringEditState,
  FlooringLayoutCreateState,
  FlooringPreparationCreateState,
} from "./calculator";

type FlooringRoomEdit = FlooringEditState["rooms"][number];

type FlooringTechRoom = {
  room: CalculatorFlooringRoom;
  covering: CalculatorFlooringCovering | null;
  preparation: CalculatorFlooringPreparation | null;
  layout: CalculatorFlooringLayout | null;
};

export type FlooringStageSectionProps = {
  projectDetail: CalculatorProjectDetail | null;
  flooringDetail: CalculatorFlooringDetail | null;
  flooringPreview: CalculatorFlooringDetail | null;
  flooringSettingsOpen: boolean;
  setFlooringSettingsOpen: Dispatch<SetStateAction<boolean>>;
  flooringRoomStateById: Map<number, FlooringRoomEdit>;
  expandedFlooringRoomId: number | null;
  setExpandedFlooringRoomId: Dispatch<SetStateAction<number | null>>;
  setFlooringState: Dispatch<SetStateAction<FlooringEditState>>;
  flooringState: FlooringEditState;
  flooringCoveringState: FlooringCoveringCreateState;
  setFlooringCoveringState: Dispatch<SetStateAction<FlooringCoveringCreateState>>;
  flooringPreparationState: FlooringPreparationCreateState;
  setFlooringPreparationState: Dispatch<SetStateAction<FlooringPreparationCreateState>>;
  flooringLayoutState: FlooringLayoutCreateState;
  setFlooringLayoutState: Dispatch<SetStateAction<FlooringLayoutCreateState>>;
  flooringCoveringById: Map<number, CalculatorFlooringCovering>;
  flooringPreparationById: Map<number, CalculatorFlooringPreparation>;
  flooringLayoutById: Map<number, CalculatorFlooringLayout>;
  flooringSelectedTechRooms: FlooringTechRoom[];
  busyKey: string | null;
  submitFlooring: () => Promise<void> | void;
  submitFlooringCovering: () => Promise<void> | void;
  submitFlooringPreparation: () => Promise<void> | void;
  submitFlooringLayout: () => Promise<void> | void;
  resetFlooringState: () => void;
};

export type FlooringStageReadyProps = Omit<
  FlooringStageSectionProps,
  "projectDetail" | "flooringDetail" | "flooringPreview"
> & {
  projectDetail: CalculatorProjectDetail;
  flooringDetail: CalculatorFlooringDetail;
  flooringPreview: CalculatorFlooringDetail;
};

// Keep the stage shell stable while the editor and summary columns evolve separately.
export function FlooringStageSection(props: FlooringStageSectionProps) {
  const { projectDetail, flooringDetail, flooringPreview, flooringSettingsOpen, setFlooringSettingsOpen } = props;

  return (
    <section className="glass-panel p-4 stage-panel flooring-stage">
      <div className="panel-header">
        <div>
          <div className="eyebrow">Напольные покрытия</div>
          <h3 className="panel-title">Покрытия, подготовка, раскладка и расходники</h3>
        </div>
        <button
          type="button"
          className={
            flooringSettingsOpen
              ? "secondary-button warmfloor-gear warmfloor-gear-active"
              : "secondary-button warmfloor-gear"
          }
          onClick={() => setFlooringSettingsOpen((current) => !current)}
        >
          ⚙ Настройки
        </button>
      </div>

      {projectDetail && flooringDetail && flooringPreview ? (
        <div className="space-y-3">
          <div className="grid gap-3 xl:grid-cols-[1.08fr_0.92fr]">
            <FlooringStageEditorColumn
              {...props}
              projectDetail={projectDetail}
              flooringDetail={flooringDetail}
              flooringPreview={flooringPreview}
            />
            <FlooringStageSummaryColumn
              {...props}
              projectDetail={projectDetail}
              flooringDetail={flooringDetail}
              flooringPreview={flooringPreview}
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
