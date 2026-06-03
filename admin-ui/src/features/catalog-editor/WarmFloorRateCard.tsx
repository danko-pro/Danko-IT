import type { ReactNode } from "react";

import type { PublicWarmFloorConfigDto, PublicWarmFloorRateField } from "./api/types";
import { CatalogDisclosureCard } from "./CatalogDisclosureCard";
import type { WarmFloorRateField } from "./warm-floor-rate-fields";
import { WarmFloorRateTable } from "./WarmFloorRateTable";
import type { WarmFloorRateColumnControls } from "./WarmFloorRateTableColumns";

export type WarmFloorRateCardProps = {
  id: string;
  title: string;
  fields: WarmFloorRateField[];
  config: PublicWarmFloorConfigDto;
  controls: WarmFloorRateColumnControls;
  collapsed: boolean;
  summary: ReactNode;
  onToggle: () => void;
  onUpdate: (field: PublicWarmFloorRateField, value: string) => void;
};

export function WarmFloorRateCard({
  id,
  title,
  fields,
  config,
  controls,
  collapsed,
  summary,
  onToggle,
  onUpdate,
}: WarmFloorRateCardProps) {
  return (
    <CatalogDisclosureCard
      className="ce-warm-floor-rate-card"
      bodyId={`ce-warm-floor-rate-card-${id}`}
      collapsed={collapsed}
      onToggle={onToggle}
      ariaLabel={title}
      title={<h3 className="ce-catalog-disclosure-card-title">{title}</h3>}
      summary={<div className="ce-warm-floor-rate-card-summary">{summary}</div>}
    >
      <WarmFloorRateTable title={title} fields={fields} config={config} controls={controls} onUpdate={onUpdate} />
    </CatalogDisclosureCard>
  );
}
