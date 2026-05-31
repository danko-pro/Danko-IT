import { describe, expect, it } from "vitest";

import adminAppSource from "./AdminApp.tsx?raw";
import controllerSource from "./shell/controller.ts?raw";

describe("admin role gate architecture", () => {
  it("gates AdminApp rendering by admin role, not just authenticated session", () => {
    expect(adminAppSource).toContain("isAdminRoleSession(controller.authSession)");
  });

  it("rejects authenticated non-admin sessions before loading admin data", () => {
    expect(controllerSource).toContain("rejectNonAdminSession(session)");
    expect(controllerSource).toContain('fetchJson<AdminAuthSession>("/api/auth/logout"');
  });
});
