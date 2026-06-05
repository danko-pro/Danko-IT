import { describe, expect, it } from "vitest";
import publicEstimateSource from "../PublicEstimate.tsx?raw";
import printActionsSource from "./useEstimatePrintActions.ts?raw";

describe("useEstimatePrintActions", () => {
  it("prints estimate through a dedicated PDF document body class", () => {
    expect(printActionsSource).toContain("public-estimate-print-estimate");
    expect(printActionsSource).toContain("isEstimatePdfPrintVisible");
    expect(printActionsSource).toMatch(/handlePrintEstimate[\s\S]*window\.print\(\)/);
  });

  it("keeps volumes print flow unchanged", () => {
    expect(printActionsSource).toContain("public-estimate-print-volumes");
    expect(printActionsSource).toMatch(/handlePrintVolumes[\s\S]*VOLUMES_PRINT_BODY_CLASS/);
    expect(printActionsSource).toMatch(/handlePrintVolumes[\s\S]*window\.print\(\)/);
    expect(printActionsSource).not.toMatch(/handlePrintVolumes[\s\S]*ESTIMATE_PRINT_BODY_CLASS/);
  });
});

describe("PublicEstimate estimate PDF wiring", () => {
  it("builds the printable document via buildPublicEstimateDocument", () => {
    expect(publicEstimateSource).toContain("buildPublicEstimateDocument");
    expect(publicEstimateSource).toContain("PublicEstimatePdfDocument");
    expect(publicEstimateSource).toContain("isEstimatePdfPrintVisible");
    expect(publicEstimateSource).not.toContain("downloadSpecExportCsv");
  });
});
