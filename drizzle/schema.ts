import { index, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const userRoles = ["citizen", "bank", "authority", "admin"] as const;
export type LienGuardRole = (typeof userRoles)[number];

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
