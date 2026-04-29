import { CalculatorSpecificationSheet } from "./";
import type { WallFinishStageReadyProps } from "./";

type WallFinishStageSpecificationProps = Pick<WallFinishStageReadyProps, "wallFinishPreview">;

export function WallFinishStageSpecification(props: WallFinishStageSpecificationProps) {
  return (
    <CalculatorSpecificationSheet
      items={props.wallFinishPreview.specification}
      emptyText="Пока нет выбранных помещений или отделки стен."
    />
  );
}
