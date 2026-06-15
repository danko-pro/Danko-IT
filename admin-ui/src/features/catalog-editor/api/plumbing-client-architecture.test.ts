import { describe, expect, it } from "vitest";

import plumbingClientSource from "./client.ts?raw";

describe("plumbing catalog client architecture", () => {
  it("loads the editor snapshot in one request without per-zone N+1", () => {
    expect(plumbingClientSource).toContain("async function loadCatalogFromApi");
    expect(plumbingClientSource).toContain("/editor-snapshot");
    expect(plumbingClientSource).not.toContain("fetchJson<PlumbingZoneDto>(`${PLUMBING_API}/zones/${summary.id}`)");
    expect(plumbingClientSource).not.toContain("zoneSummaries.map((summary)");
  });
});
