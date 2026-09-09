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
import { OFFICIAL_CYBER_AUTHORITIES } from "./authoritySeedData";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

const _seedNow = new Date();
const _seedD1 = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
const _seedD2 = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
const _seedD3 = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
const _seedD4 = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
const _seedD5 = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

// In-Memory Fallback Store for Local Demo & Offline Runs
let memCases: Case[] = [
  {
    id: 101,
    caseId: "LG-2026-A891F2C04D12",
    userId: 1,
    title: "Unauthorized Cyber Cell Lien — P2P Escrow Account Freeze",
    description: "Savings account frozen following an erroneous cybercrime complaint filed in Karnataka regarding a peer-to-peer escrow transaction. Notice issued under Section 91/102 CrPC.",
    caseType: "CYBER_CRIME_LIEN",
    status: "AWAITING_RESPONSE",
    priority: "HIGH",
    bankName: "HDFC Bank (Connaught Place Branch)",
    lienAmount: "85000.00",
    lienDate: _seedD3,
    lienReference: "LIEN-HDFC-2026-4491",
    transactionReference: "TXN-UPI-992140581",
    authorityName: "Karnataka State Cyber Crime Police Station (CID Bengaluru)",
    authorityEmail: "cybercrime@ksp.gov.in",
    authorityDirectoryId: 17,
    responseDeadline: _seedD5,
    createdAt: _seedD3,
    updatedAt: _seedD2,
  },
  {
    id: 102,
    caseId: "LG-2026-B773E9A15C88",
    userId: 1,
    title: "Merchant Gateway Chargeback Lien — Settlement Account Hold",
    description: "Current account partial debit freeze of ₹2,40,000 imposed by nodal bank operations after fraudulent card chargeback claim from external payment aggregator.",
    caseType: "BANK_INTERNAL_LIEN",
    status: "UNDER_REVIEW",
    priority: "NORMAL",
    bankName: "State Bank of India (Corporate Centre, Mumbai)",
    lienAmount: "240000.00",
    lienDate: _seedD4,
    lienReference: "SBI-CR-2026-09214",
    transactionReference: "PG-SETTLE-88102914",
    authorityName: "Maharashtra Cyber Police Headquarters (World Trade Centre, Mumbai)",
    authorityEmail: "sp.cbr-mah@gov.in",
    authorityDirectoryId: 21,
    responseDeadline: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
    createdAt: _seedD4,
    updatedAt: _seedD3,
  },
  {
    id: 103,
    caseId: "LG-2026-C190D4F88B34",
    userId: 1,
    title: "Erroneous Layer-3 Beneficiary Lien — Statutory Escalation",
    description: "Salary account frozen as tertiary beneficiary in a multi-hop phishing scam trail. The citizen had no direct contact with the primary suspect. Statutory 48-hour response window elapsed without authority reply.",
    caseType: "THIRD_PARTY_DISPUTE",
    status: "ESCALATED",
    priority: "URGENT",
    bankName: "ICICI Bank (Bandra Kurla Complex)",
    lienAmount: "315000.00",
    lienDate: _seedD1,
    lienReference: "ICICI-LN-2026-78901",
    transactionReference: "IMPS-REF-4091823",
    authorityName: "Delhi Police Cyber Crime Unit (Special Cell IFSO)",
    authorityEmail: "dcp-cybercell-dl@nic.in",
    authorityDirectoryId: 10,
    responseDeadline: _seedD2,
    createdAt: _seedD1,
    updatedAt: _seedNow,
  },
  {
    id: 104,
    caseId: "LG-2026-D442A1E77E90",
    userId: 1,
    title: "Mutual Fund Redemption Temporary Hold — Cleared & Unfrozen",
    description: "Temporary administrative lien placed during high-value redemption verification. Cleared upon furnishing video KYC and bank mandate authentication.",
    caseType: "BANK_INTERNAL_LIEN",
    status: "RESOLVED",
    priority: "LOW",
    bankName: "Axis Bank (Retail Lending Operations)",
    lienAmount: "50000.00",
    lienDate: _seedD1,
    lienReference: "AXIS-REV-2026-1102",
    transactionReference: "MF-RED-2026-77881",
    authorityName: "Haryana State Cyber Crime Police Station (PHQ Panchkula)",
    authorityEmail: "sp-cybercrimephq.pol@hry.gov.in",
    authorityDirectoryId: 12,
    responseDeadline: null,
    createdAt: _seedD1,
    updatedAt: _seedD3,
  },
];

let memCaseEvents: CaseEvent[] = [
  { id: 1, caseId: 101, actorUserId: 1, actorLabel: null, type: "CASE_CREATED", message: "Case registered by Citizen User.", previousStatus: null, nextStatus: null, createdAt: _seedD3 },
  { id: 2, caseId: 101, actorUserId: null, actorLabel: "LienGuard automation", type: "AUTHORITY_RECOMMENDED", message: "Official Authority Recommended: Karnataka State Cyber Crime Police Station (CID Bengaluru) — Source: National Cyber Crime Reporting Portal", previousStatus: null, nextStatus: null, createdAt: _seedD3 },
  { id: 3, caseId: 101, actorUserId: null, actorLabel: "LienGuard automation", type: "AUTHORITY_ASSIGNED", message: "Point-in-time statutory routing assigned to SP Cyber Crime CID Bengaluru.", previousStatus: null, nextStatus: null, createdAt: _seedD3 },
  { id: 4, caseId: 101, actorUserId: null, actorLabel: "LienGuard Maileroo delivery", type: "EMAIL_SENT", message: "Formal representation and KYC validation documents dispatched via Maileroo SMTP to cybercrime@ksp.gov.in.", previousStatus: null, nextStatus: null, createdAt: _seedD2 },
  { id: 5, caseId: 102, actorUserId: 1, actorLabel: null, type: "CASE_CREATED", message: "Merchant settlement account lien logged with proof of fulfillment.", previousStatus: null, nextStatus: null, createdAt: _seedD4 },
  { id: 6, caseId: 102, actorUserId: 1, actorLabel: null, type: "STATUS_CHANGED", message: "Status changed from open to under review following bank compliance ticket.", previousStatus: "OPEN", nextStatus: "UNDER_REVIEW", createdAt: _seedD3 },
  { id: 7, caseId: 103, actorUserId: 1, actorLabel: null, type: "CASE_CREATED", message: "Salary account freeze reported.", previousStatus: null, nextStatus: null, createdAt: _seedD1 },
  { id: 8, caseId: 103, actorUserId: null, actorLabel: "LienGuard deadline automation", type: "DEADLINE_FOLLOW_UP_QUEUED", message: "Automated 48-hour follow-up notice sent to Delhi Police IFSO Special Cell.", previousStatus: null, nextStatus: null, createdAt: _seedD2 },
  { id: 9, caseId: 103, actorUserId: null, actorLabel: "LienGuard deadline automation", type: "DEADLINE_ESCALATED", message: "Statutory response window elapsed without reply. Case formally escalated to Supervisory Authority.", previousStatus: "AWAITING_RESPONSE", nextStatus: "ESCALATED", createdAt: _seedD2 },
  { id: 10, caseId: 103, actorUserId: 1, actorLabel: null, type: "RTI_DRAFT_CREATED", message: "Draft application under Section 6(1) Right to Information Act, 2005 generated.", previousStatus: null, nextStatus: null, createdAt: _seedNow },
  { id: 11, caseId: 104, actorUserId: 1, actorLabel: null, type: "CASE_CREATED", message: "Administrative redemption hold reported.", previousStatus: null, nextStatus: null, createdAt: _seedD1 },
  { id: 12, caseId: 104, actorUserId: 1, actorLabel: null, type: "DOCUMENT_UPLOADED", message: "Video KYC verification certificate uploaded.", previousStatus: null, nextStatus: null, createdAt: _seedD3 },
  { id: 13, caseId: 104, actorUserId: 1, actorLabel: null, type: "STATUS_CHANGED", message: "Lien successfully revoked and account fully restored to normal status.", previousStatus: "UNDER_REVIEW", nextStatus: "RESOLVED", createdAt: _seedD3 },
];

let memCaseCommunications: CaseCommunication[] = [
  {
    id: 1,
    caseId: 101,
    direction: "outbound",
    subject: "[LG-2026-A891F2C04D12] Notice of Identity & Commercial Proof for Account Unfreezing Request",
    counterparty: "Karnataka State Cyber Crime Police Station (CID Bengaluru)",
    recipientEmail: "cybercrime@ksp.gov.in",
    body: "Dear Officer-in-Charge, we formally submit identity proofs, bank transaction logs, and P2P platform escrow clearance for Case LG-2026-A891F2C04D12 regarding account freeze of INR 85,000.",
    state: "sent",
    providerMessageId: "msg_ksp_0921481a",
    sentAt: _seedD2,
    deliveredAt: _seedD2,
    automated: 1,
    createdAt: _seedD3,
    updatedAt: _seedD2,
  },
  {
    id: 2,
    caseId: 102,
    direction: "inbound",
    subject: "Re: [LG-2026-B773E9A15C88] SBI Nodal Operations Acknowledgment - Case Investigation",
    counterparty: "State Bank of India (Nodal Desk)",
    recipientEmail: "nodal.desk@sbi.co.in",
    body: "This is to confirm receipt of merchant fulfillment documents. Ticket logged with internal risk assessment team. Turnaround time: 72 business hours.",
    state: "received",
    providerMessageId: "inbound_sbi_992147",
    sentAt: null,
    deliveredAt: _seedD3,
    automated: 0,
    createdAt: _seedD3,
    updatedAt: _seedD3,
  },
  {
    id: 3,
    caseId: 103,
    direction: "outbound",
    subject: "[LG-2026-C190D4F88B34] URGENT: Statutory Supervisory Escalation on Unlawful Third-Party Freeze",
    counterparty: "Delhi Police Cyber Crime Unit (Special Cell IFSO)",
    recipientEmail: "dcp-cybercell-dl@nic.in",
    body: "Formal escalation notice regarding Case LG-2026-C190D4F88B34. The statutory 48-hour response window has expired. The matter has been escalated for supervisory review.",
    state: "sent",
    providerMessageId: "msg_dl_ifso_8812",
    sentAt: _seedD2,
    deliveredAt: _seedD2,
    automated: 1,
    createdAt: _seedD2,
    updatedAt: _seedD2,
  },
];

let memCaseDocuments: CaseDocument[] = [
  {
    id: 1,
    caseId: 101,
    uploadedByUserId: 1,
    kind: "EVIDENCE",
    fileName: "P2P_Escrow_Receipt_and_Ledger.pdf",
    storageKey: "lienguard/cases/101/evidence/P2P_Escrow_Receipt_and_Ledger.pdf",
    contentType: "application/pdf",
    sizeBytes: 245800,
    createdAt: _seedD3,
    updatedAt: _seedD3,
  },
  {
    id: 2,
    caseId: 102,
    uploadedByUserId: 1,
    kind: "EVIDENCE",
    fileName: "Merchant_Tax_Invoice_and_Proof_of_Delivery.pdf",
    storageKey: "lienguard/cases/102/evidence/Merchant_Tax_Invoice_and_Proof_of_Delivery.pdf",
    contentType: "application/pdf",
    sizeBytes: 412000,
    createdAt: _seedD4,
    updatedAt: _seedD4,
  },
  {
    id: 3,
    caseId: 103,
    uploadedByUserId: 1,
    kind: "RTI_DRAFT",
    fileName: "LG-2026-C190D4F88B34-rti-draft.txt",
    storageKey: "lienguard/cases/103/rti/LG-2026-C190D4F88B34-rti-draft.txt",
    contentType: "text/plain",
    sizeBytes: 1840,
    createdAt: _seedNow,
    updatedAt: _seedNow,
  },
  {
    id: 4,
    caseId: 104,
    uploadedByUserId: 1,
    kind: "CORRESPONDENCE",
    fileName: "Bank_NOC_Lien_Release_Certificate.pdf",
    storageKey: "lienguard/cases/104/correspondence/Bank_NOC_Lien_Release_Certificate.pdf",
    contentType: "application/pdf",
    sizeBytes: 98400,
    createdAt: _seedD3,
    updatedAt: _seedD3,
  },
];

let memCaseAuthorityAssignments: any[] = [
  {
    id: 1,
    caseId: 101,
    authorityDirectoryId: 17,
    authorityName: "Karnataka State Cyber Crime Police Station (CID Bengaluru)",
    authorityEmail: "cybercrime@ksp.gov.in",
    officerName: "Sh. Ravikumar H.N.",
    designation: "IPS, SP Cyber Crime, CID",
    sourceName: "National Cyber Crime Reporting Portal",
    sourceUrl: "https://cybercrime.gov.in/",
    lastVerifiedAt: new Date("2026-08-23"),
    routingReason: "Deterministic match: State/UT = Karnataka, Category = Cyber Crime Lien",
    assignedByUserId: 1,
    assignedAt: _seedD3,
  },
  {
    id: 2,
    caseId: 102,
    authorityDirectoryId: 21,
    authorityName: "Maharashtra Cyber Police Headquarters (World Trade Centre, Mumbai)",
    authorityEmail: "sp.cbr-mah@gov.in",
    officerName: "Dr. Balsing Rajput",
    designation: "IPS, SP Cyber Maharashtra",
    sourceName: "National Cyber Crime Reporting Portal",
    sourceUrl: "https://cybercrime.gov.in/",
    lastVerifiedAt: new Date("2026-08-23"),
    routingReason: "Deterministic match: State/UT = Maharashtra, Category = Bank Settlement Lien",
    assignedByUserId: 1,
    assignedAt: _seedD4,
  },
  {
    id: 3,
    caseId: 103,
    authorityDirectoryId: 10,
    authorityName: "Delhi Police Cyber Crime Unit (Special Cell IFSO)",
    authorityEmail: "dcp-cybercell-dl@nic.in",
    officerName: "Sh. Hemant Tiwari",
    designation: "IPS, DCP IFSO Special Cell",
    sourceName: "National Cyber Crime Reporting Portal",
    sourceUrl: "https://cybercrime.gov.in/",
    lastVerifiedAt: new Date("2026-08-23"),
    routingReason: "Deterministic match: State/UT = Delhi, Category = Salary Beneficiary Dispute",
    assignedByUserId: 1,
    assignedAt: _seedD1,
  },
  {
    id: 4,
    caseId: 104,
    authorityDirectoryId: 12,
    authorityName: "Haryana State Cyber Crime Police Station (PHQ Panchkula)",
    authorityEmail: "sp-cybercrimephq.pol@hry.gov.in",
    officerName: "Sh. Sibash Kabiraj",
    designation: "IPS, ADGP Cyber Haryana",
    sourceName: "National Cyber Crime Reporting Portal",
    sourceUrl: "https://cybercrime.gov.in/",
    lastVerifiedAt: new Date("2026-08-23"),
    routingReason: "Deterministic match: State/UT = Haryana, Category = Administrative Hold",
    assignedByUserId: 1,
    assignedAt: _seedD1,
  },
];

let memUserNotifications: any[] = [
  {
    id: 1,
    userId: 1,
    type: "deadline_escalated",
    title: "Case LG-2026-C190D4F88B34 Escalated",
    message: "Statutory 48-hour response period elapsed. Case escalated to Delhi Police IFSO Supervisory Cell.",
    readAt: null,
    createdAt: _seedD2,
  },
  {
    id: 2,
    userId: 1,
    type: "status_changed",
    title: "Case LG-2026-D442A1E77E90 Resolved",
    message: "Mutual Fund redemption administrative hold has been cleared and lien released by Axis Bank.",
    readAt: _seedD3,
    createdAt: _seedD3,
  },
];
let memAuthorities = OFFICIAL_CYBER_AUTHORITIES.map((auth, idx) => ({
  id: idx + 1,
  stateUt: auth.stateUt,
  district: null,
  authorityType: auth.authorityType,
  authorityName: auth.authorityName,
  officerName: auth.officerName || null,
  designation: auth.designation || null,
  officialEmail: auth.officialEmail || null,
  phone: auth.phone || null,
  sourceName: auth.sourceName,
  sourceUrl: auth.sourceUrl,
  lastVerifiedAt: auth.lastVerifiedAt,
  active: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
}));

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

  try {
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
  } catch (error) {
    console.warn("[Database] upsertUser failed, using in-memory demo fallback:", (error as Error).message);
  }
}

export async function getUserByOpenId(openId: string) {
  try {
    const db = await getDb();
    if (!db) {
      if (openId.startsWith("demo-")) {
        const role = (openId.replace("demo-", "") as LienGuardRole) || "citizen";
        return {
          id: 1,
          openId,
          name: role === "admin" ? "LienGuard Administrator" : role === "bank" ? "Nodal Bank Officer" : role === "authority" ? "Designated Police Authority" : "Citizen User",
          email: `${role}@lienguard.dev`,
          loginMethod: "demo_auth",
          role,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
        };
      }
      return undefined;
    }

    const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
    return result[0];
  } catch (error) {
    if (openId.startsWith("demo-")) {
      const role = (openId.replace("demo-", "") as LienGuardRole) || "citizen";
      return {
        id: 1,
        openId,
        name: role === "admin" ? "LienGuard Administrator" : role === "bank" ? "Nodal Bank Officer" : role === "authority" ? "Designated Police Authority" : "Citizen User",
        email: `${role}@lienguard.dev`,
        loginMethod: "demo_auth",
        role,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      };
    }
    return undefined;
  }
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
  try {
    const db = await getDb();
    if (!db) return memUserNotifications.filter(n => n.userId === userId);

    const res = await db
      .select()
      .from(userNotifications)
      .where(eq(userNotifications.userId, userId))
      .orderBy(desc(userNotifications.createdAt));
    if (res && res.length) return res;
    return memUserNotifications.filter(n => n.userId === userId);
  } catch (error) {
    console.warn("[Database] getNotificationsForUser fallback:", (error as Error).message);
    return memUserNotifications.filter(n => n.userId === userId);
  }
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
  try {
    const db = await getDb();
    if (db) {
      const query = db.select().from(cases);
      if (user.role === "citizen" || user.role === "bank") {
        const res = await query.where(eq(cases.userId, user.id)).orderBy(desc(cases.updatedAt));
        if (res && res.length) return res;
      } else {
        const res = await query.orderBy(desc(cases.updatedAt));
        if (res && res.length) return res;
      }
    }
  } catch (error) {
    console.warn("[Database] listCasesForUser fallback to memory store");
  }

  if (user.role === "citizen" || user.role === "bank") {
    return memCases.filter(c => c.userId === user.id).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }
  return [...memCases].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

export async function getCaseByReference(caseId: string) {
  try {
    const db = await getDb();
    if (db) {
      const result = await db.select().from(cases).where(eq(cases.caseId, caseId)).limit(1);
      if (result && result.length) return result[0];
    }
  } catch (error) {
    console.warn("[Database] getCaseByReference fallback to memory store");
  }

  return memCases.find(c => c.caseId === caseId);
}

export async function getCaseById(id: number) {
  try {
    const db = await getDb();
    if (db) {
      const result = await db.select().from(cases).where(eq(cases.id, id)).limit(1);
      if (result && result.length) return result[0];
    }
  } catch (error) {
    console.warn("[Database] getCaseById fallback to memory store");
  }

  return memCases.find(c => c.id === id);
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
  const caseId = createCaseReference();
  try {
    const db = await getDb();
    if (db) {
      for (let attempt = 0; attempt < 3; attempt += 1) {
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
          return await getCaseByReference(caseId);
        } catch (error) {
          if (isDuplicateKeyError(error) && attempt < 2) continue;
          throw error;
        }
      }
    }
  } catch (err) {
    console.warn("[Database] createCase database offline, using memory store");
  }

  const newId = memCases.length ? Math.max(...memCases.map(c => c.id)) + 1 : 1;
  const now = new Date();
  const newCase: Case = {
    id: newId,
    caseId,
    userId: input.userId,
    title: input.title,
    description: input.description,
    caseType: input.caseType,
    status: input.initialStatus || "OPEN",
    priority: input.priority,
    bankName: input.bankName || null,
    lienAmount: input.lienAmount || null,
    lienDate: input.lienDate || null,
    lienReference: input.lienReference || null,
    transactionReference: input.transactionReference || null,
    authorityName: input.authorityName || null,
    authorityEmail: input.authorityEmail || null,
    authorityDirectoryId: null,
    responseDeadline: input.responseDeadline || null,
    createdAt: now,
    updatedAt: now,
  };
  memCases.push(newCase);
  memCaseEvents.push({
    id: memCaseEvents.length + 1,
    caseId: newId,
    actorUserId: input.userId,
    actorLabel: null,
    type: "CASE_CREATED",
    message: "Case record created.",
    previousStatus: null,
    nextStatus: null,
    createdAt: now,
  });
  return newCase;
}

export async function recordSystemCaseEvent(input: {
  caseRecordId: number;
  type: CaseEventType;
  message: string;
  previousStatus?: CaseStatus | null;
  nextStatus?: CaseStatus | null;
  actorLabel?: string;
}) {
  try {
    const db = await getDb();
    if (db) {
      await db.insert(caseEvents).values({
        caseId: input.caseRecordId,
        actorUserId: null,
        actorLabel: input.actorLabel || "LienGuard automation",
        type: input.type,
        message: input.message,
        previousStatus: input.previousStatus || null,
        nextStatus: input.nextStatus || null,
      });
      return;
    }
  } catch (err) {
    console.warn("[Database] recordSystemCaseEvent fallback to memory store");
  }

  memCaseEvents.push({
    id: memCaseEvents.length + 1,
    caseId: input.caseRecordId,
    actorUserId: null,
    actorLabel: input.actorLabel || "LienGuard automation",
    type: input.type,
    message: input.message,
    previousStatus: input.previousStatus || null,
    nextStatus: input.nextStatus || null,
    createdAt: new Date(),
  });
}

export async function listCaseEvents(caseRecordId: number): Promise<CaseEvent[]> {
  try {
    const db = await getDb();
    if (db) {
      const res = await db.select().from(caseEvents).where(eq(caseEvents.caseId, caseRecordId)).orderBy(desc(caseEvents.createdAt));
      if (res && res.length) return res;
    }
  } catch (err) {
    console.warn("[Database] listCaseEvents fallback to memory store");
  }

  return memCaseEvents.filter(e => e.caseId === caseRecordId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function setCaseStatus(input: {
  caseId: string;
  previousStatus: CaseStatus;
  nextStatus: CaseStatus;
  actorUserId: number;
}): Promise<Case | undefined> {
  try {
    const db = await getDb();
    if (db) {
      const current = await getCaseByReference(input.caseId);
      if (current && current.status === input.previousStatus) {
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
        return await getCaseByReference(input.caseId);
      }
    }
  } catch (err) {
    console.warn("[Database] setCaseStatus fallback to memory store");
  }

  const found = memCases.find(c => c.caseId === input.caseId);
  if (found && found.status === input.previousStatus) {
    found.status = input.nextStatus;
    found.updatedAt = new Date();
    memCaseEvents.push({
      id: memCaseEvents.length + 1,
      caseId: found.id,
      actorUserId: input.actorUserId,
      actorLabel: null,
      type: "STATUS_CHANGED",
      message: `Status changed from ${input.previousStatus.split("_").join(" ").toLowerCase()} to ${input.nextStatus.split("_").join(" ").toLowerCase()}.`,
      previousStatus: input.previousStatus,
      nextStatus: input.nextStatus,
      createdAt: new Date(),
    });
    return found;
  }
  return found;
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
  const { caseId, actorUserId, ...values } = input;
  const changedFields = Object.entries(values).filter(([, value]) => value !== undefined);
  if (!changedFields.length) return undefined;

  try {
    const db = await getDb();
    if (db) {
      const current = await getCaseByReference(caseId);
      if (current) {
        await db.transaction(async tx => {
          await tx.update(cases).set(values).where(eq(cases.caseId, caseId));
          await tx.insert(caseEvents).values({
            caseId: current.id,
            actorUserId,
            type: "DETAILS_UPDATED",
            message: `Case details updated: ${changedFields.map(([field]) => field).join(", ")}.`,
          });
        });
        return await getCaseByReference(caseId);
      }
    }
  } catch (err) {
    console.warn("[Database] updateCaseDetails fallback to memory store");
  }

  const found = memCases.find(c => c.caseId === caseId);
  if (found) {
    Object.assign(found, values);
    found.updatedAt = new Date();
    memCaseEvents.push({
      id: memCaseEvents.length + 1,
      caseId: found.id,
      actorUserId,
      actorLabel: null,
      type: "DETAILS_UPDATED",
      message: `Case details updated: ${changedFields.map(([field]) => field).join(", ")}.`,
      previousStatus: null,
      nextStatus: null,
      createdAt: new Date(),
    });
    return found;
  }
  return undefined;
}

export async function listCaseCommunications(caseRecordId: number): Promise<CaseCommunication[]> {
  try {
    const db = await getDb();
    if (db) {
      const res = await db.select().from(caseCommunications).where(eq(caseCommunications.caseId, caseRecordId)).orderBy(desc(caseCommunications.createdAt));
      if (res && res.length) return res;
    }
  } catch (err) {
    console.warn("[Database] listCaseCommunications fallback to memory store");
  }

  return memCaseCommunications.filter(c => c.caseId === caseRecordId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
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
  try {
    const db = await getDb();
    if (db) {
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
      return await getCaseCommunicationById(communicationResult);
    }
  } catch (err) {
    console.warn("[Database] createOutboundEmail fallback to memory store");
  }

  const newId = memCaseCommunications.length ? Math.max(...memCaseCommunications.map(c => c.id)) + 1 : 1;
  const now = new Date();
  const newComm: CaseCommunication = {
    id: newId,
    caseId: input.caseRecordId,
    direction: "outbound",
    subject: input.subject,
    counterparty: input.recipientName || null,
    recipientEmail: input.recipientEmail,
    body: input.body,
    state: "queued",
    providerMessageId: null,
    sentAt: null,
    deliveredAt: null,
    automated: input.automated ? 1 : 0,
    createdAt: now,
    updatedAt: now,
  };
  memCaseCommunications.push(newComm);
  memCaseEvents.push({
    id: memCaseEvents.length + 1,
    caseId: input.caseRecordId,
    actorUserId: input.actorUserId,
    actorLabel: input.actorLabel || null,
    type: input.eventType ?? "EMAIL_QUEUED",
    message: input.eventMessage ?? `Email queued for delivery to ${input.recipientEmail}.`,
    previousStatus: null,
    nextStatus: null,
    createdAt: now,
  });
  return newComm;
}

export async function getCaseCommunicationById(communicationId: number) {
  try {
    const db = await getDb();
    if (db) {
      const result = await db.select().from(caseCommunications).where(eq(caseCommunications.id, communicationId)).limit(1);
      if (result && result.length) return result[0];
    }
  } catch (err) {
    console.warn("[Database] getCaseCommunicationById fallback to memory store");
  }

  return memCaseCommunications.find(c => c.id === communicationId);
}

export async function getCaseCommunicationByProviderMessageId(providerMessageId: string) {
  try {
    const db = await getDb();
    if (db) {
      const result = await db.select().from(caseCommunications).where(eq(caseCommunications.providerMessageId, providerMessageId)).limit(1);
      if (result && result.length) return result[0];
    }
  } catch (err) {
    console.warn("[Database] getCaseCommunicationByProviderMessageId fallback to memory store");
  }

  return memCaseCommunications.find(c => c.providerMessageId === providerMessageId);
}

export async function markOutboundEmailSent(input: { communicationId: number; providerMessageId: string; actorLabel?: string }) {
  try {
    const db = await getDb();
    if (db) {
      const communication = await getCaseCommunicationById(input.communicationId);
      if (communication && communication.state === "queued") {
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
        return await getCaseCommunicationById(input.communicationId);
      }
    }
  } catch (err) {
    console.warn("[Database] markOutboundEmailSent fallback to memory store");
  }

  const found = memCaseCommunications.find(c => c.id === input.communicationId);
  if (found) {
    found.state = "sent";
    found.providerMessageId = input.providerMessageId;
    found.sentAt = new Date();
    found.updatedAt = new Date();
    memCaseEvents.push({
      id: memCaseEvents.length + 1,
      caseId: found.caseId,
      actorUserId: null,
      actorLabel: input.actorLabel || "LienGuard Maileroo delivery",
      type: "EMAIL_SENT",
      message: `Email accepted by the delivery provider for ${found.recipientEmail || "the intended recipient"}.`,
      previousStatus: null,
      nextStatus: null,
      createdAt: new Date(),
    });
    return found;
  }
  return found;
}

export async function markOutboundEmailFailed(input: { communicationId: number; message: string; actorLabel?: string }) {
  try {
    const db = await getDb();
    if (db) {
      const communication = await getCaseCommunicationById(input.communicationId);
      if (communication && communication.state === "queued") {
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
        return await getCaseCommunicationById(input.communicationId);
      }
    }
  } catch (err) {
    console.warn("[Database] markOutboundEmailFailed fallback to memory store");
  }

  const found = memCaseCommunications.find(c => c.id === input.communicationId);
  if (found) {
    found.state = "failed";
    found.updatedAt = new Date();
    memCaseEvents.push({
      id: memCaseEvents.length + 1,
      caseId: found.caseId,
      actorUserId: null,
      actorLabel: input.actorLabel || "LienGuard Maileroo delivery",
      type: "EMAIL_FAILED",
      message: `Email delivery could not be completed: ${input.message.slice(0, 380)}.`,
      previousStatus: null,
      nextStatus: null,
      createdAt: new Date(),
    });
    return found;
  }
  return found;
}

export async function recordInboundEmail(input: {
  caseRecordId: number;
  providerMessageId: string;
  senderEmail: string;
  subject: string;
  body: string;
}) {
  try {
    const db = await getDb();
    if (db) {
      const existing = await db.select().from(caseCommunications).where(eq(caseCommunications.providerMessageId, input.providerMessageId)).limit(1);
      if (existing[0]) return { communication: existing[0], duplicate: true };

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
      if (communication) return { communication, duplicate: false };
    }
  } catch (err) {
    console.warn("[Database] recordInboundEmail fallback to memory store");
  }

  const existing = memCaseCommunications.find(c => c.providerMessageId === input.providerMessageId);
  if (existing) return { communication: existing, duplicate: true };

  const newId = memCaseCommunications.length ? Math.max(...memCaseCommunications.map(c => c.id)) + 1 : 1;
  const now = new Date();
  const newComm: CaseCommunication = {
    id: newId,
    caseId: input.caseRecordId,
    direction: "inbound",
    subject: input.subject,
    counterparty: input.senderEmail,
    recipientEmail: input.senderEmail,
    body: input.body,
    state: "received",
    providerMessageId: input.providerMessageId,
    sentAt: null,
    deliveredAt: now,
    automated: 0,
    createdAt: now,
    updatedAt: now,
  };
  memCaseCommunications.push(newComm);
  memCaseEvents.push({
    id: memCaseEvents.length + 1,
    caseId: input.caseRecordId,
    actorUserId: null,
    actorLabel: "Maileroo inbound routing",
    type: "INBOUND_EMAIL_RECEIVED",
    message: `Inbound email received from ${input.senderEmail}.`,
    previousStatus: null,
    nextStatus: null,
    createdAt: now,
  });
  return { communication: newComm, duplicate: false };
}

export async function listQueuedOutboundEmails(limit = 50) {
  try {
    const db = await getDb();
    if (db) {
      const res = await db.select().from(caseCommunications).where(and(eq(caseCommunications.direction, "outbound"), eq(caseCommunications.state, "queued"))).orderBy(desc(caseCommunications.createdAt)).limit(limit);
      if (res && res.length) return res;
    }
  } catch (err) {
    console.warn("[Database] listQueuedOutboundEmails fallback to memory store");
  }

  return memCaseCommunications.filter(c => c.direction === "outbound" && c.state === "queued").sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit);
}

export async function createDeadlineFollowUpIfAbsent(input: {
  caseRecord: Case;
  idempotencyKey: string;
  subject: string;
  body: string;
}) {
  try {
    const db = await getDb();
    if (db) {
      if (!input.caseRecord.authorityEmail) throw new Error("The case has no authority email address.");
      const result = await db.transaction(async tx => {
        const communicationInsert = await tx.insert(caseCommunications).values({
          caseId: input.caseRecord.id,
          direction: "outbound",
          subject: input.subject,
          counterparty: input.caseRecord.authorityName || null,
          recipientEmail: input.caseRecord.authorityEmail!,
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
    }
  } catch (error) {
    if (isDuplicateKeyError(error)) return { created: false, communication: undefined };
    console.warn("[Database] createDeadlineFollowUpIfAbsent fallback to memory store");
  }

  const existing = memCaseCommunications.find(c => c.caseId === input.caseRecord.id && c.subject === input.subject);
  if (existing) return { created: false, communication: existing };

  const comm = await createOutboundEmail({
    caseRecordId: input.caseRecord.id,
    actorUserId: null,
    actorLabel: "LienGuard deadline automation",
    subject: input.subject,
    body: input.body,
    recipientName: input.caseRecord.authorityName,
    recipientEmail: input.caseRecord.authorityEmail || "demo-authority@local.invalid",
    automated: true,
    eventType: "DEADLINE_FOLLOW_UP_QUEUED",
    eventMessage: `Deadline follow-up queued for delivery to ${input.caseRecord.authorityEmail || "authority"}.`,
  });
  return { created: true, communication: comm };
}

export async function recordDeadlineAutomationAction(input: {
  caseRecordId: number;
  action: AutomationActionType;
  idempotencyKey: string;
  communicationId?: number | null;
}) {
  try {
    const db = await getDb();
    if (db) {
      const result = await db.insert(caseAutomationActions).values({
        caseId: input.caseRecordId,
        action: input.action,
        idempotencyKey: input.idempotencyKey,
        communicationId: input.communicationId || null,
      });
      return { created: true, id: Number(result[0].insertId) };
    }
  } catch (error) {
    if (isDuplicateKeyError(error)) return { created: false, id: null };
    console.warn("[Database] recordDeadlineAutomationAction fallback");
  }

  return { created: true, id: 1 };
}

export async function listOverdueAwaitingResponseCases(now: Date) {
  try {
    const db = await getDb();
    if (db) {
      return await db.select().from(cases).where(and(eq(cases.status, "AWAITING_RESPONSE"), lte(cases.responseDeadline, now))).orderBy(desc(cases.responseDeadline));
    }
  } catch (err) {
    console.warn("[Database] listOverdueAwaitingResponseCases fallback");
  }

  return memCases.filter(c => c.status === "AWAITING_RESPONSE" && c.responseDeadline && c.responseDeadline <= now);
}

export async function escalateCaseForDeadline(input: { caseRecordId: number; previousStatus: CaseStatus; message: string }) {
  try {
    const db = await getDb();
    if (db) {
      const current = await db.select().from(cases).where(eq(cases.id, input.caseRecordId)).limit(1);
      const caseRecord = current[0];
      if (caseRecord && caseRecord.status === input.previousStatus) {
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
    }
  } catch (err) {
    console.warn("[Database] escalateCaseForDeadline fallback");
  }

  const found = memCases.find(c => c.id === input.caseRecordId);
  if (found && found.status === input.previousStatus) {
    found.status = "ESCALATED";
    found.updatedAt = new Date();
    memCaseEvents.push({
      id: memCaseEvents.length + 1,
      caseId: found.id,
      actorUserId: null,
      actorLabel: "LienGuard deadline automation",
      type: "DEADLINE_ESCALATED",
      message: input.message,
      previousStatus: input.previousStatus,
      nextStatus: "ESCALATED",
      createdAt: new Date(),
    });
    return found;
  }
  return found;
}

export async function recordCaseFollowUp(input: {
  caseRecordId: number;
  actorUserId: number;
  authorityName?: string | null;
  note?: string;
}) {
  try {
    const db = await getDb();
    if (db) {
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
  } catch (err) {
    console.warn("[Database] recordCaseFollowUp fallback");
  }

  const newId = memCaseCommunications.length ? Math.max(...memCaseCommunications.map(c => c.id)) + 1 : 1;
  const now = new Date();
  const comm: CaseCommunication = {
    id: newId,
    caseId: input.caseRecordId,
    direction: "outbound",
    subject: "Follow-up request recorded",
    counterparty: input.authorityName || null,
    recipientEmail: "records@lienguard.local",
    body: input.note || "A follow-up request was recorded in LienGuard. External delivery must be completed through the appropriate authority channel.",
    state: "recorded",
    providerMessageId: null,
    sentAt: null,
    deliveredAt: null,
    automated: 0,
    createdAt: now,
    updatedAt: now,
  };
  memCaseCommunications.push(comm);
  memCaseEvents.push({
    id: memCaseEvents.length + 1,
    caseId: input.caseRecordId,
    actorUserId: input.actorUserId,
    actorLabel: null,
    type: "COMMUNICATION_RECORDED",
    message: "Follow-up communication recorded.",
    previousStatus: null,
    nextStatus: null,
    createdAt: now,
  });
  return comm;
}

export async function listCaseDocuments(caseRecordId: number): Promise<CaseDocument[]> {
  try {
    const db = await getDb();
    if (db) {
      const res = await db.select().from(caseDocuments).where(eq(caseDocuments.caseId, caseRecordId)).orderBy(desc(caseDocuments.createdAt));
      if (res && res.length) return res;
    }
  } catch (err) {
    console.warn("[Database] listCaseDocuments fallback to memory store");
  }

  return memCaseDocuments.filter(d => d.caseId === caseRecordId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
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
  try {
    const db = await getDb();
    if (db) {
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
      const found = documents.find(document => document.storageKey === input.storageKey);
      if (found) return found;
    }
  } catch (err) {
    console.warn("[Database] createCaseDocument fallback to memory store");
  }

  const newId = memCaseDocuments.length ? Math.max(...memCaseDocuments.map(d => d.id)) + 1 : 1;
  const now = new Date();
  const newDoc: CaseDocument = {
    id: newId,
    caseId: input.caseRecordId,
    uploadedByUserId: input.uploadedByUserId,
    kind: input.kind,
    fileName: input.fileName,
    storageKey: input.storageKey,
    contentType: input.contentType,
    sizeBytes: input.sizeBytes,
    createdAt: now,
    updatedAt: now,
  };
  memCaseDocuments.push(newDoc);
  memCaseEvents.push({
    id: memCaseEvents.length + 1,
    caseId: input.caseRecordId,
    actorUserId: input.uploadedByUserId,
    actorLabel: null,
    type: input.eventType ?? "DOCUMENT_UPLOADED",
    message: input.eventMessage ?? `Document uploaded: ${input.fileName}.`,
    previousStatus: null,
    nextStatus: null,
    createdAt: now,
  });
  return newDoc;
}

export async function getLatestDemoCase(userId?: number) {
  try {
    const db = await getDb();
    if (db) {
      const result = await db
        .select()
        .from(cases)
        .where(like(cases.title, "[HACKATHON DEMO]%"))
        .orderBy(desc(cases.createdAt))
        .limit(1);
      if (result && result.length) return result[0];
    }
  } catch (err) {
    console.warn("[Database] getLatestDemoCase fallback to memory store");
  }

  const matches = memCases.filter(c => c.title.startsWith("[HACKATHON DEMO]"));
  return matches.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
}

export async function purgeDemoCases() {
  let count = 0;
  try {
    const db = await getDb();
    if (db) {
      const demoCases = await db
        .select({ id: cases.id })
        .from(cases)
        .where(like(cases.title, "[HACKATHON DEMO]%"));

      if (demoCases.length > 0) {
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
        count += ids.length;
      }
    }
  } catch (err) {
    console.warn("[Database] purgeDemoCases database offline, purging memory store");
  }

  const demoIds = new Set(memCases.filter(c => c.title.startsWith("[HACKATHON DEMO]")).map(c => c.id));
  memCases = memCases.filter(c => !demoIds.has(c.id));
  memCaseEvents = memCaseEvents.filter(e => !demoIds.has(e.caseId));
  memCaseCommunications = memCaseCommunications.filter(c => !demoIds.has(c.caseId));
  memCaseDocuments = memCaseDocuments.filter(d => !demoIds.has(d.caseId));
  memCaseAuthorityAssignments = memCaseAuthorityAssignments.filter(a => !demoIds.has(a.caseId));

  return count + demoIds.size;
}

// ─── Authority Directory ───────────────────────────────────────────────────

export async function listAuthorityDirectory(filter?: {
  stateUt?: string;
  authorityType?: AuthorityType;
  activeOnly?: boolean;
}) {
  try {
    const db = await getDb();
    if (db) {
      let query = db.select().from(authorityDirectory);
      const conditions = [];
      if (filter?.stateUt) conditions.push(eq(authorityDirectory.stateUt, filter.stateUt));
      if (filter?.authorityType) conditions.push(eq(authorityDirectory.authorityType, filter.authorityType));
      if (filter?.activeOnly) conditions.push(eq(authorityDirectory.active, 1));

      const res = conditions.length ? await query.where(and(...conditions)).orderBy(authorityDirectory.stateUt) : await query.orderBy(authorityDirectory.stateUt);
      if (res && res.length) return res;
    }
  } catch (err) {
    console.warn("[Database] listAuthorityDirectory fallback to static directory");
  }

  let list = [...memAuthorities];
  if (filter?.stateUt) list = list.filter(a => a.stateUt.toLowerCase() === filter.stateUt!.toLowerCase());
  if (filter?.authorityType) list = list.filter(a => a.authorityType === filter.authorityType);
  if (filter?.activeOnly) list = list.filter(a => a.active === 1);
  return list;
}

export async function getAuthorityById(id: number) {
  try {
    const db = await getDb();
    if (db) {
      const result = await db.select().from(authorityDirectory).where(eq(authorityDirectory.id, id)).limit(1);
      if (result && result.length) return result[0];
    }
  } catch (err) {
    console.warn("[Database] getAuthorityById fallback to static directory");
  }

  return memAuthorities.find(a => a.id === id);
}

export async function findActiveAuthorityForRouting(stateUt: string, authorityType: AuthorityType) {
  try {
    const db = await getDb();
    if (db) {
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
      if (result && result.length) return result[0];
    }
  } catch (err) {
    console.warn("[Database] findActiveAuthorityForRouting fallback to static directory");
  }

  return memAuthorities.find(a => a.stateUt.toLowerCase() === stateUt.toLowerCase() && a.authorityType === authorityType && a.active === 1);
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
  try {
    const db = await getDb();
    if (db) {
      const result = await db.insert(authorityDirectory).values({ ...input });
      return await getAuthorityById(Number(result[0].insertId));
    }
  } catch (err) {
    console.warn("[Database] createAuthorityRecord fallback to memory store");
  }

  const newId = memAuthorities.length ? Math.max(...memAuthorities.map(a => a.id)) + 1 : 1;
  const newAuth = {
    id: newId,
    stateUt: input.stateUt,
    district: input.district || null,
    authorityType: input.authorityType,
    authorityName: input.authorityName,
    officerName: input.officerName || null,
    designation: input.designation || null,
    officialEmail: input.officialEmail || null,
    phone: input.phone || null,
    sourceName: input.sourceName,
    sourceUrl: input.sourceUrl,
    lastVerifiedAt: input.lastVerifiedAt,
    active: input.active !== undefined ? input.active : 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  memAuthorities.push(newAuth);
  return newAuth;
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
  try {
    const db = await getDb();
    if (db) {
      await db.update(authorityDirectory).set(input).where(eq(authorityDirectory.id, id));
      return await getAuthorityById(id);
    }
  } catch (err) {
    console.warn("[Database] updateAuthorityRecord fallback to memory store");
  }

  const found = memAuthorities.find(a => a.id === id);
  if (found) {
    Object.assign(found, input);
    found.updatedAt = new Date();
    return found;
  }
  return undefined;
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
  try {
    const db = await getDb();
    if (db) {
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
      if (rows && rows.length) return rows[0];
    }
  } catch (err) {
    console.warn("[Database] recordAuthorityAssignment fallback to memory store");
  }

  const newId = memCaseAuthorityAssignments.length ? Math.max(...memCaseAuthorityAssignments.map(a => a.id)) + 1 : 1;
  const newAssignment = {
    id: newId,
    caseId: input.caseRecordId,
    authorityDirectoryId: input.authorityDirectoryId || null,
    authorityName: input.authorityName,
    authorityEmail: input.authorityEmail || null,
    officerName: input.officerName || null,
    designation: input.designation || null,
    sourceName: input.sourceName,
    sourceUrl: input.sourceUrl,
    lastVerifiedAt: input.lastVerifiedAt,
    routingReason: input.routingReason || null,
    assignedByUserId: input.assignedByUserId || null,
    assignedAt: new Date(),
  };
  memCaseAuthorityAssignments.push(newAssignment);
  return newAssignment;
}

export async function getLatestAuthorityAssignment(caseRecordId: number) {
  try {
    const db = await getDb();
    if (db) {
      const result = await db
        .select()
        .from(caseAuthorityAssignments)
        .where(eq(caseAuthorityAssignments.caseId, caseRecordId))
        .orderBy(desc(caseAuthorityAssignments.assignedAt))
        .limit(1);
      if (result && result.length) return result[0];
    }
  } catch (err) {
    console.warn("[Database] getLatestAuthorityAssignment fallback to memory store");
  }

  const matches = memCaseAuthorityAssignments.filter(a => a.caseId === caseRecordId);
  return matches.sort((a, b) => b.assignedAt.getTime() - a.assignedAt.getTime())[0];
}

export async function updateCaseAuthorityDirectoryId(caseRecordId: number, authorityDirectoryId: number | null) {
  try {
    const db = await getDb();
    if (db) {
      await db.update(cases).set({ authorityDirectoryId }).where(eq(cases.id, caseRecordId));
      return;
    }
  } catch (err) {
    console.warn("[Database] updateCaseAuthorityDirectoryId fallback to memory store");
  }

  const found = memCases.find(c => c.id === caseRecordId);
  if (found) {
    found.authorityDirectoryId = authorityDirectoryId;
    found.updatedAt = new Date();
  }
}


