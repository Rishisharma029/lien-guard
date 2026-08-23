import { and, desc, eq, like, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { randomUUID } from "node:crypto";
import {
  AuthorityType,
  AutomationActionType,
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
  authorityDirectory,
  caseAuthorityAssignments,
  caseAutomationActions,
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

  const existing = await getUserByOpenId(user.openId);
  const now = user.lastSignedIn || new Date();
  const role = user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "citizen");

  if (existing) {
    await db
      .update(users)
      .set({
        name: user.name !== undefined ? user.name : existing.name,
        email: user.email !== undefined ? user.email : existing.email,
        loginMethod: user.loginMethod !== undefined ? user.loginMethod : existing.loginMethod,
        role: user.role !== undefined ? user.role : existing.role,
        lastSignedIn: now,
      })
      .where(eq(users.id, existing.id));
  } else {
    await db.insert(users).values({
      openId: user.openId,
      name: user.name || null,
      email: user.email || null,
      loginMethod: user.loginMethod || null,
      role,
      lastSignedIn: now,
    });
  }
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

export async function createUserNotification(input: {
  userId: number;
  title: string;
  message: string;
}) {
  const db = await getDb();
  if (!db) return undefined;
  await db.insert(userNotifications).values({
    userId: input.userId,
    type: "role_changed",
    title: input.title.slice(0, 160),
    message: input.message,
  });
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

export async function getCaseById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(cases).where(eq(cases.id, id)).limit(1);
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
  authorityEmail?: string;
  responseDeadline?: Date;
  initialStatus?: CaseStatus;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const caseId = createCaseReference();
    try {
      await db.transaction(async tx => {
        const { initialStatus, ...insertFields } = input;
        const insertResult = await tx.insert(cases).values({ ...insertFields, caseId, status: initialStatus || "OPEN" });
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

export async function recordSystemCaseEvent(input: {
  caseRecordId: number;
  type: CaseEventType;
  message: string;
  previousStatus?: CaseStatus | null;
  nextStatus?: CaseStatus | null;
  actorLabel?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.insert(caseEvents).values({
    caseId: input.caseRecordId,
    actorUserId: null,
    actorLabel: input.actorLabel || "LienGuard automation",
    type: input.type,
    message: input.message,
    previousStatus: input.previousStatus || null,
    nextStatus: input.nextStatus || null,
  });
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
  authorityEmail?: string | null;
  authorityDirectoryId?: number | null;
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

export async function createOutboundEmail(input: {
  caseRecordId: number;
  actorUserId: number | null;
  actorLabel?: string;
  subject: string;
  body: string;
  recipientName?: string | null;
  recipientEmail: string;
  automated?: boolean;
  eventType?: CaseEventType;
  eventMessage?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");

  const communicationResult = await db.transaction(async tx => {
    const insert = await tx.insert(caseCommunications).values({
      caseId: input.caseRecordId,
      direction: "outbound",
      subject: input.subject,
      counterparty: input.recipientName || null,
      recipientEmail: input.recipientEmail,
      body: input.body,
      state: "queued",
      automated: input.automated ? 1 : 0,
    });
    const communicationId = Number(insert[0].insertId);
    await tx.insert(caseEvents).values({
      caseId: input.caseRecordId,
      actorUserId: input.actorUserId,
      actorLabel: input.actorLabel || null,
      type: input.eventType ?? "EMAIL_QUEUED",
      message: input.eventMessage ?? `Email queued for delivery to ${input.recipientEmail}.`,
    });
    return communicationId;
  });

  return getCaseCommunicationById(communicationResult);
}

export async function getCaseCommunicationById(communicationId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(caseCommunications).where(eq(caseCommunications.id, communicationId)).limit(1);
  return result[0];
}

export async function getCaseCommunicationByProviderMessageId(providerMessageId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(caseCommunications).where(eq(caseCommunications.providerMessageId, providerMessageId)).limit(1);
  return result[0];
}

export async function markOutboundEmailSent(input: { communicationId: number; providerMessageId: string; actorLabel?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const communication = await getCaseCommunicationById(input.communicationId);
  if (!communication || communication.state !== "queued") return undefined;

  await db.transaction(async tx => {
    await tx.update(caseCommunications).set({ state: "sent", providerMessageId: input.providerMessageId, sentAt: new Date() }).where(eq(caseCommunications.id, input.communicationId));
    await tx.insert(caseEvents).values({
      caseId: communication.caseId,
      actorUserId: null,
      actorLabel: input.actorLabel || "LienGuard Maileroo delivery",
      type: "EMAIL_SENT",
      message: `Email accepted by the delivery provider for ${communication.recipientEmail || "the intended recipient"}.`,
    });
  });
  return getCaseCommunicationById(input.communicationId);
}

export async function markOutboundEmailFailed(input: { communicationId: number; message: string; actorLabel?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const communication = await getCaseCommunicationById(input.communicationId);
  if (!communication || communication.state !== "queued") return undefined;

  await db.transaction(async tx => {
    await tx.update(caseCommunications).set({ state: "failed" }).where(eq(caseCommunications.id, input.communicationId));
    await tx.insert(caseEvents).values({
      caseId: communication.caseId,
      actorUserId: null,
      actorLabel: input.actorLabel || "LienGuard Maileroo delivery",
      type: "EMAIL_FAILED",
      message: `Email delivery could not be completed: ${input.message.slice(0, 380)}.`,
    });
  });
  return getCaseCommunicationById(input.communicationId);
}

export async function recordInboundEmail(input: {
  caseRecordId: number;
  providerMessageId: string;
  senderEmail: string;
  subject: string;
  body: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");

  const existing = await db.select().from(caseCommunications).where(eq(caseCommunications.providerMessageId, input.providerMessageId)).limit(1);
  if (existing[0]) return { communication: existing[0], duplicate: true };

  try {
    const communicationId = await db.transaction(async tx => {
      const insert = await tx.insert(caseCommunications).values({
        caseId: input.caseRecordId,
        direction: "inbound",
        subject: input.subject,
        counterparty: input.senderEmail,
        recipientEmail: input.senderEmail,
        body: input.body,
        state: "received",
        providerMessageId: input.providerMessageId,
      });
      const id = Number(insert[0].insertId);
      await tx.insert(caseEvents).values({
        caseId: input.caseRecordId,
        actorUserId: null,
        actorLabel: "Maileroo inbound routing",
        type: "INBOUND_EMAIL_RECEIVED",
        message: `Inbound email received from ${input.senderEmail}.`,
      });
      return id;
    });
    const communication = await getCaseCommunicationById(communicationId);
    if (!communication) throw new Error("Inbound communication could not be saved");
    return { communication, duplicate: false };
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      const duplicate = await db.select().from(caseCommunications).where(eq(caseCommunications.providerMessageId, input.providerMessageId)).limit(1);
      if (duplicate[0]) return { communication: duplicate[0], duplicate: true };
    }
    throw error;
  }
}

export async function listQueuedOutboundEmails(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(caseCommunications).where(and(eq(caseCommunications.direction, "outbound"), eq(caseCommunications.state, "queued"))).orderBy(desc(caseCommunications.createdAt)).limit(limit);
}

export async function createDeadlineFollowUpIfAbsent(input: {
  caseRecord: Case;
  idempotencyKey: string;
  subject: string;
  body: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  if (!input.caseRecord.authorityEmail) throw new Error("The case has no authority email address.");

  try {
    const result = await db.transaction(async tx => {
      const communicationInsert = await tx.insert(caseCommunications).values({
        caseId: input.caseRecord.id,
        direction: "outbound",
        subject: input.subject,
        counterparty: input.caseRecord.authorityName || null,
        recipientEmail: input.caseRecord.authorityEmail,
        body: input.body,
        state: "queued",
        automated: 1,
      });
      const communicationId = Number(communicationInsert[0].insertId);
      await tx.insert(caseAutomationActions).values({
        caseId: input.caseRecord.id,
        action: "DEADLINE_FOLLOW_UP",
        idempotencyKey: input.idempotencyKey,
        communicationId,
      });
      await tx.insert(caseEvents).values({
        caseId: input.caseRecord.id,
        actorUserId: null,
        actorLabel: "LienGuard deadline automation",
        type: "DEADLINE_FOLLOW_UP_QUEUED",
        message: `Deadline follow-up queued for delivery to ${input.caseRecord.authorityEmail}.`,
      });
      return communicationId;
    });
    return { created: true, communication: await getCaseCommunicationById(result) };
  } catch (error) {
    if (isDuplicateKeyError(error)) return { created: false, communication: undefined };
    throw error;
  }
}

export async function recordDeadlineAutomationAction(input: {
  caseRecordId: number;
  action: AutomationActionType;
  idempotencyKey: string;
  communicationId?: number | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  try {
    const result = await db.insert(caseAutomationActions).values({
      caseId: input.caseRecordId,
      action: input.action,
      idempotencyKey: input.idempotencyKey,
      communicationId: input.communicationId || null,
    });
    return { created: true, id: Number(result[0].insertId) };
  } catch (error) {
    if (isDuplicateKeyError(error)) return { created: false, id: null };
    throw error;
  }
}

export async function listOverdueAwaitingResponseCases(now: Date) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cases).where(and(eq(cases.status, "AWAITING_RESPONSE"), lte(cases.responseDeadline, now))).orderBy(desc(cases.responseDeadline));
}

export async function escalateCaseForDeadline(input: { caseRecordId: number; previousStatus: CaseStatus; message: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const current = await db.select().from(cases).where(eq(cases.id, input.caseRecordId)).limit(1);
  const caseRecord = current[0];
  if (!caseRecord || caseRecord.status !== input.previousStatus) return undefined;

  await db.transaction(async tx => {
    const update = await tx.update(cases).set({ status: "ESCALATED" }).where(and(eq(cases.id, input.caseRecordId), eq(cases.status, input.previousStatus)));
    if (!Number(update[0].affectedRows)) return;
    await tx.insert(caseEvents).values({
      caseId: input.caseRecordId,
      actorUserId: null,
      actorLabel: "LienGuard deadline automation",
      type: "DEADLINE_ESCALATED",
      message: input.message,
      previousStatus: input.previousStatus,
      nextStatus: "ESCALATED",
    });
  });
  const refreshed = await db.select().from(cases).where(eq(cases.id, input.caseRecordId)).limit(1);
  return refreshed[0];
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

export async function getLatestDemoCase(userId?: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(cases)
    .where(like(cases.title, "[HACKATHON DEMO]%"))
    .orderBy(desc(cases.createdAt))
    .limit(1);

  return result[0];
}

export async function purgeDemoCases() {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");

  const demoCases = await db
    .select({ id: cases.id })
    .from(cases)
    .where(like(cases.title, "[HACKATHON DEMO]%"));

  if (demoCases.length === 0) return 0;

  const ids = demoCases.map(c => c.id);
  await db.transaction(async tx => {
    for (const id of ids) {
      await tx.delete(caseAuthorityAssignments).where(eq(caseAuthorityAssignments.caseId, id));
      await tx.delete(caseAutomationActions).where(eq(caseAutomationActions.caseId, id));
      await tx.delete(caseEvents).where(eq(caseEvents.caseId, id));
      await tx.delete(caseCommunications).where(eq(caseCommunications.caseId, id));
      await tx.delete(caseDocuments).where(eq(caseDocuments.caseId, id));
      await tx.delete(cases).where(eq(cases.id, id));
    }
  });

  return ids.length;
}

// ─── Authority Directory ───────────────────────────────────────────────────

export async function listAuthorityDirectory(filter?: {
  stateUt?: string;
  authorityType?: AuthorityType;
  activeOnly?: boolean;
}) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(authorityDirectory);
  const conditions = [];
  if (filter?.stateUt) conditions.push(eq(authorityDirectory.stateUt, filter.stateUt));
  if (filter?.authorityType) conditions.push(eq(authorityDirectory.authorityType, filter.authorityType));
  if (filter?.activeOnly) conditions.push(eq(authorityDirectory.active, 1));

  if (conditions.length) {
    return query.where(and(...conditions)).orderBy(authorityDirectory.stateUt);
  }
  return query.orderBy(authorityDirectory.stateUt);
}

export async function getAuthorityById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(authorityDirectory).where(eq(authorityDirectory.id, id)).limit(1);
  return result[0];
}

export async function findActiveAuthorityForRouting(stateUt: string, authorityType: AuthorityType) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(authorityDirectory)
    .where(
      and(
        eq(authorityDirectory.stateUt, stateUt),
        eq(authorityDirectory.authorityType, authorityType),
        eq(authorityDirectory.active, 1),
      ),
    )
    .orderBy(desc(authorityDirectory.lastVerifiedAt))
    .limit(1);
  return result[0];
}

export async function createAuthorityRecord(input: {
  stateUt: string;
  district?: string;
  authorityType: AuthorityType;
  authorityName: string;
  officerName?: string;
  designation?: string;
  officialEmail?: string;
  phone?: string;
  sourceName: string;
  sourceUrl: string;
  lastVerifiedAt: Date;
  active?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const result = await db.insert(authorityDirectory).values({ ...input });
  return getAuthorityById(Number(result[0].insertId));
}

export async function updateAuthorityRecord(
  id: number,
  input: Partial<{
    stateUt: string;
    district: string | null;
    authorityType: AuthorityType;
    authorityName: string;
    officerName: string | null;
    designation: string | null;
    officialEmail: string | null;
    phone: string | null;
    sourceName: string;
    sourceUrl: string;
    lastVerifiedAt: Date;
    active: number;
  }>,
) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.update(authorityDirectory).set(input).where(eq(authorityDirectory.id, id));
  return getAuthorityById(id);
}

// ─── Case Authority Assignments ────────────────────────────────────────────

export async function recordAuthorityAssignment(input: {
  caseRecordId: number;
  authorityDirectoryId?: number;
  authorityName: string;
  authorityEmail?: string;
  officerName?: string;
  designation?: string;
  sourceName: string;
  sourceUrl: string;
  lastVerifiedAt: Date;
  routingReason?: string;
  assignedByUserId?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const result = await db.insert(caseAuthorityAssignments).values({
    caseId: input.caseRecordId,
    authorityDirectoryId: input.authorityDirectoryId,
    authorityName: input.authorityName,
    authorityEmail: input.authorityEmail,
    officerName: input.officerName,
    designation: input.designation,
    sourceName: input.sourceName,
    sourceUrl: input.sourceUrl,
    lastVerifiedAt: input.lastVerifiedAt,
    routingReason: input.routingReason,
    assignedByUserId: input.assignedByUserId,
  });
  const id = Number(result[0].insertId);
  const rows = await db.select().from(caseAuthorityAssignments).where(eq(caseAuthorityAssignments.id, id)).limit(1);
  return rows[0];
}

export async function getLatestAuthorityAssignment(caseRecordId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(caseAuthorityAssignments)
    .where(eq(caseAuthorityAssignments.caseId, caseRecordId))
    .orderBy(desc(caseAuthorityAssignments.assignedAt))
    .limit(1);
  return result[0];
}

export async function updateCaseAuthorityDirectoryId(caseRecordId: number, authorityDirectoryId: number | null) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.update(cases).set({ authorityDirectoryId }).where(eq(cases.id, caseRecordId));
}


