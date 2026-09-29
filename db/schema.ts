import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
  createdAt: text("created_at").notNull(),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
});

export const studyRequests = sqliteTable("study_requests", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  subject: text("subject").notNull(),
  grade: text("grade").notNull(),
  focus: text("focus").notNull(),
  status: text("status").notNull(),
  isDemo: integer("is_demo", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
}, (table) => [index("study_requests_user_idx").on(table.userId, table.createdAt)]);

export const userPreferences = sqliteTable("user_preferences", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  newsTopics: text("news_topics").notNull(),
  marketplaceInterests: text("marketplace_interests").notNull(),
  marketplaceArea: text("marketplace_area").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const savedItems = sqliteTable("saved_items", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  portal: text("portal").notNull(),
  itemKey: text("item_key").notNull(),
  title: text("title").notNull(),
  metadata: text("metadata").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [
  uniqueIndex("saved_items_user_portal_item_idx").on(table.userId, table.portal, table.itemKey),
  index("saved_items_user_portal_idx").on(table.userId, table.portal, table.createdAt),
]);

export const contactSubmissions = sqliteTable("contact_submissions", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull(),
  topic: text("topic").notNull(),
  message: text("message").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [index("contact_submissions_created_idx").on(table.createdAt)]);
