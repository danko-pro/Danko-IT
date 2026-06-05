import { useCallback, useState } from "react";

const ESTIMATE_PRINT_BODY_CLASS = "public-estimate-print-estimate";
const VOLUMES_PRINT_BODY_CLASS = "public-estimate-print-volumes";

export function useEstimatePrintActions() {
  const [isEstimatePdfPrintVisible, setIsEstimatePdfPrintVisible] = useState(false);

  const handlePrintEstimate = useCallback(() => {
    setIsEstimatePdfPrintVisible(true);
    document.body.classList.add(ESTIMATE_PRINT_BODY_CLASS);

    const cleanup = () => {
      document.body.classList.remove(ESTIMATE_PRINT_BODY_CLASS);
      setIsEstimatePdfPrintVisible(false);
    };

    window.addEventListener("afterprint", cleanup, { once: true });

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.print();
      });
    });
  }, []);

  const handlePrintVolumes = useCallback(() => {
    document.body.classList.add(VOLUMES_PRINT_BODY_CLASS);

    const cleanup = () => {
      document.body.classList.remove(VOLUMES_PRINT_BODY_CLASS);
    };

    window.addEventListener("afterprint", cleanup, { once: true });
    window.print();
  }, []);

  return {
    handlePrintEstimate,
    handlePrintVolumes,
    isEstimatePdfPrintVisible,
  };
}
