import { decimal, index, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const userRoles = ["citizen", "bank", "authority", "admin"] as const;
export type LienGuardRole = (typeof userRoles)[number];
export const caseStatuses = ["OPEN", "UNDER_REVIEW", "AWAITING_RESPONSE", "ESCALATED", "RESOLVED", "CLOSED"] as const;
export const casePriorities = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
export const caseEventTypes = [
  "CASE_CREATED",
  "DETAILS_UPDATED",
  "STATUS_CHANGED",
  "COMMUNICATION_RECORDED",
  "EMAIL_QUEUED",
  "EMAIL_SENT",
  "EMAIL_FAILED",
  "INBOUND_EMAIL_RECEIVED",
  "DEADLINE_FOLLOW_UP_QUEUED",
  "DEADLINE_ESCALATED",
  "DOCUMENT_UPLOADED",
  "RTI_DRAFT_CREATED",
  "AUTHORITY_RECOMMENDED",
  "AUTHORITY_ASSIGNED",
  "AUTHORITY_CHANGED",
] as const;
export const caseDocumentKinds = ["EVIDENCE", "CORRESPONDENCE", "RTI_DRAFT", "OTHER"] as const;
export const communicationStates = ["recorded", "queued", "sent", "failed", "received"] as const;
export const automationActionTypes = ["DEADLINE_FOLLOW_UP", "DEADLINE_ESCALATION"] as const;
export const authorityTypes = ["CYBER_CELL", "GRIEVANCE_OFFICER", "BANK_NODAL", "OTHER"] as const;
export type CaseStatus = (typeof caseStatuses)[number];
export type CasePriority = (typeof casePriorities)[number];
export type CaseEventType = (typeof caseEventTypes)[number];
export type CaseDocumentKind = (typeof caseDocumentKinds)[number];
export type CommunicationState = (typeof communicationStates)[number];
export type AutomationActionType = (typeof automationActionTypes)[number];
export type AuthorityType = (typeof authorityTypes)[number];


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
    bankName: varchar("bank_name", { length: 160 }),
    lienAmount: decimal("lien_amount", { precision: 14, scale: 2 }),
    lienDate: timestamp("lien_date"),
    lienReference: varchar("lien_reference", { length: 96 }),
    transactionReference: varchar("transaction_reference", { length: 96 }),
    authorityName: varchar("authority_name", { length: 160 }),
    authorityEmail: varchar("authority_email", { length: 320 }),
    authorityDirectoryId: int("authority_directory_id"),
    responseDeadline: timestamp("response_deadline"),
    status: mysqlEnum("status", caseStatuses).default("OPEN").notNull(),
    priority: mysqlEnum("priority", casePriorities).default("NORMAL").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("cases_user_updated_idx").on(table.userId, table.updatedAt),
    index("cases_status_updated_idx").on(table.status, table.updatedAt),
  ],
);

export const caseCommunications = mysqlTable(
  "case_communications",
  {
    id: int("id").autoincrement().primaryKey(),
    caseId: int("case_id").notNull().references(() => cases.id, { onDelete: "cascade" }),
    direction: mysqlEnum("direction", ["outbound", "inbound"]).notNull(),
    subject: varchar("subject", { length: 180 }).notNull(),
    counterparty: varchar("counterparty", { length: 160 }),
    recipientEmail: varchar("recipient_email", { length: 320 }),
    body: text("body").notNull(),
    state: mysqlEnum("state", communicationStates).default("recorded").notNull(),
    providerMessageId: varchar("provider_message_id", { length: 128 }).unique(),
    automated: int("automated").default(0).notNull(),
    sentAt: timestamp("sent_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  table => [index("case_communications_case_created_idx").on(table.caseId, table.createdAt)],
);

/** Immutable activity stream used to explain the actual case journey. */
export const caseEvents = mysqlTable(
  "case_events",
  {
    id: int("id").autoincrement().primaryKey(),
    caseId: int("case_id").notNull().references(() => cases.id, { onDelete: "cascade" }),
    actorUserId: int("actor_user_id").references(() => users.id),
    actorLabel: varchar("actor_label", { length: 96 }),
    type: mysqlEnum("type", caseEventTypes).notNull(),
    message: varchar("message", { length: 500 }).notNull(),
    previousStatus: mysqlEnum("previous_status", caseStatuses),
    nextStatus: mysqlEnum("next_status", caseStatuses),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  table => [index("case_events_case_created_idx").on(table.caseId, table.createdAt)],
);

/** File metadata is persisted here; file bytes always remain in protected object storage. */
export const caseDocuments = mysqlTable(
  "case_documents",
  {
    id: int("id").autoincrement().primaryKey(),
    caseId: int("case_id").notNull().references(() => cases.id, { onDelete: "cascade" }),
    uploadedByUserId: int("uploaded_by_user_id").notNull().references(() => users.id),
    kind: mysqlEnum("kind", caseDocumentKinds).default("EVIDENCE").notNull(),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    storageKey: varchar("storage_key", { length: 512 }).notNull().unique(),
    contentType: varchar("content_type", { length: 127 }).notNull(),
    sizeBytes: int("size_bytes").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  table => [index("case_documents_case_created_idx").on(table.caseId, table.createdAt)],
);

export const caseAutomationActions = mysqlTable(
  "case_automation_actions",
  {
    id: int("id").autoincrement().primaryKey(),
    caseId: int("case_id").notNull().references(() => cases.id, { onDelete: "cascade" }),
    action: mysqlEnum("action", automationActionTypes).notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 160 }).notNull().unique(),
    communicationId: int("communication_id").references(() => caseCommunications.id, { onDelete: "set null" }),
    completedAt: timestamp("completed_at").defaultNow().notNull(),
  },
  table => [index("case_automation_case_action_idx").on(table.caseId, table.action, table.completedAt)],
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

/** Official authority directory — populated from government sources and maintained by admins. */
export const authorityDirectory = mysqlTable(
  "authority_directory",
  {
    id: int("id").autoincrement().primaryKey(),
    stateUt: varchar("state_ut", { length: 100 }).notNull(),
    district: varchar("district", { length: 100 }),
    authorityType: mysqlEnum("authority_type", authorityTypes).notNull().default("CYBER_CELL"),
    authorityName: varchar("authority_name", { length: 200 }).notNull(),
    officerName: varchar("officer_name", { length: 200 }),
    designation: varchar("designation", { length: 200 }),
    officialEmail: varchar("official_email", { length: 320 }),
    phone: varchar("phone", { length: 30 }),
    sourceName: varchar("source_name", { length: 200 }).notNull(),
    sourceUrl: varchar("source_url", { length: 512 }).notNull(),
    lastVerifiedAt: timestamp("last_verified_at").notNull(),
    active: int("active").default(1).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("authority_directory_state_type_idx").on(table.stateUt, table.authorityType, table.active),
  ],
);

/**
 * Point-in-time snapshot of the authority selected for a case.
 * Preserved even if the authority_directory entry changes later.
 */
export const caseAuthorityAssignments = mysqlTable(
  "case_authority_assignments",
  {
    id: int("id").autoincrement().primaryKey(),
    caseId: int("case_id").notNull().references(() => cases.id, { onDelete: "cascade" }),
    authorityDirectoryId: int("authority_directory_id").references(() => authorityDirectory.id, { onDelete: "set null" }),
    // Snapshot fields — preserved even if directory entry changes
    authorityName: varchar("authority_name", { length: 200 }).notNull(),
    authorityEmail: varchar("authority_email", { length: 320 }),
    officerName: varchar("officer_name", { length: 200 }),
    designation: varchar("designation", { length: 200 }),
    sourceName: varchar("source_name", { length: 200 }).notNull(),
    sourceUrl: varchar("source_url", { length: 512 }).notNull(),
    lastVerifiedAt: timestamp("last_verified_at").notNull(),
    routingReason: varchar("routing_reason", { length: 500 }),
    assignedByUserId: int("assigned_by_user_id").references(() => users.id, { onDelete: "set null" }),
    assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  },
  table => [
    index("case_authority_assignments_case_idx").on(table.caseId, table.assignedAt),
  ],
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type UserNotification = typeof userNotifications.$inferSelect;
export type RoleChangeAudit = typeof roleChangeAudits.$inferSelect;
export type Case = typeof cases.$inferSelect;
export type CaseCommunication = typeof caseCommunications.$inferSelect;
export type CaseEvent = typeof caseEvents.$inferSelect;
export type CaseDocument = typeof caseDocuments.$inferSelect;
export type CaseAutomationAction = typeof caseAutomationActions.$inferSelect;
export type AuthorityDirectoryEntry = typeof authorityDirectory.$inferSelect;
export type CaseAuthorityAssignment = typeof caseAuthorityAssignments.$inferSelect;

