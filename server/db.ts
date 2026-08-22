import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { randomUUID } from "node:crypto";
import {
  Case,
  CaseCommunication,
  CaseDocument,
  CaseDocumentKind,
  CaseEvent,
  CaseEventType,
  CasePriority,
  CaseStatus,
  InsertUser,
  LienGuardRole,
  caseCommunications,
  caseDocuments,
  caseEvents,
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
    .where(and(eq(userNotifications.id, notificationId), eq(userNotifications.userId, userId)))
    .limit(1);

  if (!notification[0]) return false;
  if (!notification[0].readAt) {
    await db
      .update(userNotifications)
      .set({ readAt: new Date() })
      .where(and(eq(userNotifications.id, notificationId), eq(userNotifications.userId, userId)));
  }

  return true;
}

export async function getRoleChangeAudits() {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(roleChangeAudits).orderBy(desc(roleChangeAudits.createdAt)).limit(100);
}

/** 96 bits of UUID entropy makes reference collisions operationally negligible. */
export function createCaseReference(now = new Date()) {
  const suffix = randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
  return `LG-${now.getUTCFullYear()}-${suffix}`;
}

function isDuplicateKeyError(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "ER_DUP_ENTRY",
  );
}

export async function listCasesForUser(user: { id: number; role: LienGuardRole }) {
  const db = await getDb();
  if (!db) return [];

  const query = db.select().from(cases);
  if (user.role === "citizen" || user.role === "bank") {
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
  bankName?: string;
  lienAmount?: string;
  lienDate?: Date;
  lienReference?: string;
  transactionReference?: string;
  authorityName?: string;
  responseDeadline?: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const caseId = createCaseReference();
    try {
      await db.transaction(async tx => {
        const insertResult = await tx.insert(cases).values({ ...input, caseId, status: "OPEN" });
        const caseRecordId = Number(insertResult[0].insertId);
        await tx.insert(caseEvents).values({
          caseId: caseRecordId,
          actorUserId: input.userId,
          type: "CASE_CREATED",
          message: "Case record created.",
        });
      });
      return getCaseByReference(caseId);
    } catch (error) {
      if (isDuplicateKeyError(error) && attempt < 2) continue;
      throw error;
    }
  }

  throw new Error("Could not allocate a unique case reference");
}

export async function listCaseEvents(caseRecordId: number): Promise<CaseEvent[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(caseEvents).where(eq(caseEvents.caseId, caseRecordId)).orderBy(desc(caseEvents.createdAt));
}

export async function setCaseStatus(input: {
  caseId: string;
  previousStatus: CaseStatus;
  nextStatus: CaseStatus;
  actorUserId: number;
}): Promise<Case | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");

  const current = await getCaseByReference(input.caseId);
  if (!current || current.status !== input.previousStatus) return undefined;

  await db.transaction(async tx => {
    await tx
      .update(cases)
      .set({ status: input.nextStatus })
      .where(and(eq(cases.caseId, input.caseId), eq(cases.status, input.previousStatus)));
    await tx.insert(caseEvents).values({
      caseId: current.id,
      actorUserId: input.actorUserId,
      type: "STATUS_CHANGED",
      message: `Status changed from ${input.previousStatus.split("_").join(" ").toLowerCase()} to ${input.nextStatus.split("_").join(" ").toLowerCase()}.`,
      previousStatus: input.previousStatus,
      nextStatus: input.nextStatus,
    });
  });

  return getCaseByReference(input.caseId);
}

export async function updateCaseDetails(input: {
  caseId: string;
  actorUserId: number;
  title?: string;
  description?: string;
  caseType?: string;
  priority?: CasePriority;
  bankName?: string | null;
  lienAmount?: string | null;
  lienDate?: Date | null;
  lienReference?: string | null;
  transactionReference?: string | null;
  authorityName?: string | null;
  responseDeadline?: Date | null;
}): Promise<Case | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");

  const { caseId, actorUserId, ...values } = input;
  const changedFields = Object.entries(values).filter(([, value]) => value !== undefined);
  if (!changedFields.length) return undefined;

  const current = await getCaseByReference(caseId);
  if (!current) return undefined;

  await db.transaction(async tx => {
    await tx.update(cases).set(values).where(eq(cases.caseId, caseId));
    await tx.insert(caseEvents).values({
      caseId: current.id,
      actorUserId,
      type: "DETAILS_UPDATED",
      message: `Case details updated: ${changedFields.map(([field]) => field).join(", ")}.`,
    });
  });
  return getCaseByReference(caseId);
}

export async function listCaseCommunications(caseRecordId: number): Promise<CaseCommunication[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(caseCommunications).where(eq(caseCommunications.caseId, caseRecordId)).orderBy(desc(caseCommunications.createdAt));
}

export async function recordCaseFollowUp(input: {
  caseRecordId: number;
  actorUserId: number;
  authorityName?: string | null;
  note?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.transaction(async tx => {
    await tx.insert(caseCommunications).values({
      caseId: input.caseRecordId,
      direction: "outbound",
      subject: "Follow-up request recorded",
      counterparty: input.authorityName || null,
      body: input.note || "A follow-up request was recorded in LienGuard. External delivery must be completed through the appropriate authority channel.",
      state: "recorded",
    });
    await tx.insert(caseEvents).values({
      caseId: input.caseRecordId,
      actorUserId: input.actorUserId,
      type: "COMMUNICATION_RECORDED",
      message: "Follow-up communication recorded.",
    });
  });
  const entries = await listCaseCommunications(input.caseRecordId);
  return entries[0];
}

export async function listCaseDocuments(caseRecordId: number): Promise<CaseDocument[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(caseDocuments).where(eq(caseDocuments.caseId, caseRecordId)).orderBy(desc(caseDocuments.createdAt));
}

export async function createCaseDocument(input: {
  caseRecordId: number;
  uploadedByUserId: number;
  kind: CaseDocumentKind;
  fileName: string;
  storageKey: string;
  contentType: string;
  sizeBytes: number;
  eventType?: CaseEventType;
  eventMessage?: string;
}): Promise<CaseDocument | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");

  await db.transaction(async tx => {
    await tx.insert(caseDocuments).values({
      caseId: input.caseRecordId,
      uploadedByUserId: input.uploadedByUserId,
      kind: input.kind,
      fileName: input.fileName,
      storageKey: input.storageKey,
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
    });
    await tx.insert(caseEvents).values({
      caseId: input.caseRecordId,
      actorUserId: input.uploadedByUserId,
      type: input.eventType ?? "DOCUMENT_UPLOADED",
      message: input.eventMessage ?? `Document uploaded: ${input.fileName}.`,
    });
  });

  const documents = await listCaseDocuments(input.caseRecordId);
  return documents.find(document => document.storageKey === input.storageKey);
}
