import { CalculatorSpecificationSheet } from "./";
import type { FlooringStageReadyProps } from "./";

type FlooringStageSpecificationProps = Pick<FlooringStageReadyProps, "flooringPreview">;

export function FlooringStageSpecification(props: FlooringStageSpecificationProps) {
  return (
    <CalculatorSpecificationSheet
      items={props.flooringPreview.specification}
      emptyText="Пока нет выбранных помещений или покрытий."
    />
  );
}
