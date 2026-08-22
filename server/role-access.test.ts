import { describe, expect, it } from "vitest";
import type { LienGuardRole } from "../drizzle/schema";
import { isAdministrator } from "../client/src/lib/roleAccess";
import { createRoleChangeNotificationMessage } from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createContext(role: LienGuardRole): TrpcContext {
  return {
    user: {
      id: 42,
      openId: "role-test-user",
      email: "role-test@example.com",
      name: "Role Test",
      loginMethod: "manus",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("role-based access", () => {
  it("allows a citizen to read the citizen workspace", async () => {
    const caller = appRouter.createCaller(createContext("citizen"));
    await expect(caller.workspace.citizen()).resolves.toMatchObject({ title: "My property position" });
  });

  it("rejects a citizen attempting to access the bank workspace", async () => {
    const caller = appRouter.createCaller(createContext("citizen"));
    await expect(caller.workspace.bank()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects a non-admin attempting to retrieve user records", async () => {
    const caller = appRouter.createCaller(createContext("citizen"));
    await expect(caller.users.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("hides administrator-only client navigation and page content for an authenticated citizen", () => {
    expect(isAdministrator("citizen")).toBe(false);
    expect(isAdministrator("admin")).toBe(true);
  });

  it("creates a clear role-change notice for the affected user", () => {
    expect(createRoleChangeNotificationMessage("citizen", "bank")).toBe(
      "Your LienGuard access was changed from Citizen to Bank by an administrator.",
    );
  });
});
