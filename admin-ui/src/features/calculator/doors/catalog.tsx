import { DoorsComponentCatalogPanel } from "./part-catalog";
import { DoorsDoorCatalogPanel } from "./door-catalog";
import { DoorsProjectDoorForm } from "./door-form";
import type { DoorsCatalogPanelProps } from "./catalog-types";

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
