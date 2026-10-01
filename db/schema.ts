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

export const authIdentities = sqliteTable("auth_identities", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  providerSubject: text("provider_subject").notNull(),
  email: text("email").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [
  uniqueIndex("auth_identities_provider_subject_idx").on(table.provider, table.providerSubject),
  uniqueIndex("auth_identities_user_provider_idx").on(table.userId, table.provider),
]);

export const studyRequests = sqliteTable("study_requests", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  paperId: text("paper_id"),
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

export const communityPosts = sqliteTable("community_posts", {
  id: text("id").primaryKey(),
  authorId: text("author_id").references(() => users.id, { onDelete: "set null" }),
  authorLabel: text("author_label").notNull(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  summary: text("summary").notNull(),
  body: text("body").notNull(),
  status: text("status").notNull(),
  isInternal: integer("is_internal", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
  publishedAt: text("published_at"),
}, (table) => [
  index("community_posts_status_published_idx").on(table.status, table.publishedAt),
  index("community_posts_author_idx").on(table.authorId, table.createdAt),
]);

export const testRooms = sqliteTable("test_rooms", {
  id: text("id").primaryKey(),
  teacherId: text("teacher_id").notNull(),
  paperId: text("paper_id").notNull(),
  status: text("status").notNull(),
  createdAt: text("created_at").notNull(),
});

export const userRoles = sqliteTable("user_roles", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("student"),
  institution: text("institution"),
  verified: integer("verified", { mode: "boolean" }).notNull().default(false),
  updatedAt: text("updated_at").notNull(),
});

export const testAttendees = sqliteTable("test_attendees", {
  id: text("id").primaryKey(),
  roomId: text("room_id").notNull().references(() => testRooms.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  rollNumber: text("roll_number").notNull(),
  status: text("status").notNull(),
  optionsFilled: text("options_filled"),
  score: integer("score"),
  aiEvaluation: text("ai_evaluation"),
  createdAt: text("created_at").notNull(),
});
