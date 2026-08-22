import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  Case,
  CasePriority,
  CaseStatus,
  InsertUser,
  LienGuardRole,
  cases,
  roleChangeAudits,
  userNotifications,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;

  textFields.forEach(field => {
    if (user[field] !== undefined) {
      const value = user[field] ?? null;
      values[field] = value;
      updateSet[field] = value;
    }
  });

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function listUsersForAdmin() {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
      lastSignedIn: users.lastSignedIn,
    })
    .from(users)
    .orderBy(desc(users.lastSignedIn));
}

export function formatRoleName(role: LienGuardRole) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function createRoleChangeNotificationMessage(
  previousRole: LienGuardRole,
  newRole: LienGuardRole,
) {
  return `Your LienGuard access was changed from ${formatRoleName(previousRole)} to ${formatRoleName(newRole)} by an administrator.`;
}

export async function changeUserRoleWithAudit(input: {
  targetUserId: number;
  changedByUserId: number;
  newRole: LienGuardRole;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");

  return db.transaction(async tx => {
    const target = await tx.select().from(users).where(eq(users.id, input.targetUserId)).limit(1);
    const targetUser = target[0];
    if (!targetUser) throw new Error("User was not found");

    const previousRole = targetUser.role;
    if (previousRole === input.newRole) {
      return { changed: false, previousRole, newRole: input.newRole };
    }

    await tx.update(users).set({ role: input.newRole }).where(eq(users.id, input.targetUserId));

    const auditResult = await tx.insert(roleChangeAudits).values({
      targetUserId: input.targetUserId,
      changedByUserId: input.changedByUserId,
      previousRole,
      newRole: input.newRole,
    });

    await tx.insert(userNotifications).values({
      userId: input.targetUserId,
      type: "role_changed",
      title: "Your LienGuard access changed",
      message: createRoleChangeNotificationMessage(previousRole, input.newRole),
    });

    return {
      changed: true,
      auditId: Number(auditResult[0].insertId),
      previousRole,
      newRole: input.newRole,
    };
  });
}

export async function getNotificationsForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(userNotifications)
    .where(eq(userNotifications.userId, userId))
    .orderBy(desc(userNotifications.createdAt));
}

export async function markNotificationRead(notificationId: number, userId: number) {
  const db = await getDb();
  if (!db) return false;

  const notification = await db
    .select({ id: userNotifications.id, readAt: userNotifications.readAt })
    .from(userNotifications)
    .where(eq(userNotifications.id, notificationId))
    .limit(1);

  if (!notification[0]) return false;

  const owner = await db
    .select({ userId: userNotifications.userId })
    .from(userNotifications)
    .where(eq(userNotifications.id, notificationId))
    .limit(1);

  if (owner[0]?.userId !== userId) return false;
  if (!notification[0].readAt) {
    await db.update(userNotifications).set({ readAt: new Date() }).where(eq(userNotifications.id, notificationId));
  }

  return true;
}

export async function getRoleChangeAudits() {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(roleChangeAudits).orderBy(desc(roleChangeAudits.createdAt)).limit(100);
}

export function createCaseReference() {
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `LG-${new Date().getFullYear()}-${suffix}`;
}

export async function listCasesForUser(user: { id: number; role: LienGuardRole }) {
  const db = await getDb();
  if (!db) return [];

  const query = db.select().from(cases);
  if (user.role === "citizen") {
    return query.where(eq(cases.userId, user.id)).orderBy(desc(cases.updatedAt));
  }
  return query.orderBy(desc(cases.updatedAt));
}

export async function getCaseByReference(caseId: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(cases).where(eq(cases.caseId, caseId)).limit(1);
  return result[0];
}

export async function createCase(input: {
  userId: number;
  title: string;
  description: string;
  caseType: string;
  priority: CasePriority;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");

  const caseId = createCaseReference();
  await db.insert(cases).values({ ...input, caseId, status: "OPEN" });
  return getCaseByReference(caseId);
}

export async function setCaseStatus(caseId: string, status: CaseStatus): Promise<Case | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");

  await db.update(cases).set({ status }).where(eq(cases.caseId, caseId));
  return getCaseByReference(caseId);
}

export async function updateCaseDetails(input: {
  caseId: string;
  title?: string;
  description?: string;
  caseType?: string;
  priority?: CasePriority;
}): Promise<Case | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");

  const { caseId, ...values } = input;
  await db.update(cases).set(values).where(eq(cases.caseId, caseId));
  return getCaseByReference(caseId);
}
