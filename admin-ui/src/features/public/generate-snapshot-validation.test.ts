import { describe, expect, it } from "vitest";

import {
  buildSnapshotUrl,
  findForbiddenKeys,
  resolveRemoteBaseUrl,
  validateSnapshotPayload,
} from "../../../scripts/generate-snapshot.js";

describe("generate-snapshot validation", () => {
  it("resolves remote base URL in priority order", () => {
    const prevPublic = process.env.PUBLIC_SNAPSHOT_BASE_URL;
    const prevVite = process.env.VITE_API_BASE_URL;
    try {
      delete process.env.PUBLIC_SNAPSHOT_BASE_URL;
      delete process.env.VITE_API_BASE_URL;
      expect(resolveRemoteBaseUrl()).toBeNull();

      process.env.VITE_API_BASE_URL = "https://api.example.com/";
      expect(resolveRemoteBaseUrl()).toBe("https://api.example.com/");

      process.env.PUBLIC_SNAPSHOT_BASE_URL = "https://snapshot.example.com";
      expect(resolveRemoteBaseUrl()).toBe("https://snapshot.example.com");
    } finally {
      if (prevPublic === undefined) {
        delete process.env.PUBLIC_SNAPSHOT_BASE_URL;
      } else {
        process.env.PUBLIC_SNAPSHOT_BASE_URL = prevPublic;
      }
      if (prevVite === undefined) {
        delete process.env.VITE_API_BASE_URL;
      } else {
        process.env.VITE_API_BASE_URL = prevVite;
      }
    }
  });

  it("builds snapshot URL without duplicate slashes", () => {
    expect(buildSnapshotUrl("https://api.example.com")).toBe(
      "https://api.example.com/api/public/catalog/plumbing/snapshot",
    );
    expect(buildSnapshotUrl("https://api.example.com/")).toBe(
      "https://api.example.com/api/public/catalog/plumbing/snapshot",
    );
  });

  it("accepts a minimal valid public payload", () => {
    const result = validateSnapshotPayload({
      version: "snapshot-abc",
      items: [],
      zones: [{ code: "zone-kitchen-sink" }],
    });
    expect(result).toEqual({ ok: true });
  });

  it("rejects empty zones and forbidden internal keys", () => {
    expect(validateSnapshotPayload({ version: "v1", items: [], zones: [] })).toEqual({
      ok: false,
      reason: "zones must be a non-empty array",
    });

    const leaked = findForbiddenKeys({
      zones: [{ packages: [{ work_price: 1 }] }],
    });
    expect(leaked.has("work_price")).toBe(true);

    expect(
      validateSnapshotPayload({
        version: "v1",
        items: [],
        zones: [{ riskPercent: 6.4 }],
      }),
    ).toEqual({
      ok: false,
      reason: "forbidden internal keys: riskPercent",
    });
  });
});
