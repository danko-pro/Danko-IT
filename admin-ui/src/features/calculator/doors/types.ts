import type { CalculatorProjectDetail } from "./";
import type { DoorsCatalogPanelProps } from "./";
import type { DoorsProjectPanelProps } from "./";

type DoorsStageSharedProps = Omit<DoorsCatalogPanelProps, "projectDetail"> &
  Omit<DoorsProjectPanelProps, "projectDetail">;

// Единый внешний контракт дверного stage-блока.
// После этого shell, catalog и project-подсекции зависят от одного стабильного входа.
export type DoorsStageSectionProps = DoorsStageSharedProps & {
  projectDetail: CalculatorProjectDetail | null;
};

export type DoorsStageReadyProps = DoorsStageSharedProps & {
  projectDetail: CalculatorProjectDetail;
};
