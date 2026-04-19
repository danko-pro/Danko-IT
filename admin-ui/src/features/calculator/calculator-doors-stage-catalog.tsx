import { DoorsComponentCatalogPanel } from "./calculator-doors-component-catalog-panel";
import { DoorsDoorCatalogPanel } from "./calculator-doors-door-catalog-panel";
import { DoorsProjectDoorForm } from "./calculator-doors-project-door-form";
import type { DoorsCatalogPanelProps } from "./calculator-doors-stage-catalog-types";

// Верхний блок дверей сведён к orchestration-слою.
// Конкретные формы каталога и проекта вынесены в независимые подмодули.
export function DoorsCatalogPanel(props: DoorsCatalogPanelProps) {
  return (
    <>
      <DoorsDoorCatalogPanel {...props} />
      <DoorsComponentCatalogPanel {...props} />
      <DoorsProjectDoorForm {...props} />
    </>
  );
}
