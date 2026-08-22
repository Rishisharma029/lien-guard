import { and, asc, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  Case,
  CaseCommunication,
  CasePriority,
  CaseRtiDraft,
  CaseStatus,
  CaseTimelineEvent,
  InsertCase,
  InsertCaseCommunication,
  InsertCaseRtiDraft,
  InsertCaseTimelineEvent,
  InsertUser,
  LienGuardRole,
  User,
  UserNotification,
  caseCommunications,
  caseRtiDrafts,
  caseTimelineEvents,
  cases,
  roleChangeAudits,
  userNotifications,
  users,
} from "../drizzle/schema";
import {
  generateFollowUpReminder,
  generateInitialNotice,
  generateRtiDraft,
  generateTier2Escalation,
  generateTier3Escalation,
} from "./authorityTemplates";
import { calculateDeadline, getDeadlineStatus } from "./cases";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && (process.env.DATABASE_URL || process.env.NODE_ENV === "test")) {
    try {
      _db = drizzle(process.env.DATABASE_URL || "");
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ---------------------------------------------------------
// Resilient In-Memory Store (for local/demo standalone mode)
// ---------------------------------------------------------
const now = new Date();
const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
const fiveDaysFuture = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

const memStore = {
  users: [
    {
      id: 1,
      openId: "local-citizen-user",
      name: "Aarav Sharma (Citizen)",
      email: "citizen@lienguard.in",
      loginMethod: "local",
      role: "citizen" as LienGuardRole,
      createdAt: now,
      updatedAt: now,
      lastSignedIn: now,
    },
    {
      id: 2,
      openId: "local-bank-user",
      name: "SBI Branch Manager (Bank)",
      email: "bank@lienguard.in",
      loginMethod: "local",
      role: "bank" as LienGuardRole,
      createdAt: now,
      updatedAt: now,
      lastSignedIn: now,
    },
    {
      id: 3,
      openId: "local-authority-user",
      name: "Cyber Crime Cell IO (Authority)",
      email: "authority@lienguard.in",
      loginMethod: "local",
      role: "authority" as LienGuardRole,
      createdAt: now,
      updatedAt: now,
      lastSignedIn: now,
    },
    {
      id: 4,
      openId: "local-admin-user",
      name: "Platform Administrator",
      email: "admin@lienguard.in",
      loginMethod: "local",
      role: "admin" as LienGuardRole,
      createdAt: now,
      updatedAt: now,
      lastSignedIn: now,
    },
  ] as User[],

  cases: [
    {
      id: 1,
      caseId: "LG-CYB-1024",
      userId: 1,
      title: "Lien on SBI Savings Account ₹15,000",
      description: "Savings account placed on freeze following NCRP reference from Delhi Cyber Cell.",
      caseType: "Cybercrime Bank Lien",
      status: "AWAITING_RESPONSE" as CaseStatus,
      priority: "HIGH" as CasePriority,
      bankName: "State Bank of India",
      accountNumber: "30891234567",
      branchName: "Connaught Place Branch, New Delhi",
      ifscCode: "SBIN0000691",
      lienAmount: "15000",
      disputeRefNumber: "DISP-9921-2026",
      ncrpAckNumber: "20261930018241",
      firNumber: "FIR 42/2026 (PS Cyber New Delhi)",
      freezingAuthority: "Delhi Cyber Crime Police Station",
      authorityEmail: "cyberps.delhi@gov.in",
      nodalOfficerEmail: "nodalofficer.delhi@sbi.co.in",
      noticeSentAt: twoDaysAgo,
      responseDeadline: fiveDaysFuture,
      reminderCount: 0,
      escalationTier: 1,
      resolutionNotes: null,
      createdAt: twoDaysAgo,
      updatedAt: twoDaysAgo,
    },
  ] as Case[],

  timelineEvents: [
    {
      id: 1,
      caseId: "LG-CYB-1024",
      eventType: "CASE_REGISTERED",
      title: "Case Registered with LienGuard",
      description: "Incident recorded with State Bank of India for ₹15,000. Unique Case ID LG-CYB-1024 assigned.",
      actorRole: "citizen",
      metadata: JSON.stringify({ bankName: "State Bank of India", lienAmount: "15000" }),
      createdAt: twoDaysAgo,
    },
    {
      id: 2,
      caseId: "LG-CYB-1024",
      eventType: "NOTICE_DISPATCHED",
      title: "Formal Representation Dispatched to Authority",
      description: "Official notice sent to State Bank of India & Delhi Cyber Crime Police Station. 7-day response SLA countdown active.",
      actorRole: "citizen",
      metadata: JSON.stringify({ recipient: "cyberps.delhi@gov.in" }),
      createdAt: twoDaysAgo,
    },
  ] as CaseTimelineEvent[],

  communications: [
    {
      id: 1,
      caseId: "LG-CYB-1024",
      direction: "OUTBOUND" as const,
      communicationType: "INITIAL_NOTICE",
      recipientOrSender: "cyberps.delhi@gov.in, nodalofficer.delhi@sbi.co.in",
      subject: "[Ref: LG-CYB-1024] Formal Request for Grounds & Sec 102/106 Order regarding Lien on SBI A/C 30891234567",
      body: `To:\nThe Branch Manager, State Bank of India\nThe Investigating Officer, Delhi Cyber Crime Police Station\n\nSUBJECT: Formal Representation regarding Bank Lien of ₹15,000 on Account No: 30891234567 (Case Reference: LG-CYB-1024)\n\nRespected Sir/Madam,\n\nI am writing to formally submit this representation regarding an unauthorized / disputable debit-freeze / lien of ₹15,000 placed on my bank account with State Bank of India, Connaught Place Branch.\n\nAccount Details:\n- Account Holder: Aarav Sharma\n- Account Number: 30891234567\n- IFSC Code: SBIN0000691\n- Freezing Authority: Delhi Cyber Crime Police Station\n- NCRP Acknowledgement: 20261930018241\n\nI request you to kindly furnish a certified copy of the requisition order issued under Section 102 CrPC / Section 106 BNSS, or de-freeze the unaffected legitimate funds without delay.\n\nA response is requested within 7 working days.\n\nSincerely,\nAarav Sharma`,
      status: "SENT",
      createdAt: twoDaysAgo,
    },
  ] as CaseCommunication[],

  rtiDrafts: [] as CaseRtiDraft[],
  notifications: [] as UserNotification[],
  audits: [] as any[],
};

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");

  const db = await getDb();
  if (db) {
    try {
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
      }

      if (!values.lastSignedIn) values.lastSignedIn = new Date();
      if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

      await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
      return;
    } catch (e) {
      console.warn("[Database] MySQL write failed, falling back to memory store:", e);
    }
  }

  // Memory fallback
  const existing = memStore.users.find(u => u.openId === user.openId);
  if (existing) {
    if (user.name !== undefined) existing.name = user.name ?? null;
    if (user.email !== undefined) existing.email = user.email ?? null;
    if (user.role !== undefined) existing.role = user.role;
    existing.lastSignedIn = user.lastSignedIn || new Date();
    existing.updatedAt = new Date();
  } else {
    const newUser: User = {
      id: memStore.users.length + 1,
      openId: user.openId,
      name: user.name ?? null,
      email: user.email ?? null,
      loginMethod: user.loginMethod ?? null,
      role: user.role || "citizen",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: user.lastSignedIn || new Date(),
    };
    memStore.users.push(newUser);
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (db) {
    try {
      const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
      if (result[0]) return result[0];
    } catch (e) {
      console.warn("[Database] MySQL read failed, falling back to memory store:", e);
    }
  }

  return memStore.users.find(u => u.openId === openId);
}

export async function listUsersForAdmin() {
  const db = await getDb();
  if (db) {
    try {
      return await db
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
    } catch (e) {
      console.warn("[Database] MySQL read failed, falling back to memory store:", e);
    }
  }

  return memStore.users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt,
    lastSignedIn: u.lastSignedIn,
  }));
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
  if (db) {
    return await db.transaction(async tx => {
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

  // Memory store implementation
  const targetUser = memStore.users.find(u => u.id === input.targetUserId);
  if (!targetUser) throw new Error("User was not found");
  const previousRole = targetUser.role;
  targetUser.role = input.newRole;

  const audit = {
    id: memStore.audits.length + 1,
    targetUserId: input.targetUserId,
    changedByUserId: input.changedByUserId,
    previousRole,
    newRole: input.newRole,
    createdAt: new Date(),
  };
  memStore.audits.push(audit);

  const notif: UserNotification = {
    id: memStore.notifications.length + 1,
    userId: input.targetUserId,
    type: "role_changed",
    title: "Your LienGuard access changed",
    message: createRoleChangeNotificationMessage(previousRole, input.newRole),
    readAt: null,
    createdAt: new Date(),
  };
  memStore.notifications.push(notif);

  return {
    changed: true,
    auditId: audit.id,
    previousRole,
    newRole: input.newRole,
  };
}

export async function getNotificationsForUser(userId: number) {
  const db = await getDb();
  if (db) {
    return await db
      .select()
      .from(userNotifications)
      .where(eq(userNotifications.userId, userId))
      .orderBy(desc(userNotifications.createdAt));
  }

  return memStore.notifications.filter(n => n.userId === userId);
}

export async function markNotificationRead(notificationId: number, userId: number) {
  const db = await getDb();
  if (db) {
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

  const notif = memStore.notifications.find(n => n.id === notificationId && n.userId === userId);
  if (notif) {
    notif.readAt = new Date();
    return true;
  }
  return false;
}

export async function getRoleChangeAudits() {
  const db = await getDb();
  if (db) {
    try {
      return await db.select().from(roleChangeAudits).orderBy(desc(roleChangeAudits.createdAt)).limit(100);
    } catch (e) {
      console.warn("[Database] MySQL read failed, falling back to memory store:", e);
    }
  }

  return memStore.audits;
}

export function createCaseReference() {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `LG-CYB-${num}`;
}

export async function listCasesForUser(user: { id: number; role: LienGuardRole }) {
  const db = await getDb();
  if (db) {
    try {
      const query = db.select().from(cases);
      if (user.role === "citizen") {
        return await query.where(eq(cases.userId, user.id)).orderBy(desc(cases.updatedAt));
      }
      return await query.orderBy(desc(cases.updatedAt));
    } catch (e) {
      console.warn("[Database] MySQL read failed, falling back to memory store:", e);
    }
  }

  if (user.role === "citizen") {
    return memStore.cases.filter(c => c.userId === user.id);
  }
  return memStore.cases;
}

export async function getCaseByReference(caseId: string) {
  const db = await getDb();
  if (db) {
    try {
      const result = await db.select().from(cases).where(eq(cases.caseId, caseId)).limit(1);
      if (result[0]) return result[0];
    } catch (e) {
      console.warn("[Database] MySQL read failed, falling back to memory store:", e);
    }
  }

  return memStore.cases.find(c => c.caseId === caseId);
}

export async function getTimelineEventsForCase(caseId: string) {
  const db = await getDb();
  if (db) {
    try {
      return await db.select().from(caseTimelineEvents).where(eq(caseTimelineEvents.caseId, caseId)).orderBy(asc(caseTimelineEvents.createdAt));
    } catch (e) {
      console.warn("[Database] MySQL read failed, falling back to memory store:", e);
    }
  }

  return memStore.timelineEvents.filter(t => t.caseId === caseId);
}

export async function getCommunicationsForCase(caseId: string) {
  const db = await getDb();
  if (db) {
    try {
      return await db.select().from(caseCommunications).where(eq(caseCommunications.caseId, caseId)).orderBy(desc(caseCommunications.createdAt));
    } catch (e) {
      console.warn("[Database] MySQL read failed, falling back to memory store:", e);
    }
  }

  return memStore.communications.filter(c => c.caseId === caseId);
}

export async function getRtiDraftForCase(caseId: string) {
  const db = await getDb();
  if (db) {
    try {
      const result = await db.select().from(caseRtiDrafts).where(eq(caseRtiDrafts.caseId, caseId)).limit(1);
      if (result[0]) return result[0];
    } catch (e) {
      console.warn("[Database] MySQL read failed, falling back to memory store:", e);
    }
  }

  return memStore.rtiDrafts.find(r => r.caseId === caseId);
}

export async function getCaseWithDetails(caseId: string) {
  const caseRecord = await getCaseByReference(caseId);
  if (!caseRecord) return undefined;

  const [timelineEvents, communications, rtiDraft] = await Promise.all([
    getTimelineEventsForCase(caseId),
    getCommunicationsForCase(caseId),
    getRtiDraftForCase(caseId),
  ]);

  return {
    caseRecord,
    timelineEvents,
    communications,
    rtiDraft,
  };
}

export async function logTimelineEvent(input: {
  caseId: string;
  eventType: string;
  title: string;
  description: string;
  actorRole: string;
  metadata?: Record<string, unknown>;
}) {
  const db = await getDb();
  if (db) {
    try {
      return await db.insert(caseTimelineEvents).values({
        caseId: input.caseId,
        eventType: input.eventType,
        title: input.title,
        description: input.description,
        actorRole: input.actorRole,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      });
    } catch (e) {
      console.warn("[Database] MySQL timeline write failed, falling back to memory store:", e);
    }
  }

  const event: CaseTimelineEvent = {
    id: memStore.timelineEvents.length + 1,
    caseId: input.caseId,
    eventType: input.eventType,
    title: input.title,
    description: input.description,
    actorRole: input.actorRole,
    metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    createdAt: new Date(),
  };
  memStore.timelineEvents.push(event);
  return event;
}

export async function createCase(input: {
  userId: number;
  title: string;
  description: string;
  caseType: string;
  priority?: CasePriority;
  bankName?: string;
  accountNumber?: string;
  branchName?: string;
  ifscCode?: string;
  lienAmount?: string;
  disputeRefNumber?: string;
  ncrpAckNumber?: string;
  firNumber?: string;
  freezingAuthority?: string;
  authorityEmail?: string;
  nodalOfficerEmail?: string;
}) {
  const caseId = createCaseReference();
  const db = await getDb();
  if (db) {
    try {
      await db.insert(cases).values({
        ...input,
        caseId,
        status: "OPEN",
        priority: input.priority || "NORMAL",
        reminderCount: 0,
        escalationTier: 1,
      });
    } catch (e) {
      console.warn("[Database] MySQL case insert failed, saving to memory store:", e);
      const newCase: Case = {
        id: memStore.cases.length + 1,
        caseId,
        userId: input.userId,
        title: input.title,
        description: input.description,
        caseType: input.caseType,
        status: "OPEN",
        priority: input.priority || "NORMAL",
        bankName: input.bankName || null,
        accountNumber: input.accountNumber || null,
        branchName: input.branchName || null,
        ifscCode: input.ifscCode || null,
        lienAmount: input.lienAmount || null,
        disputeRefNumber: input.disputeRefNumber || null,
        ncrpAckNumber: input.ncrpAckNumber || null,
        firNumber: input.firNumber || null,
        freezingAuthority: input.freezingAuthority || null,
        authorityEmail: input.authorityEmail || null,
        nodalOfficerEmail: input.nodalOfficerEmail || null,
        noticeSentAt: null,
        responseDeadline: null,
        reminderCount: 0,
        escalationTier: 1,
        resolutionNotes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      memStore.cases.unshift(newCase);
    }
  } else {
    const newCase: Case = {
      id: memStore.cases.length + 1,
      caseId,
      userId: input.userId,
      title: input.title,
      description: input.description,
      caseType: input.caseType,
      status: "OPEN",
      priority: input.priority || "NORMAL",
      bankName: input.bankName || null,
      accountNumber: input.accountNumber || null,
      branchName: input.branchName || null,
      ifscCode: input.ifscCode || null,
      lienAmount: input.lienAmount || null,
      disputeRefNumber: input.disputeRefNumber || null,
      ncrpAckNumber: input.ncrpAckNumber || null,
      firNumber: input.firNumber || null,
      freezingAuthority: input.freezingAuthority || null,
      authorityEmail: input.authorityEmail || null,
      nodalOfficerEmail: input.nodalOfficerEmail || null,
      noticeSentAt: null,
      responseDeadline: null,
      reminderCount: 0,
      escalationTier: 1,
      resolutionNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memStore.cases.unshift(newCase);
  }

  await logTimelineEvent({
    caseId,
    eventType: "CASE_REGISTERED",
    title: "Case Registered with LienGuard",
    description: `Incident recorded with ${input.bankName ? `${input.bankName}` : "the Bank"}${input.lienAmount ? ` for ₹${input.lienAmount}` : ""}. Unique Case ID assigned.`,
    actorRole: "citizen",
    metadata: {
      bankName: input.bankName,
      lienAmount: input.lienAmount,
      ncrpAckNumber: input.ncrpAckNumber,
    },
  });

  return getCaseByReference(caseId);
}

export async function dispatchInitialNotice(input: {
  caseId: string;
  citizenName: string;
  citizenEmail?: string | null;
  actorRole: LienGuardRole;
}) {
  const caseRecord = await getCaseByReference(input.caseId);
  if (!caseRecord) throw new Error("Case not found");

  const { subject, body } = generateInitialNotice({
    caseRecord,
    citizenName: input.citizenName,
    citizenEmail: input.citizenEmail,
  });

  const deadline = calculateDeadline(7);

  const db = await getDb();
  if (db) {
    try {
      await db.insert(caseCommunications).values({
        caseId: input.caseId,
        direction: "OUTBOUND",
        communicationType: "INITIAL_NOTICE",
        recipientOrSender: caseRecord.authorityEmail || caseRecord.nodalOfficerEmail || "bank.nodal@authority.gov.in",
        subject,
        body,
        status: "SENT",
      });

      await db.update(cases).set({
        noticeSentAt: new Date(),
        responseDeadline: deadline,
        status: "AWAITING_RESPONSE",
      }).where(eq(cases.caseId, input.caseId));
    } catch (e) {
      console.warn("[Database] MySQL write failed, using memory store:", e);
    }
  }

  // Update memory store
  caseRecord.noticeSentAt = new Date();
  caseRecord.responseDeadline = deadline;
  caseRecord.status = "AWAITING_RESPONSE";
  caseRecord.updatedAt = new Date();

  memStore.communications.unshift({
    id: memStore.communications.length + 1,
    caseId: input.caseId,
    direction: "OUTBOUND",
    communicationType: "INITIAL_NOTICE",
    recipientOrSender: caseRecord.authorityEmail || caseRecord.nodalOfficerEmail || "bank.nodal@authority.gov.in",
    subject,
    body,
    status: "SENT",
    createdAt: new Date(),
  });

  await logTimelineEvent({
    caseId: input.caseId,
    eventType: "NOTICE_DISPATCHED",
    title: "Formal Representation Dispatched to Authority",
    description: `Official notice sent to ${caseRecord.bankName || "Bank"} & ${caseRecord.freezingAuthority || "Cyber Cell"}. 7-day response window initiated (Deadline: ${deadline.toLocaleDateString("en-IN")}).`,
    actorRole: input.actorRole,
    metadata: {
      recipient: caseRecord.authorityEmail || caseRecord.nodalOfficerEmail,
      deadline: deadline.toISOString(),
    },
  });

  return getCaseWithDetails(input.caseId);
}

export async function dispatchFollowUpReminder(input: {
  caseId: string;
  citizenName: string;
  actorRole: LienGuardRole;
}) {
  const caseRecord = await getCaseByReference(input.caseId);
  if (!caseRecord) throw new Error("Case not found");

  const nextReminderCount = (caseRecord.reminderCount || 0) + 1;
  const { subject, body } = generateFollowUpReminder({
    caseRecord,
    citizenName: input.citizenName,
    reminderNumber: nextReminderCount,
  });

  const newDeadline = calculateDeadline(5);

  const db = await getDb();
  if (db) {
    try {
      await db.insert(caseCommunications).values({
        caseId: input.caseId,
        direction: "OUTBOUND",
        communicationType: "FOLLOW_UP_REMINDER",
        recipientOrSender: caseRecord.authorityEmail || caseRecord.nodalOfficerEmail || "bank.nodal@authority.gov.in",
        subject,
        body,
        status: "SENT",
      });

      await db.update(cases).set({
        reminderCount: nextReminderCount,
        responseDeadline: newDeadline,
        status: "REMINDER_SENT",
      }).where(eq(cases.caseId, input.caseId));
    } catch (e) {
      console.warn("[Database] MySQL write failed, using memory store:", e);
    }
  }

  caseRecord.reminderCount = nextReminderCount;
  caseRecord.responseDeadline = newDeadline;
  caseRecord.status = "REMINDER_SENT";
  caseRecord.updatedAt = new Date();

  memStore.communications.unshift({
    id: memStore.communications.length + 1,
    caseId: input.caseId,
    direction: "OUTBOUND",
    communicationType: "FOLLOW_UP_REMINDER",
    recipientOrSender: caseRecord.authorityEmail || caseRecord.nodalOfficerEmail || "bank.nodal@authority.gov.in",
    subject,
    body,
    status: "SENT",
    createdAt: new Date(),
  });

  await logTimelineEvent({
    caseId: input.caseId,
    eventType: "REMINDER_DISPATCHED",
    title: `Follow-up Reminder #${nextReminderCount} Dispatched`,
    description: `Automated reminder sent due to non-response by deadline. Revised 5-day response window set to ${newDeadline.toLocaleDateString("en-IN")}.`,
    actorRole: input.actorRole,
    metadata: {
      reminderNumber: nextReminderCount,
      newDeadline: newDeadline.toISOString(),
    },
  });

  return getCaseWithDetails(input.caseId);
}

export async function dispatchEscalation(input: {
  caseId: string;
  citizenName: string;
  tier: 2 | 3;
  actorRole: LienGuardRole;
}) {
  const caseRecord = await getCaseByReference(input.caseId);
  if (!caseRecord) throw new Error("Case not found");

  const { subject, body } = input.tier === 2
    ? generateTier2Escalation({ caseRecord, citizenName: input.citizenName })
    : generateTier3Escalation({ caseRecord, citizenName: input.citizenName });

  const communicationType = input.tier === 2 ? "TIER2_ESCALATION" : "TIER3_OMBUDSMAN";
  const recipient = input.tier === 2
    ? caseRecord.nodalOfficerEmail || "pno@bank.co.in"
    : "banking.ombudsman@rbi.org.in";

  const newDeadline = calculateDeadline(7);

  const db = await getDb();
  if (db) {
    try {
      await db.insert(caseCommunications).values({
        caseId: input.caseId,
        direction: "OUTBOUND",
        communicationType,
        recipientOrSender: recipient,
        subject,
        body,
        status: "SENT",
      });

      await db.update(cases).set({
        escalationTier: input.tier,
        status: "ESCALATED",
        responseDeadline: newDeadline,
      }).where(eq(cases.caseId, input.caseId));
    } catch (e) {
      console.warn("[Database] MySQL write failed, using memory store:", e);
    }
  }

  caseRecord.escalationTier = input.tier;
  caseRecord.status = "ESCALATED";
  caseRecord.responseDeadline = newDeadline;
  caseRecord.updatedAt = new Date();

  memStore.communications.unshift({
    id: memStore.communications.length + 1,
    caseId: input.caseId,
    direction: "OUTBOUND",
    communicationType,
    recipientOrSender: recipient,
    subject,
    body,
    status: "SENT",
    createdAt: new Date(),
  });

  await logTimelineEvent({
    caseId: input.caseId,
    eventType: "ESCALATION_TRIGGERED",
    title: `Case Escalated to Tier-${input.tier} (${input.tier === 2 ? "Principal Nodal Officer / SP Cyber" : "Banking Ombudsman / Appellate"})`,
    description: `Formal escalation dossier submitted due to prolonged non-response. Direct regulatory intervention requested.`,
    actorRole: input.actorRole,
    metadata: {
      tier: input.tier,
      recipient,
    },
  });

  return getCaseWithDetails(input.caseId);
}

export async function recordInboundResponse(input: {
  caseId: string;
  sender: string;
  subject: string;
  body: string;
  nextStatus?: CaseStatus;
  notes?: string;
  actorRole: LienGuardRole;
}) {
  const caseRecord = await getCaseByReference(input.caseId);
  if (!caseRecord) throw new Error("Case not found");

  const nextStatus = input.nextStatus || "UNDER_REVIEW";

  const db = await getDb();
  if (db) {
    try {
      await db.insert(caseCommunications).values({
        caseId: input.caseId,
        direction: "INBOUND",
        communicationType: "INBOUND_REPLY",
        recipientOrSender: input.sender,
        subject: input.subject,
        body: input.body,
        status: "RECEIVED",
      });

      await db.update(cases).set({
        status: nextStatus,
        resolutionNotes: input.notes || caseRecord.resolutionNotes,
      }).where(eq(cases.caseId, input.caseId));
    } catch (e) {
      console.warn("[Database] MySQL write failed, using memory store:", e);
    }
  }

  caseRecord.status = nextStatus;
  if (input.notes) caseRecord.resolutionNotes = input.notes;
  caseRecord.updatedAt = new Date();

  memStore.communications.unshift({
    id: memStore.communications.length + 1,
    caseId: input.caseId,
    direction: "INBOUND",
    communicationType: "INBOUND_REPLY",
    recipientOrSender: input.sender,
    subject: input.subject,
    body: input.body,
    status: "RECEIVED",
    createdAt: new Date(),
  });

  await logTimelineEvent({
    caseId: input.caseId,
    eventType: "RESPONSE_RECORDED",
    title: `Response Received from ${input.sender}`,
    description: input.notes ? `Authority communication logged. Remarks: ${input.notes}` : `Incoming response received and archived. Status updated to ${nextStatus}.`,
    actorRole: input.actorRole,
    metadata: {
      sender: input.sender,
      subject: input.subject,
      nextStatus,
    },
  });

  return getCaseWithDetails(input.caseId);
}

export async function generateOrUpdateRtiDraft(input: {
  caseId: string;
  citizenName: string;
  citizenAddress?: string;
  factsSummary?: string;
  queriesRequested?: string;
  actorRole: LienGuardRole;
}) {
  const caseRecord = await getCaseByReference(input.caseId);
  if (!caseRecord) throw new Error("Case not found");

  const autoDraft = generateRtiDraft({
    caseRecord,
    citizenName: input.citizenName,
    citizenAddress: input.citizenAddress,
  });

  const publicAuthority = autoDraft.publicAuthority;
  const pioDesignation = autoDraft.pioDesignation;
  const factsSummary = input.factsSummary || autoDraft.factsSummary;
  const queriesRequested = input.queriesRequested || autoDraft.queriesRequested;
  const statutoryDeclaration = autoDraft.statutoryDeclaration;

  const db = await getDb();
  if (db) {
    try {
      const existing = await getRtiDraftForCase(input.caseId);
      if (existing) {
        await db.update(caseRtiDrafts).set({
          factsSummary,
          queriesRequested,
          publicAuthority,
          pioDesignation,
          statutoryDeclaration,
        }).where(eq(caseRtiDrafts.caseId, input.caseId));
      } else {
        await db.insert(caseRtiDrafts).values({
          caseId: input.caseId,
          publicAuthority,
          pioDesignation,
          factsSummary,
          queriesRequested,
          statutoryDeclaration,
        });
      }
    } catch (e) {
      console.warn("[Database] MySQL RTI write failed, using memory store:", e);
    }
  }

  const existingMem = memStore.rtiDrafts.find(r => r.caseId === input.caseId);
  if (existingMem) {
    existingMem.factsSummary = factsSummary;
    existingMem.queriesRequested = queriesRequested;
    existingMem.publicAuthority = publicAuthority;
    existingMem.pioDesignation = pioDesignation;
    existingMem.statutoryDeclaration = statutoryDeclaration;
    existingMem.updatedAt = new Date();
  } else {
    memStore.rtiDrafts.push({
      id: memStore.rtiDrafts.length + 1,
      caseId: input.caseId,
      publicAuthority,
      pioDesignation,
      factsSummary,
      queriesRequested,
      statutoryDeclaration,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  await logTimelineEvent({
    caseId: input.caseId,
    eventType: "RTI_DRAFTED",
    title: "Section 6(1) RTI Application Draft Prepared",
    description: `Structured legal draft compiled under the Right to Information Act, 2005 ready for citizen review and submission.`,
    actorRole: input.actorRole,
  });

  return getRtiDraftForCase(input.caseId);
}

export async function setCaseStatus(caseId: string, status: CaseStatus, actorRole: string = "authority", notes?: string): Promise<Case | undefined> {
  const db = await getDb();
  if (db) {
    try {
      await db.update(cases).set({
        status,
        ...(notes ? { resolutionNotes: notes } : {}),
      }).where(eq(cases.caseId, caseId));
    } catch (e) {
      console.warn("[Database] MySQL status update failed, using memory store:", e);
    }
  }

  const caseRecord = memStore.cases.find(c => c.caseId === caseId);
  if (caseRecord) {
    caseRecord.status = status;
    if (notes) caseRecord.resolutionNotes = notes;
    caseRecord.updatedAt = new Date();
  }

  await logTimelineEvent({
    caseId,
    eventType: "STATUS_UPDATED",
    title: `Case Status Changed to ${status.replace(/_/g, " ")}`,
    description: notes ? `Status updated by ${actorRole}. Remarks: ${notes}` : `Status transitioned to ${status.replace(/_/g, " ")}.`,
    actorRole,
    metadata: { status, notes },
  });

  return getCaseByReference(caseId);
}

export async function updateCaseDetails(input: {
  caseId: string;
  title?: string;
  description?: string;
  caseType?: string;
  priority?: CasePriority;
  bankName?: string;
  accountNumber?: string;
  branchName?: string;
  ifscCode?: string;
  lienAmount?: string;
  disputeRefNumber?: string;
  ncrpAckNumber?: string;
  firNumber?: string;
  freezingAuthority?: string;
  authorityEmail?: string;
  nodalOfficerEmail?: string;
  resolutionNotes?: string;
}): Promise<Case | undefined> {
  const db = await getDb();
  if (db) {
    try {
      const { caseId, ...values } = input;
      await db.update(cases).set(values).where(eq(cases.caseId, caseId));
    } catch (e) {
      console.warn("[Database] MySQL update failed, using memory store:", e);
    }
  }

  const caseRecord = memStore.cases.find(c => c.caseId === input.caseId);
  if (caseRecord) {
    if (input.title !== undefined) caseRecord.title = input.title;
    if (input.description !== undefined) caseRecord.description = input.description;
    if (input.caseType !== undefined) caseRecord.caseType = input.caseType;
    if (input.priority !== undefined) caseRecord.priority = input.priority;
    if (input.bankName !== undefined) caseRecord.bankName = input.bankName;
    if (input.accountNumber !== undefined) caseRecord.accountNumber = input.accountNumber;
    if (input.branchName !== undefined) caseRecord.branchName = input.branchName;
    if (input.ifscCode !== undefined) caseRecord.ifscCode = input.ifscCode;
    if (input.lienAmount !== undefined) caseRecord.lienAmount = input.lienAmount;
    if (input.disputeRefNumber !== undefined) caseRecord.disputeRefNumber = input.disputeRefNumber;
    if (input.ncrpAckNumber !== undefined) caseRecord.ncrpAckNumber = input.ncrpAckNumber;
    if (input.firNumber !== undefined) caseRecord.firNumber = input.firNumber;
    if (input.freezingAuthority !== undefined) caseRecord.freezingAuthority = input.freezingAuthority;
    if (input.authorityEmail !== undefined) caseRecord.authorityEmail = input.authorityEmail;
    if (input.nodalOfficerEmail !== undefined) caseRecord.nodalOfficerEmail = input.nodalOfficerEmail;
    if (input.resolutionNotes !== undefined) caseRecord.resolutionNotes = input.resolutionNotes;
    caseRecord.updatedAt = new Date();
  }

  return getCaseByReference(input.caseId);
}

export async function getDashboardMetrics(user: { id: number; role: LienGuardRole }) {
  const userCases = await listCasesForUser(user);

  let totalFrozenAmount = 0;
  let activeCases = 0;
  let awaitingResponse = 0;
  let overdueDeadlines = 0;
  let escalatedCases = 0;
  let resolvedCases = 0;

  const now = new Date().getTime();

  for (const c of userCases) {
    if (c.lienAmount) {
      const num = Number(c.lienAmount.replace(/[^0-9.-]+/g, ""));
      if (!isNaN(num)) totalFrozenAmount += num;
    }

    if (c.status === "RESOLVED" || c.status === "CLOSED") {
      resolvedCases++;
    } else {
      activeCases++;
    }

    if (c.status === "AWAITING_RESPONSE" || c.status === "REMINDER_SENT") {
      awaitingResponse++;
    }

    if (c.status === "ESCALATED") {
      escalatedCases++;
    }

    if (c.responseDeadline && !["RESOLVED", "CLOSED"].includes(c.status)) {
      const deadlineTime = new Date(c.responseDeadline).getTime();
      if (deadlineTime < now) {
        overdueDeadlines++;
      }
    }
  }

  return {
    totalCases: userCases.length,
    activeCases,
    awaitingResponse,
    overdueDeadlines,
    escalatedCases,
    resolvedCases,
    totalFrozenAmount,
  };
}


