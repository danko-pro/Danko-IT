import { EstimateSpecOverlay } from "../../EstimateSpecOverlay";
import { formatEstimateQuantity, formatMoney } from "../../estimate/format";
import type { EstimateSpecModalData } from "../../estimate/spec";

type EstimateSpecModalProps = {
  data: EstimateSpecModalData | null;
  onClose: () => void;
};

export function EstimateSpecModal({ data, onClose }: EstimateSpecModalProps) {
  if (!data) {
    return null;
  }

  return (
    <EstimateSpecOverlay
      title={data.title}
      subtitle={data.subtitle}
      sections={data.sections}
      procurementLines={data.procurementLines}
      formatMoney={formatMoney}
      formatQuantity={formatEstimateQuantity}
      onClose={onClose}
    />
  );
}
