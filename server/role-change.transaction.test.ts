import { describe, expect, it, vi } from "vitest";

const testState = vi.hoisted(() => ({
  selectResults: [] as unknown[][],
  inserts: [] as { table: unknown; values: Record<string, unknown> }[],
  updates: [] as Record<string, unknown>[],
}));

const buildSelect = () => ({
  from: () => ({
    where: () => ({
      limit: async () => testState.selectResults.shift() ?? [],
      orderBy: async () => testState.selectResults.shift() ?? [],
    }),
    orderBy: async () => testState.selectResults.shift() ?? [],
  }),
});

const mockTransaction = {
  select: buildSelect,
  update: () => ({
    set: (values: Record<string, unknown>) => ({
      where: async () => testState.updates.push(values),
    }),
  }),
  insert: (table: unknown) => ({
    values: async (values: Record<string, unknown>) => {
      testState.inserts.push({ table, values });
      return [{ insertId: testState.inserts.length }];
    },
  }),
};

const mockDb = {
  ...mockTransaction,
  transaction: async (callback: (transaction: typeof mockTransaction) => Promise<unknown>) => callback(mockTransaction),
};

vi.mock("drizzle-orm/mysql2", () => ({ drizzle: () => mockDb }));

import { roleChangeAudits, userNotifications } from "../drizzle/schema";
import { getNotificationsForUser, markNotificationRead } from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 7,
      openId: "admin-open-id",
      email: "admin@example.com",
      name: "Administrator",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

function resetState(...selectResults: unknown[][]) {
  testState.selectResults = selectResults;
  testState.inserts = [];
  testState.updates = [];
}

describe("administrative role changes", () => {
  it("writes an audit record and an access notification in the same role-change workflow", async () => {
    resetState([
      {
        id: 8,
        openId: "citizen-open-id",
        email: "citizen@example.com",
        name: "Citizen",
        loginMethod: "manus",
        role: "citizen",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
    ]);

    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.users.changeRole({ userId: 8, role: "bank" });

    expect(result).toMatchObject({ changed: true, previousRole: "citizen", newRole: "bank" });
    expect(testState.updates).toEqual([{ role: "bank" }]);
    expect(testState.inserts).toHaveLength(2);
    expect(testState.inserts[0]).toMatchObject({
      table: roleChangeAudits,
      values: { targetUserId: 8, changedByUserId: 7, previousRole: "citizen", newRole: "bank" },
    });
    expect(testState.inserts[1]).toMatchObject({
      table: userNotifications,
      values: {
        userId: 8,
        type: "role_changed",
        title: "Your LienGuard access changed",
        message: "Your LienGuard access was changed from Citizen to Bank by an administrator.",
      },
    });
  });

  it("lists a user’s notifications and marks only that user’s unread notification as read", async () => {
    const notification = {
      id: 12,
      userId: 8,
      type: "role_changed" as const,
      title: "Your LienGuard access changed",
      message: "Your LienGuard access was changed from Citizen to Bank by an administrator.",
      readAt: null,
      createdAt: new Date(),
    };
    resetState([notification]);
    await expect(getNotificationsForUser(8)).resolves.toEqual([notification]);

    resetState([{ id: 12, readAt: null }], [{ userId: 8 }]);
    await expect(markNotificationRead(12, 8)).resolves.toBe(true);
    expect(testState.updates).toHaveLength(1);
    expect(testState.updates[0]?.readAt).toBeInstanceOf(Date);
  });
});
