import { describe, expect, it } from "vitest";

import plumbingClientSource from "./client.ts?raw";
import plumbingMappersSource from "./mappers.ts?raw";

describe("plumbing catalog client architecture", () => {
  it("loads the editor snapshot in one request without per-zone N+1", () => {
    expect(plumbingClientSource).toContain("async function loadCatalogFromApi");
    expect(plumbingClientSource).toContain("/editor-snapshot");
    expect(plumbingClientSource).not.toContain("fetchJson<PlumbingZoneDto>(`${PLUMBING_API}/zones/${summary.id}`)");
    expect(plumbingClientSource).not.toContain("zoneSummaries.map((summary)");
  });

  it("checks debounce equality with a single forward diff", () => {
    expect(plumbingClientSource).toContain("catalogSnapshotsEqual");
    expect(plumbingClientSource).not.toContain("planCatalogSync(b, a)");
    expect(plumbingClientSource).not.toContain("planCatalogSync(b,a)");
    expect(plumbingClientSource).not.toContain("snapshotEquals");
  });
});

describe("plumbing catalog mappers architecture", () => {
  it("compares zone rows and packages without JSON.stringify signatures", () => {
    expect(plumbingMappersSource).toContain("function rowsEqual");
    expect(plumbingMappersSource).toContain("function packagesEqual");
    expect(plumbingMappersSource).toContain("export function catalogSnapshotsEqual");
    expect(plumbingMappersSource).not.toContain("rowsSignature");
    expect(plumbingMappersSource).not.toContain("packagesSignature");
    expect(plumbingMappersSource).not.toMatch(/JSON\.stringify[\s\S]*rowsEqual/);
    expect(plumbingMappersSource).not.toMatch(/JSON\.stringify[\s\S]*packagesEqual/);
  });
});
