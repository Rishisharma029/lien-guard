import { decimal, index, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const userRoles = ["citizen", "bank", "authority", "admin"] as const;
export type LienGuardRole = (typeof userRoles)[number];
export const caseStatuses = ["OPEN", "UNDER_REVIEW", "AWAITING_RESPONSE", "ESCALATED", "RESOLVED", "CLOSED"] as const;
export const casePriorities = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
export const caseEventTypes = ["CASE_CREATED", "DETAILS_UPDATED", "STATUS_CHANGED", "COMMUNICATION_RECORDED", "DOCUMENT_UPLOADED", "RTI_DRAFT_CREATED"] as const;
export const caseDocumentKinds = ["EVIDENCE", "CORRESPONDENCE", "RTI_DRAFT", "OTHER"] as const;
export type CaseStatus = (typeof caseStatuses)[number];
export type CasePriority = (typeof casePriorities)[number];
export type CaseEventType = (typeof caseEventTypes)[number];
export type CaseDocumentKind = (typeof caseDocumentKinds)[number];

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
    body: text("body").notNull(),
    state: mysqlEnum("state", ["recorded", "received"]).default("recorded").notNull(),
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
    actorUserId: int("actor_user_id").notNull().references(() => users.id),
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
export type CaseCommunication = typeof caseCommunications.$inferSelect;
export type CaseEvent = typeof caseEvents.$inferSelect;
export type CaseDocument = typeof caseDocuments.$inferSelect;
