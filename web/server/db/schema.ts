import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(), // Format: `${provider}:${providerAccountId}`
  username: text("username").notNull(),
  status: text("status", { enum: ["active", "warned", "banned"] })
    .notNull()
    .default("active"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  isAdmin: integer("is_admin", { mode: "boolean" }).notNull().default(false),
});

export const infractions = sqliteTable("infractions", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  identityHash: text("identity_hash").notNull(),
  type: text("type", { enum: ["copyright", "spam", "minor"] }).notNull(),
  issuedAt: integer("issued_at", { mode: "timestamp" }).notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }),
});

export const guideSubmissions = sqliteTable("guide_submissions", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  sanityDocId: text("sanity_doc_id").notNull(),
  status: text("status", { enum: ["pending", "published", "rejected"] })
    .notNull()
    .default("pending"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const banned_identities = sqliteTable("banned_identities", {
  id: text("id").primaryKey(),
  hashed_identity: text("hashed_identity").notNull().unique(),
  banned_at: integer("banned_at", { mode: "timestamp" }).notNull(),
  reason: text("reason"),
});

export const accountDeletionRequests = sqliteTable(
  "account_deletion_requests",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    status: text("status", { enum: ["pending", "approved", "rejected"] })
      .notNull()
      .default("pending"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
);

export const guideReports = sqliteTable(
  "guide_reports",
  {
    id: text("id").primaryKey(),
    reporterId: text("reporter_id").references(() => users.id, {
      onDelete: "set null",
    }),
    sanityDocId: text("sanity_doc_id").notNull(),
    reason: text("reason", {
      enum: ["inaccurate", "spam", "copyright", "inappropriate", "other"],
    }).notNull(),
    details: text("details"),
    status: text("status", {
      enum: ["pending", "reviewed", "dismissed"],
    })
      .notNull()
      .default("pending"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    uniqueIndex("guide_reports_reporter_guide_idx").on(
      table.reporterId,
      table.sanityDocId,
    ),
  ],
);
