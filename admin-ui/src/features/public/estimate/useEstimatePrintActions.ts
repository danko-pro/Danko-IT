import { useCallback } from "react";

export function useEstimatePrintActions() {
  const handlePrintEstimate = useCallback(() => {
    window.print();
  }, []);

  const handlePrintVolumes = useCallback(() => {
    document.body.classList.add("public-estimate-print-volumes");

    const cleanup = () => {
      document.body.classList.remove("public-estimate-print-volumes");
    };

    window.addEventListener("afterprint", cleanup, { once: true });
    window.print();
  }, []);

  return {
    handlePrintEstimate,
    handlePrintVolumes,
  };
}
