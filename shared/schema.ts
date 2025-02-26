import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  isAdmin: boolean("is_admin").notNull().default(false),
});

export const burnerProfiles = pgTable("burner_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  codename: text("codename").notNull(),
  personality: text("personality").notNull(),
  avatar: text("avatar").notNull(),
  background: text("background").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  isAI: boolean("is_ai").notNull().default(false),
});

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  burnerId: integer("burner_id").references(() => burnerProfiles.id),
  originalContent: text("original_content").notNull(),
  transformedContent: text("transformed_content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const inviteCodes = pgTable("invite_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  createdById: integer("created_by_id").references(() => users.id),
  usedById: integer("used_by_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  usedAt: timestamp("used_at"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertBurnerProfileSchema = createInsertSchema(burnerProfiles).pick({
  codename: true,
  personality: true,
  avatar: true,
  background: true,
});

export const insertPostSchema = createInsertSchema(posts).pick({
  originalContent: true,
}).extend({
  burnerId: z.number()
});

export const insertInviteCodeSchema = createInsertSchema(inviteCodes).pick({
  code: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type BurnerProfile = typeof burnerProfiles.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type InviteCode = typeof inviteCodes.$inferSelect;