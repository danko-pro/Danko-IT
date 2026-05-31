import { describe, expect, it } from "vitest";

import type { AdminAuthSession } from "./types";
import { isAdminRoleSession, isAuthenticatedSession } from "./network";

function session(role: string, authenticated = true): AdminAuthSession {
  return {
    auth_enabled: true,
    authenticated,
    mode: "session",
    user: authenticated
      ? {
          id: 1,
          subject: "user@example.test",
          role,
          email: "user@example.test",
          display_name: "User",
        }
      : null,
    expires_at: authenticated ? "2030-01-01T00:00:00Z" : null,
  };
}

describe("admin auth session helpers", () => {
  it("distinguishes authenticated users from admin-role sessions", () => {
    const userSession = session("user");

    expect(isAuthenticatedSession(userSession)).toBe(true);
    expect(isAdminRoleSession(userSession)).toBe(false);
  });

  it("accepts only authenticated admin sessions for admin UI", () => {
    expect(isAdminRoleSession(session("admin"))).toBe(true);
    expect(isAdminRoleSession(session("admin", false))).toBe(false);
    expect(isAdminRoleSession(null)).toBe(false);
  });
});
