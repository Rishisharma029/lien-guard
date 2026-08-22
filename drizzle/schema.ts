import { index, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const userRoles = ["citizen", "bank", "authority", "admin"] as const;
export type LienGuardRole = (typeof userRoles)[number];
export const caseStatuses = [
  "OPEN",
  "UNDER_REVIEW",
  "AWAITING_RESPONSE",
  "REMINDER_SENT",
  "ESCALATED",
  "RESOLVED",
  "CLOSED",
] as const;
export const casePriorities = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
export type CaseStatus = (typeof caseStatuses)[number];
export type CasePriority = (typeof casePriorities)[number];

/** Core user record created and refreshed by the Manus OAuth flow. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", userRoles).default("citizen").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const userNotifications = mysqlTable(
  "user_notifications",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: mysqlEnum("type", ["role_changed"]).notNull(),
    title: varchar("title", { length: 160 }).notNull(),
    message: text("message").notNull(),
    readAt: timestamp("readAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("user_notifications_user_created_idx").on(table.userId, table.createdAt)],
);

export const cases = mysqlTable(
  "cases",
  {
    id: int("id").autoincrement().primaryKey(),
    caseId: varchar("case_id", { length: 32 }).notNull().unique(),
    userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 180 }).notNull(),
    description: text("description").notNull(),
    caseType: varchar("case_type", { length: 80 }).notNull(),
    status: mysqlEnum("status", caseStatuses).default("OPEN").notNull(),
    priority: mysqlEnum("priority", casePriorities).default("NORMAL").notNull(),
    
    // Bank and Account Details
    bankName: varchar("bank_name", { length: 120 }),
    accountNumber: varchar("account_number", { length: 40 }),
    branchName: varchar("branch_name", { length: 120 }),
    ifscCode: varchar("ifsc_code", { length: 20 }),
    
    // Lien and Incident specifics
    lienAmount: varchar("lien_amount", { length: 30 }),
    disputeRefNumber: varchar("dispute_ref_number", { length: 100 }),
    ncrpAckNumber: varchar("ncrp_ack_number", { length: 100 }),
    firNumber: varchar("fir_number", { length: 100 }),
    freezingAuthority: varchar("freezing_authority", { length: 180 }),
    authorityEmail: varchar("authority_email", { length: 320 }),
    nodalOfficerEmail: varchar("nodal_officer_email", { length: 320 }),
    
    // SLA & Follow-up Tracking
    noticeSentAt: timestamp("notice_sent_at"),
    responseDeadline: timestamp("response_deadline"),
    reminderCount: int("reminder_count").default(0).notNull(),
    escalationTier: int("escalation_tier").default(1).notNull(),
    resolutionNotes: text("resolution_notes"),
    
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("cases_user_updated_idx").on(table.userId, table.updatedAt),
    index("cases_status_updated_idx").on(table.status, table.updatedAt),
  ],
);

export const caseTimelineEvents = mysqlTable(
  "case_timeline_events",
  {
    id: int("id").autoincrement().primaryKey(),
    caseId: varchar("case_id", { length: 32 }).notNull().references(() => cases.caseId, { onDelete: "cascade" }),
    eventType: varchar("event_type", { length: 60 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description").notNull(),
    actorRole: varchar("actor_role", { length: 40 }).notNull(),
    metadata: text("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  table => [index("case_timeline_events_case_created_idx").on(table.caseId, table.createdAt)],
);

export const caseCommunications = mysqlTable(
  "case_communications",
  {
    id: int("id").autoincrement().primaryKey(),
    caseId: varchar("case_id", { length: 32 }).notNull().references(() => cases.caseId, { onDelete: "cascade" }),
    direction: mysqlEnum("direction", ["OUTBOUND", "INBOUND"]).notNull(),
    communicationType: varchar("communication_type", { length: 60 }).notNull(),
    recipientOrSender: varchar("recipient_or_sender", { length: 320 }).notNull(),
    subject: varchar("subject", { length: 300 }).notNull(),
    body: text("body").notNull(),
    status: varchar("status", { length: 40 }).default("SENT").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  table => [index("case_communications_case_created_idx").on(table.caseId, table.createdAt)],
);

export const caseRtiDrafts = mysqlTable(
  "case_rti_drafts",
  {
    id: int("id").autoincrement().primaryKey(),
    caseId: varchar("case_id", { length: 32 }).notNull().references(() => cases.caseId, { onDelete: "cascade" }),
    publicAuthority: varchar("public_authority", { length: 200 }).notNull(),
    pioDesignation: varchar("pio_designation", { length: 200 }).notNull(),
    factsSummary: text("facts_summary").notNull(),
    queriesRequested: text("queries_requested").notNull(),
    statutoryDeclaration: text("statutory_declaration").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("case_rti_drafts_case_updated_idx").on(table.caseId, table.updatedAt)],
);

export const roleChangeAudits = mysqlTable(
  "role_change_audits",
  {
    id: int("id").autoincrement().primaryKey(),
    targetUserId: int("targetUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
    changedByUserId: int("changedByUserId").notNull().references(() => users.id),
    previousRole: mysqlEnum("previousRole", userRoles).notNull(),
    newRole: mysqlEnum("newRole", userRoles).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("role_change_audits_target_created_idx").on(table.targetUserId, table.createdAt),
    index("role_change_audits_actor_created_idx").on(table.changedByUserId, table.createdAt),
  ],
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type UserNotification = typeof userNotifications.$inferSelect;
export type RoleChangeAudit = typeof roleChangeAudits.$inferSelect;
export type Case = typeof cases.$inferSelect;
export type InsertCase = typeof cases.$inferInsert;
export type CaseTimelineEvent = typeof caseTimelineEvents.$inferSelect;
export type InsertCaseTimelineEvent = typeof caseTimelineEvents.$inferInsert;
export type CaseCommunication = typeof caseCommunications.$inferSelect;
export type InsertCaseCommunication = typeof caseCommunications.$inferInsert;
export type CaseRtiDraft = typeof caseRtiDrafts.$inferSelect;
export type InsertCaseRtiDraft = typeof caseRtiDrafts.$inferInsert;

